# backend/patient_routes.py
import os
import re
import json
import secrets
from datetime import datetime
from flask import Blueprint, request, jsonify, g, send_file
from werkzeug.utils import secure_filename
from database import get_db_connection, log_audit, create_notification
from auth_middleware import role_required, get_client_ip
from ocr_service import extract_text_from_pdf, parse_clinical_values_from_text, validate_clinical_inputs
from main import predict_all_diseases
from assistant_service import generate_assistant_response, get_assistant_quick_suggestions
from model_evaluation_data import MODEL_EVALUATION_METRICS, CLINICAL_DISCLAIMER
from ai_nutrition_service import (
    generate_ai_food_recommendations,
    get_patient_report_and_predictions,
    get_latest_cached_ai_recommendation,
    check_ai_provider_connection,
    generate_ai_prediction_analysis,
    get_latest_cached_ai_analysis
)
from wellness_service import (
    get_yoga_library,
    get_patient_daily_routine,
    log_patient_activity,
    get_weekly_wellness_summary,
    update_wellness_settings
)

patient_bp = Blueprint("patient_api", __name__)

UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads", "medical_reports")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB limit

@patient_bp.route("/dashboard", methods=["GET"])
@role_required(["patient"])
def get_patient_dashboard():
    """
    Returns dashboard overview for the logged-in patient.
    Uses real database counts and patient records.
    """
    patient_email = g.current_user["email"]
    conn = get_db_connection()

    # User and Profile
    user = conn.execute("SELECT email, full_name, phone FROM users WHERE email = ?", (patient_email,)).fetchone()
    profile = conn.execute("SELECT * FROM patient_profiles WHERE email = ?", (patient_email,)).fetchone()

    # Latest uploaded report
    latest_report = conn.execute('''
        SELECT id, report_title, original_filename, file_size, extraction_method, status, created_at as uploaded_at
        FROM medical_reports
        WHERE patient_email = ?
        ORDER BY created_at DESC
        LIMIT 1
    ''', (patient_email,)).fetchone()

    # Latest prediction results
    latest_predictions = conn.execute('''
        SELECT disease_name, score, risk, timestamp
        FROM predictions
        WHERE email = ?
        ORDER BY timestamp DESC
        LIMIT 5
    ''', (patient_email,)).fetchall()

    predictions_map = {}
    for p in latest_predictions:
        predictions_map[p["disease_name"]] = {"score": p["score"], "risk": p["risk"]}

    # Latest AI analysis & Diet Plan status
    latest_analysis = conn.execute('''
        SELECT id, primary_condition, risk_level, ai_model_name, created_at
        FROM ai_prediction_analyses
        WHERE patient_email = ?
        ORDER BY created_at DESC
        LIMIT 1
    ''', (patient_email,)).fetchone()

    latest_diet = conn.execute('''
        SELECT id, primary_condition, risk_level, ai_model_name, created_at
        FROM ai_food_recommendations
        WHERE patient_email = ?
        ORDER BY created_at DESC
        LIMIT 1
    ''', (patient_email,)).fetchone()

    # Real counts
    report_count = conn.execute("SELECT COUNT(*) FROM medical_reports WHERE patient_email = ?", (patient_email,)).fetchone()[0]
    prediction_count = conn.execute("SELECT COUNT(DISTINCT timestamp) FROM predictions WHERE email = ?", (patient_email,)).fetchone()[0]
    saved_foods_count = conn.execute("SELECT COUNT(*) FROM favorite_resources WHERE user_email = ?", (patient_email,)).fetchone()[0]

    conn.close()

    has_rep = latest_report is not None
    has_preds = len(predictions_map) > 0
    has_analysis = latest_analysis is not None
    has_diet = latest_diet is not None

    current_step = 1
    if has_rep and not has_preds:
        current_step = 2
    elif has_preds and not has_analysis:
        current_step = 4
    elif has_analysis and not has_diet:
        current_step = 5
    elif has_diet:
        current_step = 5

    return jsonify({
        "user": dict(user) if user else {},
        "profile": dict(profile) if profile else {},
        "latest_report": dict(latest_report) if latest_report else None,
        "latest_predictions": predictions_map,
        "has_ai_analysis": has_analysis,
        "latest_analysis": dict(latest_analysis) if latest_analysis else None,
        "has_diet_plan": has_diet,
        "latest_diet": dict(latest_diet) if latest_diet else None,
        "workflow_status": {
            "has_report": has_rep,
            "has_predictions": has_preds,
            "has_ai_analysis": has_analysis,
            "has_diet_plan": has_diet,
            "current_step": current_step
        },
        "total_reports": report_count,
        "total_predictions": prediction_count,
        "saved_foods_count": saved_foods_count
    }), 200

