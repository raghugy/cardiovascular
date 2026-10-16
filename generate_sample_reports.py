# generate_sample_reports.py
import os
import sys
import re
import json
import requests
import pymupdf

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

REQUIRED_ATTRIBUTES = [
  "Age","heart_disease","Married","BMI","Hypertension",
  "glucose_level","Sex","smoking_status",
  "systolic_bp","BP_Medications","diastolic_bp","sex",
  "diabetes","heart_rate","cigsPerDay","cholesterol","smokes",
  "oldpeak","max_hr","resting_bp","fasting_bs",
  "Chest_pain_type","Resting_ecg","Fasting_bs","St_slope",
  "Troponin","CK_MB","blood_sugar",
  "typical_angina","Region","RWMA","K","EF-TTE","hypertension",
  "FH","Tinversion","HDL","ESR","Lymph","HB","WBC","Weight",
  "CR","triglycerides","FBS","Na","LDL","PLT","BUN","Neut","Length"
]

def create_clinical_report(output_path, patient_profile):
    """Generate a clean, professional medical lab report PDF containing all required attributes."""
    doc = pymupdf.open()
    page = doc.new_page(width=612, height=792)  # Standard Letter size

    # Colors
    c_primary = (0.08, 0.35, 0.58)      # Deep Medical Blue
    c_secondary = (0.2, 0.2, 0.2)       # Dark Slate
    c_line = (0.78, 0.85, 0.92)         # Soft border blue
    c_accent_bg = (0.94, 0.96, 0.98)    # Light card background
    c_text = (0.1, 0.1, 0.1)

    # Header Background Banner
    page.draw_rect(pymupdf.Rect(36, 36, 576, 95), color=c_primary, fill=c_primary)
    page.insert_text((50, 62), "CARDIOPREDICT DIAGNOSTIC LABORATORIES", fontsize=15, fontname="helv", color=(1, 1, 1))
    page.insert_text((50, 78), "Cardiovascular Health Evaluation & Comprehensive Clinical Biomarker Panel", fontsize=9, fontname="helv", color=(0.85, 0.92, 1))
    page.insert_text((430, 62), f"Report ID: {patient_profile['report_id']}", fontsize=8.5, fontname="helv", color=(1, 1, 1))
    page.insert_text((430, 76), f"Date: {patient_profile['date']}", fontsize=8.5, fontname="helv", color=(0.85, 0.92, 1))
    page.insert_text((430, 88), "Status: Verified", fontsize=8.5, fontname="helv", color=(0.5, 1, 0.6))

    # Patient Information Card
    page.draw_rect(pymupdf.Rect(36, 105, 576, 158), color=c_line, fill=c_accent_bg)
    page.insert_text((48, 122), f"Patient Name: {patient_profile['name']}", fontsize=10, fontname="helv", color=c_secondary)
    page.insert_text((230, 122), f"MRN / Patient ID: {patient_profile['patient_id']}", fontsize=9.5, fontname="helv", color=c_secondary)
    page.insert_text((420, 122), f"Referring Physician: Dr. Sarah Vance, MD", fontsize=8.5, fontname="helv", color=c_secondary)

    # Core demographics line (includes key required attributes)
    demo_str = (
        f"Age: {patient_profile['Age']}    "
        f"Sex: {patient_profile['Sex']}    "
        f"sex: {patient_profile['sex']}    "
        f"Married: {patient_profile['Married']}    "
        f"Weight: {patient_profile['Weight']}    "
        f"Length: {patient_profile['Length']}    "
        f"BMI: {patient_profile['BMI']}"
    )
    page.insert_text((48, 142), demo_str, fontsize=9, fontname="helv", color=c_text)

    # Section 1: Vital Signs & Cardiovascular Hemodynamics
    y = 175
    page.draw_rect(pymupdf.Rect(36, y, 576, y + 18), color=c_primary, fill=c_primary)
    page.insert_text((44, y + 13), "1. VITAL SIGNS & HEMODYNAMIC MEASUREMENTS", fontsize=9.5, fontname="helv", color=(1, 1, 1))

    y += 26
    vitals_line1 = (
        f"systolic_bp: {patient_profile['systolic_bp']} mmHg    "
        f"diastolic_bp: {patient_profile['diastolic_bp']} mmHg    "
        f"resting_bp: {patient_profile['resting_bp']} mmHg    "
        f"heart_rate: {patient_profile['heart_rate']} bpm"
    )
    page.insert_text((48, y), vitals_line1, fontsize=9, fontname="helv", color=c_text)

    y += 16
    vitals_line2 = (
        f"max_hr: {patient_profile['max_hr']} bpm    "
        f"BP_Medications: {patient_profile['BP_Medications']}    "
        f"smoking_status: {patient_profile['smoking_status']}    "
        f"smokes: {patient_profile['smokes']}    "
        f"cigsPerDay: {patient_profile['cigsPerDay']}"
    )
    page.insert_text((48, y), vitals_line2, fontsize=9, fontname="helv", color=c_text)

    # Section 2: Clinical History & Risk Factors
    y += 24
    page.draw_rect(pymupdf.Rect(36, y, 576, y + 18), color=c_primary, fill=c_primary)
    page.insert_text((44, y + 13), "2. CLINICAL HISTORY & CARDIOVASCULAR RISK FACTORS", fontsize=9.5, fontname="helv", color=(1, 1, 1))

    y += 26
    history_line = (
        f"Hypertension: {patient_profile['Hypertension']}    "
        f"hypertension: {patient_profile['hypertension']}    "
        f"heart_disease: {patient_profile['heart_disease']}    "
        f"diabetes: {patient_profile['diabetes']}    "
        f"FH: {patient_profile['FH']}"
    )
    page.insert_text((48, y), history_line, fontsize=9, fontname="helv", color=c_text)

    # Section 3: Lipid Profile & Glycemic Metrics
    y += 24
    page.draw_rect(pymupdf.Rect(36, y, 576, y + 18), color=c_primary, fill=c_primary)
    page.insert_text((44, y + 13), "3. LIPID PROFILE & GLYCEMIC METRICS", fontsize=9.5, fontname="helv", color=(1, 1, 1))

    y += 26
    lipid_line1 = (
        f"cholesterol: {patient_profile['cholesterol']} mg/dL    "
        f"HDL: {patient_profile['HDL']} mg/dL    "
        f"LDL: {patient_profile['LDL']} mg/dL    "
        f"triglycerides: {patient_profile['triglycerides']} mg/dL"
    )
    page.insert_text((48, y), lipid_line1, fontsize=9, fontname="helv", color=c_text)

    y += 16
    lipid_line2 = (
        f"glucose_level: {patient_profile['glucose_level']} mg/dL    "
        f"blood_sugar: {patient_profile['blood_sugar']} mg/dL    "
        f"fasting_bs: {patient_profile['fasting_bs']}    "
        f"Fasting_bs: {patient_profile['Fasting_bs']}    "
        f"FBS: {patient_profile['FBS']}"
    )
    page.insert_text((48, y), lipid_line2, fontsize=9, fontname="helv", color=c_text)

    # Section 4: Cardiac Biomarkers, ECG & Echocardiography
    y += 24
    page.draw_rect(pymupdf.Rect(36, y, 576, y + 18), color=c_primary, fill=c_primary)
    page.insert_text((44, y + 13), "4. CARDIAC BIOMARKERS, ECG & ECHOCARDIOGRAPHY", fontsize=9.5, fontname="helv", color=(1, 1, 1))

    y += 26
    cardio_line1 = (
        f"Troponin: {patient_profile['Troponin']} ng/mL    "
        f"CK_MB: {patient_profile['CK_MB']} U/L    "
        f"oldpeak: {patient_profile['oldpeak']} mm    "
        f"Chest_pain_type: {patient_profile['Chest_pain_type']}"
    )
    page.insert_text((48, y), cardio_line1, fontsize=9, fontname="helv", color=c_text)

    y += 16
    cardio_line2 = (
        f"Resting_ecg: {patient_profile['Resting_ecg']}    "
        f"St_slope: {patient_profile['St_slope']}    "
        f"typical_angina: {patient_profile['typical_angina']}    "
        f"Tinversion: {patient_profile['Tinversion']}"
    )
    page.insert_text((48, y), cardio_line2, fontsize=9, fontname="helv", color=c_text)

    y += 16
    cardio_line3 = (
        f"EF-TTE: {patient_profile['EF-TTE']} %    "
        f"Region: {patient_profile['Region']}    "
        f"RWMA: {patient_profile['RWMA']}"
    )
    page.insert_text((48, y), cardio_line3, fontsize=9, fontname="helv", color=c_text)

    # Section 5: Hematology & Renal/Electrolyte Panel
    y += 24
    page.draw_rect(pymupdf.Rect(36, y, 576, y + 18), color=c_primary, fill=c_primary)
    page.insert_text((44, y + 13), "5. COMPLETE BLOOD COUNT (CBC) & RENAL/ELECTROLYTE PANEL", fontsize=9.5, fontname="helv", color=(1, 1, 1))

    y += 26
    lab_line1 = (
        f"HB: {patient_profile['HB']} g/dL    "
        f"WBC: {patient_profile['WBC']} /uL    "
        f"PLT: {patient_profile['PLT']} /uL    "
        f"ESR: {patient_profile['ESR']} mm/hr    "
        f"Lymph: {patient_profile['Lymph']} %    "
        f"Neut: {patient_profile['Neut']} %"
    )
    page.insert_text((48, y), lab_line1, fontsize=9, fontname="helv", color=c_text)

    y += 16
    lab_line2 = (
        f"CR: {patient_profile['CR']} mg/dL    "
        f"BUN: {patient_profile['BUN']} mg/dL    "
        f"Na: {patient_profile['Na']} mEq/L    "
        f"K: {patient_profile['K']} mEq/L"
    )
    page.insert_text((48, y), lab_line2, fontsize=9, fontname="helv", color=c_text)

    # Summary Diagnostic Box
    y += 26
    page.draw_rect(pymupdf.Rect(36, y, 576, y + 80), color=c_line, fill=c_accent_bg)
    page.insert_text((48, y + 16), "CLINICAL EVALUATION SUMMARY & AI SCREENING NOTICE", fontsize=9.5, fontname="helv", color=c_primary)
    page.insert_text((48, y + 32), "This diagnostic document is generated for comprehensive cardiovascular disease assessment.", fontsize=8.5, fontname="helv", color=c_secondary)
    page.insert_text((48, y + 46), f"Patient presentation: {patient_profile['notes']}", fontsize=8.5, fontname="helv", color=c_secondary)
    page.insert_text((48, y + 60), "All parameters extracted are ingested by CardioPredict AI multi-model pipeline for differential risk screening.", fontsize=8, fontname="helv", color=(0.4, 0.4, 0.4))

    # Footer
    page.draw_line((36, 750), (576, 750), color=c_line, width=1)
    page.insert_text((48, 765), "CardioPredict Medical Informatics System • Confidential Diagnostic Report • ISO 15189 Certified", fontsize=7.5, fontname="helv", color=(0.5, 0.5, 0.5))
    page.insert_text((490, 765), "Page 1 of 1", fontsize=7.5, fontname="helv", color=(0.5, 0.5, 0.5))

    doc.save(output_path)
    doc.close()
    print(f"✅ Generated report: {output_path}")

