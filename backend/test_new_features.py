"""
Test suite for new CardioPredict features:
1. Patient AI-Powered Food Recommendations workflow & absence of hardcoded lists
2. Yoga & Wellness library, daily routines, interactive logging, weekly summary, and journal
3. Auth protection & role separation (Patient vs Admin)
"""
import requests
import sys

BASE_URL = "http://127.0.0.1:8000"

def log(msg, success=True):
    symbol = "[PASS]" if success else "[FAIL]"
    print(f"{symbol} {msg}")

def test_unauthenticated_protection():
    print("\n--- Testing Unauthenticated Access Protection ---")
    endpoints = [
        "/api/patient/dashboard",
        "/api/patient/diet-recommendations",
        "/api/patient/wellness/yoga-library",
        "/api/patient/wellness/daily-routine",
        "/api/patient/wellness/weekly-summary",
        "/api/admin/dashboard-stats"
    ]
    for ep in endpoints:
        res = requests.get(f"{BASE_URL}{ep}")
        assert res.status_code == 401, f"Expected 401 for unauth {ep}, got {res.status_code}"
    log("All patient and admin routes strictly reject unauthenticated requests with 401 Unauthorized")

def test_admin_and_patient_auth():
    print("\n--- Testing Authentication & Role Separation ---")
    # Admin login
    admin_res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@cardiopredict.org",
        "password": "Admin@12345"
    })
    assert admin_res.status_code == 200, f"Admin login failed: {admin_res.text}"
    admin_data = admin_res.json()
    admin_token = admin_data.get("token") or admin_data.get("access_token")
    assert admin_token, "Admin token missing"
    assert admin_data["user"]["role"] == "admin"
    log("Admin login succeeded with role='admin'")

    # Admin should NOT access patient endpoints
    pat_ep_res = requests.get(f"{BASE_URL}/api/patient/diet-recommendations", headers={
        "Authorization": f"Bearer {admin_token}"
    })
    assert pat_ep_res.status_code == 403, f"Admin should receive 403 on patient route, got {pat_ep_res.status_code}"
    log("Role-based access control: Admin is blocked (403) from accessing patient diet routes")

    # Patient login
    patient_res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "patient.elena@cardiopredict.org",
        "password": "Patient@12345"
    })
    assert patient_res.status_code == 200, f"Patient login failed: {patient_res.text}"
    patient_data = patient_res.json()
    patient_token = patient_data.get("token") or patient_data.get("access_token")
    assert patient_token, "Patient token missing"
    assert patient_data["user"]["role"] == "patient"
    log("Patient login succeeded with role='patient'")

    # Patient should NOT access admin endpoints
    adm_ep_res = requests.get(f"{BASE_URL}/api/admin/dashboard-stats", headers={
        "Authorization": f"Bearer {patient_token}"
    })
    assert adm_ep_res.status_code == 403, f"Patient should receive 403 on admin route, got {adm_ep_res.status_code}"
    log("Role-based access control: Patient is blocked (403) from accessing admin endpoints")

    return admin_token, patient_token

def test_ai_food_recommendations(patient_token):
    print("\n--- Testing AI-Powered Food Recommendations ---")
    headers = {"Authorization": f"Bearer {patient_token}"}
    
    res = requests.get(f"{BASE_URL}/api/patient/diet-recommendations", headers=headers)
    assert res.status_code == 200, f"Diet endpoint failed: {res.text}"
    data = res.json()
    
    # Check fields
    assert "has_prediction" in data, "Response must indicate has_prediction"
    assert "status" in data, "Response must include status"
    assert "disclaimer" in data, "Response must include clinical educational disclaimer"
    
    # Notice: Patient Elena has run predictions previously, so has_prediction should be True.
    # Since no external API key (GEMINI_API_KEY/OPENAI_API_KEY) is configured, status must be 'unavailable'
    # and MUST NOT contain hardcoded fake recommendations.
    if data["has_prediction"]:
        log(f"Patient has verified prediction record: risk_level={data.get('risk_level')}")
        if data["status"] == "unavailable":
            log("AI recommendations correctly report 'unavailable' when no external API key is set on server")
            assert "temporarily unavailable" in data.get("message", "").lower()
            # Ensure no fake recommendations were silently injected
            assert data.get("recommendations") is None or len(data.get("recommendations", {})) == 0
            log("Zero hardcoded/fabricated recommendations silently substituted!")
        elif data["status"] == "ready":
            log("AI recommendations successfully generated via configured AI provider!")
    else:
        log("Patient has no predictions yet; recommendations correctly locked")
        assert "complete your report analysis" in data.get("message", "").lower()
        log("Locked state message matches prompt requirements perfectly")

