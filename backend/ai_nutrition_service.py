# backend/ai_nutrition_service.py
"""
CardioPredict AI-Powered Clinical Analysis & Personalized Nutrition Service

Responsibilities:
1. Verifies that medical report extraction and ML/DL prediction inference have completed.
2. Clinical AI Analysis:
   - Plain-English breakdown of what the 5 cardiovascular risk screening scores mean.
   - Distinguishes measured lab values from mathematical prediction probabilities.
   - Clinical context on risk factors without claiming a diagnosis.
   - Identifies uncertainties and missing clinical information.
   - Provides formulated questions for the patient to discuss with their physician/cardiologist.
3. Personalized AI Diet Planning:
   - Unlocked only after report analysis and prediction have succeeded.
   - Dynamic meal structure (breakfast, lunch, dinner, snacks) with practical alternatives.
   - Safe hydration guidance, portion advice, preparation tips, and cautions for allergies.
4. Protects patient confidentiality by transmitting ONLY necessary de-identified clinical biomarkers
   (strictly NO patient names, emails, phone numbers, or file storage paths).
5. Invokes server-side AI model using official SDKs:
   - Google Gemini (google.genai SDK with model fallback: gemini-3.1-flash-lite, gemini-3.5-flash, etc.)
   - OpenAI (openai SDK with model: gpt-4o-mini)
6. Enforces clinical governance: never substitutes fake hardcoded food lists or fabricated nutrient numbers.
"""

import os
import json
import time
import re
from datetime import datetime
from database import get_db_connection, log_audit

def sanitize_error_message(err_str: str) -> str:
    """Strips any accidental API key or credential traces from error strings."""
    if not err_str:
        return ""
    sanitized = re.sub(r'(AIzaSy[A-Za-z0-9_-]{33})', '[REDACTED_GEMINI_KEY]', err_str)
    sanitized = re.sub(r'(sk-[A-Za-z0-9_-]{20,})', '[REDACTED_OPENAI_KEY]', sanitized)
    sanitized = re.sub(r'(AQ\.[A-Za-z0-9_-]{40,})', '[REDACTED_KEY]', sanitized)
    return sanitized

def check_ai_provider_connection():
    """
    Validates current AI provider configuration.
    Performs a lightweight connectivity check to verify whether the configured
    API key is valid and responsive.
    Returns a dict with: configured (bool), provider (str|None), status ("connected"|"unconfigured"|"error"),
    message (str), and setup instructions.
    """
    gemini_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    openai_key = os.environ.get("OPENAI_API_KEY")

    if not gemini_key and not openai_key:
        return {
            "configured": False,
            "provider": None,
            "status": "unconfigured",
            "message": "AI recommendation service is not configured. No GEMINI_API_KEY or OPENAI_API_KEY was found in the backend environment.",
            "instructions": (
                "To enable real AI recommendations:\n"
                "1. For Google Gemini: Obtain a free API key at https://aistudio.google.com/app/apikey and add GEMINI_API_KEY=your_key in backend/.env\n"
                "2. For OpenAI: Obtain an API key at https://platform.openai.com/api-keys and add OPENAI_API_KEY=your_key in backend/.env\n"
                "3. Restart the Flask backend server."
            )
        }

    # Test Google Gemini if configured
    if gemini_key:
        try:
            from google import genai
            client = genai.Client(api_key=gemini_key)
            models_to_try = [
                "models/gemini-3.1-flash-lite",
                "models/gemini-3.5-flash",
                "gemini-2.5-flash",
                "gemini-flash-latest"
            ]
            last_err = None
            for m in models_to_try:
                try:
                    response = client.models.generate_content(
                        model=m,
                        contents="Reply with the single word: OK",
                    )
                    if response and response.text:
                        return {
                            "configured": True,
                            "provider": "Google Gemini",
                            "model": m.replace("models/", ""),
                            "status": "connected",
                            "message": f"Successfully connected to Google Gemini ({m.replace('models/', '')}) AI service."
                        }
                except Exception as me:
                    last_err = me
                    continue

            if last_err:
                raise last_err

        except Exception as e:
            clean_err = sanitize_error_message(str(e))
            return {
                "configured": True,
                "provider": "Google Gemini",
                "status": "error",
                "message": f"Google Gemini API error: {clean_err}",
                "instructions": "Verify that your GEMINI_API_KEY in backend/.env is active and has available quota."
            }

    # Test OpenAI if configured
    if openai_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=openai_key, timeout=10.0)
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": "Reply with the single word: OK"}],
                max_tokens=5
            )
            if response and response.choices:
                return {
                    "configured": True,
                    "provider": "OpenAI",
                    "model": "gpt-4o-mini",
                    "status": "connected",
                    "message": "Successfully connected to OpenAI GPT-4o-mini service."
                }
        except Exception as e:
            clean_err = sanitize_error_message(str(e))
            return {
                "configured": True,
                "provider": "OpenAI",
                "status": "error",
                "message": f"OpenAI API error: {clean_err}",
                "instructions": "Verify that your OPENAI_API_KEY in backend/.env is active and has billing credit."
            }

    return {
        "configured": False,
        "provider": None,
        "status": "unconfigured",
        "message": "No functional AI provider configured.",
        "instructions": "Please configure GEMINI_API_KEY or OPENAI_API_KEY in backend/.env."
    }

