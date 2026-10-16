# backend/ocr_service.py
import re
import os
import sys
import io
import json
from typing import Tuple, Dict, Any, List, Optional
import pdfplumber
import numpy as np
from PIL import Image

try:
    import pymupdf as fitz
except ImportError:
    try:
        import fitz
    except ImportError:
        fitz = None

try:
    from rapidocr_onnxruntime import RapidOCR
    RAPID_OCR_ENGINE = RapidOCR()
except Exception:
    RAPID_OCR_ENGINE = None

try:
    import pytesseract
    PYTESSERACT_AVAILABLE = True
except ImportError:
    PYTESSERACT_AVAILABLE = False

# Enable UTF-8 output on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Canonical attributes used across CardioPredict models
CLINICAL_ATTRIBUTES = [
    "Age", "heart_disease", "Married", "BMI", "Hypertension",
    "glucose_level", "Sex", "smoking_status",
    "systolic_bp", "BP_Medications", "diastolic_bp", "sex",
    "diabetes", "heart_rate", "cigsPerDay", "cholesterol", "smokes",
    "oldpeak", "max_hr", "resting_bp", "fasting_bs",
    "Chest_pain_type", "Resting_ecg", "Fasting_bs", "St_slope",
    "Troponin", "CK_MB", "blood_sugar",
    "typical_angina", "Region", "RWMA", "K", "EF-TTE", "hypertension",
    "FH", "Tinversion", "HDL", "ESR", "Lymph", "HB", "WBC", "Weight",
    "CR", "triglycerides", "FBS", "Na", "LDL", "PLT", "BUN", "Neut", "Length"
]

# Critical mandatory attributes that MUST be valid before running prediction
MANDATORY_ATTRIBUTES = [
    "Age", "Sex", "systolic_bp", "diastolic_bp", "cholesterol", "glucose_level"
]

# Clinical Reference Ranges & Unit Validation
CLINICAL_VALIDATION_RULES = {
    "Age": {"type": "float", "min": 1, "max": 120, "unit": "years", "label": "Age"},
    "Weight": {"type": "float", "min": 20, "max": 350, "unit": "kg", "label": "Weight"},
    "Length": {"type": "float", "min": 70, "max": 250, "unit": "cm", "label": "Height / Length"},
    "BMI": {"type": "float", "min": 10.0, "max": 75.0, "unit": "kg/m²", "label": "Body Mass Index (BMI)"},
    "systolic_bp": {"type": "float", "min": 60, "max": 260, "unit": "mmHg", "label": "Systolic Blood Pressure"},
    "diastolic_bp": {"type": "float", "min": 40, "max": 160, "unit": "mmHg", "label": "Diastolic Blood Pressure"},
    "resting_bp": {"type": "float", "min": 60, "max": 260, "unit": "mmHg", "label": "Resting Blood Pressure"},
    "heart_rate": {"type": "float", "min": 30, "max": 220, "unit": "bpm", "label": "Heart Rate"},
    "max_hr": {"type": "float", "min": 50, "max": 250, "unit": "bpm", "label": "Maximum Heart Rate"},
    "cholesterol": {"type": "float", "min": 70, "max": 600, "unit": "mg/dL", "label": "Total Cholesterol"},
    "LDL": {"type": "float", "min": 15, "max": 400, "unit": "mg/dL", "label": "LDL Cholesterol"},
    "HDL": {"type": "float", "min": 10, "max": 150, "unit": "mg/dL", "label": "HDL Cholesterol"},
    "triglycerides": {"type": "float", "min": 30, "max": 1000, "unit": "mg/dL", "label": "Triglycerides"},
    "glucose_level": {"type": "float", "min": 40, "max": 500, "unit": "mg/dL", "label": "Fasting Glucose"},
    "blood_sugar": {"type": "float", "min": 40, "max": 500, "unit": "mg/dL", "label": "Blood Sugar"},
    "FBS": {"type": "float", "min": 40, "max": 500, "unit": "mg/dL", "label": "Fasting Blood Sugar"},
    "fasting_bs": {"type": "categorical", "allowed": [0, 1, "0", "1", "Y", "N", "Yes", "No"], "label": "Fasting Blood Sugar > 120"},
    "Troponin": {"type": "float", "min": 0.0, "max": 50.0, "unit": "ng/mL", "label": "Cardiac Troponin"},
    "CK_MB": {"type": "float", "min": 0.0, "max": 300.0, "unit": "ng/mL", "label": "CK-MB Biomarker"},
    "EF-TTE": {"type": "float", "min": 10.0, "max": 85.0, "unit": "%", "label": "Ejection Fraction (EF-TTE)"},
    "K": {"type": "float", "min": 2.0, "max": 8.0, "unit": "mmol/L", "label": "Serum Potassium (K)"},
    "Na": {"type": "float", "min": 100, "max": 180, "unit": "mmol/L", "label": "Serum Sodium (Na)"},
    "HB": {"type": "float", "min": 5.0, "max": 24.0, "unit": "g/dL", "label": "Hemoglobin (HB)"},
    "WBC": {"type": "float", "min": 1000, "max": 40000, "unit": "/µL", "label": "White Blood Cells (WBC)"},
    "PLT": {"type": "float", "min": 40000, "max": 1000000, "unit": "/µL", "label": "Platelet Count (PLT)"},
    "ESR": {"type": "float", "min": 0, "max": 130, "unit": "mm/hr", "label": "Erythrocyte Sed. Rate (ESR)"},
    "CR": {"type": "float", "min": 0.2, "max": 15.0, "unit": "mg/dL", "label": "Serum Creatinine (CR)"},
    "BUN": {"type": "float", "min": 3, "max": 120, "unit": "mg/dL", "label": "Blood Urea Nitrogen (BUN)"},
    "Lymph": {"type": "float", "min": 5, "max": 85, "unit": "%", "label": "Lymphocytes"},
    "Neut": {"type": "float", "min": 10, "max": 95, "unit": "%", "label": "Neutrophils"},
    "oldpeak": {"type": "float", "min": -3.0, "max": 8.0, "unit": "mm", "label": "ST Depression (Oldpeak)"},
    "cigsPerDay": {"type": "float", "min": 0, "max": 100, "unit": "cigs/day", "label": "Cigarettes Per Day"}
}