# -------------------------------------------------------------
# Medical Report PDF Upload & OCR Workflow
# -------------------------------------------------------------
@patient_bp.route("/upload-report", methods=["POST"])
@role_required(["patient"])
def upload_medical_report():
    """
    Step 1 of Medical Report Workflow:
    - Validates file type, MIME signature, and size limit.
    - Extracts text digitally + OCR fallback.
    - Parses clinical parameters.
    - Saves report metadata securely in database.
    - Cleans up temporary storage on any error.
    - Returns extracted values for patient review/confirmation.
    """
    patient_email = g.current_user["email"]

    if "file" not in request.files:
        return jsonify({"error": "No file uploaded. Please select a medical report PDF."}), 400

    file = request.files["file"]
    if not file or file.filename == "":
        return jsonify({"error": "No file selected."}), 400

    filename = file.filename
    if not filename.lower().endswith(".pdf"):
        return jsonify({"error": "Invalid file extension. Only PDF medical reports (.pdf) are supported."}), 400

    # Read file content safely in memory first
    file_bytes = file.read()
    file_size = len(file_bytes)

    if file_size > MAX_FILE_SIZE:
        return jsonify({"error": "File size exceeds 10 MB limit. Please upload a smaller PDF."}), 400

    if file_size < 100:
        return jsonify({
            "error": "The uploaded PDF file is empty or corrupted (under 100 bytes).",
            "allow_manual_entry": True
        }), 400

    # Validate PDF magic bytes signature (%PDF-) within first 1024 bytes per PDF standard
    if b"%PDF-" not in file_bytes[:1024]:
        return jsonify({
            "error": "Invalid PDF format: File header does not match the standard PDF signature (%PDF-). If this file was renamed to .pdf, please provide a genuine PDF report.",
            "allow_manual_entry": True
        }), 400

    # Generate secure storage filename
    safe_orig = secure_filename(filename) or "medical_report.pdf"
    unique_prefix = secrets.token_hex(8)
    stored_filename = f"{unique_prefix}_{safe_orig}"
    file_path = os.path.join(UPLOAD_FOLDER, stored_filename)

    try:
        # Extract text digitally with OCR fallback directly from in-memory bytes
        raw_text, extraction_method = extract_text_from_pdf(file_bytes)

        if not raw_text.strip():
            return jsonify({
                "error": "Could not extract readable text from this PDF. The document may contain complex imagery, low-contrast scans, or non-standard formatting. You can enter your values manually below.",
                "allow_manual_entry": True
            }), 422

        # Save validated file to disk securely
        with open(file_path, "wb") as f:
            f.write(file_bytes)

        # Parse clinical parameters from text
        extracted_data = parse_clinical_values_from_text(raw_text)

        report_title = request.form.get("report_title") or f"Cardiovascular Lab Report ({datetime.now().strftime('%b %d, %Y')})"

        # Save to medical_reports table
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute('''
            INSERT INTO medical_reports
            (patient_email, report_title, original_filename, stored_filename, file_path, file_size, extraction_method, raw_text, extracted_data, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'uploaded')
        ''', (patient_email, report_title, safe_orig, stored_filename, file_path, file_size, extraction_method, raw_text, json.dumps(extracted_data)))
        report_id = cur.lastrowid
        conn.commit()
        conn.close()

        log_audit(patient_email, "UPLOAD_MEDICAL_REPORT", target_type="medical_reports", target_id=report_id,
                  details=f"File: {safe_orig}, Size: {file_size} bytes, Method: {extraction_method}", ip_address=get_client_ip())

        # Validate inputs for initial feedback
        is_valid, cleaned, errors, warnings, missing = validate_clinical_inputs(extracted_data)

        return jsonify({
            "message": "Report uploaded and clinical parameters extracted successfully.",
            "report_id": report_id,
            "filename": safe_orig,
            "extraction_method": extraction_method,
            "extracted_data": extracted_data,
            "missing_fields": missing,
            "validation_errors": errors,
            "warnings": warnings,
            "is_ready_for_prediction": is_valid
        }), 201

    except ValueError as ve:
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass
        return jsonify({
            "error": str(ve),
            "allow_manual_entry": True
        }), 422
    except Exception as e:
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass
        return jsonify({
            "error": f"Failed to process medical report: {str(e)}",
            "allow_manual_entry": True
        }), 500

@patient_bp.route("/manual-report", methods=["POST"])
@role_required(["patient"])
def create_manual_report():
    """
    Creates a placeholder report record for patients who choose to manually enter biomarkers.
    """
    patient_email = g.current_user["email"]
    data = request.get_json() or {}
    report_title = data.get("report_title", f"Manual Cardiovascular Panel ({datetime.now().strftime('%b %d, %Y')})").strip()

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('''
        INSERT INTO medical_reports
        (patient_email, report_title, original_filename, stored_filename, file_path, file_size, extraction_method, raw_text, extracted_data, status)
        VALUES (?, ?, 'manual_entry.pdf', '', '', 0, 'manual', '', '{}', 'manual_entry')
    ''', (patient_email, report_title))
    new_report_id = cur.lastrowid
    conn.commit()
    conn.close()

    log_audit(patient_email, "MANUAL_REPORT_CREATED", target_type="medical_reports", target_id=new_report_id,
              details="Patient initiated manual biomarker input session", ip_address=get_client_ip())

    return jsonify({
        "message": "Manual report session initialized.",
        "report_id": new_report_id,
        "report_title": report_title
    }), 201