def get_patient_report_and_predictions(patient_email):
    """
    Retrieves the patient's latest uploaded report findings and ML model predictions.
    Returns (has_prediction, report_data, predictions_map, profile_data).
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Check for latest predictions
    cursor.execute('''
        SELECT id, disease_name, score, risk, timestamp, features_snapshot, report_id
        FROM predictions
        WHERE email = ?
        ORDER BY timestamp DESC
        LIMIT 5
    ''', (patient_email,))
    pred_rows = cursor.fetchall()

    if not pred_rows:
        conn.close()
        return False, None, {}, {}

    predictions_map = {}
    report_id_from_pred = None
    for r in pred_rows:
        predictions_map[r["disease_name"]] = {
            "risk": r["risk"],
            "score": r["score"],
            "evaluated_at": r["timestamp"]
        }
        if r["report_id"]:
            report_id_from_pred = r["report_id"]

    # 2. Check for latest medical report extraction
    if report_id_from_pred:
        cursor.execute('''
            SELECT id, original_filename, extracted_data, verified_data, status, created_at
            FROM medical_reports
            WHERE id = ? AND patient_email = ?
        ''', (report_id_from_pred, patient_email))
    else:
        cursor.execute('''
            SELECT id, original_filename, extracted_data, verified_data, status, created_at
            FROM medical_reports
            WHERE patient_email = ?
            ORDER BY created_at DESC
            LIMIT 1
        ''', (patient_email,))
    report_row = cursor.fetchone()

    report_data = None
    if report_row:
        extracted = {}
        try:
            raw_json = report_row["verified_data"] or report_row["extracted_data"]
            if raw_json:
                extracted = json.loads(raw_json)
        except Exception:
            extracted = {}

        report_data = {
            "report_id": report_row["id"],
            "filename": report_row["original_filename"],
            "upload_date": report_row["created_at"],
            "extracted_biomarkers": {
                k: v for k, v in extracted.items()
                if k.lower() in [
                    "age", "sex", "gender", "systolic_bp", "diastolic_bp", "resting_bp",
                    "cholesterol", "ldl", "hdl", "triglycerides", "glucose_level",
                    "blood_sugar", "fbs", "bmi", "heart_rate", "smoking_status", "smokes"
                ]
            }
        }

    # 3. Patient profile preferences and allergies
    cursor.execute('''
        SELECT dietary_preference, allergies, chronic_conditions, blood_group, age, gender
        FROM patient_profiles
        WHERE email = ?
    ''', (patient_email,))
    prof_row = cursor.fetchone()

    profile_data = {
        "dietary_preference": prof_row["dietary_preference"] if prof_row and prof_row["dietary_preference"] else "standard",
        "allergies": prof_row["allergies"] if prof_row and prof_row["allergies"] else "None reported",
        "chronic_conditions": prof_row["chronic_conditions"] if prof_row and prof_row["chronic_conditions"] else "None reported",
        "age": prof_row["age"] if prof_row else None,
        "gender": prof_row["gender"] if prof_row else None
    }

    conn.close()
    return True, report_data, predictions_map, profile_data

def _extract_json_from_llm_response(raw_text: str):
    """Safely extracts JSON payload from text that might include markdown backticks."""
    text = raw_text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    return json.loads(text)

def call_external_ai_service(prompt_payload):
    """
    Attempts to invoke an external AI LLM provider using supported SDKs.
    Checks environment for GEMINI_API_KEY (or GOOGLE_API_KEY), then OPENAI_API_KEY.
    Includes sensible timeouts (20s) and 1 retry.
    Returns (success: bool, response_json_or_error_message: dict|str, model_name: str|None).
    """
    gemini_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    openai_key = os.environ.get("OPENAI_API_KEY")

    if not gemini_key and not openai_key:
        return (
            False,
            "No external AI service API key (GEMINI_API_KEY or OPENAI_API_KEY) is configured on the backend server. "
            "Please configure a valid API key in backend/.env to generate AI nutrition recommendations.",
            None
        )

    # 1. Google Gemini via google.genai SDK
    if gemini_key:
        last_error = None
        models_to_try = [
            "models/gemini-3.1-flash-lite",
            "models/gemini-3.5-flash",
            "gemini-2.5-flash",
            "gemini-flash-latest"
        ]
        for attempt in range(2):
            try:
                from google import genai
                client = genai.Client(api_key=gemini_key)
                
                for model_to_use in models_to_try:
                    try:
                        response = client.models.generate_content(
                            model=model_to_use,
                            contents=prompt_payload,
                            config={
                                "response_mime_type": "application/json",
                                "temperature": 0.2
                            }
                        )
                        if response and response.text:
                            parsed = _extract_json_from_llm_response(response.text)
                            return True, parsed, f"Google Gemini ({model_to_use.replace('models/', '')})"
                    except Exception as m_err:
                        last_error = m_err
                        continue

            except Exception as e:
                last_error = e
                if attempt == 0:
                    time.sleep(1.5)

        clean_err = sanitize_error_message(str(last_error))
        return False, f"Google Gemini request failed: {clean_err}", None

    # 2. OpenAI via openai SDK
    if openai_key:
        last_error = None
        for attempt in range(2):
            try:
                from openai import OpenAI
                client = OpenAI(api_key=openai_key, timeout=20.0)
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "You are a specialized clinical cardiovascular AI assistant. You output ONLY valid JSON adhering strictly to the requested schema. Never invent scientific citations, fake calorie/sodium numbers, or treat predicted risks as diagnoses."},
                        {"role": "user", "content": prompt_payload}
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.2
                )
                text = response.choices[0].message.content
                parsed = _extract_json_from_llm_response(text)
                return True, parsed, "OpenAI (gpt-4o-mini)"

            except Exception as e:
                last_error = e
                if attempt == 0:
                    time.sleep(1.5)

        clean_err = sanitize_error_message(str(last_error))
        return False, f"OpenAI API request failed: {clean_err}", None

    return False, "No functional AI provider configured.", None

# ---------------------------------------------------------------------------
# Section 3: AI Clinical Analysis of Completed Prediction Results
# ---------------------------------------------------------------------------
def get_latest_cached_ai_analysis(patient_email):
    """Retrieves the latest stored AI clinical prediction analysis for this patient."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id, report_id, primary_condition, risk_level, analysis_json, ai_model_name, created_at
        FROM ai_prediction_analyses
        WHERE patient_email = ?
        ORDER BY created_at DESC
        LIMIT 1
    ''', (patient_email,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    try:
        data = json.loads(row["analysis_json"])
        data["analysis_id"] = row["id"]
        data["generated_at"] = row["created_at"]
        data["ai_model"] = row["ai_model_name"]
        return data
    except Exception:
        return None

def generate_ai_prediction_analysis(patient_email):
    """
    Step 4 of Clinical Workflow:
    Executes a comprehensive, plain-language AI clinical analysis of the completed ML prediction.
    - Plain-English synthesis.
    - Distinguishes measured findings from predictions.
    - Explains risk factors without claiming diagnosis.
    - Identifies uncertainty and missing data.
    - Formulates practical questions for patient's doctor.
    - Strictly avoids prescribing medicines or promising cures.
    """
    has_prediction, report_data, predictions_map, profile_data = get_patient_report_and_predictions(patient_email)

    if not has_prediction or not predictions_map:
        return {
            "has_prediction": False,
            "status": "locked",
            "message": "Complete your medical report analysis and risk prediction to receive AI clinical analysis.",
            "action_required": "Please upload a medical report PDF and confirm extracted values to execute prediction first."
        }, 400

    primary_condition = "Cardiovascular Health"
    risk_level = "Standard"
    for cond, pdata in predictions_map.items():
        if pdata["risk"] == "High":
            primary_condition = cond.replace("_", " ").title()
            risk_level = "High"
            break
        elif pdata["risk"] == "Moderate" and risk_level != "High":
            primary_condition = cond.replace("_", " ").title()
            risk_level = "Moderate"

    # Minimal, de-identified clinical context
    deidentified_payload = {
        "primary_flagged_condition": primary_condition,
        "highest_risk_level": risk_level,
        "model_risk_evaluations": predictions_map,
        "measured_lab_biomarkers": report_data["extracted_biomarkers"] if report_data else {},
        "chronic_conditions": profile_data["chronic_conditions"],
        "dietary_preference": profile_data["dietary_preference"],
        "allergies": profile_data["allergies"]
    }

    ai_prompt = f"""
You are a specialized clinical cardiovascular communications AI for CardioPredict.
A patient has completed a medical laboratory report analysis and machine learning cardiovascular risk assessment.
Here is the de-identified, validated clinical data:
- Model Risk Evaluations: {json.dumps(deidentified_payload['model_risk_evaluations'])}
- Measured Laboratory Biomarkers: {json.dumps(deidentified_payload['measured_lab_biomarkers'])}
- Chronic Conditions Disclosed: {deidentified_payload['chronic_conditions']}

CRITICAL CLINICAL COMMUNICATION RULES:
1. Explain the results in plain, empathetic English suitable for a patient.
2. Explicitly distinguish empirical laboratory measurements (e.g. blood pressure, glucose, lipids) from machine learning statistical prediction scores.
3. State clearly that the predicted risk level is an assistive screening estimate, NOT a confirmed clinical diagnosis.
4. Explain the key risk factors observed in the biomarkers (e.g. how systolic pressure or cholesterol influences vascular afterload).
5. Identify clinical uncertainties or missing laboratory information (e.g. missing longitudinal trends, missing ECG/imaging, missing family history).
6. Formulate 4-5 thoughtful, practical questions the patient can ask their cardiologist or primary care doctor.
7. Do NOT prescribe medications, adjust dosages, or promise that a condition can be cured or completely prevented.
8. Output ONLY a valid JSON object matching this schema:
{{
  "executive_summary": "Plain language clinical synthesis of what the patient's report and predictions mean in everyday terms",
  "primary_flagged_concern": "{primary_condition}",
  "risk_tier": "{risk_level}",
  "measured_vs_predicted_explanation": "Clear explanation distinguishing empirical lab numbers from mathematical prediction scores",
  "risk_factors_breakdown": [
    {{
      "factor": "e.g. Systolic Blood Pressure & Vascular Afterload",
      "observation": "Measured value and why it is clinically significant",
      "practical_takeaway": "Actionable lifestyle insight"
    }}
  ],
  "uncertainties_and_missing_data": [
    "Specific items not covered by a single report (e.g. longitudinal trends, family history, imaging)"
  ],
  "suggested_questions_for_doctor": [
    "Question 1 for doctor",
    "Question 2 for doctor",
    "Question 3 for doctor",
    "Question 4 for doctor"
  ],
  "clinical_disclaimer": "This analysis is generated for educational and clinical decision-support purposes only. It does not replace formal consultation, diagnostic testing, or clinical care with a licensed cardiologist or physician."
}}
"""

    success, ai_result, model_name = call_external_ai_service(ai_prompt)

    if not success:
        return {
            "has_prediction": True,
            "status": "unavailable",
            "ai_configured": False,
            "message": "AI-powered clinical analysis is temporarily unavailable because no external AI provider API key is configured or reached on the backend server.",
            "details": ai_result,
            "patient_context": deidentified_payload,
            "disclaimer": "CardioPredict provides automated screening assistance. Consult a licensed physician for diagnosis."
        }, 200

    # Persist in ai_prediction_analyses table
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        report_id = report_data["report_id"] if report_data else None
        cursor.execute('''
            INSERT INTO ai_prediction_analyses (patient_email, report_id, primary_condition, risk_level, analysis_json, ai_model_name)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (patient_email, report_id, primary_condition, risk_level, json.dumps(ai_result), model_name))
        conn.commit()
        analysis_id = cursor.lastrowid
        conn.close()

        log_audit(patient_email, "AI_PREDICTION_ANALYSIS_GENERATED", target_type="ai_prediction_analyses",
                  target_id=str(analysis_id), details=f"Generated via {model_name} for condition: {primary_condition}",
                  actor_role="patient")
    except Exception as e:
        print(f"Error persisting AI prediction analysis: {e}")

    return {
        "has_prediction": True,
        "status": "success",
        "ai_configured": True,
        "ai_model": model_name,
        "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
        "patient_context": deidentified_payload,
        "analysis": ai_result
    }, 200