def extract_text_from_pdf(pdf_stream_or_path) -> Tuple[str, str]:
    """
    Extracts text from PDF safely and robustly.
    - Validates PDF structure and catches corruption/encryption.
    - Digital extraction first via PyMuPDF (fitz) + pdfplumber (memory safe).
    - If digital text length is low or sparse, falls back to RapidOCR neural OCR for scanned pages.
    - Returns (extracted_text, extraction_method).
    """
    raw_bytes = None
    if isinstance(pdf_stream_or_path, (bytes, bytearray)):
        raw_bytes = bytes(pdf_stream_or_path)
    elif hasattr(pdf_stream_or_path, "read"):
        raw_bytes = pdf_stream_or_path.read()
    elif isinstance(pdf_stream_or_path, str) and os.path.exists(pdf_stream_or_path):
        with open(pdf_stream_or_path, "rb") as f:
            raw_bytes = f.read()

    if raw_bytes is not None:
        if len(raw_bytes) < 100:
            raise ValueError("The uploaded PDF file is empty or corrupted (under 100 bytes).")
        # Standard PDF specification: %PDF- can be located anywhere in the first 1024 bytes
        if b"%PDF-" not in raw_bytes[:1024]:
            raise ValueError("Invalid PDF format: File header does not match the standard PDF signature (%PDF-).")

    text_content = ""
    method = "digital"

    # 1. Primary Digital Extraction via PyMuPDF (Fast, resilient to complex fonts/encodings)
    if fitz is not None and raw_bytes is not None:
        try:
            doc = fitz.open(stream=raw_bytes, filetype="pdf")
            if doc.is_encrypted:
                raise ValueError("This PDF document is encrypted or password-protected.")
            if doc.page_count == 0:
                raise ValueError("PDF document contains no pages.")

            for page_idx in range(min(doc.page_count, 20)):
                page = doc[page_idx]
                p_text = page.get_text("text") or ""
                if p_text.strip():
                    text_content += p_text + "\n"

            doc.close()
        except ValueError:
            raise
        except Exception as e:
            err = str(e).lower()
            if "password" in err or "encrypt" in err:
                raise ValueError("This PDF document is encrypted or password-protected.")
            if "syntax" in err or "corrupt" in err or "format error" in err:
                raise ValueError("The uploaded file is not a valid PDF or has corrupted structure.")
            print(f"PyMuPDF digital extraction notice: {e}")

    # Secondary Digital Extraction via pdfplumber if PyMuPDF extracted minimal text
    if len(text_content.strip()) < 25:
        try:
            stream_obj = io.BytesIO(raw_bytes) if raw_bytes else pdf_stream_or_path
            with pdfplumber.open(stream_obj) as pdf:
                if len(pdf.pages) == 0:
                    raise ValueError("PDF document contains no pages.")
                plumber_text = ""
                for page in pdf.pages[:20]:
                    txt = page.extract_text()
                    if txt:
                        plumber_text += txt + "\n"
                if len(plumber_text.strip()) > len(text_content.strip()):
                    text_content = plumber_text
        except ValueError:
            raise
        except Exception as e:
            err = str(e).lower()
            if "password" in err or "encrypt" in err:
                raise ValueError("This PDF document is encrypted or password-protected.")
            print(f"pdfplumber extraction notice: {e}")

    # If digital extraction succeeded and found readable clinical text, return digital
    if len(text_content.strip()) >= 30:
        parsed_preview = parse_clinical_values_from_text(text_content)
        if len(parsed_preview) >= 1 or len(text_content.strip()) >= 80:
            return text_content, "digital"

    # 2. Scanned or Image PDF OCR Fallback
    print("ℹ️ Digital text sparse or image-based. Initiating OCR extraction...")
    ocr_text = ""

    if fitz is not None and raw_bytes is not None:
        try:
            doc = fitz.open(stream=raw_bytes, filetype="pdf")
            for page_idx in range(min(doc.page_count, 5)):
                page = doc[page_idx]
                pix = page.get_pixmap(dpi=200)
                img = Image.open(io.BytesIO(pix.tobytes("png")))

                # Try RapidOCR first
                if RAPID_OCR_ENGINE is not None:
                    try:
                        result, _ = RAPID_OCR_ENGINE(np.array(img))
                        if result:
                            page_ocr = "\n".join([item[1] for item in result])
                            ocr_text += page_ocr + "\n"
                    except Exception as ocr_err:
                        print(f"RapidOCR warning on page {page_idx}: {ocr_err}")

                # Try Tesseract as backup if RapidOCR did not produce text
                if not ocr_text.strip() and PYTESSERACT_AVAILABLE:
                    try:
                        tess_ocr = pytesseract.image_to_string(img)
                        if tess_ocr.strip():
                            ocr_text += tess_ocr + "\n"
                    except Exception as tess_err:
                        print(f"Tesseract warning on page {page_idx}: {tess_err}")

            doc.close()
        except ValueError:
            raise
        except Exception as e:
            print(f"OCR page rendering error: {e}")

    # Fallback to pdfplumber image conversion if fitz wasn't available
    if not ocr_text.strip():
        try:
            stream_obj = io.BytesIO(raw_bytes) if raw_bytes else pdf_stream_or_path
            with pdfplumber.open(stream_obj) as pdf:
                for page_idx, page in enumerate(pdf.pages[:5]):
                    im = page.to_image(resolution=150).original
                    if RAPID_OCR_ENGINE is not None:
                        res, _ = RAPID_OCR_ENGINE(np.array(im))
                        if res:
                            ocr_text += "\n".join([item[1] for item in res]) + "\n"
                    elif PYTESSERACT_AVAILABLE:
                        ocr_text += pytesseract.image_to_string(im) + "\n"
        except Exception as e:
            print(f"pdfplumber OCR fallback notice: {e}")

    if len(ocr_text.strip()) > len(text_content.strip()):
        return ocr_text, "ocr"
    elif text_content.strip():
        return text_content, "digital"
    elif ocr_text.strip():
        return ocr_text, "ocr"

    return "", "none"

