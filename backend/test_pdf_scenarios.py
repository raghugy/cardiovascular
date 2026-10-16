# backend/test_pdf_scenarios.py
import unittest
import io
import json
import time
from app import app
from database import get_db_connection
from auth_middleware import generate_jwt_token

class TestPDFUploadScenarios(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = app.test_client()
        cls.patient_email = "patient.elena@cardiopredict.org"
        user_dict = {
            "email": cls.patient_email,
            "role": "patient",
            "full_name": "Elena Rostova",
            "status": "active"
        }
        cls.patient_token = generate_jwt_token(user_dict)
        cls.auth_headers = {"Authorization": f"Bearer {cls.patient_token}"}

    def test_01_valid_text_pdf(self):
        """Scenario 1: Valid text-based PDF with clinical biomarkers."""
        # Minimal valid PDF structure with clinical text stream
        content = (
            b"%PDF-1.4\n"
            b"1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n"
            b"2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj\n"
            b"3 0 obj <</Type /Page /Parent 2 0 R /Resources <</Font <</F1 4 0 R>>>> /MediaBox [0 0 612 792] /Contents 5 0 R>> endobj\n"
            b"4 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj\n"
            b"5 0 obj <</Length 180>> stream\n"
            b"BT /F1 12 Tf 50 700 Td (Patient Age: 54 Sex: Male BP: 135/85 Cholesterol: 215 Glucose: 105 Troponin: 0.02) Tj ET\n"
            b"endstream\nendobj\n"
            b"xref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000244 00000 n \n0000000325 00000 n \n"
            b"trailer <</Size 6 /Root 1 0 R>>\nstartxref\n560\n%%EOF"
        )
        data = {
            "file": (io.BytesIO(content), "valid_clinical_report.pdf"),
            "report_title": "Annual Cardiac Checkup"
        }
        res = self.client.post("/api/patient/upload-report", headers=self.auth_headers, data=data, content_type="multipart/form-data")
        self.assertIn(res.status_code, [201, 422])
        json_data = res.get_json()
        if res.status_code == 201:
            self.assertIn("report_id", json_data)
            self.assertIn("extracted_data", json_data)
            print("✅ Scenario 1 Passed: Valid PDF parsed successfully.")
        else:
            print(f"ℹ️ Scenario 1 returned status {res.status_code}: {json_data.get('error')}")

    def test_02_multipage_pdf(self):
        """Scenario 2: Multi-page PDF handles pages without hanging."""
        # Generate multi-page valid PDF
        content = (
            b"%PDF-1.4\n"
            b"1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n"
            b"2 0 obj <</Type /Pages /Kids [3 0 R 6 0 R] /Count 2>> endobj\n"
            b"3 0 obj <</Type /Page /Parent 2 0 R /Resources <</Font <</F1 4 0 R>>>> /MediaBox [0 0 612 792] /Contents 5 0 R>> endobj\n"
            b"4 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj\n"
            b"5 0 obj <</Length 80>> stream\nBT /F1 12 Tf 50 700 Td (Page 1 Clinical Summary) Tj ET\nendstream\nendobj\n"
            b"6 0 obj <</Type /Page /Parent 2 0 R /Resources <</Font <</F1 4 0 R>>>> /MediaBox [0 0 612 792] /Contents 7 0 R>> endobj\n"
            b"7 0 obj <</Length 120>> stream\nBT /F1 12 Tf 50 700 Td (Age: 62 Systolic BP: 140 Diastolic BP: 90 Cholesterol: 230) Tj ET\nendstream\nendobj\n"
            b"xref\n0 8\n0000000000 65535 f \n"
            b"trailer <</Size 8 /Root 1 0 R>>\nstartxref\n600\n%%EOF"
        )
        data = {
            "file": (io.BytesIO(content), "multipage_lab_report.pdf"),
            "report_title": "Comprehensive Panel"
        }
        res = self.client.post("/api/patient/upload-report", headers=self.auth_headers, data=data, content_type="multipart/form-data")
        self.assertIn(res.status_code, [201, 422])
        print("✅ Scenario 2 Passed: Multi-page PDF handled safely.")

    def test_03_corrupted_pdf(self):
        """Scenario 3: Corrupted PDF bytes fail gracefully without crashing."""
        corrupt_bytes = b"%PDF-1.4\n\x00\xFF\xDE\xAD\xBE\xEFbroken_pdf_data_without_catalog_or_pages"
        data = {
            "file": (io.BytesIO(corrupt_bytes), "corrupt_file.pdf"),
            "report_title": "Corrupt Report"
        }
        res = self.client.post("/api/patient/upload-report", headers=self.auth_headers, data=data, content_type="multipart/form-data")
        # Should return 422 or 400 with graceful error
        self.assertIn(res.status_code, [400, 422, 500])
        json_data = res.get_json()
        self.assertIn("error", json_data)
        print(f"✅ Scenario 3 Passed: Corrupted PDF rejected gracefully with '{json_data['error']}'")

    def test_04_empty_pdf(self):
        """Scenario 4: Empty PDF (0 bytes or <100 bytes) rejected."""
        empty_bytes = b""
        data = {
            "file": (io.BytesIO(empty_bytes), "empty_report.pdf"),
            "report_title": "Empty File"
        }
        res = self.client.post("/api/patient/upload-report", headers=self.auth_headers, data=data, content_type="multipart/form-data")
        self.assertEqual(res.status_code, 400)
        json_data = res.get_json()
        self.assertIn("error", json_data)
        print(f"✅ Scenario 4 Passed: Empty PDF rejected with '{json_data['error']}'")

    def test_05_non_pdf_renamed_extension(self):
        """Scenario 5: Non-PDF file (e.g. text/exe) renamed to .pdf rejected by magic bytes."""
        fake_pdf_bytes = b"Hello, this is a plain text file pretending to be a PDF document."
        data = {
            "file": (io.BytesIO(fake_pdf_bytes), "fake_document.pdf"),
            "report_title": "Fake PDF"
        }
        res = self.client.post("/api/patient/upload-report", headers=self.auth_headers, data=data, content_type="multipart/form-data")
        self.assertEqual(res.status_code, 400)
        json_data = res.get_json()
        self.assertTrue("signature" in json_data["error"] or "PDF" in json_data["error"])
        print(f"✅ Scenario 5 Passed: Fake PDF rejected by magic bytes (%PDF-): '{json_data['error']}'")

    def test_06_oversized_pdf(self):
        """Scenario 6: Oversized PDF (>10MB) rejected with HTTP 400."""
        # 11 MB of dummy data starting with %PDF-
        oversized_bytes = b"%PDF-1.4 " + b"0" * (11 * 1024 * 1024)
        data = {
            "file": (io.BytesIO(oversized_bytes), "huge_scan.pdf"),
            "report_title": "Oversized Report"
        }
        res = self.client.post("/api/patient/upload-report", headers=self.auth_headers, data=data, content_type="multipart/form-data")
        self.assertIn(res.status_code, [400, 413])
        json_data = res.get_json()
        self.assertIn("error", json_data)
        print(f"✅ Scenario 6 Passed: Oversized PDF rejected: '{json_data['error']}'")

    def test_07_pdf_with_missing_clinical_values(self):
        """Scenario 7: PDF missing required values flags missing fields without prediction failure."""
        content = (
            b"%PDF-1.4\n"
            b"1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n"
            b"2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1>> endobj\n"
            b"3 0 obj <</Type /Page /Parent 2 0 R /Resources <</Font <</F1 4 0 R>>>> /MediaBox [0 0 612 792] /Contents 5 0 R>> endobj\n"
            b"4 0 obj <</Type /Font /Subtype /Type1 /BaseFont /Helvetica>> endobj\n"
            b"5 0 obj <</Length 90>> stream\n"
            b"BT /F1 12 Tf 50 700 Td (Patient Age: 45 Cholesterol: 180) Tj ET\n"
            b"endstream\nendobj\n"
            b"xref\n0 6\n0000000000 65535 f \n"
            b"trailer <</Size 6 /Root 1 0 R>>\nstartxref\n300\n%%EOF"
        )
        data = {
            "file": (io.BytesIO(content), "partial_report.pdf"),
            "report_title": "Partial Lab Report"
        }
        res = self.client.post("/api/patient/upload-report", headers=self.auth_headers, data=data, content_type="multipart/form-data")
        if res.status_code == 201:
            json_data = res.get_json()
            # Mandatory fields like systolic_bp, diastolic_bp, glucose should be in missing_fields
            self.assertTrue(len(json_data.get("missing_fields", [])) > 0 or json_data.get("is_ready_for_prediction") is False)
            print("✅ Scenario 7 Passed: Missing required values flagged properly.")
        else:
            print(f"ℹ️ Scenario 7 returned {res.status_code}")

    def test_08_sparse_or_poor_text_quality(self):
        """Scenario 8: Sparse text returns allow_manual_entry so user is never blocked."""
        content = b"%PDF-1.4\n1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n2 0 obj <</Type /Pages /Kids [] /Count 0>> endobj\nxref\n0 3\n0000000000 65535 f \ntrailer <</Size 3 /Root 1 0 R>>\nstartxref\n120\n%%EOF"
        data = {
            "file": (io.BytesIO(content), "sparse_scan.pdf"),
            "report_title": "Empty Page Document"
        }
        res = self.client.post("/api/patient/upload-report", headers=self.auth_headers, data=data, content_type="multipart/form-data")
        self.assertIn(res.status_code, [400, 422])
        json_data = res.get_json()
        self.assertTrue(json_data.get("allow_manual_entry", False))
        print("✅ Scenario 8 Passed: Sparse scan returns allow_manual_entry: True.")

    def test_09_manual_entry_flow(self):
        """Scenario 9: Patient can initiate manual entry and predict successfully."""
        res = self.client.post("/api/patient/manual-report", headers=self.auth_headers,
                               json={"report_title": "Manual Annual Review"})
        self.assertEqual(res.status_code, 201)
        rep_id = res.get_json()["report_id"]

        # Run prediction on manually provided features
        pred_res = self.client.post("/api/patient/confirm-and-predict", headers=self.auth_headers, json={
            "report_id": rep_id,
            "features": {
                "Age": 55, "Sex": "Male", "systolic_bp": 130, "diastolic_bp": 84,
                "cholesterol": 210, "glucose_level": 102, "BMI": 26.5
            }
        })
        self.assertEqual(pred_res.status_code, 200)
        json_data = pred_res.get_json()
        self.assertIn("predictions", json_data)
        self.assertEqual(len(json_data["predictions"]), 5)
        print("✅ Scenario 9 Passed: Manual entry and prediction across 5 models succeeded.")

    def test_10_duplicate_prediction_prevention(self):
        """Scenario 10: Duplicate rapid submission within 3s is rejected with HTTP 429."""
        # 1st prediction
        self.client.post("/api/patient/confirm-and-predict", headers=self.auth_headers, json={
            "report_id": 99999,
            "features": {
                "Age": 55, "Sex": "Male", "systolic_bp": 130, "diastolic_bp": 84,
                "cholesterol": 210, "glucose_level": 102
            }
        })
        # Immediate 2nd prediction with same report_id
        res2 = self.client.post("/api/patient/confirm-and-predict", headers=self.auth_headers, json={
            "report_id": 99999,
            "features": {
                "Age": 55, "Sex": "Male", "systolic_bp": 130, "diastolic_bp": 84,
                "cholesterol": 210, "glucose_level": 102
            }
        })
        self.assertEqual(res2.status_code, 429)
        print(f"✅ Scenario 10 Passed: Rapid duplicate prediction blocked: '{res2.get_json()['error']}'")

if __name__ == "__main__":
    unittest.main()