def verify_and_test_report(pdf_path):
    """Simulate frontend PDF extraction and test backend prediction."""
    doc = pymupdf.open(pdf_path)
    text_content = ""
    for page in doc:
        text_content += page.get_text() + " "
    doc.close()

    # Replicate frontend regex parser
    extracted = {}
    for feature in REQUIRED_ATTRIBUTES:
        regex = re.compile(rf"(?:^|\s){feature}\s*[:\-]\s*([A-Za-z0-9\.]+)", re.IGNORECASE)
        match = regex.search(text_content)
        if match:
            val = match.group(1)
            try:
                val = float(val)
            except ValueError:
                pass
            extracted[feature] = val

    print(f"\nExtracted attributes for {os.path.basename(pdf_path)}:")
    for k, v in sorted(extracted.items()):
        print(f"  {k}: {v}")

    missing = [a for a in REQUIRED_ATTRIBUTES if a not in extracted or extracted[a] == ""]
    print(f"Extraction test for: {os.path.basename(pdf_path)}")
    print(f"  Total required: {len(REQUIRED_ATTRIBUTES)}")
    print(f"  Successfully extracted: {len(extracted)}")
    print(f"  Missing attributes: {len(missing)}")
    if missing:
        print(f"  ❌ Missing list: {missing}")
    else:
        print("  ✅ All attributes extracted with 100% accuracy!")

    # Test with backend
    try:
        res = requests.post("http://127.0.0.1:8000/predict_all", json={
            "email": "sample_patient@cardiopredict.org",
            "data": extracted
        }, timeout=10)
        res_json = res.json()
        print("\n🔮 [CardioPredict AI Predictions]:")
        print(json.dumps(res_json, indent=2))
        return extracted, res_json
    except Exception as e:
        print(f"  ⚠️ Backend request failed: {e}")
        return extracted, None