# ---------------------------------------------------------------------------
# Section 4: Personalized AI Diet & Nutrition Planning
# ---------------------------------------------------------------------------
def get_latest_cached_ai_recommendation(patient_email):
    """Retrieves the latest stored AI diet recommendation for this patient if available."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id, report_id, primary_condition, risk_level, recommendations_json, ai_model_name, created_at
        FROM ai_food_recommendations
        WHERE patient_email = ?
        ORDER BY created_at DESC
        LIMIT 1
    ''', (patient_email,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return None

    try:
        data = json.loads(row["recommendations_json"])
        data["recommendation_id"] = row["id"]
        data["generated_at"] = row["created_at"]
        data["ai_model"] = row["ai_model_name"]
        return data
    except Exception:
        return None

def generate_ai_food_recommendations(patient_email, user_preferences=None):
    """
    Step 5 of Clinical Workflow:
    Generates a personalized cardiovascular diet plan only after prediction has returned a valid result.
    Builds a complete daily meal structure (breakfast, lunch, dinner, snacks), portion guidance,
    safe hydration, practical preparation tips, and cautions for allergies.
    """
    has_prediction, report_data, predictions_map, profile_data = get_patient_report_and_predictions(patient_email)

    if not has_prediction or not predictions_map:
        return {
            "has_prediction": False,
            "status": "locked",
            "message": "Complete your report analysis and risk assessment to receive AI-generated food recommendations.",
            "action_required": "Please upload a medical report (PDF) and confirm extracted values to execute cardiovascular risk assessment first."
        }, 400

    # Merge dynamic user preferences if passed
    if user_preferences and isinstance(user_preferences, dict):
        if user_preferences.get("dietary_preference"):
            profile_data["dietary_preference"] = user_preferences["dietary_preference"]
        if user_preferences.get("allergies"):
            profile_data["allergies"] = user_preferences["allergies"]
        if user_preferences.get("chronic_conditions"):
            profile_data["chronic_conditions"] = user_preferences["chronic_conditions"]

    primary_condition = "Cardiovascular Health"
    risk_level = "Standard"
    for cond, pdata in predictions_map.items():
        if pdata["risk"] == "High":
            primary_condition = cond.replace("_", " ").title()
            risk_level = "High"
            break
        elif pdata["risk"] == "Moderate" and risk_level != "High":
            primary_condition = cond.replace("_", " ").title()
            risk_level = "Moderate"

    # Minimal, de-identified patient context
    patient_context_summary = {
        "primary_flagged_condition": primary_condition,
        "highest_risk_level": risk_level,
        "predictions_summary": {k: v["risk"] for k, v in predictions_map.items()},
        "extracted_biomarkers": report_data["extracted_biomarkers"] if report_data else {},
        "dietary_preference": profile_data["dietary_preference"],
        "allergies": profile_data["allergies"],
        "chronic_conditions": profile_data["chronic_conditions"]
    }

    ai_prompt = f"""
