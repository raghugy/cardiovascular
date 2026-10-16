# backend/test_backend_suite.py
import unittest
import json
import os
import sys
import tempfile
from app import app
from database import get_db_connection

class CardioPredictBackendTestSuite(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        self.client.testing = True

    def test_01_health_check(self):
        """Test health check route."""
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertEqual(data.get("status"), "healthy")
        self.assertTrue(data.get("models_loaded"))
        self.assertIn("cad", data.get("available_models"))
        self.assertIn("hypertension", data.get("available_models"))
        print("\n✅ Test 01 Passed: API Health & Models loaded.")

    def test_02_registration_validation(self):
        """Test registration validation: name format, email format, 10-digit mobile, strong password, terms consent, and role restrictions."""
        # 1. Invalid email
        res = self.client.post("/api/auth/register", json={
            "full_name": "Test User",
            "email": "not-an-email",
            "phone": "9876543210",
            "password": "Password@123",
            "confirm_password": "Password@123",
            "consent_terms": True,
            "role": "patient"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("valid email", res.get_json()["error"])

        # 2. Invalid phone (< 10 digits)
        res = self.client.post("/api/auth/register", json={
            "full_name": "Test User",
            "email": "valid1@test.com",
            "phone": "98765432",
            "password": "Password@123",
            "confirm_password": "Password@123",
            "consent_terms": True,
            "role": "patient"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("10 numeric digits", res.get_json()["error"])

        # 3. Invalid phone (> 10 digits)
        res = self.client.post("/api/auth/register", json={
            "full_name": "Test User",
            "email": "valid2@test.com",
            "phone": "9876543210123",
            "password": "Password@123",
            "confirm_password": "Password@123",
            "consent_terms": True,
            "role": "patient"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("10 numeric digits", res.get_json()["error"])

        # 4. Invalid name with digits
        res = self.client.post("/api/auth/register", json={
            "full_name": "User123",
            "email": "valid_name@test.com",
            "phone": "9876543210",
            "password": "Password@123",
            "confirm_password": "Password@123",
            "consent_terms": True,
            "role": "patient"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("alphabetic characters", res.get_json()["error"])

        # 5. Missing consent
        res = self.client.post("/api/auth/register", json={
            "full_name": "Valid Name",
            "email": "valid_consent@test.com",
            "phone": "9876543210",
            "password": "Password@123",
            "confirm_password": "Password@123",
            "consent_terms": False,
            "role": "patient"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("Terms of Service", res.get_json()["error"])

        # 6. Password mismatch
        res = self.client.post("/api/auth/register", json={
            "full_name": "Test User",
            "email": "valid3@test.com",
            "phone": "9876543210",
            "password": "Password@123",
            "confirm_password": "Password@999",
            "consent_terms": True,
            "role": "patient"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("Passwords do not match", res.get_json()["error"])

        # 7. Role security: Block Admin from public registration
        res = self.client.post("/api/auth/register", json={
            "full_name": "Hacker Admin",
            "email": "hacker@test.com",
            "phone": "9876543210",
            "password": "Password@123",
            "confirm_password": "Password@123",
            "consent_terms": True,
            "role": "admin"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("Public registration is only available for Patient", res.get_json()["error"])

        # 8. Role security: Block Doctor from public registration (Doctor module removed)
        res_doc = self.client.post("/api/auth/register", json={
            "full_name": "Hacker Doctor",
            "email": "doctor_attempt@test.com",
            "phone": "9876543210",
            "password": "Password@123",
            "confirm_password": "Password@123",
            "consent_terms": True,
            "role": "doctor"
        })
        self.assertEqual(res_doc.status_code, 400)
        self.assertIn("Public registration is only available for Patient", res_doc.get_json()["error"])

        print("✅ Test 02 Passed: Registration validation & strict role restrictions.")

    def test_03_ai_health_assistant(self):
        """Test CardioPredict AI Health Assistant endpoint with verified knowledge and suggestions."""
        patient_login = self.client.post("/api/auth/login", json={
            "email": "patient.elena@cardiopredict.org",
            "password": "Patient@12345"
        })
        self.assertEqual(patient_login.status_code, 200)
        patient_token = patient_login.get_json()["token"]

        # 1. Ask about a clinical biomarker (Troponin)
        chat_res = self.client.post("/api/patient/assistant/chat", json={
            "message": "What does my troponin level mean?",
            "use_personal_context": True
        }, headers={"Authorization": f"Bearer {patient_token}"})
        self.assertEqual(chat_res.status_code, 200)
        chat_data = chat_res.get_json()
        self.assertIn("reply", chat_data)
        self.assertIn("Troponin", chat_data["reply"])
        self.assertIn("sources", chat_data)

        # 2. Ask about a recommended food
        food_res = self.client.post("/api/patient/assistant/chat", json={
            "message": "Why is moong dal recommended for my heart?",
            "use_personal_context": True
        }, headers={"Authorization": f"Bearer {patient_token}"})
        self.assertEqual(food_res.status_code, 200)
        self.assertIn("potassium", food_res.get_json()["reply"].lower())

        # 3. Get starter quick suggestions
        sugg_res = self.client.get("/api/patient/assistant/suggestions", headers={
            "Authorization": f"Bearer {patient_token}"
        })
        self.assertEqual(sugg_res.status_code, 200)
        suggestions = sugg_res.get_json()["suggestions"]
        self.assertGreater(len(suggestions), 0)

        print("✅ Test 03 Passed: AI Health Assistant chat and dynamic suggestions verified.")

    def test_04_auth_and_role_protection(self):
        """Test login, JWT token generation, and server-side role-based route protection."""
        # 1. Admin login
        admin_login = self.client.post("/api/auth/login", json={
            "email": "admin@cardiopredict.org",
            "password": "Admin@12345"
        })
        self.assertEqual(admin_login.status_code, 200)
        admin_token = admin_login.get_json()["token"]
        self.assertEqual(admin_login.get_json()["user"]["role"], "admin")

        # 2. Patient login
        patient_login = self.client.post("/api/auth/login", json={
            "email": "patient.elena@cardiopredict.org",
            "password": "Patient@12345"
        })
        self.assertEqual(patient_login.status_code, 200)
        patient_token = patient_login.get_json()["token"]
        self.assertEqual(patient_login.get_json()["user"]["role"], "patient")

        # 3. Patient attempts to access Admin dashboard: must be 403 Forbidden!
        forbidden_res = self.client.get("/api/admin/dashboard-stats", headers={
            "Authorization": f"Bearer {patient_token}"
        })
        self.assertEqual(forbidden_res.status_code, 403)
        self.assertIn("Access forbidden", forbidden_res.get_json()["error"])

        # 4. Admin accesses Admin dashboard: must be 200 OK!
        admin_res = self.client.get("/api/admin/dashboard-stats", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        self.assertEqual(admin_res.status_code, 200)
        stats = admin_res.get_json()["stats"]
        self.assertIn("total_users", stats)
        self.assertIn("total_patients", stats)
        self.assertIn("total_uploaded_reports", stats)
        self.assertIn("total_predictions", stats)
        print("✅ Test 04 Passed: Role authorization & RBAC verified.")

    def test_05_admin_patient_management_and_audit_export(self):
        """Test Admin managing patient accounts, status toggle, and exporting audit logs."""
        admin_login = self.client.post("/api/auth/login", json={
            "email": "admin@cardiopredict.org",
            "password": "Admin@12345"
        })
        admin_token = admin_login.get_json()["token"]

        # 1. List patients
        patients_res = self.client.get("/api/admin/patients", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        self.assertEqual(patients_res.status_code, 200)
        patients = patients_res.get_json()["patients"]
        self.assertIsInstance(patients, list)

        # 2. Toggle patient status
        patient_email = "patient.elena@cardiopredict.org"
        toggle_res = self.client.patch(f"/api/admin/users/{patient_email}/status", json={
            "status": "active"
        }, headers={"Authorization": f"Bearer {admin_token}"})
        self.assertEqual(toggle_res.status_code, 200)

        # 3. Export audit logs
        export_res = self.client.get("/api/admin/audit-logs/export", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        self.assertEqual(export_res.status_code, 200)
        export_data = export_res.get_json()
        self.assertIn("audit_trail", export_data)
        self.assertIn("export_metadata", export_data)

        print("✅ Test 05 Passed: Admin patient management and audit logs export.")

    def test_06_pdf_upload_ocr_and_prediction_pipeline(self):
        """Test PDF upload, OCR parsing, clinical validation, and prediction on the 5 models."""
        patient_login = self.client.post("/api/auth/login", json={
            "email": "patient.elena@cardiopredict.org",
            "password": "Patient@12345"
        })
        patient_token = patient_login.get_json()["token"]

        # Valid synthetic PDF report
        sample_pdf_content = (
            b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n"
            b"2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n"
            b"3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n"
            b"4 0 obj\n<<\n/Length 320\n>>\nstream\nBT\n/F1 12 Tf\n50 700 Td\n"
            b"(Comprehensive Cardiovascular Evaluation) Tj\n"
            b"0 -25 Td\n(Patient: Elena Rostova, Age: 58, Sex: Male) Tj\n"
            b"0 -20 Td\n(Blood Pressure: 146/92 mmHg, Heart Rate: 84 bpm) Tj\n"
            b"0 -20 Td\n(Total Cholesterol: 242 mg/dL, Triglycerides: 210 mg/dL) Tj\n"
            b"0 -20 Td\n(HDL: 42 mg/dL, LDL: 154 mg/dL, Glucose: 118 mg/dL) Tj\n"
            b"0 -20 Td\n(Troponin I: 0.04 ng/mL, CK-MB: 2.5 ng/mL, EF-TTE: 55 %) Tj\n"
            b"0 -20 Td\n(BMI: 27.4, Smoker: Yes, Chest Pain: Typical Angina) Tj\n"
            b"ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n"
            b"0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n"
            b"0000000204 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n580\n%%EOF"
        )

        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tf:
            tf.write(sample_pdf_content)
            tf_path = tf.name

        try:
            with open(tf_path, "rb") as f:
                res = self.client.post("/api/patient/upload-report", data={
                    "file": (f, "cardio_evaluation_test.pdf")
                }, headers={"Authorization": f"Bearer {patient_token}"}, content_type="multipart/form-data")

            self.assertEqual(res.status_code, 201)
            up_data = res.get_json()
            self.assertIn("report_id", up_data)
            self.assertIn("extracted_data", up_data)
            report_id = up_data["report_id"]

            extracted = up_data["extracted_data"]
            self.assertEqual(extracted.get("Age"), 58.0)
            self.assertEqual(extracted.get("systolic_bp"), 146.0)
            self.assertEqual(extracted.get("diastolic_bp"), 92.0)
            self.assertEqual(extracted.get("cholesterol"), 242.0)

            # Step 2: Confirm features and execute 5-disease model prediction
            pred_res = self.client.post("/api/patient/confirm-and-predict", json={
                "report_id": report_id,
                "features": extracted
            }, headers={"Authorization": f"Bearer {patient_token}"})

            self.assertEqual(pred_res.status_code, 200)
            pred_data = pred_res.get_json()
            predictions = pred_data.get("predictions", {})

            # Verify predictions across 5 trained disease models
            for d in ["cad", "heart_failure", "heart_attack", "stroke", "hypertension"]:
                self.assertIn(d, predictions)
                self.assertIn("risk", predictions[d])
                self.assertIn(predictions[d]["risk"], ["Low", "Moderate", "High"])

        finally:
            if os.path.exists(tf_path):
                os.remove(tf_path)

        print("✅ Test 06 Passed: PDF Upload, OCR Extraction, and AI Prediction on 5 models.")

    def test_07_admin_report_processing(self):
        """Test Admin Report Processing list and monitoring."""
        admin_login = self.client.post("/api/auth/login", json={
            "email": "admin@cardiopredict.org",
            "password": "Admin@12345"
        })
        admin_token = admin_login.get_json()["token"]

        rep_res = self.client.get("/api/admin/reports", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        self.assertEqual(rep_res.status_code, 200)
        rep_data = rep_res.get_json()
        self.assertIn("reports", rep_data)
        self.assertIn("total", rep_data)
        print("✅ Test 07 Passed: Admin report processing monitoring.")

    def test_08_diet_recommendations_and_wellness_resources(self):
        """Test Personalized Diet Engine & Yoga Video Resources."""
        patient_login = self.client.post("/api/auth/login", json={
            "email": "patient.elena@cardiopredict.org",
            "password": "Patient@12345"
        })
        patient_token = patient_login.get_json()["token"]

        # Diet recommendations
        diet_res = self.client.get("/api/patient/diet-recommendations", headers={
            "Authorization": f"Bearer {patient_token}"
        })
        self.assertEqual(diet_res.status_code, 200)
        diet_json = diet_res.get_json()
        self.assertIn("has_prediction", diet_json)
        self.assertIn("status", diet_json)
        self.assertIn("disclaimer", diet_json)

        # Wellness resources
        well_res = self.client.get("/api/patient/wellness-resources", headers={
            "Authorization": f"Bearer {patient_token}"
        })
        self.assertEqual(well_res.status_code, 200)
        well_json = well_res.get_json()
        self.assertGreater(len(well_json["resources"]), 0)
        first_r = well_json["resources"][0]
        self.assertIn("video_url", first_r)
        self.assertIn("safety_contraindications", first_r)

        print("✅ Test 08 Passed: Diet recommendation engine & wellness video resources.")

    def test_09_single_admin_enforcement_and_admin_login(self):
        """Test single administrator account enforcement, dedicated admin-login, and password change."""
        import sqlite3

        # 1. Valid Admin Login via dedicated /api/auth/admin-login
        res = self.client.post("/api/auth/admin-login", json={
            "email": "admin@cardiopredict.org",
            "password": "Admin@12345"
        })
        self.assertEqual(res.status_code, 200)
        admin_data = res.get_json()
        self.assertIn("token", admin_data)
        self.assertEqual(admin_data["user"]["role"], "admin")
        admin_token = admin_data["token"]

        # 2. Patient credentials rejected at /api/auth/admin-login
        patient_res = self.client.post("/api/auth/admin-login", json={
            "email": "patient.elena@cardiopredict.org",
            "password": "Patient@12345"
        })
        self.assertEqual(patient_res.status_code, 401)
        self.assertIn("Invalid administrator credentials", patient_res.get_json()["error"])

        # 3. Invalid admin credentials rejected
        invalid_res = self.client.post("/api/auth/admin-login", json={
            "email": "admin@cardiopredict.org",
            "password": "WrongPassword@999"
        })
        self.assertEqual(invalid_res.status_code, 401)

        # 4. Database Trigger strictly enforces at most ONE administrator account
        conn = get_db_connection()
        cur = conn.cursor()
        second_admin_inserted = False
        caught_exception_str = ""
        try:
            cur.execute("""
                INSERT INTO users (email, username, password, role)
                VALUES ('illegal.admin@cardiopredict.org', 'fake_admin', 'hash123', 'admin')
            """)
            conn.commit()
            second_admin_inserted = True
        except sqlite3.DatabaseError as e:
            second_admin_inserted = False
            caught_exception_str = str(e)
            conn.rollback()
        finally:
            conn.close()

        self.assertFalse(second_admin_inserted)
        self.assertIn("Security Violation: Exactly one authorized administrator account is permitted", caught_exception_str)

        # 5. Public registration cannot create admin accounts
        reg_admin_res = self.client.post("/api/auth/register", json={
            "full_name": "Second Admin",
            "email": "admin2@cardiopredict.org",
            "phone": "9876543299",
            "password": "AdminPass@12345",
            "confirm_password": "AdminPass@12345",
            "consent_terms": True,
            "role": "admin"
        })
        self.assertEqual(reg_admin_res.status_code, 400)
        self.assertIn("Patient accounts", reg_admin_res.get_json()["error"])

        # 6. Admin can securely change password
        pwd_res = self.client.post("/api/admin/change-password", json={
            "current_password": "Admin@12345",
            "new_password": "NewAdminPass@999",
            "confirm_new_password": "NewAdminPass@999"
        }, headers={"Authorization": f"Bearer {admin_token}"})
        self.assertEqual(pwd_res.status_code, 200)

        # Revert back to original password for testing consistency
        revert_res = self.client.post("/api/admin/change-password", json={
            "current_password": "NewAdminPass@999",
            "new_password": "Admin@12345",
            "confirm_new_password": "Admin@12345"
        }, headers={"Authorization": f"Bearer {admin_token}"})
        self.assertEqual(revert_res.status_code, 200)

        print("✅ Test 09 Passed: Single Administrator DB triggers, /admin-login, and change-password verified.")

if __name__ == "__main__":
    unittest.main()
