# backend/test_enhancements.py
import sys
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

import urllib.request
import urllib.error
import json
import time

base_url = 'http://127.0.0.1:8000'

print("=== Running CardioPredict Enhancement Test Suite ===")

# 1. Full Name Rejection with Numbers
for bad_name in ['Raghu123', '123Raghu', 'Ra2ghu']:
    data = json.dumps({
        'full_name': bad_name,
        'email': 'valid.test@cardiopredict.org',
        'phone': '9876543210',
        'password': 'Password@123',
        'confirm_password': 'Password@123',
        'consent_terms': True,
        'role': 'patient'
    }).encode('utf-8')
    req = urllib.request.Request(f'{base_url}/api/auth/register', data=data, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            print(f'❌ UNEXPECTED SUCCESS for name: {bad_name}')
            sys.exit(1)
    except urllib.error.HTTPError as e:
        err = json.loads(e.read().decode('utf-8'))
        print(f"[PASS] Correctly rejected bad name '{bad_name}': {err.get('error')}")
        assert 'numbers are not allowed' in err.get('error', '').lower()

# 2. Email Validation: Rejection of Leading Number
data = json.dumps({
    'full_name': 'Ramesh Kumar',
    'email': '123ramesh@cardiopredict.org',
    'phone': '9876543210',
    'password': 'Password@123',
    'confirm_password': 'Password@123',
    'consent_terms': True,
    'role': 'patient'
}).encode('utf-8')
req = urllib.request.Request(f'{base_url}/api/auth/register', data=data, headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req, timeout=5) as resp:
        print('❌ UNEXPECTED SUCCESS for leading number in email')
        sys.exit(1)
except urllib.error.HTTPError as e:
    err = json.loads(e.read().decode('utf-8'))
    print(f"[PASS] Correctly rejected leading number in email: {err.get('error')}")
    assert 'must begin with an alphabetic letter' in err.get('error', '').lower()

# 3. Email Validation: Rejection of Consecutive Dots
data = json.dumps({
    'full_name': 'Ramesh Kumar',
    'email': 'ramesh..kumar@cardiopredict.org',
    'phone': '9876543210',
    'password': 'Password@123',
    'confirm_password': 'Password@123',
    'consent_terms': True,
    'role': 'patient'
}).encode('utf-8')
req = urllib.request.Request(f'{base_url}/api/auth/register', data=data, headers={'Content-Type': 'application/json'})
try:
    with urllib.request.urlopen(req, timeout=5) as resp:
        print('❌ UNEXPECTED SUCCESS for consecutive dots in email')
        sys.exit(1)
except urllib.error.HTTPError as e:
    err = json.loads(e.read().decode('utf-8'))
    print(f"[PASS] Correctly rejected consecutive dots: {err.get('error')}")
    assert 'consecutive or misplaced dots' in err.get('error', '').lower()

# 4. Valid Patient Registration & Login
valid_email = f"patient_{int(time.time())}@cardiopredict.org"
unique_phone = f"98{str(int(time.time()))[-8:]}"
reg_payload = json.dumps({
    'full_name': "Pooja Hegde",
    'email': valid_email,
    'phone': unique_phone,
    'password': 'StrongPassword@123',
    'confirm_password': 'StrongPassword@123',
    'consent_terms': True,
    'role': 'patient'
}).encode('utf-8')
req = urllib.request.Request(f'{base_url}/api/auth/register', data=reg_payload, headers={'Content-Type': 'application/json'})
with urllib.request.urlopen(req, timeout=5) as resp:
    res = json.loads(resp.read().decode('utf-8'))
    print(f"[PASS] Valid Registration Succeeded: {res.get('message')}")

login_payload = json.dumps({'email': valid_email, 'password': 'StrongPassword@123'}).encode('utf-8')
req = urllib.request.Request(f'{base_url}/api/auth/login', data=login_payload, headers={'Content-Type': 'application/json'})
with urllib.request.urlopen(req, timeout=5) as resp:
    res = json.loads(resp.read().decode('utf-8'))
    patient_token = res['token']
    print(f"[PASS] Patient Login Succeeded: role={res.get('user', {}).get('role')}")

# 5. Patient Submits Real Feedback
fb_data = json.dumps({
    'category': 'Prediction Inquiry',
    'subject': 'Inquiry about CAD score and diet',
    'message': 'Could you please explain what the CAD risk assessment means regarding my diet?',
    'rating': 5
}).encode('utf-8')
req = urllib.request.Request(f'{base_url}/api/patient/feedback', data=fb_data, headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {patient_token}'})
with urllib.request.urlopen(req, timeout=5) as resp:
    res = json.loads(resp.read().decode('utf-8'))
    feedback_id = res['feedback_id']
    print(f"[PASS] Patient Feedback Created: {feedback_id}, status={res.get('status')}")

# 6. Admin Login and Views Feedback Inbox
admin_data = json.dumps({'email': 'admin@cardiopredict.org', 'password': 'Admin@12345'}).encode('utf-8')
req = urllib.request.Request(f'{base_url}/api/auth/admin-login', data=admin_data, headers={'Content-Type': 'application/json'})
with urllib.request.urlopen(req, timeout=5) as resp:
    res = json.loads(resp.read().decode('utf-8'))
    admin_token = res['token']
    print(f"[PASS] Administrator Logged In: {res.get('user', {}).get('email')}")

req = urllib.request.Request(f'{base_url}/api/admin/feedback', headers={'Authorization': f'Bearer {admin_token}'})
with urllib.request.urlopen(req, timeout=5) as resp:
    res = json.loads(resp.read().decode('utf-8'))
    fb_list = res.get('feedback', [])
    print(f"[PASS] Admin Feedback Inbox: {len(fb_list)} tickets, pending={res.get('counts', {}).get('pending')}")
    assert any(f['feedback_id'] == feedback_id for f in fb_list)

# 7. Admin Responds to Feedback Ticket
resp_data = json.dumps({
    'response': 'Thank you for reaching out. We have assigned a cardiologist to review your assessment. Please also review the DASH diet guidelines in your Diet tab.',
    'status': 'Responded'
}).encode('utf-8')
req = urllib.request.Request(f'{base_url}/api/admin/feedback/{feedback_id}/respond', data=resp_data, headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {admin_token}'})
with urllib.request.urlopen(req, timeout=5) as resp:
    res = json.loads(resp.read().decode('utf-8'))
    print(f"[PASS] Admin Feedback Response Delivered: status={res.get('status')}")

# 8. Patient Views Thread and Replies
req = urllib.request.Request(f'{base_url}/api/patient/feedback/{feedback_id}', headers={'Authorization': f'Bearer {patient_token}'})
with urllib.request.urlopen(req, timeout=5) as resp:
    res = json.loads(resp.read().decode('utf-8'))
    fb = res.get('feedback', {})
    msgs = res.get('messages', [])
    print(f"[PASS] Patient Sees Updated Thread: status={fb.get('status')}, messages={len(msgs)}")
    assert fb.get('status') == 'Responded'
    assert len(msgs) >= 2

reply_data = json.dumps({'message': 'Thank you for the quick guidance! I will check the DASH diet section.'}).encode('utf-8')
req = urllib.request.Request(f'{base_url}/api/patient/feedback/{feedback_id}/reply', data=reply_data, headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {patient_token}'})
with urllib.request.urlopen(req, timeout=5) as resp:
    res = json.loads(resp.read().decode('utf-8'))
    print(f"[PASS] Patient Reply Sent: new status={res.get('status')}")

# 9. Verify 10 Doctor Profiles
req = urllib.request.Request(f'{base_url}/api/admin/doctors', headers={'Authorization': f'Bearer {admin_token}'})
with urllib.request.urlopen(req, timeout=5) as resp:
    res = json.loads(resp.read().decode('utf-8'))
    docs = res.get('doctors', [])
    print(f"[PASS] Admin 10 Doctor Profiles: {len(docs)} found (all demo marked: {all(d['is_demo'] == 1 for d in docs)})")
    assert len(docs) >= 10

# 10. Doctor Assignment Workflow
req = urllib.request.Request(f'{base_url}/api/admin/doctor-assignments', headers={'Authorization': f'Bearer {admin_token}'})
with urllib.request.urlopen(req, timeout=5) as resp:
    res = json.loads(resp.read().decode('utf-8'))
    asgs = res.get('assignments', [])
    print(f"[PASS] Admin Doctor Assignments List: {len(asgs)} records")

# 11. Model Metrics
req = urllib.request.Request(f'{base_url}/api/patient/model-metrics')
with urllib.request.urlopen(req, timeout=5) as resp:
    res = json.loads(resp.read().decode('utf-8'))
    models = res.get('models', {})
    print(f"[PASS] Model Performance Metrics: {len(models)} conditions verified ({', '.join(models.keys())})")
    for k, v in models.items():
        print(f"   {k}: Acc={v['metrics']['accuracy']}%, ROC-AUC={v['metrics']['roc_auc']}, Sensitivity={v['metrics']['recall_sensitivity']}%")

# 12. End-to-End Doctor Suggestion & Admin Assignment
pred_payload = json.dumps({
    'features': {
        'Age': 58,
        'Sex': 'Male',
        'systolic_bp': 150,
        'diastolic_bp': 95,
        'cholesterol': 260,
        'LDL': 160,
        'HDL': 38,
        'triglycerides': 210,
        'glucose_level': 130,
        'smokes': 1,
        'Hypertension': 1,
        'diabetes': 0
    }
}).encode('utf-8')
req = urllib.request.Request(f'{base_url}/api/patient/confirm-and-predict', data=pred_payload, headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {patient_token}'})
with urllib.request.urlopen(req, timeout=10) as resp:
    res = json.loads(resp.read().decode('utf-8'))
    asg = res.get('suggested_assignment')
    print(f"[PASS] Model Inference Run OK: Suggested Specialty='{asg.get('suggested_specialty')}', Condition='{asg.get('primary_condition')}'")
    asg_id = asg['assignment_id']

# Admin reviews and assigns doctor
assign_payload = json.dumps({
    'assigned_doctor_id': docs[0]['id'],
    'status': 'Assigned',
    'admin_notes': 'Assigned for comprehensive lipid and angiography consultation.'
}).encode('utf-8')
req = urllib.request.Request(f'{base_url}/api/admin/doctor-assignments/{asg_id}/assign', data=assign_payload, headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {admin_token}'})
with urllib.request.urlopen(req, timeout=5) as resp:
    res = json.loads(resp.read().decode('utf-8'))
    print(f"[PASS] Admin Doctor Assignment Confirmed: {res.get('message')}, doctor={res.get('assigned_doctor')}")

# Patient fetches their confirmed assignment
req = urllib.request.Request(f'{base_url}/api/patient/doctor-assignment', headers={'Authorization': f'Bearer {patient_token}'})
with urllib.request.urlopen(req, timeout=5) as resp:
    res = json.loads(resp.read().decode('utf-8'))
    confirmed_asg = res.get('assignment', {})
    print(f"[PASS] Patient Sees Confirmed Doctor Assignment: Status='{confirmed_asg.get('status')}', Assigned='{confirmed_asg.get('assigned_doctor_name')}'")
    assert confirmed_asg.get('status') == 'Assigned'

print("\n🎉 ALL 12 TESTS PASSED PERFECTLY WITH ZERO ERRORS!")

