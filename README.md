# 🫀 CardioPredict — Deep Learning for Cardiovascular Health Assessment

**CardioPredict** is an enterprise-grade cardiovascular health assessment and clinical decision support platform. It combines deep learning risk inference across **5 major cardiovascular conditions** with automated digital and OCR medical report parsing, a strictly two-role access model (**Patient** and **Administrator**), an interactive **AI Health Assistant**, an evidence-based **disease-specific food recommendation engine**, therapeutic wellness modules, and comprehensive administrative audit controls.

---

## 🌟 Key Capabilities & System Features

### 1. 🔐 Two-Role Architecture & RBAC Security
- **Strict Two-Role System**: Independent, isolated portal experiences for **Patients** and the **Administrator**.
- **Professional User Login**:
  - Unified **"User Login"** interface for all users (no public doctor or admin selection tabs, and no hardcoded demo buttons).
  - Server-side role routing: Authenticated credentials securely determine whether the user is routed to the **Patient Dashboard** (`/patient/dashboard`) or the **Admin Dashboard** (`/admin/dashboard`).
- **Discreet Administrator Access**:
  - Accessible via a subtle three-dot (`...`) options menu on the public registration and login headers.
  - Secure CLI/environment bootstrap utility (`python bootstrap_admin.py`) for one-time initialization of administrative credentials without public privilege elevation.
- **Strict Registration Validation**:
  - Full Name validation (accepts letters and spaces; strictly rejects numeric digits and invalid characters).
  - Indian Mobile Number validation: Enforces exactly **10 digits** (`/^[6-9]\d{9}$/`).
  - RFC-compliant email validation and normalization.
  - Live Password Strength Meter evaluating character count (min 8), uppercase, lowercase, numbers, and special symbols.
  - Explicit terms and privacy consent checkbox.
- **Cryptographic Protection**: Passwords salted and hashed with PBKDF2/SHA-256. JWT tokens with configurable expiration and client IP audit logging.

### 2. 📄 Medical Report Processing (Digital Extraction + Tesseract OCR)
- **Multi-Modal PDF Extraction**:
  - Memory-safe digital text extraction via `pdfminer.six` and `pdfplumber`.
  - Automatic OCR fallback via **Tesseract OCR** for scanned and photographic reports.
- **51+ Clinical Biomarker Parser**:
  - Extracts: Blood Pressure (Systolic & Diastolic), Total Cholesterol, HDL, LDL, Triglycerides, Fasting Blood Glucose, HbA1c, Cardiac Troponin, CK-MB, Ejection Fraction (EF-TTE), Serum Creatinine, Electrolytes (Potassium, Sodium), Platelets, WBC, BMI, and smoking history.
- **Patient Confirmation Step**:
  - Extracted measurements are displayed in editable form fields for patient verification and manual error correction before model execution.
  - Physiological range validation guards against implausible clinical entries.

### 3. 🧠 Deep Learning Cardiovascular Risk Prediction Engine
- Real-time simultaneous inference across **5 trained neural network and machine learning models**:
  1. **Coronary Artery Disease (CAD)** (54 input features)
  2. **Congestive Heart Failure (HF)** (11 input features)
  3. **Myocardial Infarction (Heart Attack / MI)** (8 input features)
  4. **Cerebrovascular Accident (Stroke / CVA)** (10 input features)
  5. **Systemic Hypertension (HTN)** (12 input features)
- Standardized feature alignment pipeline with calibrated risk classification (**Low**, **Moderate**, **High**) and confidence probability percentages.
- Results are permanently recorded in the database alongside report metadata and audit timestamps.

### 4. 🤖 CardioPredict AI Health Assistant
- **Floating Patient Widget**: Available on all patient pages at the bottom-right corner with smooth expand/collapse.
- **Verified Clinical Knowledge**: Explains complex laboratory biomarkers (e.g., Troponin, EF-TTE, LDL/HDL ratio, SBP/DBP) in plain language.
- **Nutritional Rationale**: Explains why specific foods (e.g., Moong Dal, Oats, Palak, Flaxseeds) benefit arterial elasticity and lipid balance.
- **Clinician Communication**: Suggests structured questions for patients to ask their healthcare providers.
- **Emergency Red-Flag Detection**: Detects acute cardiac symptoms (e.g., crushing chest pressure, left arm pain, shortness of breath, slurred speech) and immediately displays urgent care warnings with national emergency phone numbers (112, 108, 911).
- Operates reliably offline with verified rule-based guidance, while also supporting external LLM API keys via environment variables when configured.

