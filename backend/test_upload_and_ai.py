# backend/test_upload_and_ai.py
import os
import sys
import io
import json
import unittest
from io import BytesIO
from app import app
from database import get_db_connection
import fitz  # PyMuPDF
from PIL import Image, ImageDraw

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

class TestUploadAndAIRecommendations(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = app.test_client()

        # Login as patient
        res = cls.client.post("/api/auth/login", json={
            "email": "patient.elena@cardiopredict.org",
            "password": "Patient@12345"
        })
        cls.patient_token = res.get_json()["token"]
        cls.headers = {"Authorization": f"Bearer {cls.patient_token}"}

    def test_01_upload_valid_text_pdf(self):
        """Test uploading a valid text-based medical report PDF."""
        # Locate sample PDF in frontend public directory
        sample_path = os.path.abspath(os.path.join(
            os.path.dirname(__file__), "..", "frontend", "public", "sample_reports", "sample_patient_report_elevated_risk.pdf"
        ))
        self.assertTrue(os.path.exists(sample_path), f"Sample report not found at {sample_path}")

        with open(sample_path, "rb") as f:
            pdf_bytes = f.read()

        data = {
            "file": (BytesIO(pdf_bytes), "sample_patient_report_elevated_risk.pdf"),
            "report_title": "Elevated Risk Clinical Test Panel"
        }

        res = self.client.post(
            "/api/patient/upload-report",
            headers=self.headers,
            data=data,
            content_type="multipart/form-data"
        )
        self.assertEqual(res.status_code, 201, f"Expected 201, got {res.status_code}: {res.get_data(as_text=True)}")
        resp_json = res.get_json()
        self.assertIn("report_id", resp_json)
        self.assertEqual(resp_json["filename"], "sample_patient_report_elevated_risk.pdf")
        self.assertIn("extracted_data", resp_json)
        extracted = resp_json["extracted_data"]
        # Verify extracted biomarkers
        self.assertTrue(len(extracted) > 0, "Expected non-empty extracted data")
        self.assertIn("systolic_bp", extracted)
        self.assertIn("cholesterol", extracted)
        print(f"✅ test_01_upload_valid_text_pdf passed. Extracted {len(extracted)} biomarkers.")

    def test_02_upload_scanned_pdf_with_rapidocr(self):
        """Test uploading a scanned (image-only) PDF and extracting text with RapidOCR."""
        # Create an in-memory image containing medical text (simulating a scanner scan)
        img = Image.new("RGB", (800, 600), color="white")
        draw = ImageDraw.Draw(img)
        draw.text((50, 50), "CARDIOVASCULAR DIAGNOSTIC LAB REPORT", fill="black")
        draw.text((50, 100), "Patient Age: 58 years", fill="black")
        draw.text((50, 130), "Gender: Male", fill="black")
        draw.text((50, 160), "Blood Pressure: 145/92 mmHg", fill="black")
        draw.text((50, 190), "Total Cholesterol: 240 mg/dL", fill="black")
        draw.text((50, 220), "Fasting Glucose: 115 mg/dL", fill="black")
        draw.text((50, 250), "Resting Heart Rate: 78 bpm", fill="black")

        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format="PNG")
        img_bytes = img_byte_arr.getvalue()

        # Build a single-page PDF containing ONLY this rendered image (no digital text streams)
        doc = fitz.open()
        page = doc.new_page(width=800, height=600)
        page.insert_image(page.rect, stream=img_bytes)
        scanned_pdf_bytes = doc.write()
        doc.close()

        data = {
            "file": (BytesIO(scanned_pdf_bytes), "scanned_lab_scan_test.pdf"),
            "report_title": "Scanned Image Laboratory Report"
        }

        res = self.client.post(
            "/api/patient/upload-report",
            headers=self.headers,
            data=data,
            content_type="multipart/form-data"
        )
        self.assertEqual(res.status_code, 201, f"Expected 201, got {res.status_code}: {res.get_data(as_text=True)}")
        resp_json = res.get_json()
        self.assertEqual(resp_json["extraction_method"], "ocr")
        extracted = resp_json["extracted_data"]
        self.assertTrue(len(extracted) > 0, "RapidOCR should have parsed scanned biomarkers")
        print(f"✅ test_02_upload_scanned_pdf_with_rapidocr passed. Method: {resp_json['extraction_method']}, Biomarkers: {list(extracted.keys())}")

    def test_03_invalid_and_corrupted_pdf_handling(self):
        """Test rejection of empty files, corrupted headers, and non-PDFs with meaningful errors."""
        # 1. Empty PDF (<100 bytes)
        empty_data = {"file": (BytesIO(b""), "empty.pdf")}
        res = self.client.post("/api/patient/upload-report", headers=self.headers, data=empty_data, content_type="multipart/form-data")
        self.assertEqual(res.status_code, 400)
        self.assertIn("empty or corrupted", res.get_json()["error"])

        # 2. Corrupted file (renamed text file without %PDF- magic bytes, >= 100 bytes)
        fake_pdf_data = {"file": (BytesIO(b"Hello this is not a valid pdf file at all! " * 4), "fake.pdf")}
        res = self.client.post("/api/patient/upload-report", headers=self.headers, data=fake_pdf_data, content_type="multipart/form-data")
        self.assertEqual(res.status_code, 400)
        self.assertIn("Invalid PDF format", res.get_json()["error"])

        # 3. Non-PDF extension
        txt_data = {"file": (BytesIO(b"%PDF-1.4 but with txt extension"), "report.txt")}
        res = self.client.post("/api/patient/upload-report", headers=self.headers, data=txt_data, content_type="multipart/form-data")
        self.assertEqual(res.status_code, 400)
        self.assertIn("Invalid file extension", res.get_json()["error"])

        # 4. Oversized PDF (>10MB)
        big_content = b"%PDF-1.4 " + (b"0" * (10 * 1024 * 1024 + 100))
        big_data = {"file": (BytesIO(big_content), "large.pdf")}
        res = self.client.post("/api/patient/upload-report", headers=self.headers, data=big_data, content_type="multipart/form-data")
        self.assertIn(res.status_code, [400, 413])
        self.assertIn("exceeds 10 MB limit", res.get_json()["error"])

        print("✅ test_03_invalid_and_corrupted_pdf_handling passed.")

    def test_04_ai_service_status_and_retry(self):
        """Test GET /api/patient/ai-service-status reports real provider connection state."""
        res = self.client.get("/api/patient/ai-service-status", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("configured", data)
        self.assertIn("status", data)
        self.assertIn("message", data)
        # Without keys in default environment, should be unconfigured
        if not os.environ.get("GEMINI_API_KEY") and not os.environ.get("OPENAI_API_KEY"):
            self.assertEqual(data["status"], "unconfigured")
            self.assertIn("instructions", data)
            self.assertFalse(data["configured"])
        print(f"✅ test_04_ai_service_status_and_retry passed. Live status: {data['status']}")

    def test_05_diet_locked_before_prediction(self):
        """Test recommendations remain locked for a new patient with no predictions."""
        # Create a fresh patient
        fresh_email = "new.patient.test@cardiopredict.org"
        conn = get_db_connection()
        conn.execute("DELETE FROM predictions WHERE email = ?", (fresh_email,))
        conn.execute("DELETE FROM medical_reports WHERE patient_email = ?", (fresh_email,))
        conn.commit()
        conn.close()

        # Register or login fresh patient
        self.client.post("/api/auth/register", json={
            "full_name": "Test Fresh Patient",
            "email": fresh_email,
            "phone": "9876543219",
            "password": "ValidPassword@123",
            "confirm_password": "ValidPassword@123",
            "consent_terms": True,
            "role": "patient"
        })
        login_res = self.client.post("/api/auth/login", json={
            "email": fresh_email,
            "password": "ValidPassword@123"
        })
        fresh_token = login_res.get_json()["token"]
        fresh_headers = {"Authorization": f"Bearer {fresh_token}"}

        # Diet endpoint should return locked status
        res = self.client.get("/api/patient/diet-recommendations", headers=fresh_headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertFalse(data["has_prediction"])
        self.assertEqual(data["status"], "locked")
        self.assertIn("Complete your report analysis", data["message"])
        print("✅ test_05_diet_locked_before_prediction passed. Service is locked before prediction.")

    def test_06_unlocked_diet_with_no_hardcoded_fallback(self):
        """Test that after prediction, recommendations unlock but never use fake hardcoded food lists."""
        # Run prediction for Elena
        res = self.client.post("/api/patient/confirm-and-predict", headers=self.headers, json={
            "features": {
                "Age": 55, "Sex": "Female", "cholesterol": 230, "systolic_bp": 140, "diastolic_bp": 90,
                "glucose_level": 110, "heart_rate": 75, "BMI": 27.5, "smokes": 0, "Hypertension": 1
            }
        })
        self.assertEqual(res.status_code, 200)

        # Clear any cached AI recommendations for test isolation
        conn = get_db_connection()
        conn.execute("DELETE FROM ai_food_recommendations WHERE patient_email = ?", ("patient.elena@cardiopredict.org",))
        conn.commit()
        conn.close()

        # Check diet recommendations
        res = self.client.get("/api/patient/diet-recommendations", headers=self.headers)
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertTrue(data["has_prediction"])

        if not os.environ.get("GEMINI_API_KEY") and not os.environ.get("OPENAI_API_KEY"):
            # Must return honest "unavailable" status without fake food recommendations
            self.assertEqual(data["status"], "unavailable")
            self.assertFalse(data["ai_configured"])
            self.assertIn("AI-powered food recommendations are temporarily unavailable", data["message"])
            self.assertNotIn("recommended_foods", data)
            self.assertIn("governance_notice", data)
            print("✅ test_06_unlocked_diet_with_no_hardcoded_fallback passed. No fake recommendations substituted.")

if __name__ == "__main__":
    unittest.main()