You are a clinical cardiovascular nutrition AI assistant for CardioPredict.
A patient has completed a medical laboratory report analysis and ML cardiovascular risk assessment.
Here is the de-identified, validated clinical profile:
- Model Risk Evaluations (Probabilistic screening only, NOT a confirmed diagnosis): {json.dumps(patient_context_summary['predictions_summary'])}
- Verified Clinical Biomarkers: {json.dumps(patient_context_summary['extracted_biomarkers'])}
- Stated Dietary Preference: {patient_context_summary['dietary_preference']}
- Stated Allergies: {patient_context_summary['allergies']}
- Stated Chronic Conditions: {patient_context_summary['chronic_conditions']}

CRITICAL CLINICAL SAFETY RULES:
1. Do NOT prescribe medical treatments, pharmaceutical medications, or exact dosages.
2. Do NOT treat the predicted risk level as a confirmed clinical diagnosis. State that these are screening risk assessments.
3. Do NOT invent fake scientific citations, fictitious journal papers, or fabricated calorie/potassium/sodium figures. Reference established public guideline bodies only (e.g. American Heart Association Dietary Guidelines, ACC/AHA Prevention Guidelines, DASH dietary pattern).
4. Strictly respect stated allergies: if nuts, dairy, gluten, shellfish, etc. are listed, ensure they are 100% excluded.
5. Provide evidence-based cardiovascular dietary patterns (e.g. DASH, Mediterranean).
6. Provide a complete daily meal structure (Breakfast, Lunch, Dinner, Optional Snacks) with practical alternatives.
7. Return a valid JSON object matching this schema:
{{
  "summary": "Concise plain-language clinical synthesis of how report biomarkers relate to dietary goals",
  "evidence_dietary_pattern": "Name of evidence pattern, e.g. DASH Diet / Mediterranean Heart Pattern",
  "daily_meal_structure": {{
    "breakfast": {{
      "primary_choice": "Specific wholesome meal choice",
      "practical_alternative": "Convenient alternative option",
      "portion_guidance": "General visual plate portion guidance (e.g. 1 medium bowl, 1 fist-sized serving)",
      "prep_tips": "Simple practical preparation tip to keep sodium/sugar minimal"
    }},
    "lunch": {{
      "primary_choice": "Heart-healthy lunch option",
      "practical_alternative": "Portable alternative option",
      "portion_guidance": "Balanced plate portion: half vegetables, one-quarter whole grains, one-quarter lean protein",
      "prep_tips": "Practical preparation advice"
    }},
    "dinner": {{
      "primary_choice": "Nutrient-rich dinner option",
      "practical_alternative": "Light dinner alternative",
      "portion_guidance": "Palm-sized protein portion with generous non-starchy vegetables",
      "prep_tips": "Use herbs, garlic, and citrus instead of table salt"
    }},
    "optional_snacks": {{
      "suggestions": ["Snack suggestion 1", "Snack suggestion 2", "Snack suggestion 3"],
      "portion_guidance": "Keep snack portions small and nutrient-dense"
    }}
  }},
  "hydration_guidance": "Evidence-based hydration advice tailored to heart health (e.g. drink water regularly throughout the day; do NOT prescribe extreme fluid restrictions unless specifically directed by a cardiologist or nephrologist)",
  "recommended_categories": [
    {{
      "category": "e.g. Soluble Fiber & Whole Grains",
      "items": ["Oats", "Barley", "Quinoa"],
      "clinical_reason": "Helps bind bile acids and lower circulating LDL particles",
      "guideline_source": "American Heart Association (AHA) Dietary Guidelines"
    }}
  ],
  "foods_to_limit": [
    {{
      "food_type": "e.g. High-Sodium Processed Foods",
      "reason": "Elevates vascular resistance and systolic pressure",
      "guideline_source": "ACC/AHA Hypertension Prevention Guidelines"
    }}
  ],
  "allergy_and_safety_checks": [
    "Specific confirmation that reported allergies and preferences were respected"
  ],
  "clinical_disclaimer": "This dietary guidance is generated for educational and decision-support purposes based on your validated report and risk assessment. It does not replace medical consultation with a registered dietitian or cardiologist."
}}
"""

    success, ai_result, model_name = call_external_ai_service(ai_prompt)

    if not success:
        return {
            "has_prediction": True,
            "status": "unavailable",
            "ai_configured": False,
            "message": "AI-powered food recommendations are temporarily unavailable because no external AI provider API key is configured or reached on the backend server.",
            "details": ai_result,
            "patient_context": patient_context_summary,
            "governance_notice": "Per clinical governance requirements, predefined disease-to-food mappings and hardcoded recommendation lists have been removed. AI recommendations require an active AI model service.",
            "disclaimer": "Food suggestions are educational and must be discussed with a qualified healthcare professional. CardioPredict does not prescribe diet changes or substitute medical care."
        }, 200

    # Save successfully generated AI recommendation to database
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        report_id = report_data["report_id"] if report_data else None
        cursor.execute('''
            INSERT INTO ai_food_recommendations (patient_email, report_id, primary_condition, risk_level, recommendations_json, ai_model_name)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (patient_email, report_id, primary_condition, risk_level, json.dumps(ai_result), model_name))
        conn.commit()
        rec_id = cursor.lastrowid
        conn.close()

        log_audit(patient_email, "AI_NUTRITION_RECOMMENDATIONS_GENERATED", target_type="ai_food_recommendations",
                  target_id=str(rec_id), details=f"Generated via {model_name} for condition: {primary_condition}",
                  actor_role="patient")
    except Exception as e:
        print(f"Error persisting AI recommendations: {e}")

    return {
        "has_prediction": True,
        "status": "success",
        "ai_configured": True,
        "ai_model": model_name,
        "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
        "patient_context": patient_context_summary,
        "recommendations": ai_result
    }, 200