### 5. 🥗 Evidence-Based Food Recommendation System
- Connected directly to model prediction outcomes:
  - **Hypertension**: DASH dietary guidance emphasizing potassium-rich vegetables, pulses, and low sodium (< 1,500 mg/day).
  - **Coronary Artery Disease (CAD)**: Soluble fiber, omega-3 fatty acids, and saturated fat replacement.
  - **Heart Failure**: Sodium moderation and fluid awareness without unsafe potassium overloading.
  - **Stroke Risk**: Antioxidants, polyphenols, and cardioprotective whole grains.
- **Allergy & Restriction Filtering**: Automatically filters out foods conflicting with patient allergies (nuts, dairy, gluten, soy, shellfish) or renal conditions.
- **Culturally Familiar Foods**: Includes reliable nutrition metrics for Indian heart-healthy ingredients (Palak, Moong Dal, Methi seeds, Walnuts, Garlic, Oats, etc.).
- **Traceable Nutrition**: Sourced from the **American Heart Association (AHA)**, **World Health Organization (WHO)**, and **ICMR-National Institute of Nutrition (NIN)** with verifiable citation links.

### 6. 🛡️ Comprehensive Admin Management Portal
- **Real Database Counts**: Live platform metrics calculated directly from SQLite queries (never hardcoded mock stats).
- **Patient Account Directory**: Search, filter, view registration dates, activate/suspend accounts, and execute safe GDPR/HIPAA-compliant anonymization.
- **Report Processing Management**: Inspect all uploaded medical PDFs, verify OCR extraction pipelines, and perform safe deletions with physical file cleanup.
- **Food & Nutrition Catalog**: Complete administrative CRUD interface to add, edit, or remove verified food items, nutrition facts per 100g, and clinical rationales.
- **Audit Logs Trail**: Immutable log of security and clinical events (logins, registrations, report uploads, predictions, food management, and privilege changes).

---

## 🏗️ System Architecture & Directory Structure

```
Cardiovascular-Health-Prediction-main/
│
├── backend/
│   ├── app.py                     # Flask application & blueprint registrations
│   ├── database.py                # SQLite WAL schema, tables, and seeding
│   ├── bootstrap_admin.py         # Secure one-time admin provisioning CLI
│   ├── auth_middleware.py         # JWT verification, RBAC guard, client IP helper
│   ├── auth_routes.py             # User login, registration with strict validation, password reset
│   ├── admin_routes.py            # Admin dashboard metrics, user directory, reports, food catalog, audit logs
│   ├── patient_routes.py          # PDF upload, OCR parsing, predictions, diet, wellness, assistant chat
│   ├── assistant_service.py       # AI Health Assistant verified cardiology knowledge base
│   ├── common_routes.py           # Notifications, profile update, disease education
│   ├── ocr_service.py             # pdfminer.six + Tesseract OCR and 51-biomarker parser
│   ├── main.py                    # 5-disease ML/DL model inference engine
│   ├── models/                    # Trained .pkl, .h5, and scaler model artifacts
│   ├── uploads/medical_reports/   # Encrypted/isolated report storage
│   ├── sachin.db                  # SQLite database (WAL mode enabled)
│   ├── test_backend_suite.py      # Automated 8-test verification suite (100% passing)
│   └── requirements.txt           # Python dependencies
│
└── frontend/
    ├── src/
    │   ├── components/            # Sidebar, Navbar, Footer, AiHealthAssistant, NotificationBell, ProtectedRoute
    │   ├── context/               # AuthContext (JWT session), NotificationContext (alerts & toasts)
    │   ├── pages/
    │   │   ├── admin/             # AdminDashboard, AdminUsers, AdminReports, AdminFoodCatalog,
    │   │   │                      # AdminDietWellness, AdminAuditLogs
    │   │   ├── patient/           # PatientDashboard, PatientUpload, PatientPredictions, PatientDiet,
    │   │   │                      # PatientWellness, PatientProfile, PatientHelp
    │   │   ├── Hero.jsx, Home.jsx, About.jsx, Contact.jsx, DiseaseDetail.jsx
    │   │   ├── Login.jsx, SignUp.jsx, ForgotPassword.jsx
    │   ├── App.jsx                # Full application routing & RBAC protection
    │   └── index.css              # Modern healthcare UI styling & animations
    ├── package.json
    └── vite.config.js
```

---

## 🔑 Default Accounts & Credentials

The system initializes with default accounts for development and verification:

| Role | Email Address | Password | Permissions |
|------|---------------|----------|-------------|
| **Administrator** | `admin@cardiopredict.org` | `Admin@12345` | Full System & Platform Administration |
| **Patient** | `patient.elena@cardiopredict.org` | `Patient@12345` | Clinical Uploads, AI Predictions, Diet & Assistant |

### Administrative Bootstrap Command
To create or update the primary administrator via command line:
```bash
cd backend
python bootstrap_admin.py --email admin@cardiopredict.org --password "Admin@12345" --name "System Administrator"
```

