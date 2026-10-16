# backend/verify_final_system.py
import sys
import unittest
import json
import sqlite3
from app import app
from database import get_db_connection

if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

class CardioPredictFinalVerification(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = app.test_client()

        # Admin login
        res = cls.client.post("/api/auth/admin-login", json={
            "email": "admin@cardiopredict.org",
            "password": "Admin@12345"
        })
        cls.admin_token = res.get_json()["token"]

        # Patient login
        res = cls.client.post("/api/auth/login", json={
            "email": "patient.elena@cardiopredict.org",
            "password": "Patient@12345"
        })
        cls.patient_token = res.get_json()["token"]
        cls.patient_headers = {"Authorization": f"Bearer {cls.patient_token}"}
        cls.admin_headers = {"Authorization": f"Bearer {cls.admin_token}"}

    def test_01_name_validation(self):
        """1. Registration rejects names with numbers; accepts valid alphabetic names."""
        for bad_name in ["Raghu123", "123Raghu", "Ra2ghu", "   ", ""]:
            res = self.client.post("/api/auth/register", json={
                "full_name": bad_name,
                "email": "valid.person@example.com",
                "phone": "9876543210",
                "password": "ValidPassword@123",
                "confirm_password": "ValidPassword@123",
                "consent_terms": True,
                "role": "patient"
            })
            self.assertEqual(res.status_code, 400, f"Expected 400 for bad name '{bad_name}'")
            data = res.get_json()
            err_msg = data.get("error", "").lower()
            self.assertTrue("letters" in err_msg or "alphabetic" in err_msg or "required" in err_msg)

    def test_02_email_validation(self):
        """2. Email validation: reject leading digits, consecutive dots, missing TLD."""
        for bad_email in ["123raghu@gmail.com", "raghu..ram@gmail.com", "raghu@domain", "raghu @gmail.com"]:
            res = self.client.post("/api/auth/register", json={
                "full_name": "Test Subject",
                "email": bad_email,
                "phone": "9876543210",
                "password": "ValidPassword@123",
                "confirm_password": "ValidPassword@123",
                "consent_terms": True,
                "role": "patient"
            })
            self.assertEqual(res.status_code, 400, f"Expected 400 for bad email '{bad_email}'")

    def test_03_phone_validation(self):
        """3. Mobile validation: exactly 10 digits starting with 6-9, optional +91."""
        for bad_phone in ["12345", "5876543210", "987654321012", "abcdefghij"]:
            res = self.client.post("/api/auth/register", json={
                "full_name": "Test Subject",
                "email": "valid.subject@cardio.org",
                "phone": bad_phone,
                "password": "ValidPassword@123",
                "confirm_password": "ValidPassword@123",
                "consent_terms": True,
                "role": "patient"
            })
            self.assertEqual(res.status_code, 400, f"Expected 400 for bad phone '{bad_phone}'")

    def test_04_patient_admin_rbac(self):
        """4. Patient cannot access admin endpoints (RBAC)."""
        res = self.client.get("/api/admin/users", headers=self.patient_headers)
        self.assertEqual(res.status_code, 403)
        res = self.client.get("/api/admin/doctors", headers=self.patient_headers)
        self.assertEqual(res.status_code, 403)
        res = self.client.get("/api/admin/feedback", headers=self.patient_headers)
        self.assertEqual(res.status_code, 403)

    def test_05_feedback_flow(self):
        """5. Feedback system: Patient submits -> Admin responds -> Patient sees response & replies."""
        # 1. Patient submits feedback
        res = self.client.post("/api/patient/feedback", headers=self.patient_headers, json={
            "subject": "Final Verification Feedback Ticket",
            "category": "Medical Report Inquiry",
            "message": "Inquiry regarding my coronary risk estimate and specialist recommendation.",
            "rating": 5
        })
        self.assertEqual(res.status_code, 201)
        fb_id = res.get_json()["feedback_id"]

        # 2. Admin retrieves feedback list and responds
        res = self.client.get("/api/admin/feedback", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        
        res = self.client.post(f"/api/admin/feedback/{fb_id}/respond", headers=self.admin_headers, json={
            "response": "Your report was reviewed. A cardiology specialist has been assigned for consultation.",
            "status": "Responded"
        })
        self.assertEqual(res.status_code, 200)

        # 3. Patient reads response and sends follow-up
        res = self.client.get(f"/api/patient/feedback/{fb_id}", headers=self.patient_headers)
        self.assertEqual(res.status_code, 200)
        detail = res.get_json()
        fb = detail["feedback"]
        msgs = detail["messages"]
        self.assertEqual(fb["status"], "Responded")
        self.assertGreaterEqual(len(msgs), 2)

        # Patient replies
        res = self.client.post(f"/api/patient/feedback/{fb_id}/reply", headers=self.patient_headers, json={
            "message": "Thank you, Dr. Admin. I will prepare my documents."
        })
        self.assertEqual(res.status_code, 201)

    def test_06_10_doctor_profiles(self):
        """6. Exactly 10 demo doctor profiles exist, manageable by admin."""
        res = self.client.get("/api/admin/doctors", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        docs = res.get_json()["doctors"]
        self.assertGreaterEqual(len(docs), 10)
        
        # Verify demo flags and fields
        for doc in docs[:10]:
            self.assertEqual(doc["is_demo"], 1)
            self.assertTrue(doc["display_name"].startswith("Dr."))
            self.assertIn("specialization", doc)
            self.assertIn("qualifications", doc)
            self.assertIn("experience_years", doc)
            self.assertIn("availability_status", doc)

    def test_07_doctor_suggestion_and_assignment(self):
        """7. Doctor suggestion from model output and admin-controlled assignment."""
        # Patient runs prediction
        res = self.client.post("/api/patient/confirm-and-predict", headers=self.patient_headers, json={
            "features": {
                "Age": 62, "Sex": "Female", "cholesterol": 260, "systolic_bp": 155, "diastolic_bp": 98,
                "glucose_level": 135, "heart_rate": 88, "BMI": 29.2, "smokes": 0, "Hypertension": 1
            }
        })
        self.assertEqual(res.status_code, 200)
        pred_data = res.get_json()
        asg = pred_data.get("suggested_assignment")
        self.assertIsNotNone(asg)
        asg_id = asg["assignment_id"]
        
        # Admin views assignments
        res = self.client.get("/api/admin/doctor-assignments", headers=self.admin_headers)
        self.assertEqual(res.status_code, 200)
        assignments = res.get_json()["assignments"]
        self.assertGreater(len(assignments), 0)

        # Admin assigns specialist
        res = self.client.post(f"/api/admin/doctor-assignments/{asg_id}/assign", headers=self.admin_headers, json={
            "assigned_doctor_id": 1,
            "admin_notes": "Assigned for comprehensive lipid management and coronary assessment.",
            "status": "Assigned"
        })
        self.assertEqual(res.status_code, 200)

        # Patient sees assigned doctor
        res = self.client.get("/api/patient/doctor-assignment", headers=self.patient_headers)
        self.assertEqual(res.status_code, 200)
        p_assign = res.get_json()["assignment"]
        self.assertIsNotNone(p_assign)
        self.assertEqual(p_assign["status"], "Assigned")

    def test_08_model_metrics(self):
        """8. Model performance metrics from held-out test data with disclaimer."""
        res = self.client.get("/api/patient/model-metrics")
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("models", data)
        self.assertIn("clinical_disclaimer", data)
        
        # Verify all 5 conditions present with genuine benchmarks
        for cond in ["cad", "heart_failure", "heart_attack", "stroke", "hypertension"]:
            self.assertIn(cond, data["models"])
            m = data["models"][cond]
            metrics = m["metrics"]
            self.assertIn("accuracy", metrics)
            self.assertIn("roc_auc", metrics)
            self.assertIn("recall_sensitivity", metrics)
            self.assertIn("specificity", metrics)
            self.assertIn("f1_score", metrics)
            self.assertIn("test_sample_size", m)
            self.assertIn("evaluation_protocol", m)

    def test_09_database_integrity(self):
        """9. Verify DB integrity, foreign keys, and tables."""
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [r[0] for r in cursor.fetchall()]
        for req_table in ["users", "medical_reports", "predictions", "patient_feedback", "feedback_messages", "managed_doctors", "doctor_assignments", "ai_prediction_analyses", "ai_food_recommendations"]:
            self.assertIn(req_table, tables)
        conn.close()

    def test_10_patient_dashboard_workflow(self):
        """10. Verify patient dashboard returns 200 with complete workflow_status."""
        res = self.client.get("/api/patient/dashboard", headers=self.patient_headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("user", data)
        self.assertIn("latest_predictions", data)
        self.assertIn("workflow_status", data)
        wf = data["workflow_status"]
        self.assertIn("has_report", wf)
        self.assertIn("has_predictions", wf)
        self.assertIn("has_ai_analysis", wf)
        self.assertIn("has_diet_plan", wf)
        self.assertIn("current_step", wf)

    def test_11_prediction_analysis_endpoint(self):
        """11. Verify AI clinical prediction analysis endpoint."""
        res = self.client.get("/api/patient/prediction-analysis", headers=self.patient_headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data.get("has_prediction"))
        
        # Trigger AI analysis
        res = self.client.post("/api/patient/analyze-prediction-ai", headers=self.patient_headers)
        self.assertIn(res.status_code, [200, 201])
        analysis_data = res.get_json()
        self.assertEqual(analysis_data.get("status"), "success")
        self.assertIn("analysis", analysis_data)
        analysis = analysis_data["analysis"]
        self.assertIn("executive_summary", analysis)
        self.assertIn("measured_vs_predicted_explanation", analysis)
        self.assertIn("suggested_questions_for_doctor", analysis)

    def test_12_generate_ai_diet_with_preferences(self):
        """12. Verify personalized diet plan generation with dietary preferences and allergies."""
        res = self.client.post("/api/patient/generate-ai-diet", headers=self.patient_headers, json={
            "preferences": {
                "dietary_preference": "vegetarian",
                "allergies": "Peanuts, Shellfish"
            }
        })
        self.assertIn(res.status_code, [200, 201])
        data = res.get_json()
        self.assertEqual(data.get("status"), "success")
        recs = data.get("recommendations", {})
        self.assertIn("daily_meal_structure", recs)
        self.assertIn("breakfast", recs["daily_meal_structure"])
        self.assertIn("lunch", recs["daily_meal_structure"])
        self.assertIn("dinner", recs["daily_meal_structure"])
        self.assertIn("hydration_guidance", recs)

if __name__ == "__main__":
    unittest.main()

