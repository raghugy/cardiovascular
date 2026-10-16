# backend/assistant_service.py
"""
CardioPredict AI Health Assistant Service
Provides safe, evidence-based educational responses for cardiovascular health queries.
Uses verified medical guidelines (AHA, ACC, WHO, ICMR-NIN).
Supports consent-based patient personalization and optional external AI API fallback.
"""
import os
import re
import json
from typing import Dict, Any, Optional

# Verified Biomarker Information
BIOMARKER_KNOWLEDGE = {
    "troponin": {
        "name": "Cardiac Troponin (cTnI / cTnT)",
        "normal": "< 0.04 ng/mL (assay-dependent)",
        "meaning": "Troponin is a cardiac protein released into the bloodstream when heart muscle cells experience stress or injury.",
        "simple_explanation": "Think of troponin as an emergency signal from the heart muscle. In a healthy heart, troponin levels are very low. If the heart muscle is injured, troponin leaks into the blood.",
        "questions_for_doctor": [
            "Are my troponin levels within normal baseline limits?",
            "Do I need follow-up ECG or serial cardiac enzyme monitoring?",
            "Could non-cardiac factors (like kidney strain or strenuous exertion) influence my results?"
        ]
    },
    "ck_mb": {
        "name": "Creatine Kinase-MB (CK-MB)",
        "normal": "< 5.0 ng/mL",
        "meaning": "CK-MB is an enzyme found primarily in heart muscle cells, used alongside troponin to assess myocardial stress.",
        "simple_explanation": "CK-MB rises within hours of heart muscle strain. It helps clinicians understand the timing of cardiac stress.",
        "questions_for_doctor": [
            "How does my CK-MB compare with my troponin levels?",
            "Does my result indicate acute or past cardiac stress?"
        ]
    },
    "bp": {
        "name": "Blood Pressure (Systolic / Diastolic)",
        "normal": "Normal: < 120/80 mmHg; Elevated: 120-129/<80; Stage 1 Hypertension: 130-139/80-89; Stage 2: >= 140/90 mmHg",
        "meaning": "Blood pressure measures the lateral force exerted by circulating blood against arterial walls.",
        "simple_explanation": "The top number (Systolic) is the pressure when your heart beats. The bottom number (Diastolic) is the pressure when your heart rests between beats.",
        "questions_for_doctor": [
            "What is my target resting blood pressure goal?",
            "Should I maintain a home blood pressure log morning and evening?",
            "Would lifestyle modifications (DASH diet, reduced sodium) be sufficient, or is medication indicated?"
        ]
    },
    "cholesterol": {
        "name": "Lipid Profile (Total Cholesterol, LDL, HDL, Triglycerides)",
        "normal": "Total Cholesterol < 200 mg/dL; LDL < 100 mg/dL (optimal); HDL > 40 mg/dL (men) / > 50 mg/dL (women); Triglycerides < 150 mg/dL",
        "meaning": "Lipids are fats circulating in your blood. LDL deposits cholesterol into arterial walls, while HDL carries it away to the liver for excretion.",
        "simple_explanation": "LDL is often called 'bad cholesterol' because it can build up plaques in arteries. HDL is 'good cholesterol' because it helps clear excess fat from your blood vessels.",
        "questions_for_doctor": [
            "What is my calculated 10-year atherosclerotic cardiovascular disease (ASCVD) risk?",
            "Is my LDL level at target for my individual cardiovascular risk category?",
            "Would soluble dietary fiber and plant sterols help improve my lipid profile?"
        ]
    },
    "ef_tte": {
        "name": "Ejection Fraction (EF-TTE)",
        "normal": "50% to 70% (Preserved Ejection Fraction)",
        "meaning": "Ejection fraction measures the percentage of blood pumped out of the left ventricle with each contraction.",
        "simple_explanation": "If your ejection fraction is 60%, it means your heart pumps out 60% of the blood inside its main chamber each time it beats. A normal range is typically 50% to 70%.",
        "questions_for_doctor": [
            "Is my left ventricular systolic function preserved or reduced?",
            "Do I need follow-up echocardiography?",
            "What daily physical activity level is safe for my heart function?"
        ]
    },
    "glucose": {
        "name": "Fasting Blood Glucose / HbA1c",
        "normal": "Fasting: 70-99 mg/dL (Normal); 100-125 mg/dL (Prediabetes); >= 126 mg/dL (Diabetes)",
        "meaning": "Measures the concentration of sugar in your bloodstream after fasting.",
        "simple_explanation": "Elevated blood sugar over time can stiffen blood vessels and accelerate plaque buildup in coronary arteries.",
        "questions_for_doctor": [
            "Does my glucose level warrant an HbA1c screening test?",
            "How does blood sugar management protect my heart vessels?"
        ]
    },
    "potassium": {
        "name": "Serum Potassium (K)",
        "normal": "3.5 to 5.0 mmol/L",
        "meaning": "A vital electrolyte essential for the normal electrical rhythm and contraction of the heart.",
        "simple_explanation": "Potassium helps your heart maintain a steady beat and balances sodium. Both very high and very low potassium require clinical attention.",
        "questions_for_doctor": [
            "Are my electrolytes in balance?",
            "Do my blood pressure medications affect my potassium levels?"
        ]
    }
}