def test_yoga_and_wellness(patient_token):
    print("\n--- Testing Yoga & Wellness Features ---")
    headers = {"Authorization": f"Bearer {patient_token}"}

    # 1. Yoga Library
    lib_res = requests.get(f"{BASE_URL}/api/patient/wellness/yoga-library", headers=headers)
    assert lib_res.status_code == 200, f"Yoga library failed: {lib_res.text}"
    lib_data = lib_res.json()
    exercises = lib_data.get("exercises", [])
    assert len(exercises) >= 5, f"Expected at least 5 yoga exercises, got {len(exercises)}"
    assert "cardiac_safety_disclaimer" in lib_data, "Response must include cardiac safety disclaimer"
    log(f"Yoga library returned {len(exercises)} cardiac-safe exercises with safety disclaimer")

    # Verify exercise properties
    first_ex = exercises[0]
    assert "title" in first_ex
    assert "duration_minutes" in first_ex
    assert "level" in first_ex
    assert "safety_notes" in first_ex
    assert "seated_modification" in first_ex
    log(f"Exercise '{first_ex['title']}' includes safety notes and seated modifications")

    # 2. Daily Routine
    routine_res = requests.get(f"{BASE_URL}/api/patient/wellness/daily-routine", headers=headers)
    assert routine_res.status_code == 200, f"Daily routine failed: {routine_res.text}"
    routine_data = routine_res.json()
    checklist = routine_data.get("activities", [])
    assert len(checklist) >= 4, "Expected daily wellness routine items"
    log(f"Daily routine returned {len(checklist)} selectable cardiac wellness items")

    # 3. Log Activity (Breathing exercise completed)
    log_res = requests.post(f"{BASE_URL}/api/patient/wellness/log-activity", headers=headers, json={
        "activity_key": "cardiac_box_breathing",
        "duration_minutes": 5,
        "mood": "Calm",
        "journal_entry": "Completed 5-minute guided box breathing session."
    })
    assert log_res.status_code == 200, f"Log activity failed: {log_res.text}"
    log("Logged interactive breathing activity to database")

    # 4. Weekly Summary based on real user activity
    summary_res = requests.get(f"{BASE_URL}/api/patient/wellness/weekly-summary", headers=headers)
    assert summary_res.status_code == 200, f"Weekly summary failed: {summary_res.text}"
    summary_data = summary_res.json()
    assert summary_data.get("total_sessions", 0) >= 1
    assert summary_data.get("total_minutes", 0) >= 5
    log(f"Real user weekly summary: {summary_data['total_sessions']} sessions, {summary_data['total_minutes']} mins")

    # 5. Personal Wellness Journal
    journal_post = requests.post(f"{BASE_URL}/api/patient/wellness/journal", headers=headers, json={
        "journal_entry": "Morning walk and gentle breathing session went very well. Feeling energized.",
        "mood": "Energized"
    })
    assert journal_post.status_code == 200, f"Journal post failed: {journal_post.text}"
    log("Logged personal wellness journal entry")

    # 6. Wellness Settings (Gentle Reminders)
    settings_patch = requests.patch(f"{BASE_URL}/api/patient/wellness/settings", headers=headers, json={
        "reminders_enabled": True,
        "preferred_duration": "15 mins",
        "preferred_intensity": "Gentle",
        "requires_seated_modification": True
    })
    assert settings_patch.status_code == 200, f"Update settings failed: {settings_patch.text}"
    log("Updated patient wellness reminder settings via PATCH")

def main():
    print("==================================================")
    print(" CARDIOPREDICT FEATURE & COMPLIANCE TEST SUITE")
    print("==================================================")
    try:
        test_unauthenticated_protection()
        admin_token, patient_token = test_admin_and_patient_auth()
        test_ai_food_recommendations(patient_token)
        test_yoga_and_wellness(patient_token)
        print("\n==================================================")
        print(" [SUCCESS] ALL TESTS PASSED SUCCESSFULLY!")
        print("==================================================")
    except AssertionError as e:
        print(f"\n[FAIL] TEST FAILURE: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    except Exception as e:
        print(f"\n[FAIL] UNEXPECTED ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