if __name__ == "__main__":
    # Patient 1: Moderate/Elevated Risk Sample Patient
    patient1 = {
        "report_id": "CP-2026-9842",
        "date": "2026-09-18",
        "name": "Marcus Vance",
        "patient_id": "MRN-84920",
        "Age": 58,
        "Sex": "Male",
        "sex": "Male",
        "Married": "Yes",
        "Weight": 84,
        "Length": 175,
        "BMI": 27.4,
        "systolic_bp": 146,
        "diastolic_bp": 92,
        "resting_bp": 145,
        "heart_rate": 84,
        "max_hr": 148,
        "BP_Medications": 1,
        "smoking_status": "smokes",
        "smokes": 1,
        "cigsPerDay": 12,
        "Hypertension": 1,
        "hypertension": 1,
        "heart_disease": 0,
        "diabetes": 0,
        "FH": 1,
        "cholesterol": 242,
        "HDL": 42,
        "LDL": 154,
        "triglycerides": 210,
        "glucose_level": 118,
        "blood_sugar": 118,
        "fasting_bs": 1,
        "Fasting_bs": 1,
        "FBS": 118,
        "Troponin": 0.04,
        "CK_MB": 3.8,
        "oldpeak": 1.4,
        "Chest_pain_type": "NAP",
        "Resting_ecg": "Normal",
        "St_slope": "Flat",
        "typical_angina": 0,
        "Tinversion": 0,
        "EF-TTE": 55,
        "Region": 0,
        "RWMA": 0,
        "HB": 14.8,
        "WBC": 7600,
        "PLT": 238000,
        "ESR": 16,
        "Lymph": 28,
        "Neut": 62,
        "CR": 1.1,
        "BUN": 19,
        "Na": 139,
        "K": 4.2,
        "notes": "Elevated systolic/diastolic blood pressure, borderline hyperlipidemia, mild exertional fatigue."
    }

    # Patient 2: Healthy / Low Risk Sample Patient
    patient2 = {
        "report_id": "CP-2026-1045",
        "date": "2026-09-18",
        "name": "Elena Rostova",
        "patient_id": "MRN-31289",
        "Age": 36,
        "Sex": "Female",
        "sex": "Female",
        "Married": "Yes",
        "Weight": 58,
        "Length": 166,
        "BMI": 21.0,
        "systolic_bp": 115,
        "diastolic_bp": 74,
        "resting_bp": 115,
        "heart_rate": 68,
        "max_hr": 172,
        "BP_Medications": 0,
        "smoking_status": "never",
        "smokes": 0,
        "cigsPerDay": 0,
        "Hypertension": 0,
        "hypertension": 0,
        "heart_disease": 0,
        "diabetes": 0,
        "FH": 0,
        "cholesterol": 175,
        "HDL": 62,
        "LDL": 88,
        "triglycerides": 98,
        "glucose_level": 88,
        "blood_sugar": 88,
        "fasting_bs": 0,
        "Fasting_bs": 0,
        "FBS": 88,
        "Troponin": 0.01,
        "CK_MB": 1.2,
        "oldpeak": 0.0,
        "Chest_pain_type": "ATA",
        "Resting_ecg": "Normal",
        "St_slope": "Up",
        "typical_angina": 0,
        "Tinversion": 0,
        "EF-TTE": 65,
        "Region": 0,
        "RWMA": 0,
        "HB": 13.5,
        "WBC": 5800,
        "PLT": 260000,
        "ESR": 8,
        "Lymph": 34,
        "Neut": 56,
        "CR": 0.8,
        "BUN": 13,
        "Na": 141,
        "K": 4.1,
        "notes": "Routine annual cardiology checkup. Normal vital signs, optimal lipid profile and cardiac biomarkers."
    }

    # Output directories
    dirs = [
        "c:/Users/raghu/Downloads/Cardiovascular-Health-Prediction-main/Cardiovascular-Health-Prediction-main/sample_reports",
        "c:/Users/raghu/Downloads/Cardiovascular-Health-Prediction-main/Cardiovascular-Health-Prediction-main/frontend/public/sample_reports"
    ]
    for d in dirs:
        os.makedirs(d, exist_ok=True)

    # Generate files
    pdf1_name = "sample_patient_report_elevated_risk.pdf"
    pdf2_name = "sample_patient_report_healthy.pdf"

    for d in dirs:
        create_clinical_report(os.path.join(d, pdf1_name), patient1)
        create_clinical_report(os.path.join(d, pdf2_name), patient2)

    # Verify extraction & prediction
    print("\n" + "="*50)
    verify_and_test_report(os.path.join(dirs[0], pdf1_name))
    print("\n" + "="*50)
    verify_and_test_report(os.path.join(dirs[0], pdf2_name))