def parse_clinical_values_from_text(raw_text: str) -> Dict[str, Any]:
    """
    Parses clinical attributes from extracted PDF text using pattern matching.
    Supports canonical labels as well as common medical report variations:
    - Combined Blood Pressure (e.g. "BP: 130/85 mmHg")
    - Cholesterol variations ("Total Cholesterol", "Cholesterol")
    - Fasting Blood Sugar / Glucose variations
    - Heart rate / Pulse variations
    - Electrolytes (Potassium, Sodium) and Renal markers (Creatinine, BUN)
    - Hematology (Hemoglobin, WBC, Platelets)
    """
    extracted = {}

    if not raw_text:
        return extracted

    # Clean text: normalize non-breaking spaces and tabs
    clean_text = raw_text.replace("\u00a0", " ").replace("\t", " ")

    # 1. Combined Blood Pressure (e.g., "BP: 130/85", "Blood Pressure: 140 / 90 mmHg", "BP - 120/80")
    bp_combined = re.search(r"(?:BP|Blood\s*Pressure|B\.P\.)\s*[:=\-]?\s*(\d{2,3})\s*[/\\|\-]\s*(\d{2,3})", clean_text, re.IGNORECASE)
    if bp_combined:
        try:
            sbp = float(bp_combined.group(1))
            dbp = float(bp_combined.group(2))
            if 60 <= sbp <= 260 and 40 <= dbp <= 160:
                extracted["systolic_bp"] = sbp
                extracted["resting_bp"] = sbp
                extracted["diastolic_bp"] = dbp
        except ValueError:
            pass

    # 2. Individual clinical attributes
    for attr in CLINICAL_ATTRIBUTES:
        if attr in extracted:
            continue
        attr_regex = re.escape(attr)
        pattern = re.compile(rf"(?:^|\s|\b){attr_regex}\s*[:\-=\t]\s*([A-Za-z0-9\.\-\+/]+)", re.IGNORECASE)
        match = pattern.search(clean_text)

        if match:
            raw_val = match.group(1).strip()
            # Strip trailing punctuation or units
            raw_val = re.sub(r"[,;]$", "", raw_val)
            try:
                if "." in raw_val:
                    extracted[attr] = float(raw_val)
                else:
                    extracted[attr] = int(raw_val)
            except ValueError:
                extracted[attr] = raw_val

    # 3. Medical Synonyms & Common Laboratory Formats
    synonyms_map = [
        # Blood Pressure
        (r"(?:Systolic\s*BP|Systolic|SBP)\s*[:=\-]?\s*(\d{2,3})", "systolic_bp"),
        (r"(?:Diastolic\s*BP|Diastolic|DBP)\s*[:=\-]?\s*(\d{2,3})", "diastolic_bp"),
        (r"(?:Resting\s*BP|Resting\s*Blood\s*Pressure)\s*[:=\-]?\s*(\d{2,3})", "resting_bp"),

        # Lipids
        (r"(?:Total\s*Cholesterol|Serum\s*Cholesterol)\s*[:=\-]?\s*(\d{2,3}(?:\.\d+)?)", "cholesterol"),
        (r"(?:LDL\s*Cholesterol|LDL\-C|LDL)\s*[:=\-]?\s*(\d{2,3}(?:\.\d+)?)", "LDL"),
        (r"(?:HDL\s*Cholesterol|HDL\-C|HDL)\s*[:=\-]?\s*(\d{2,3}(?:\.\d+)?)", "HDL"),
        (r"(?:Triglycerides?|TG)\s*[:=\-]?\s*(\d{2,4}(?:\.\d+)?)", "triglycerides"),

        # Glucose
        (r"(?:Fasting\s*Blood\s*Sugar|Fasting\s*Glucose|Fasting\s*Plasma\s*Glucose|Blood\s*Glucose|FBS|Glucose)\s*[:=\-]?\s*(\d{2,3}(?:\.\d+)?)", "glucose_level"),
        (r"(?:Random\s*Blood\s*Sugar|Blood\s*Sugar|RBS)\s*[:=\-]?\s*(\d{2,3}(?:\.\d+)?)", "blood_sugar"),

        # Heart Rate
        (r"(?:Heart\s*Rate|Pulse\s*Rate|Pulse|HR)\s*[:=\-]?\s*(\d{2,3})", "heart_rate"),

        # Cardiac Markers
        (r"(?:Cardiac\s*Troponin|Troponin\s*I|Troponin\s*T|Troponin)\s*[:=\-]?\s*(\d+(?:\.\d+)?)", "Troponin"),
        (r"(?:CK\-MB|CK_MB|CKMB)\s*[:=\-]?\s*(\d+(?:\.\d+)?)", "CK_MB"),
        (r"(?:Ejection\s*Fraction|EF\-TTE|LVEF|EF)\s*[:=\-]?\s*(\d{2}(?:\.\d+)?)\s*%?", "EF-TTE"),

        # Renal & Electrolytes
        (r"(?:Serum\s*Creatinine|Creatinine|S\.Creatinine)\s*[:=\-]?\s*(\d+(?:\.\d+)?)", "CR"),
        (r"(?:Blood\s*Urea\s*Nitrogen|BUN|Urea)\s*[:=\-]?\s*(\d+(?:\.\d+)?)", "BUN"),
        (r"(?:Serum\s*Potassium|Potassium|K\+)\s*[:=\-]?\s*(\d+(?:\.\d+)?)", "K"),
        (r"(?:Serum\s*Sodium|Sodium|Na\+)\s*[:=\-]?\s*(\d+(?:\.\d+)?)", "Na"),

        # Hematology
        (r"(?:Hemoglobin|Hb|Hgb)\s*[:=\-]?\s*(\d+(?:\.\d+)?)", "HB"),
        (r"(?:White\s*Blood\s*Cells?|WBC|Total\s*Leukocyte\s*Count|TLC)\s*[:=\-]?\s*([\d,]+(?:\.\d+)?)", "WBC"),
        (r"(?:Platelets?|Platelet\s*Count|PLT)\s*[:=\-]?\s*([\d,]+(?:\.\d+)?)", "PLT"),
        (r"(?:ESR|Erythrocyte\s*Sedimentation\s*Rate)\s*[:=\-]?\s*(\d+(?:\.\d+)?)", "ESR"),

        # Vitals & Anthropometry
        (r"(?:Patient\s*Age|Age)\s*[:=\-]?\s*(\d{1,3})\s*(?:years|yrs)?", "Age"),
        (r"(?:Gender|Sex)\s*[:=\-]?\s*(Male|Female|M|F)\b", "Sex"),
        (r"(?:Body\s*Mass\s*Index|BMI)\s*[:=\-]?\s*(\d{2}(?:\.\d+)?)", "BMI"),
        (r"(?:Body\s*Weight|Weight)\s*[:=\-]?\s*(\d{2,3}(?:\.\d+)?)\s*(?:kg)?", "Weight"),
        (r"(?:Height|Length)\s*[:=\-]?\s*(\d{2,3}(?:\.\d+)?)\s*(?:cm)?", "Length")
    ]

    for syn_regex, target_key in synonyms_map:
        if target_key not in extracted:
            match = re.search(syn_regex, clean_text, re.IGNORECASE)
            if match:
                raw_match = match.group(1).replace(",", "").strip()
                try:
                    if "." in raw_match:
                        extracted[target_key] = float(raw_match)
                    elif raw_match.isdigit():
                        extracted[target_key] = int(raw_match)
                    else:
                        # For Sex / Gender
                        extracted[target_key] = raw_match.capitalize()
                except ValueError:
                    extracted[target_key] = raw_match

    # 4. Canonical Aliases Alignment
    # Sex alignment
    if "Sex" in extracted and "sex" not in extracted:
        val = extracted["Sex"]
        if str(val).lower() in ["male", "m", "1"]:
            extracted["Sex"] = "Male"
            extracted["sex"] = 1.0
        elif str(val).lower() in ["female", "f", "0"]:
            extracted["Sex"] = "Female"
            extracted["sex"] = 0.0
    elif "sex" in extracted and "Sex" not in extracted:
        extracted["Sex"] = "Male" if str(extracted["sex"]) in ["1", "1.0", "male"] else "Female"

    # Hypertension flag alignment
    if "Hypertension" in extracted and "hypertension" not in extracted:
        extracted["hypertension"] = extracted["Hypertension"]
    elif "hypertension" in extracted and "Hypertension" not in extracted:
        extracted["Hypertension"] = extracted["hypertension"]

    # Glucose and FBS alignment
    if "glucose_level" in extracted and "blood_sugar" not in extracted:
        extracted["blood_sugar"] = extracted["glucose_level"]
    elif "blood_sugar" in extracted and "glucose_level" not in extracted:
        extracted["glucose_level"] = extracted["blood_sugar"]

    if "glucose_level" in extracted and "FBS" not in extracted:
        extracted["FBS"] = extracted["glucose_level"]
    elif "FBS" in extracted and "glucose_level" not in extracted:
        extracted["glucose_level"] = extracted["FBS"]

    # Fasting BS categorical threshold (> 120 mg/dL)
    if "glucose_level" in extracted and "fasting_bs" not in extracted:
        try:
            extracted["fasting_bs"] = 1 if float(extracted["glucose_level"]) > 120 else 0
            extracted["Fasting_bs"] = extracted["fasting_bs"]
        except Exception:
            pass

    # Resting BP and Systolic BP alignment
    if "systolic_bp" in extracted and "resting_bp" not in extracted:
        extracted["resting_bp"] = extracted["systolic_bp"]
    elif "resting_bp" in extracted and "systolic_bp" not in extracted:
        extracted["systolic_bp"] = extracted["resting_bp"]

    # Auto-calculate BMI if Weight and Length are present
    if "Weight" in extracted and "Length" in extracted and "BMI" not in extracted:
        try:
            wt = float(extracted["Weight"])
            ht_m = float(extracted["Length"]) / 100.0
            if ht_m > 0 and wt > 0:
                extracted["BMI"] = round(wt / (ht_m * ht_m), 1)
        except Exception:
            pass

    return extracted