# Verified Food Explanations
FOOD_KNOWLEDGE = {
    "oats": "Steel-cut whole oats contain beta-glucan, a soluble dietary fiber that binds cholesterol and bile acids in the digestive tract, naturally lowering circulating LDL particles without sodium.",
    "moong dal": "Moong dal (yellow split mung beans) is an easily digestible, low-fat plant protein rich in dietary potassium and soluble fiber that supports arterial elasticity and healthy blood pressure.",
    "spinach": "Fresh spinach (palak) is abundant in natural dietary nitrates, potassium, and folate, which stimulate endothelial nitric oxide production to naturally relax and dilate blood vessels.",
    "garlic": "Fresh garlic provides allicin, a bioactive sulfur compound that clinical studies associate with improved arterial flexibility and mild blood pressure moderation.",
    "walnuts": "Raw English walnuts are rich in plant-derived alpha-linolenic acid (ALA) omega-3 and polyphenols that help protect the vascular lining against oxidative stress.",
    "olive oil": "Extra virgin olive oil is rich in oleic acid (monounsaturated fat) and oleocanthal, supporting anti-inflammatory vascular health and healthy HDL levels.",
    "chia": "Chia and ground flaxseeds provide concentrated lignans and soluble mucilage fiber that help moderate glucose absorption and support healthy lipid panels."
}

# General Heart Healthy Advice
LIFESTYLE_TIPS = [
    "DASH Eating Plan: Focus on vegetables, fruits, whole grains, beans, nuts, and low-fat dairy while minimizing sodium (< 1,500 - 2,000 mg/day).",
    "Physical Activity: The AHA recommends at least 150 minutes of moderate aerobic activity (like brisk walking) or 75 minutes of vigorous activity per week, as approved by your clinician.",
    "Stress & Rest: Quality sleep (7-9 hours) and vagal breathing exercises (like Anulom Vilom) support autonomic nervous system balance and help moderate resting blood pressure.",
    "Avoid Tobacco: Eliminating tobacco and secondhand smoke exposure is the single most rapid way to reduce coronary endothelial damage."
]