@patient_bp.route("/confirm-and-predict", methods=["POST"])
@role_required(["patient"])
def confirm_and_predict():
    """
    Step 2 of Medical Report Workflow:
    - Receives verified/edited clinical parameters from patient.
    - Validates values, units, and expected ranges.
    - Prevents running predictions when mandatory inputs are missing or invalid.
    - Prevents duplicate clicks / race conditions.
    - Runs existing 5 trained models (CAD, Heart Failure, Heart Attack, Stroke, Hypertension).
    - Records prediction results in DB.
    - Updates report status to 'predicted'.
    """
    patient_email = g.current_user["email"]
    data = request.get_json() or {}
    report_id = data.get("report_id")
    clinical_features = data.get("features", {})

    if not clinical_features or not isinstance(clinical_features, dict):
        return jsonify({"error": "No clinical features provided for prediction."}), 400

    # 1. Clinical validation: check mandatory fields & ranges
    is_valid, cleaned_features, errors, warnings, missing = validate_clinical_inputs(clinical_features)

    if not is_valid:
        return jsonify({
            "error": "Validation failed. Please correct the highlighted values before running AI prediction.",
            "missing_fields": missing,
            "validation_errors": errors,
            "warnings": warnings
        }), 422

    # 2. Check for duplicate rapid submission (within 3 seconds)
    conn = get_db_connection()
    recent = conn.execute('''
        SELECT id, timestamp FROM predictions
        WHERE email = ? AND report_id = ? AND timestamp >= datetime('now', '-3 seconds')
        LIMIT 1
    ''', (patient_email, report_id)).fetchone()
    if recent:
        conn.close()
        return jsonify({"error": "Duplicate submission detected. Your assessment is already processing."}), 429

    # 3. Run trained AI models
    try:
        prediction_results = predict_all_diseases(cleaned_features)

        if "error" in prediction_results:
            conn.close()
            return jsonify({"error": prediction_results["error"]}), 500

        predictions = prediction_results.get("predictions", {})

        # 4. Store predictions and update report
        cur = conn.cursor()

        # Update medical report with verified features and status
        if report_id:
            cur.execute('''
                UPDATE medical_reports
                SET verified_data = ?, status = 'predicted'
                WHERE id = ? AND patient_email = ?
            ''', (json.dumps(cleaned_features), report_id, patient_email))

        # Store prediction records
        for disease_name, res in predictions.items():
            if "error" not in res:
                cur.execute('''
                    INSERT INTO predictions (email, disease_name, score, risk, report_id, features_snapshot)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (patient_email, disease_name, res.get("score"), res.get("risk"), report_id, json.dumps(cleaned_features)))

        # 5. Doctor Suggestion Logic based on highest risk estimate
        specialty_map = {
            "cad": ("Cardiology", "Coronary Artery Disease (CAD)", "Estimated risk for Coronary Artery Disease indicates potential arterial plaque or ischemia. Consultation with Cardiology or Preventive Cardiology is recommended for diagnostic evaluation (e.g., stress testing or angiography). This is an assistive risk estimate, not a confirmed clinical diagnosis."),
            "heart_attack": ("Interventional Cardiology", "Myocardial Infarction / Heart Attack", "Elevated biomarker or hemodynamic score suggests acute myocardial vulnerability. Evaluation by an Interventional Cardiologist is suggested for coronary artery review. Risk estimate only."),
            "heart_failure": ("Cardiology", "Congestive Heart Failure", "Elevated indicator for heart failure suggests hemodynamic strain or systolic/diastolic impairment. Consultation with a Cardiologist or Heart Failure specialist is advised."),
            "stroke": ("Neurology (Stroke Care)", "Cerebrovascular Accident (Stroke)", "Neurovascular risk estimate indicates potential cerebrovascular vulnerability. Consultation with a Neurologist specializing in stroke prevention and carotid health is advised."),
            "hypertension": ("Nephrology & Hypertension", "Systemic Hypertension", "Elevated blood pressure risk indicates chronic vascular resistance. Consultation with a specialist in Hypertension and Cardiorenal Health is advised.")
        }

        highest_disease = None
        highest_score = -1.0
        highest_risk = "Low"
        for d_name, d_res in predictions.items():
            if "score" in d_res and isinstance(d_res["score"], (int, float)):
                if d_res["score"] > highest_score:
                    highest_score = d_res["score"]
                    highest_disease = d_name
                    highest_risk = d_res.get("risk", "Low")

        suggested_assignment = None
        if highest_disease and highest_disease in specialty_map:
            spec_name, cond_title, rationale = specialty_map[highest_disease]
            doc_row = cur.execute(
                "SELECT id, doctor_code, display_name, specialization, qualifications, experience_years, availability_status FROM managed_doctors WHERE is_active = 1 AND specialization LIKE ? LIMIT 1",
                (f"%{spec_name.split()[0]}%",)
            ).fetchone()
            if not doc_row:
                doc_row = cur.execute(
                    "SELECT id, doctor_code, display_name, specialization, qualifications, experience_years, availability_status FROM managed_doctors WHERE is_active = 1 LIMIT 1"
                ).fetchone()

            suggested_doc_id = doc_row["id"] if doc_row else None
            assignment_id = f"ASG-{secrets.token_hex(4).upper()}"
            user_row = cur.execute("SELECT full_name FROM users WHERE email = ?", (patient_email,)).fetchone()
            p_name = user_row["full_name"] if user_row and user_row["full_name"] else patient_email

            cur.execute('''
                INSERT INTO doctor_assignments
                (assignment_id, patient_email, patient_name, report_id, primary_condition, risk_level, risk_score, suggested_specialty, suggested_doctor_id, clinical_rationale, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending Review')
            ''', (assignment_id, patient_email, p_name, report_id, cond_title, highest_risk, highest_score, spec_name, suggested_doc_id, rationale))

            suggested_assignment = {
                "assignment_id": assignment_id,
                "primary_condition": cond_title,
                "risk_level": highest_risk,
                "risk_score": highest_score,
                "suggested_specialty": spec_name,
                "suggested_doctor": dict(doc_row) if doc_row else None,
                "clinical_rationale": rationale,
                "status": "Pending Review",
                "disclaimer": "The ML model output is an assistive risk estimate, not an authoritative diagnosis or clinical referral. Administrator reviews and assigns specialists."
            }

        conn.commit()
        conn.close()

        log_audit(patient_email, "RUN_PREDICTION_MODELS", target_type="medical_reports", target_id=report_id,
                  details=f"Predictions calculated for 5 cardiovascular conditions", ip_address=get_client_ip())

        # Check if high risk detected to notify patient
        high_risk_diseases = [d for d, r in predictions.items() if r.get("risk") == "High"]
        if high_risk_diseases:
            create_notification(
                patient_email,
                "Elevated Cardiovascular Risk Detected",
                f"Your recent assessment indicated elevated risk for {', '.join(high_risk_diseases).upper()}. Your case has been forwarded to the administrator for doctor assignment review.",
                "warning",
                "/patient/dashboard"
            )

        return jsonify({
            "message": "AI Cardiovascular assessment completed successfully.",
            "report_id": report_id,
            "predictions": predictions,
            "input_features": cleaned_features,
            "suggested_assignment": suggested_assignment,
            "model_performance_benchmarks": MODEL_EVALUATION_METRICS,
            "clinical_disclaimer": CLINICAL_DISCLAIMER,
            "warnings": warnings,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }), 200

    except Exception as e:
        conn.close()
        return jsonify({"error": f"Prediction model execution failed: {str(e)}"}), 500

@patient_bp.route("/reports", methods=["GET"])
@role_required(["patient"])
def list_patient_reports():
    """Lists all uploaded reports and their prediction statuses for the patient."""
    patient_email = g.current_user["email"]
    conn = get_db_connection()
    reports = conn.execute('''
        SELECT id, report_title, original_filename, file_size, extraction_method,
               status, doctor_review_requested, reviewed_by, reviewed_at, created_at
        FROM medical_reports
        WHERE patient_email = ?
        ORDER BY created_at DESC
    ''', (patient_email,)).fetchall()
    conn.close()
    return jsonify({"reports": [dict(r) for r in reports]}), 200

@patient_bp.route("/report-file/<int:report_id>", methods=["GET"])
@role_required(["patient", "doctor", "admin"])
def download_private_report_file(report_id):
    """
    Securely serves the private PDF report file.
    Blocks public URLs and prevents IDOR:
    - Patient can only download their own reports.
    - Doctor can only download reports of assigned patients with consent.
    - Admin has authorized administrative access.
    """
    current_user = g.current_user
    email = current_user["email"]
    role = current_user["role"]

    conn = get_db_connection()
    report = conn.execute("SELECT patient_email, original_filename, file_path FROM medical_reports WHERE id = ?", (report_id,)).fetchone()

    if not report:
        conn.close()
        return jsonify({"error": "Report file not found."}), 404

    owner_email = report["patient_email"]
    file_path = report["file_path"]

    # Authorization Check: Patient owns report, or Admin managing system
    authorized = False
    if role == "admin":
        authorized = True
    elif role == "patient" and email == owner_email:
        authorized = True

    conn.close()

    if not authorized:
        return jsonify({"error": "Access forbidden. You do not have permission to access this private report."}), 403

    if not os.path.exists(file_path):
        return jsonify({"error": "Report file is not available on the server storage."}), 404

    log_audit(email, "DOWNLOAD_REPORT_FILE", target_type="medical_reports", target_id=report_id,
              details=f"Downloaded report file #{report_id}", ip_address=get_client_ip())

    return send_file(
        file_path,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=report["original_filename"]
    )

@patient_bp.route("/predictions", methods=["GET"])
@role_required(["patient"])
def get_prediction_history():
    """Returns the patient's full cardiovascular prediction records."""
    patient_email = g.current_user["email"]
    conn = get_db_connection()
    rows = conn.execute('''
        SELECT id, disease_name, score, risk, timestamp, report_id
        FROM predictions
        WHERE email = ?
        ORDER BY timestamp DESC
    ''', (patient_email,)).fetchall()
    conn.close()

    # Group by report_id / timestamp
    grouped = {}
    for r in rows:
        ts = r["timestamp"]
        rep_id = r["report_id"] or ts
        if rep_id not in grouped:
            grouped[rep_id] = {
                "report_id": r["report_id"],
                "timestamp": ts,
                "predictions": {}
            }
        grouped[rep_id]["predictions"][r["disease_name"]] = {
            "score": r["score"],
            "risk": r["risk"]
        }

    return jsonify({"history": list(grouped.values())}), 200

# -------------------------------------------------------------
# AI Health Assistant Endpoints
# -------------------------------------------------------------
@patient_bp.route("/assistant/chat", methods=["POST"])
@role_required(["patient"])
def assistant_chat():
    """
    CardioPredict Health Assistant endpoint.
    Safely responds to cardiovascular queries with verified guidelines.
    Optionally personalizes response using authenticated patient's results upon consent.
    """
    patient_email = g.current_user["email"]
    data = request.get_json() or {}
    user_message = data.get("message", "").strip()
    use_personal_context = data.get("use_personal_context", True)

    if not user_message:
        return jsonify({"error": "Message is required."}), 400

    patient_context = {}
    if use_personal_context:
        conn = get_db_connection()
        # Fetch latest predictions
        preds = conn.execute('''
            SELECT disease_name, risk, score FROM predictions
            WHERE email = ? ORDER BY timestamp DESC LIMIT 5
        ''', (patient_email,)).fetchall()
        pred_map = {p["disease_name"]: p["risk"] for p in preds}

        # Fetch profile
        prof = conn.execute('''
            SELECT allergies, chronic_conditions, dietary_preference, gender, age
            FROM patient_profiles WHERE email = ?
        ''', (patient_email,)).fetchone()

        conn.close()

        patient_context = {
            "predictions": pred_map,
            "dietary_preference": prof["dietary_preference"] if prof else "standard",
            "allergies": prof["allergies"] if prof else "",
            "chronic_conditions": prof["chronic_conditions"] if prof else "",
            "age": prof["age"] if prof else None,
            "gender": prof["gender"] if prof else None
        }

    response_data = generate_assistant_response(user_message, patient_context)

    log_audit(patient_email, "ASSISTANT_QUERY", target_type="assistant",
              details=f"Query: {user_message[:60]}... -> Category: {response_data.get('category')}",
              ip_address=get_client_ip(), actor_role="patient")

    return jsonify(response_data), 200

@patient_bp.route("/assistant/suggestions", methods=["GET"])
@role_required(["patient"])
def assistant_suggestions():
    """Returns dynamic starter suggestions for the AI Health Assistant."""
    patient_email = g.current_user["email"]
    conn = get_db_connection()
    preds = conn.execute('''
        SELECT disease_name, risk FROM predictions
        WHERE email = ? ORDER BY timestamp DESC LIMIT 5
    ''', (patient_email,)).fetchall()
    prof = conn.execute("SELECT dietary_preference FROM patient_profiles WHERE email = ?", (patient_email,)).fetchone()
    conn.close()

    patient_context = {
        "predictions": {p["disease_name"]: p["risk"] for p in preds},
        "dietary_preference": prof["dietary_preference"] if prof else "standard"
    }

    suggestions = get_assistant_quick_suggestions(patient_context)
    return jsonify({"suggestions": suggestions}), 200

# -------------------------------------------------------------
# Mandatory AI-Powered Food Recommendation Module
# -------------------------------------------------------------
@patient_bp.route("/diet-recommendations", methods=["GET"])
@role_required(["patient"])
def get_personalized_diet():
    """
    AI-Powered Food Recommendations:
    1. Food recommendations are generated ONLY after medical report analysis and prediction.
    2. Before analysis, returns status: 'locked' with message 'Complete your report analysis to receive AI-generated food recommendations.'
    3. All predefined/hardcoded lists have been removed.
    4. If an external AI provider (Gemini/OpenAI) is configured, generates dynamic recommendations.
    5. If no AI provider is configured, returns explicit 'unavailable' message without hardcoded substitution.
    """
    patient_email = g.current_user["email"]

    # Check if patient has completed report analysis & predictions
    has_prediction, report_data, predictions_map, profile_data = get_patient_report_and_predictions(patient_email)

    if not has_prediction or not predictions_map:
        return jsonify({
            "has_prediction": False,
            "status": "locked",
            "message": "Complete your report analysis to receive AI-generated food recommendations.",
            "action_required": "Please upload a medical report (PDF) and confirm extracted values to execute cardiovascular risk assessment first."
        }), 200

    # Check if a previously generated AI recommendation exists
    cached = get_latest_cached_ai_recommendation(patient_email)
    if cached:
        return jsonify({
            "has_prediction": True,
            "status": "success",
            "ai_configured": True,
            "is_cached": True,
            "generated_at": cached.get("generated_at"),
            "ai_model": cached.get("ai_model"),
            "recommendations": cached
        }), 200

    # Otherwise generate fresh recommendations via AI service
    resp, code = generate_ai_food_recommendations(patient_email)
    return jsonify(resp), code

@patient_bp.route("/prediction-analysis", methods=["GET"])
@role_required(["patient"])
def get_prediction_analysis():
    """
    Step 4: AI Clinical Analysis Status & Cached Results:
    1. Analysis is available ONLY after medical report analysis and risk prediction.
    2. Before prediction, returns status: 'locked' with message.
    3. If cached analysis exists, returns it.
    4. If predictions are available but no analysis yet, returns status: 'ready_to_analyze'.
    """
    patient_email = g.current_user["email"]
    has_prediction, report_data, predictions_map, profile_data = get_patient_report_and_predictions(patient_email)

    if not has_prediction or not predictions_map:
        return jsonify({
            "has_prediction": False,
            "status": "locked",
            "message": "Complete your medical report analysis and risk prediction to receive AI clinical analysis.",
            "action_required": "Please upload a medical report (PDF) and confirm extracted values to execute cardiovascular risk assessment first."
        }), 200

    cached = get_latest_cached_ai_analysis(patient_email)
    if cached:
        return jsonify({
            "has_prediction": True,
            "status": "success",
            "ai_configured": True,
            "is_cached": True,
            "generated_at": cached.get("generated_at"),
            "ai_model": cached.get("ai_model"),
            "analysis": cached
        }), 200

    return jsonify({
        "has_prediction": True,
        "status": "ready_to_analyze",
        "message": "Cardiovascular risk evaluations are completed. Click 'Analyze My Results with AI' to generate a plain-English explanation."
    }), 200

@patient_bp.route("/analyze-prediction-ai", methods=["POST"])
@role_required(["patient"])
def analyze_prediction_ai():
    """
    Step 4: Generates a plain-English AI clinical synthesis of prediction results,
    distinguishing empirical lab numbers from statistical risk estimates,
    explaining risk factors, noting uncertainties, and formulating questions for the doctor.
    """
    patient_email = g.current_user["email"]
    resp, code = generate_ai_prediction_analysis(patient_email)
    return jsonify(resp), code

@patient_bp.route("/generate-ai-diet", methods=["POST"])
@role_required(["patient"])
def generate_ai_diet():
    """Triggers or regenerates AI-powered food recommendations."""
    patient_email = g.current_user["email"]
    data = request.get_json() or {}
    user_preferences = data.get("preferences")
    resp, code = generate_ai_food_recommendations(patient_email, user_preferences=user_preferences)
    return jsonify(resp), code

@patient_bp.route("/ai-service-status", methods=["GET"])
@role_required(["patient"])
def get_ai_service_status():
    """
    Checks and reports the real backend AI provider connectivity status.
    Allows the frontend 'Retry AI Service Connection' button to verify live status.
    """
    status_info = check_ai_provider_connection()
    return jsonify(status_info), 200

# -------------------------------------------------------------
# Dedicated Yoga, Guided Breathing & Daily Wellness Module
# -------------------------------------------------------------
@patient_bp.route("/wellness/yoga-library", methods=["GET"])
@role_required(["patient"])
def api_get_yoga_library():
    """Returns curated evidence-based yoga and mobility exercises."""
    level = request.args.get("level")
    duration = request.args.get("duration")
    category = request.args.get("category")
    search = request.args.get("search")
    exercises = get_yoga_library(level=level, duration=duration, category=category, search=search)
    return jsonify({
        "exercises": exercises,
        "count": len(exercises),
        "cardiac_safety_disclaimer": "Safety Advisory: Yoga and gentle stretching are supportive wellness activities and do not replace prescribed cardiovascular medical treatments or medications. If you experience chest pain, unusual shortness of breath, palpitations, or lightheadedness, immediately STOP and seek medical attention."
    }), 200

@patient_bp.route("/wellness/daily-routine", methods=["GET"])
@role_required(["patient"])
def api_get_daily_routine():
    """Returns today's selectable routine items, checklist, and settings."""
    patient_email = g.current_user["email"]
    routine = get_patient_daily_routine(patient_email)
    return jsonify(routine), 200

@patient_bp.route("/wellness/log-activity", methods=["POST"])
@role_required(["patient"])
def api_log_wellness_activity():
    """Logs completion of a wellness activity."""
    patient_email = g.current_user["email"]
    data = request.get_json() or {}
    activity_key = data.get("activity_key")
    duration = data.get("duration_minutes", 0)
    journal_entry = data.get("journal_entry")
    mood = data.get("mood", "Calm")

    if not activity_key:
        return jsonify({"error": "activity_key is required"}), 400

    log_patient_activity(patient_email, activity_key, duration, journal_entry, mood)
    return jsonify({"message": "Activity successfully logged", "status": "completed"}), 200

@patient_bp.route("/wellness/journal", methods=["POST"])
@role_required(["patient"])
def api_save_wellness_journal():
    """Saves a daily reflection and mood check-in."""
    patient_email = g.current_user["email"]
    data = request.get_json() or {}
    entry = data.get("journal_entry", "").strip()
    mood = data.get("mood", "Calm")

    if not entry:
        return jsonify({"error": "Journal entry text is required"}), 400

    log_patient_activity(patient_email, "daily_journal", 2, entry, mood)
    return jsonify({"message": "Journal reflection saved successfully", "status": "saved"}), 200

@patient_bp.route("/wellness/weekly-summary", methods=["GET"])
@role_required(["patient"])
def api_get_weekly_summary():
    """Returns real 7-day activity metrics calculated from patient logs."""
    patient_email = g.current_user["email"]
    summary = get_weekly_wellness_summary(patient_email)
    return jsonify(summary), 200

@patient_bp.route("/wellness/settings", methods=["PATCH"])
@role_required(["patient"])
def api_update_wellness_settings():
    """Updates reminder preferences and exercise personalization settings."""
    patient_email = g.current_user["email"]
    data = request.get_json() or {}
    reminders = data.get("reminders_enabled")
    duration = data.get("preferred_duration")
    intensity = data.get("preferred_intensity")
    seated = data.get("requires_seated_modification")

    update_wellness_settings(patient_email, reminders, duration, intensity, seated)
    return jsonify({"message": "Wellness preferences updated successfully"}), 200

# -------------------------------------------------------------
# Yoga, Exercise and Video Resource Module
# -------------------------------------------------------------
@patient_bp.route("/wellness-resources", methods=["GET"])
@role_required(["patient"])
def get_wellness_resources():
    """
    Returns curated cardiovascular yoga, breathing, and exercise videos.
    Supports filtering by category and search.
    """
    patient_email = g.current_user["email"]
    category = request.args.get("category", "").strip()
    search = request.args.get("search", "").strip()

    conn = get_db_connection()
    query = '''
        SELECT w.*,
               CASE WHEN f.id IS NOT NULL THEN 1 ELSE 0 END as is_favorite
        FROM wellness_resources w
        LEFT JOIN favorite_resources f ON f.resource_id = w.id AND f.resource_type = 'wellness' AND f.user_email = ?
        WHERE w.is_active = 1
    '''
    params = [patient_email]

    if category and category != "all":
        query += " AND w.category = ?"
        params.append(category)

    if search:
        query += " AND (w.title LIKE ? OR w.target_benefits LIKE ?)"
        s = f"%{search}%"
        params.extend([s, s])

    query += " ORDER BY w.id ASC"

    rows = conn.execute(query, params).fetchall()
    conn.close()

    items = []
    for r in rows:
        d = dict(r)
        try:
            d["step_instructions"] = json.loads(d["step_instructions"]) if d["step_instructions"] else []
        except Exception:
            pass
        items.append(d)

    return jsonify({"resources": items}), 200

@patient_bp.route("/toggle-favorite", methods=["POST"])
@role_required(["patient"])
def toggle_favorite_resource():
    """Toggles saving a resource as favorite."""
    patient_email = g.current_user["email"]
    data = request.get_json() or {}
    resource_id = data.get("resource_id")
    resource_type = data.get("resource_type", "wellness")

    if not resource_id:
        return jsonify({"error": "Resource ID required."}), 400

    conn = get_db_connection()
    existing = conn.execute('''
        SELECT id FROM favorite_resources
        WHERE user_email = ? AND resource_type = ? AND resource_id = ?
    ''', (patient_email, resource_type, resource_id)).fetchone()

    if existing:
        conn.execute("DELETE FROM favorite_resources WHERE id = ?", (existing["id"],))
        is_fav = False
    else:
        conn.execute('''
            INSERT INTO favorite_resources (user_email, resource_type, resource_id)
            VALUES (?, ?, ?)
        ''', (patient_email, resource_type, resource_id))
        is_fav = True

    conn.commit()
    conn.close()

    return jsonify({"is_favorite": is_fav}), 200



# -------------------------------------------------------------
# Patient Privacy & Data Sovereignty (GDPR / HIPAA)
# -------------------------------------------------------------
@patient_bp.route("/privacy-request", methods=["POST"])
@role_required(["patient"])
def submit_privacy_request():
    """
    Submits a formal data export or account/record deletion request.
    Recorded in the database with audit tracking.
    """
    patient_email = g.current_user["email"]
    data = request.get_json() or {}
    request_type = data.get("request_type", "").strip().lower()
    details = data.get("details", "").strip()

    if request_type not in ["export", "deletion"]:
        return jsonify({"error": "Invalid request_type. Must be 'export' or 'deletion'."}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('''
        INSERT INTO privacy_requests (user_email, request_type, status, details)
        VALUES (?, ?, 'pending', ?)
    ''', (patient_email, request_type, details))
    req_id = cur.lastrowid
    conn.commit()
    conn.close()

    log_audit(patient_email, "PATIENT_PRIVACY_REQUEST", target_type="privacy_requests", target_id=req_id,
              details=f"Submitted privacy request: {request_type}", ip_address=get_client_ip())

    create_notification(
        patient_email,
        "Privacy Request Received",
        f"Your request for data {request_type} (#{req_id}) has been logged and queued for administrative compliance review.",
        "info",
        "/patient/profile"
    )

    return jsonify({
        "message": f"Privacy {request_type} request submitted successfully.",
        "request_id": req_id,
        "status": "pending"
    }), 201

@patient_bp.route("/export-data", methods=["GET"])
@role_required(["patient"])
def export_patient_data():
    """
    Extracts the patient's entire personal health record, reports metadata,
    OCR extractions, ML predictions, and doctor consultations as a secure, structured JSON document.
    """
    patient_email = g.current_user["email"]
    conn = get_db_connection()

    # User & Profile
    user_row = conn.execute("SELECT email, full_name, phone, role, dob, consent_privacy, created_at FROM users WHERE email = ?", (patient_email,)).fetchone()
    profile_row = conn.execute("SELECT * FROM patient_profiles WHERE email = ?", (patient_email,)).fetchone()

    # Medical Reports
    report_rows = conn.execute('''
        SELECT id, original_filename, file_size, extracted_data, verified_data, status, created_at
        FROM medical_reports WHERE patient_email = ? ORDER BY created_at DESC
    ''', (patient_email,)).fetchall()

    reports = []
    for r in report_rows:
        rd = dict(r)
        try:
            rd["extracted_data"] = json.loads(rd["extracted_data"]) if rd["extracted_data"] else {}
            rd["verified_data"] = json.loads(rd["verified_data"]) if rd["verified_data"] else {}
        except Exception:
            pass
        reports.append(rd)

    # Predictions
    pred_rows = conn.execute('''
        SELECT disease_name, risk, score, model_version, features_snapshot, timestamp
        FROM predictions WHERE email = ? ORDER BY timestamp DESC
    ''', (patient_email,)).fetchall()

    predictions = []
    for p in pred_rows:
        pd = dict(p)
        try:
            pd["features_snapshot"] = json.loads(pd["features_snapshot"]) if pd["features_snapshot"] else {}
        except Exception:
            pass
        predictions.append(pd)

    conn.close()

    log_audit(patient_email, "PATIENT_DATA_EXPORT", target_type="patient_records", target_id=patient_email,
              details="Patient downloaded their full clinical health record export", ip_address=get_client_ip(), actor_role="patient")

    export_payload = {
        "export_metadata": {
            "application": "CardioPredict Clinical Health System",
            "export_timestamp_utc": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            "data_subject": patient_email,
            "compliance": "HIPAA & GDPR Patient Data Access Standard"
        },
        "user_account": dict(user_row) if user_row else {},
        "patient_profile": dict(profile_row) if profile_row else {},
        "medical_reports": reports,
        "prediction_history": predictions
    }

    response = jsonify(export_payload)
    response.headers["Content-Disposition"] = f"attachment; filename=CardioPredict_Health_Record_{patient_email.split('@')[0]}.json"
    return response, 200

# -------------------------------------------------------------
# Genuine Model Performance Metrics Endpoint
# -------------------------------------------------------------
@patient_bp.route("/model-metrics", methods=["GET"])
def get_model_metrics():
    """
    Returns genuine model performance evaluation metrics across 5 cardiovascular models.
    Metrics were evaluated on stratified held-out test splits.
    """
    return jsonify({
        "models": MODEL_EVALUATION_METRICS,
        "clinical_disclaimer": CLINICAL_DISCLAIMER,
        "evaluation_standard": "Stratified 80/20 Train/Test Held-out Split without Data Leakage"
    }), 200

# -------------------------------------------------------------
# Patient Doctor Assignment & Suggestion Endpoints
# -------------------------------------------------------------
@patient_bp.route("/doctor-assignment", methods=["GET"])
@role_required(["patient"])
def get_patient_doctor_assignment():
    """
    Returns the latest doctor assignment status for the logged-in patient.
    Includes suggested specialty, clinical rationale, and assigned doctor details if confirmed by admin.
    """
    patient_email = g.current_user["email"]
    conn = get_db_connection()

    assignment = conn.execute('''
        SELECT a.id, a.assignment_id, a.patient_email, a.patient_name, a.report_id,
               a.primary_condition, a.risk_level, a.risk_score, a.suggested_specialty,
               a.suggested_doctor_id, a.clinical_rationale, a.status,
               a.assigned_doctor_id, a.admin_notes, a.reviewed_by, a.reviewed_at,
               a.created_at, a.updated_at,
               sd.display_name as suggested_doctor_name, sd.specialization as suggested_doctor_spec,
               sd.qualifications as suggested_doctor_qual, sd.experience_years as suggested_doctor_exp,
               sd.availability_status as suggested_doctor_avail, sd.is_demo as suggested_doctor_is_demo,
               ad.display_name as assigned_doctor_name, ad.specialization as assigned_doctor_spec,
               ad.qualifications as assigned_doctor_qual, ad.experience_years as assigned_doctor_exp,
               ad.availability_status as assigned_doctor_avail, ad.is_demo as assigned_doctor_is_demo,
               ad.hospital_affiliation as assigned_doctor_hospital
        FROM doctor_assignments a
        LEFT JOIN managed_doctors sd ON a.suggested_doctor_id = sd.id
        LEFT JOIN managed_doctors ad ON a.assigned_doctor_id = ad.id
        WHERE a.patient_email = ?
        ORDER BY a.created_at DESC
        LIMIT 1
    ''', (patient_email,)).fetchone()

    conn.close()

    if not assignment:
        return jsonify({"assignment": None, "message": "No active doctor assignments or suggestions recorded."}), 200

    row_dict = dict(assignment)
    return jsonify({
        "assignment": row_dict,
        "clinical_disclaimer": CLINICAL_DISCLAIMER
    }), 200

# -------------------------------------------------------------
# Real Patient-to-Admin Feedback & Support System
# -------------------------------------------------------------
@patient_bp.route("/feedback", methods=["POST"])
@role_required(["patient"])
def submit_feedback():
    """
    Allows a patient to submit real feedback or support inquiries to the administrator.
    Stores record in database and initializes message thread.
    """
    patient_email = g.current_user["email"]
    data = request.get_json() or {}

    subject = data.get("subject", "").strip()
    message = data.get("message", "").strip()
    category = data.get("category", "General Feedback").strip()
    rating = data.get("rating")

    if not subject:
        return jsonify({"error": "Subject is required."}), 400
    if not message:
        return jsonify({"error": "Message content is required."}), 400

    valid_categories = ["General Feedback", "Report Issue", "Prediction Inquiry", "System Bug", "Doctor Suggestion", "Diet & Nutrition"]
    if category not in valid_categories:
        category = "General Feedback"

    if rating is not None:
        try:
            rating = int(rating)
            if rating < 1 or rating > 5:
                rating = None
        except (ValueError, TypeError):
            rating = None

    conn = get_db_connection()
    cur = conn.cursor()

    # Get patient display name
    user_row = cur.execute("SELECT full_name FROM users WHERE email = ?", (patient_email,)).fetchone()
    patient_name = user_row["full_name"] if user_row and user_row["full_name"] else patient_email

    feedback_id = f"FB-{secrets.token_hex(4).upper()}"

    cur.execute('''
        INSERT INTO patient_feedback
        (feedback_id, patient_email, patient_name, category, subject, message, rating, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Submitted', datetime('now'), datetime('now'))
    ''', (feedback_id, patient_email, patient_name, category, subject, message, rating))

    # Add initial message to thread
    cur.execute('''
        INSERT INTO feedback_messages
        (feedback_id, sender_email, sender_name, sender_role, message, created_at)
        VALUES (?, ?, ?, 'patient', ?, datetime('now'))
    ''', (feedback_id, patient_email, patient_name, message))

    conn.commit()
    conn.close()

    log_audit(patient_email, "PATIENT_FEEDBACK_SUBMITTED", target_type="patient_feedback", target_id=feedback_id,
              details=f"Category: {category}, Subject: {subject}", ip_address=get_client_ip(), actor_role="patient")

    return jsonify({
        "message": "Feedback submitted successfully. The administrator will review your message.",
        "feedback_id": feedback_id,
        "status": "Submitted",
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }), 201

@patient_bp.route("/feedback", methods=["GET"])
@role_required(["patient"])
def get_patient_feedback_list():
    """
    Returns all feedback items submitted by the logged-in patient.
    Enforces authorization: Patients can only view their own feedback.
    """
    patient_email = g.current_user["email"]
    conn = get_db_connection()

    rows = conn.execute('''
        SELECT f.id, f.feedback_id, f.patient_email, f.patient_name, f.category,
               f.subject, f.message, f.rating, f.status, f.admin_response,
               f.responded_by, f.responded_at, f.created_at, f.updated_at,
               (SELECT COUNT(*) FROM feedback_messages m WHERE m.feedback_id = f.feedback_id) as total_messages
        FROM patient_feedback f
        WHERE f.patient_email = ?
        ORDER BY f.created_at DESC
    ''', (patient_email,)).fetchall()

    conn.close()
    return jsonify({"feedback": [dict(r) for r in rows]}), 200

@patient_bp.route("/feedback/<feedback_id>", methods=["GET"])
@role_required(["patient"])
def get_patient_feedback_detail(feedback_id):
    """
    Returns single feedback item and conversation message thread for the patient.
    Strictly IDOR protected: patient can only view their own feedback.
    """
    patient_email = g.current_user["email"]
    conn = get_db_connection()

    feedback = conn.execute('''
        SELECT * FROM patient_feedback
        WHERE feedback_id = ? AND patient_email = ?
    ''', (feedback_id, patient_email)).fetchone()

    if not feedback:
        conn.close()
        return jsonify({"error": "Feedback ticket not found or unauthorized access."}), 404

    messages = conn.execute('''
        SELECT id, feedback_id, sender_email, sender_name, sender_role, message, created_at
        FROM feedback_messages
        WHERE feedback_id = ?
        ORDER BY created_at ASC
    ''', (feedback_id,)).fetchall()

    conn.close()
    return jsonify({
        "feedback": dict(feedback),
        "messages": [dict(m) for m in messages]
    }), 200

@patient_bp.route("/feedback/<feedback_id>/reply", methods=["POST"])
@role_required(["patient"])
def reply_to_feedback(feedback_id):
    """
    Allows a patient to reply to an ongoing feedback thread.
    Updates status to 'In Review' for administrator attention.
    """
    patient_email = g.current_user["email"]
    data = request.get_json() or {}
    message = data.get("message", "").strip()

    if not message:
        return jsonify({"error": "Reply message cannot be empty."}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    feedback = cur.execute('''
        SELECT id, patient_name, status FROM patient_feedback
        WHERE feedback_id = ? AND patient_email = ?
    ''', (feedback_id, patient_email)).fetchone()

    if not feedback:
        conn.close()
        return jsonify({"error": "Feedback ticket not found or unauthorized access."}), 404

    patient_name = feedback["patient_name"] or patient_email

    cur.execute('''
        INSERT INTO feedback_messages
        (feedback_id, sender_email, sender_name, sender_role, message, created_at)
        VALUES (?, ?, ?, 'patient', ?, datetime('now'))
    ''', (feedback_id, patient_email, patient_name, message))

    # Reopen ticket to 'In Review' if it was responded or closed
    new_status = "In Review" if feedback["status"] != "Submitted" else "Submitted"
    cur.execute('''
        UPDATE patient_feedback
        SET status = ?, updated_at = datetime('now')
        WHERE feedback_id = ?
    ''', (new_status, feedback_id))

    conn.commit()
    conn.close()

    log_audit(patient_email, "PATIENT_FEEDBACK_REPLIED", target_type="patient_feedback", target_id=feedback_id,
              details="Patient submitted reply to feedback thread", ip_address=get_client_ip(), actor_role="patient")

    return jsonify({
        "message": "Reply posted successfully.",
        "feedback_id": feedback_id,
        "status": new_status,
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }), 201