---

## 🚀 Installation & Local Run Guide

### Prerequisites
- **Python**: 3.10+ (tested on Python 3.11.9)
- **Node.js**: 20.18+ or 22+
- **Tesseract OCR**: (Optional for scanned image PDFs; digital PDF parsing works out of the box via `pdfminer.six`)

---

### Step 1: Backend Setup & Execution

1. Open a terminal and navigate to `backend`:
   ```bash
   cd backend
   ```

2. (Optional) Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Initialize the database schema and seed default data:
   ```bash
   python database.py
   ```

5. Run the automated backend test suite:
   ```bash
   python test_backend_suite.py
   ```
   *(All 8 tests should pass with `OK`).*

6. Start the Flask backend server:
   ```bash
   python app.py
   ```
   *The backend starts on `http://127.0.0.1:8000`.*

---

### Step 2: Frontend Setup & Execution

1. Open a second terminal and navigate to `frontend`:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the production bundle to verify compilation:
   ```bash
   npm run build
   ```

4. Start the Vite development server:
   ```bash
   npm run dev -- --host 127.0.0.1 --port 5173
   ```
   *Open `http://127.0.0.1:5173` in your browser.*

---

## 📡 API Reference Overview

### Authentication (`/api/auth`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Patient registration with 10-digit Indian phone, name, and password strength checks. |
| `POST` | `/api/auth/login` | Unified authentication endpoint returning JWT token and server-side role. |
| `POST` | `/api/auth/forgot-password` | Generate secure password reset token. |
| `POST` | `/api/auth/reset-password` | Set new password using verified reset token. |
| `GET` | `/api/auth/me` | Return active user identity and role. |

### Patient Operations (`/api/patient`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/patient/dashboard` | Returns patient overview, 5 latest condition predictions, and quick actions. |
| `POST` | `/api/patient/upload-report` | PDF upload, digital extraction + Tesseract OCR, parses 51 clinical markers. |
| `POST` | `/api/patient/confirm-and-predict` | Runs 5 deep learning models on validated clinical biomarkers. |
| `GET` | `/api/patient/report-file/<id>` | IDOR-protected private PDF report download. |
| `GET` | `/api/patient/predictions` | Complete cardiovascular prediction history. |
| `GET` | `/api/patient/diet-recommendations` | Evidence-based nutrition protocols filtered by predictions and allergies. |
| `GET` | `/api/patient/wellness-resources` | Curated yoga and aerobic video library with contraindications. |
| `POST` | `/api/patient/toggle-favorite` | Toggle bookmarked wellness routines. |
| `POST` | `/api/patient/assistant/chat` | AI Health Assistant query handling with emergency detection. |
| `GET` | `/api/patient/assistant/suggestions`| Dynamic suggested questions tailored to patient's predicted risks. |

### Admin Operations (`/api/admin`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/admin/dashboard-stats` | Live database statistics, disease risk breakdown, and user counts. |
| `GET` | `/api/admin/users` | User management directory with search and status filters. |
| `PATCH` | `/api/admin/users/<email>/status` | Activate or suspend user account. |
| `DELETE` | `/api/admin/users/<email>` | Safe GDPR/HIPAA anonymization of user personal data. |
| `GET` | `/api/admin/reports` | Medical report processing audit across all registered patients. |
| `DELETE` | `/api/admin/reports/<id>` | Delete medical report record and clean up file on disk. |
| `GET` | `/api/admin/food-catalog` | Fetch all verified food items with composition per 100g. |
| `POST` | `/api/admin/food-catalog` | Create a new verified food item with evidence citations. |
| `PUT` | `/api/admin/food-catalog/<id>` | Update nutrient values, clinical rationales, or supported conditions. |
| `DELETE` | `/api/admin/food-catalog/<id>` | Delete a food item from the verified catalog. |
| `GET` | `/api/admin/audit-logs` | Immutable security audit log trail. |
| `GET`/`POST` | `/api/admin/diet-resources` | Manage dietary guidelines and nutrition resources. |
| `GET`/`POST` | `/api/admin/wellness-resources` | Manage exercise videos and therapeutic instructions. |

---

## ⚕️ Clinical & Legal Disclaimer

> **IMPORTANT**: CardioPredict is an assistive educational and clinical risk assessment tool designed for preventive cardiovascular evaluation. Deep learning risk scores reflect mathematical inference based on lab values and should **never** substitute for professional clinical judgment, emergency medical diagnosis, or diagnostic angiograms. If you experience severe chest pain, shortness of breath, or numbness, immediately contact emergency services (112 / 108 / 911).

---

## 📄 License
This project is licensed under the MIT License — see the LICENSE file for details.
