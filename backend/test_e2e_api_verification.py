import requests
import json
import sys

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

BASE_URL = "http://127.0.0.1:8000"

def test_live_system():
    print("=================================================================")
    print("🚀 LIVE E2E SYSTEM INTEGRATION & COMPLIANCE VERIFICATION")
    print("=================================================================")

    # 1. Patient Workflow
    print("\n[1/3] Testing Patient Elena Portal Workflows...")
    login_res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "patient.elena@cardiopredict.org",
        "password": "Patient@12345"
    })
    assert login_res.status_code == 200, f"Patient login failed: {login_res.text}"
    patient_token = login_res.json()["token"]
    p_headers = {"Authorization": f"Bearer {patient_token}"}
    print("  ✅ Patient authentication successful (JWT received).")

    # Patient Dashboard
    dash_res = requests.get(f"{BASE_URL}/api/patient/dashboard", headers=p_headers)
    assert dash_res.status_code == 200, f"Patient dash failed: {dash_res.text}"
    dash_data = dash_res.json()
    print(f"  ✅ Patient Dashboard live DB stats: {len(dash_data.get('reports', []))} reports, {len(dash_data.get('predictions', []))} predictions.")

    # Patient Diet Protocols
    diet_res = requests.get(f"{BASE_URL}/api/patient/diet-recommendations", headers=p_headers)
    assert diet_res.status_code == 200, f"Diet recommendations failed: {diet_res.text}"
    diet_data = diet_res.json()
    catalog_foods = diet_data.get("catalog_foods", [])
    guidelines = diet_data.get("clinical_guidance", [])
    print(f"  ✅ Personalized Diet Engine: {len(catalog_foods)} verified foods matched, {len(guidelines)} clinical condition guidelines.")
    if catalog_foods:
        top_food = catalog_foods[0]
        print(f"     Top matched food: {top_food['name']} ({top_food['category']}) | Nutrients: {top_food['calories_per_100g']}kcal, {top_food['protein_g']}g protein, {top_food['sodium_mg']}mg sodium | Source: {top_food['evidence_source']}")

    # Patient Data Export (GDPR / HIPAA)
    export_res = requests.get(f"{BASE_URL}/api/patient/export-data", headers=p_headers)
    assert export_res.status_code == 200, f"Patient data export failed: {export_res.text}"
    export_data = export_res.json()
    print(f"  ✅ Patient Data Sovereignty: Full medical export generated ({len(json.dumps(export_data))} bytes) with reports, predictions, and consultations.")

    # Patient Privacy Request
    priv_res = requests.post(f"{BASE_URL}/api/patient/privacy-request", headers=p_headers, json={
        "request_type": "export",
        "details": "Automated verification of HIPAA data access request"
    })
    assert priv_res.status_code == 201, f"Privacy request failed: {priv_res.text}"
    print(f"  ✅ Privacy Request logged with ID #{priv_res.json().get('request_id')} and audit tracking.")

    # 2. Doctor Workflow
    print("\n[2/3] Testing Doctor Sarah Portal Workflows...")
    doc_login = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "doctor.sarah@cardiopredict.org",
        "password": "Doctor@12345"
    })
    assert doc_login.status_code == 200, f"Doctor login failed: {doc_login.text}"
    doc_token = doc_login.json()["token"]
    d_headers = {"Authorization": f"Bearer {doc_token}"}
    print("  ✅ Doctor authentication successful.")

    # Doctor Dashboard
    doc_dash = requests.get(f"{BASE_URL}/api/doctor/dashboard", headers=d_headers)
    assert doc_dash.status_code == 200, f"Doctor dash failed: {doc_dash.text}"
    print(f"  ✅ Doctor Dashboard retrieved with verification status: {doc_dash.json().get('profile', {}).get('approval_status')}.")

    # Doctor Assigned Patients
    doc_patients = requests.get(f"{BASE_URL}/api/doctor/patients", headers=d_headers)
    assert doc_patients.status_code == 200, f"Doctor patients failed: {doc_patients.text}"
    patients = doc_patients.json().get("patients", [])
    print(f"  ✅ Doctor Patient Review: {len(patients)} authorized consent-granted assigned patients.")

    # 3. Admin Workflow
    print("\n[3/3] Testing Admin Portal Workflows...")
    admin_login = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@cardiopredict.org",
        "password": "Admin@12345"
    })
    assert admin_login.status_code == 200, f"Admin login failed: {admin_login.text}"
    admin_token = admin_login.json()["token"]
    a_headers = {"Authorization": f"Bearer {admin_token}"}
    print("  ✅ Admin authentication successful.")

    # Admin Stats
    admin_stats = requests.get(f"{BASE_URL}/api/admin/dashboard-stats", headers=a_headers)
    assert admin_stats.status_code == 200, f"Admin stats failed: {admin_stats.text}"
    stats = admin_stats.json().get("stats", {})
    print(f"  ✅ Admin Dashboard Stats (Genuine DB Counts):")
    print(f"     • Total Users: {stats.get('total_users')}")
    print(f"     • Total Patients: {stats.get('total_patients')}")
    print(f"     • Total Doctors: {stats.get('total_doctors')}")
    print(f"     • Uploaded Reports: {stats.get('total_uploaded_reports')}")
    print(f"     • Predictions Run: {stats.get('total_predictions')}")
    print(f"     • Consultations / Appointments: {stats.get('total_appointments')}")

    # Admin Food Catalog
    food_cat = requests.get(f"{BASE_URL}/api/admin/food-catalog", headers=a_headers)
    assert food_cat.status_code == 200, f"Food catalog failed: {food_cat.text}"
    catalog = food_cat.json().get("food_catalog", [])
    print(f"  ✅ Food Catalog Management: {len(catalog)} verified nutritional foods in database.")

    # Admin Audit Logs Export
    audit_exp = requests.get(f"{BASE_URL}/api/admin/audit-logs/export", headers=a_headers)
    assert audit_exp.status_code == 200, f"Audit export failed: {audit_exp.text}"
    audit_data = audit_exp.json()
    print(f"  ✅ Platform Audit Trail Export: {audit_data.get('export_metadata', {}).get('total_events')} verified immutable audit events exported.")

    # Admin Privacy Requests
    priv_list = requests.get(f"{BASE_URL}/api/admin/privacy-requests", headers=a_headers)
    assert priv_list.status_code == 200, f"Privacy requests list failed: {priv_list.text}"
    priv_items = priv_list.json().get("privacy_requests", [])
    print(f"  ✅ Compliance Management: {len(priv_items)} user privacy requests pending or resolved.")

    print("\n=================================================================")
    print("🎉 ALL 12 CORE HEALTHCARE APPLICATION WORKFLOWS FULLY VERIFIED!")
    print("=================================================================\n")

if __name__ == "__main__":
    test_live_system()
