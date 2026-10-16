import requests
import json
import time
import sys
import io

if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000"

def run_e2e_journey():
    print("=================================================================")
    print("🏥 CardioPredict Full End-to-End Workflow Verification")
    print("=================================================================")

    # 1. Login as patient
    print("\n[Step 1] Logging in as patient.elena@cardiopredict.org...")
    login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "patient.elena@cardiopredict.org",
        "password": "Patient@12345"
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token = login_res.json()["token"]
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    print("✅ Login successful! Token acquired.")

    # 2. Check Dashboard
    print("\n[Step 2] Fetching Patient Dashboard (/api/patient/dashboard)...")
    dash_res = requests.get(f"{BASE_URL}/api/patient/dashboard", headers=headers)
    assert dash_res.status_code == 200, f"Dashboard failed: {dash_res.text}"
    dash_data = dash_res.json()
    print(f"✅ Dashboard loaded successfully for {dash_data['user']['full_name']}!")
    print(f"   Current Workflow Status: {dash_data.get('workflow_status')}")

    # 3. Create/Confirm Report & Biomarkers
    print("\n[Step 3] Initializing Report & Confirming Biomarkers...")
    manual_res = requests.post(f"{BASE_URL}/api/patient/manual-report", headers=headers, json={
        "report_title": "Annual Comprehensive Cardiovascular Screen"
    })
    assert manual_res.status_code in [200, 201], f"Manual report failed: {manual_res.text}"
    report_id = manual_res.json()["report_id"]
    print(f"✅ Report created with ID: {report_id}")

    # Biomarkers
    biomarkers = {
        "Age": 58,
        "Sex": "Male",
        "systolic_bp": 142,
        "diastolic_bp": 92,
        "cholesterol": 235,
        "LDL": 145,
        "HDL": 42,
        "triglycerides": 180,
        "glucose_level": 110,
        "BMI": 28.4,
        "heart_rate": 78,
        "Troponin": 0.01,
        "CK-MB": 2.2,
        "smokes": 0,
        "diabetes": 0
    }

    # 4. Confirm & Run 5 ML Models
    print("\n[Step 4] Executing 5 ML Risk Models (/api/patient/confirm-and-predict)...")
    pred_res = requests.post(f"{BASE_URL}/api/patient/confirm-and-predict", headers=headers, json={
        "report_id": report_id,
        "features": biomarkers
    })
    assert pred_res.status_code == 200, f"Prediction failed: {pred_res.text}"
    preds = pred_res.json()["predictions"]
    print("✅ All 5 Deep Learning Models evaluated successfully:")
    for cond, info in preds.items():
        print(f"   - {cond.upper()}: {info['risk']} Risk ({info['score']:.1f}%)")

    # 5. AI Clinical Analysis
    print("\n[Step 5] Triggering AI Clinical Analysis (/api/patient/analyze-prediction-ai)...")
    ai_analysis_res = requests.post(f"{BASE_URL}/api/patient/analyze-prediction-ai", headers=headers)
    assert ai_analysis_res.status_code in [200, 201], f"AI Analysis failed: {ai_analysis_res.text}"
    ai_analysis = ai_analysis_res.json()
    assert ai_analysis.get("status") == "success", f"AI Analysis status not success: {ai_analysis}"
    analysis = ai_analysis["analysis"]
    print(f"✅ AI Clinical Analysis successfully generated using {ai_analysis.get('ai_model')}!")
    print(f"   - Executive Summary: {analysis['executive_summary'][:120]}...")
    print(f"   - Primary Concern: {analysis.get('primary_flagged_concern')} (Tier: {analysis.get('risk_tier')})")
    print(f"   - Doctor Questions Formulated: {len(analysis.get('suggested_questions_for_doctor', []))} questions")

    # 6. Verify Cached Analysis Retrieval
    print("\n[Step 6] Verifying Cached AI Analysis Endpoint (/api/patient/prediction-analysis)...")
    cached_analysis_res = requests.get(f"{BASE_URL}/api/patient/prediction-analysis", headers=headers)
    assert cached_analysis_res.status_code == 200
    assert cached_analysis_res.json().get("status") == "success"
    print("✅ Cached AI analysis verified.")

    # 7. Generate Personalized Diet Plan
    print("\n[Step 7] Generating Personalized Diet Plan (/api/patient/generate-ai-diet)...")
    diet_res = requests.post(f"{BASE_URL}/api/patient/generate-ai-diet", headers=headers, json={
        "preferences": {
            "dietary_preference": "mediterranean",
            "allergies": "Shellfish, Peanuts"
        }
    })
    assert diet_res.status_code in [200, 201], f"Diet generation failed: {diet_res.text}"
    diet_data = diet_res.json()
    assert diet_data.get("status") == "success", f"Diet status not success: {diet_data}"
    recs = diet_data.get("recommendations", {})
    print(f"✅ Personalized Diet Plan generated via {diet_data.get('ai_model')}!")
    print(f"   - Dietary Pattern: {recs.get('evidence_dietary_pattern')}")
    meals = recs.get("daily_meal_structure", {})
    print(f"   - Breakfast Choice: {meals.get('breakfast', {}).get('primary_choice')}")
    print(f"   - Lunch Choice: {meals.get('lunch', {}).get('primary_choice')}")
    print(f"   - Dinner Choice: {meals.get('dinner', {}).get('primary_choice')}")
    hyd = recs.get('hydration_guidance')
    hyd_text = hyd if isinstance(hyd, str) else (hyd.get('safe_guideline') if isinstance(hyd, dict) else str(hyd))
    print(f"   - Hydration Protocol: {hyd_text}")

    # 8. Check Dashboard workflow status advancement
    print("\n[Step 8] Checking updated Patient Dashboard...")
    dash_updated = requests.get(f"{BASE_URL}/api/patient/dashboard", headers=headers).json()
    wf_updated = dash_updated.get("workflow_status", {})
    print(f"✅ Final Dashboard Workflow: {wf_updated}")
    assert wf_updated.get("has_report") == True
    assert wf_updated.get("has_predictions") == True
    assert wf_updated.get("has_ai_analysis") == True
    assert wf_updated.get("has_diet_plan") == True
    assert wf_updated.get("current_step") == 5

    print("\n=================================================================")
    print("🎉 ALL 8 WORKFLOW STAGES VERIFIED LIVE & FULLY OPERATIONAL!")
    print("=================================================================")

if __name__ == "__main__":
    run_e2e_journey()