def generate_assistant_response(user_message: str, patient_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Generates a personalized, safe educational health response.
    Never prescribes medications or diagnoses diseases.
    """
    msg_lower = (user_message or "").lower().strip()

    # 1. Emergency Warning Signs Check
    emergency_keywords = [
        "severe chest pain", "crushing pain", "radiating to arm", "radiating to jaw",
        "cannot breathe", "difficulty breathing", "passed out", "fainting", "coughing blood"
    ]
    if any(k in msg_lower for k in emergency_keywords):
        return {
            "reply": (
                "⚠️ URGENT MEDICAL ADVICE: If you or someone around you is experiencing severe chest pain, "
                "pressure, pain radiating to your left arm, neck, or jaw, or sudden difficulty breathing, "
                "this may be a cardiac emergency. Please call local emergency services immediately (112 in India, "
                "911 in the US) or go to the nearest emergency hospital. Do not wait for an online assessment."
            ),
            "is_emergency": True,
            "category": "emergency",
            "sources": ["American Heart Association Emergency Warning Signs", "WHO Cardiovascular Emergencies"]
        }

    # 2. Extract personalized patient context safely if provided
    context_notes = []
    high_risks = []
    diet_pref = "standard"
    allergies = ""
    chronic_cond = ""

    if patient_context:
        predictions = patient_context.get("predictions") or {}
        for d_name, d_val in predictions.items():
            if isinstance(d_val, dict) and d_val.get("risk") == "High":
                high_risks.append(d_name.replace("_", " ").title())
            elif isinstance(d_val, str) and d_val == "High":
                high_risks.append(d_name.replace("_", " ").title())

        diet_pref = patient_context.get("dietary_preference") or "standard"
        allergies = (patient_context.get("allergies") or "").lower()
        chronic_cond = (patient_context.get("chronic_conditions") or "").lower()

        if high_risks:
            context_notes.append(f"Your recent assessment highlighted elevated risk for: {', '.join(high_risks)}.")
        if "kidney" in chronic_cond or "ckd" in chronic_cond:
            context_notes.append("Note: Your profile indicates renal history; high-potassium salt substitutes should be strictly avoided.")
        if "nut" in allergies:
            context_notes.append("Note: Tree nut allergies on file; tree nuts are excluded from your food guidance.")

    # 3. Topic: Explaining Biomarkers
    for key, info in BIOMARKER_KNOWLEDGE.items():
        if key in msg_lower or info["name"].lower() in msg_lower:
            reply = f"**{info['name']}**\n\n"
            reply += f"• **What it is**: {info['meaning']}\n"
            reply += f"• **Simple explanation**: {info['simple_explanation']}\n"
            reply += f"• **Standard reference range**: {info['normal']}\n\n"
            reply += "**Recommended Questions for Your Healthcare Professional:**\n"
            for q in info["questions_for_doctor"]:
                reply += f"- {q}\n"
            if context_notes:
                reply += f"\n💡 *Personalized context for your profile*: {' '.join(context_notes)}"
            return {
                "reply": reply,
                "category": "biomarker_education",
                "biomarker": info["name"],
                "sources": ["American Heart Association (AHA)", "National Institutes of Health (NIH)"]
            }

    # 4. Topic: Why a food is suggested
    for food_key, rationale in FOOD_KNOWLEDGE.items():
        if food_key in msg_lower:
            reply = f"**Why {food_key.capitalize()} is Recommended for Heart Health:**\n\n"
            reply += f"{rationale}\n\n"
            reply += "This recommendation comes directly from verified clinical nutrition guidelines (such as the AHA Diet and Lifestyle Guidelines and ICMR-NIN Food Composition data)."
            if "nut" in allergies and food_key in ["walnuts", "almonds"]:
                reply += "\n\n⚠️ **Safety Alert**: Since your profile notes a nut allergy, please do not consume nuts. Opt for safe alternatives such as chia seeds or ground flaxseeds."
            return {
                "reply": reply,
                "category": "nutrition_rationale",
                "food": food_key,
                "sources": ["American Heart Association Lifestyle Guidance", "USDA FoodData Central", "ICMR-NIN"]
            }

    # 5. Topic: Explaining Prediction Results
    if any(k in msg_lower for k in ["prediction", "risk score", "result", "my report", "assessment"]):
        reply = "**Understanding Your CardioPredict Assessment:**\n\n"
        reply += "CardioPredict uses deep learning and machine learning models trained on standardized clinical datasets to estimate risk across 5 cardiovascular conditions: Hypertension, CAD, Heart Failure, Heart Attack, and Stroke.\n\n"
        if high_risks:
            reply += f"Based on your latest recorded report, the assessment identified elevated risk markers for **{', '.join(high_risks)}**.\n\n"
            reply += "• **Low Risk**: Clinical measurements are currently within protective ranges.\n"
            reply += "• **Moderate Risk**: Some biomarkers are borderline; lifestyle measures (nutrition, exercise) can significantly mitigate progression.\n"
            reply += "• **High Risk**: Multiple risk factors coincide. We strongly recommend discussing these findings with your cardiologist or physician.\n\n"
        else:
            reply += "• The prediction assesses your submitted biomarker values against biological risk boundaries.\n"
            reply += "• It is an educational tool designed to support early awareness, not a clinical diagnosis.\n\n"
        reply += "**Important Disclaimer**: AI model outputs are probabilistic screening aids. Only a licensed physician can diagnose cardiovascular disease."
        return {
            "reply": reply,
            "category": "prediction_explanation",
            "sources": ["CardioPredict Clinical Architecture", "ACC/AHA Risk Assessment Guidelines"]
        }

    # 6. Topic: Questions to ask doctor
    if any(k in msg_lower for k in ["ask doctor", "questions for doctor", "consultation", "cardiologist questions"]):
        reply = "**Recommended Questions to Ask Your Cardiologist or Physician:**\n\n"
        reply += "1. *'Based on my blood pressure and lipid values, what is my overall cardiovascular risk profile?'*\n"
        reply += "2. *'Are there specific dietary changes (such as the DASH diet or sodium reduction) that would benefit me most?'*\n"
        reply += "3. *'What is a safe target heart rate and exercise intensity for my current fitness level?'*\n"
        reply += "4. *'Should we schedule regular monitoring tests (like lipid panels, HbA1c, or an echocardiogram)?'*\n"
        reply += "5. *'Do my family history or lifestyle factors suggest I need further coronary artery screening?'*\n\n"
        reply += "💡 *Tip: You can download or print your CardioPredict health summary from the My Predictions page to share with your clinician.*"
        return {
            "reply": reply,
            "category": "clinical_questions",
            "sources": ["American Heart Association Patient-Physician Communication Guidelines"]
        }

    # 7. Topic: Heart-healthy eating & diet
    if any(k in msg_lower for k in ["diet", "food", "eat", "nutrition", "dash", "salt", "sodium"]):
        reply = "**Evidence-Based Cardiovascular Nutrition Principles:**\n\n"
        reply += "1. **Prioritize Soluble Fiber**: Whole oats, lentils, moong dal, and beans help capture excess cholesterol.\n"
        reply += "2. **Emphasize Dietary Potassium & Nitrates**: Leafy greens (spinach/palak), beetroot, and fruits help relax arterial walls and lower blood pressure.\n"
        reply += "3. **Limit Sodium**: Target under 1,500 to 2,000 mg of sodium daily. Avoid packaged snacks, canned broths, and salted condiments.\n"
        reply += "4. **Choose Unsaturated Fats**: Extra virgin olive oil, ground flaxseeds, and chia seeds provide protective omega-3 fatty acids.\n\n"
        if diet_pref == "vegetarian":
            reply += "🌱 *Your preference is Vegetarian*: Excellent plant-based heart foods include yellow moong dal, chickpeas (chana), fresh methi, spinach, and walnuts.\n"
        elif diet_pref == "vegan":
            reply += "🌿 *Your preference is Vegan*: Ensure adequate protein from legumes, tofu, and chia seeds without processed mock-meats high in sodium.\n"
        elif diet_pref == "low_sodium":
            reply += "🧂 *Your preference is Strict Low-Sodium*: Flavor meals with fresh lemon juice, garlic, ginger, cumin, and fresh herbs instead of salt.\n"
        reply += "\nVisit your **Food Recommendations** page for genuine food cards with verified nutrient breakdowns."
        return {
            "reply": reply,
            "category": "diet_education",
            "sources": ["DASH Eating Plan (NHLBI)", "American Heart Association Dietary Guidelines"]
        }

    # 8. Topic: Navigation and Website Help
    if any(k in msg_lower for k in ["upload", "how to use", "website", "navigate", "help", "pdf"]):
        reply = "**How to Use CardioPredict:**\n\n"
        reply += "1. **Upload Report**: Go to 'Upload Report' from the navigation. Select your medical PDF report. Our system extracts clinical measurements digitally.\n"
        reply += "2. **Review & Confirm**: Check the extracted values (like Blood Pressure, Cholesterol, Glucose) and make corrections if needed.\n"
        reply += "3. **Run AI Assessment**: Click 'Confirm & Run Assessment'. The 5 trained models evaluate CAD, Heart Failure, Heart Attack, Stroke, and Hypertension.\n"
        reply += "4. **Personalized Food Guidance**: Explore the 'Food Recommendations' tab to view verified, condition-specific foods matched to your results.\n"
        reply += "5. **Health Education**: Access verified therapeutic breathing exercises and yoga sessions in 'Health Education'.\n\n"
        reply += "Need help? You can ask me anytime about specific measurements or terms!"
        return {
            "reply": reply,
            "category": "navigation_help",
            "sources": ["CardioPredict User Guide"]
        }

    # 9. General Cardiovascular Health Fallback
    reply = (
        "Hello! I am your **CardioPredict Health Assistant**.\n\n"
        "I can help you understand your cardiovascular assessment, explain medical lab values "
        "(such as Troponin, Blood Pressure, Cholesterol, or EF-TTE), guide you on heart-healthy nutrition, "
        "and suggest questions for your doctor.\n\n"
        "**Try asking:**\n"
        "• *'What does my Troponin level mean?'*\n"
        "• *'Why is Moong Dal recommended for hypertension?'*\n"
        "• *'What questions should I ask my doctor about my risk score?'*\n"
        "• *'How does the DASH diet lower blood pressure?'*\n\n"
        "*(Note: I provide educational health information from verified sources like the AHA and WHO. I cannot diagnose conditions or prescribe medications.)*"
    )
    return {
        "reply": reply,
        "category": "general_greeting",
        "sources": ["World Health Organization", "American Heart Association"]
    }

def get_assistant_quick_suggestions(patient_context: Optional[Dict[str, Any]] = None) -> list:
    """Returns dynamic starter prompt pills based on patient context."""
    suggestions = [
        "Explain my latest risk score",
        "What does high blood pressure mean?",
        "What questions should I ask my cardiologist?",
        "Why is Moong Dal recommended for my heart?",
        "How do I upload and verify my medical PDF?"
    ]
    if patient_context:
        preds = patient_context.get("predictions") or {}
        if any("High" in str(v) for v in preds.values()):
            suggestions.insert(0, "What should I do about my high-risk result?")
        if patient_context.get("dietary_preference") == "vegetarian":
            suggestions.append("What are top vegetarian heart-healthy foods?")
    return suggestions[:5]