def validate_clinical_inputs(features: Dict[str, Any]) -> Tuple[bool, Dict[str, Any], Dict[str, str], Dict[str, str], List[str]]:
    """
    Validates clinical features according to physiological ranges and expected formats.
    Returns:
    (is_valid, cleaned_data, errors, warnings, missing_mandatory)
    """
    cleaned = dict(features)
    errors = {}
    warnings = {}
    missing_mandatory = []

    # 1. Check Mandatory Attributes
    for req in MANDATORY_ATTRIBUTES:
        val = cleaned.get(req)
        if val is None or str(val).strip() == "":
            missing_mandatory.append(req)
            errors[req] = f"{req} is mandatory for accurate cardiovascular risk estimation."

    # 2. Check Physiological Ranges
    for key, rule in CLINICAL_VALIDATION_RULES.items():
        if key not in cleaned:
            continue

        raw_val = cleaned[key]
        if raw_val is None or str(raw_val).strip() == "":
            continue

        rule_type = rule.get("type", "float")
        label = rule.get("label", key)

        if rule_type == "float":
            try:
                num_val = float(raw_val)
                cleaned[key] = num_val

                # Check biologically implausible ranges
                min_val = rule.get("min")
                max_val = rule.get("max")
                unit = rule.get("unit", "")

                if min_val is not None and num_val < min_val:
                    warnings[key] = f"{label} ({num_val} {unit}) is unusually low (expected ≥ {min_val} {unit})."
                elif max_val is not None and num_val > max_val:
                    warnings[key] = f"{label} ({num_val} {unit}) is unusually high (expected ≤ {max_val} {unit})."

            except (ValueError, TypeError):
                errors[key] = f"{label} must be a valid numeric measurement."

    # Consistency checks: systolic must exceed diastolic
    sbp = cleaned.get("systolic_bp")
    dbp = cleaned.get("diastolic_bp")
    if sbp is not None and dbp is not None:
        try:
            if float(sbp) <= float(dbp):
                errors["systolic_bp"] = "Systolic blood pressure must be higher than diastolic pressure."
        except ValueError:
            pass

    is_valid = len(errors) == 0
    return is_valid, cleaned, errors, warnings, missing_mandatory
