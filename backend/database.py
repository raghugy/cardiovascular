# backend/database.py
import sqlite3
import os
import json
import uuid
from datetime import datetime
from werkzeug.security import generate_password_hash

import sys
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

DB_NAME = os.getenv("DB_NAME", "sachin.db")

def get_db_connection():
    # Ensure database path is in backend folder if relative
    db_path = DB_NAME
    if not os.path.isabs(db_path):
        db_path = os.path.join(os.path.dirname(__file__), db_path)
    conn = sqlite3.connect(db_path, timeout=30.0)
    try:
        conn.execute("PRAGMA journal_mode=WAL")
    except Exception:
        pass
    conn.row_factory = sqlite3.Row
    return conn

def safe_add_column(cursor, table, column_def):
    """Safely adds a column to an existing table if it doesn't already exist."""
    try:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column_def}")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e).lower():
            pass
        else:
            print(f"Notice adding column to {table}: {e}")

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Base users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            email TEXT PRIMARY KEY,
            username TEXT NOT NULL,
            password TEXT NOT NULL
        )
    ''')

    # Safely migrate existing users table with role-based auth and security columns
    safe_add_column(cursor, "users", "full_name TEXT")
    safe_add_column(cursor, "users", "phone TEXT")
    safe_add_column(cursor, "users", "role TEXT DEFAULT 'patient'") # 'admin', 'doctor', 'patient'
    safe_add_column(cursor, "users", "status TEXT DEFAULT 'active'") # 'active', 'pending', 'suspended', 'rejected'
    safe_add_column(cursor, "users", "dob TEXT")
    safe_add_column(cursor, "users", "consent_privacy INTEGER DEFAULT 0")
    safe_add_column(cursor, "users", "failed_login_attempts INTEGER DEFAULT 0")
    safe_add_column(cursor, "users", "lockout_until DATETIME")
    safe_add_column(cursor, "users", "created_at DATETIME")
    safe_add_column(cursor, "users", "updated_at DATETIME")
    safe_add_column(cursor, "users", "reset_token TEXT")
    safe_add_column(cursor, "users", "reset_token_expiry DATETIME")

    cursor.execute("UPDATE users SET full_name = username WHERE full_name IS NULL OR full_name = ''")
    cursor.execute("UPDATE users SET role = 'patient' WHERE role IS NULL")
    cursor.execute("UPDATE users SET status = 'active' WHERE status IS NULL")
    cursor.execute("UPDATE users SET created_at = datetime('now') WHERE created_at IS NULL")
    cursor.execute("UPDATE users SET updated_at = datetime('now') WHERE updated_at IS NULL")

    # Strictly enforce that at most ONE administrator account can exist in the entire database
    cursor.execute('''
        CREATE TRIGGER IF NOT EXISTS enforce_single_admin_insert
        BEFORE INSERT ON users
        WHEN NEW.role = 'admin'
        BEGIN
            SELECT CASE
                WHEN (SELECT COUNT(*) FROM users WHERE role = 'admin' AND email != NEW.email) >= 1
                THEN RAISE(ABORT, 'CardioPredict Security Violation: Exactly one authorized administrator account is permitted.')
            END;
        END;
    ''')

    cursor.execute('''
        CREATE TRIGGER IF NOT EXISTS enforce_single_admin_update
        BEFORE UPDATE OF role ON users
        WHEN NEW.role = 'admin' AND OLD.role != 'admin'
        BEGIN
            SELECT CASE
                WHEN (SELECT COUNT(*) FROM users WHERE role = 'admin' AND email != NEW.email) >= 1
                THEN RAISE(ABORT, 'CardioPredict Security Violation: Exactly one authorized administrator account is permitted.')
            END;
        END;
    ''')

    # 2. Doctor Profiles table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS doctor_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            qualification TEXT,
            license_number TEXT NOT NULL,
            registration_authority TEXT,
            jurisdiction TEXT,
            specialization TEXT NOT NULL,
            hospital_name TEXT NOT NULL,
            experience_years INTEGER DEFAULT 0,
            bio TEXT,
            professional_phone TEXT,
            clinic_address TEXT,
            approval_status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
            approved_by TEXT,
            approved_at DATETIME,
            rejection_reason TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (email) REFERENCES users (email) ON DELETE CASCADE
        )
    ''')

    safe_add_column(cursor, "doctor_profiles", "qualification TEXT")
    safe_add_column(cursor, "doctor_profiles", "registration_authority TEXT")
    safe_add_column(cursor, "doctor_profiles", "jurisdiction TEXT")
    safe_add_column(cursor, "doctor_profiles", "professional_phone TEXT")
    safe_add_column(cursor, "doctor_profiles", "clinic_address TEXT")

    # 3. Patient Profiles table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS patient_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            dob TEXT,
            age INTEGER,
            gender TEXT,
            blood_group TEXT,
            emergency_contact_name TEXT,
            emergency_contact_phone TEXT,
            emergency_contact TEXT,
            address TEXT,
            allergies TEXT,
            chronic_conditions TEXT,
            current_medications TEXT,
            dietary_preference TEXT DEFAULT 'standard',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (email) REFERENCES users (email) ON DELETE CASCADE
        )
    ''')

    safe_add_column(cursor, "patient_profiles", "dob TEXT")
    safe_add_column(cursor, "patient_profiles", "emergency_contact_name TEXT")
    safe_add_column(cursor, "patient_profiles", "emergency_contact_phone TEXT")

    # 4. Doctor-Patient Assignments & Consent
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS doctor_patient_assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            doctor_email TEXT NOT NULL,
            patient_email TEXT NOT NULL,
            consent_granted INTEGER DEFAULT 1,
            consent_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            assigned_by TEXT DEFAULT 'patient_request',
            status TEXT DEFAULT 'active', -- 'active', 'revoked'
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(doctor_email, patient_email),
            FOREIGN KEY (doctor_email) REFERENCES users (email),
            FOREIGN KEY (patient_email) REFERENCES users (email)
        )
    ''')

    # 5. Medical Reports Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS medical_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_email TEXT NOT NULL,
            report_title TEXT,
            original_filename TEXT NOT NULL,
            stored_filename TEXT NOT NULL,
            file_path TEXT NOT NULL,
            file_size INTEGER,
            extraction_method TEXT DEFAULT 'digital', -- 'digital', 'ocr', 'hybrid', 'manual'
            raw_text TEXT,
            extracted_data TEXT, -- JSON of clinical attributes
            verified_data TEXT,  -- JSON with patient corrections
            status TEXT DEFAULT 'uploaded', -- 'uploaded', 'predicted', 'reviewed', 'manual_entry'
            doctor_review_requested INTEGER DEFAULT 0,
            reviewed_by TEXT,
            reviewed_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_email) REFERENCES users (email) ON DELETE CASCADE
        )
    ''')

    # 6. Predictions table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            disease_name TEXT NOT NULL,
            score REAL,
            risk TEXT,
            model_version TEXT DEFAULT 'v2.1-ensemble',
            report_id INTEGER,
            features_snapshot TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    safe_add_column(cursor, "predictions", "report_id INTEGER")
    safe_add_column(cursor, "predictions", "model_version TEXT DEFAULT 'v2.1-ensemble'")
    safe_add_column(cursor, "predictions", "features_snapshot TEXT")

    # 7. Appointments table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS appointments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_email TEXT NOT NULL,
            doctor_email TEXT NOT NULL,
            appointment_date TEXT NOT NULL, -- YYYY-MM-DD
            time_slot TEXT NOT NULL,        -- e.g. "10:00 - 10:30 AM"
            reason TEXT,
            status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'rejected', 'completed', 'cancelled'
            doctor_notes TEXT,
            rejection_reason TEXT,
            follow_up_recommendation TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_email) REFERENCES users (email),
            FOREIGN KEY (doctor_email) REFERENCES users (email)
        )
    ''')
    safe_add_column(cursor, "appointments", "rejection_reason TEXT")

    # 8. Consultation Notes & Recommendations
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS consultation_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            doctor_email TEXT NOT NULL,
            patient_email TEXT NOT NULL,
            report_id INTEGER,
            clinical_notes TEXT NOT NULL,
            dietary_guidance TEXT,
            exercise_guidance TEXT,
            follow_up_advice TEXT,
            follow_up_date TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (doctor_email) REFERENCES users (email),
            FOREIGN KEY (patient_email) REFERENCES users (email),
            FOREIGN KEY (report_id) REFERENCES medical_reports (id)
        )
    ''')
    safe_add_column(cursor, "consultation_notes", "follow_up_date TEXT")

    # 9. Real Food Catalog (Evidence-Based Nutrition Database)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS food_catalog (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            category TEXT NOT NULL, -- 'Vegetables', 'Fruits', 'Legumes & Pulses', 'Whole Grains', 'Healthy Fats & Oils', 'Lean Proteins', 'Nuts & Seeds'
            calories_per_100g REAL,
            protein_g REAL,
            fat_g REAL,
            saturated_fat_g REAL,
            fiber_g REAL,
            sodium_mg REAL,
            potassium_mg REAL,
            serving_size TEXT,
            supported_conditions TEXT, -- JSON array e.g. ["hypertension", "cad", "heart_attack", "stroke", "general"]
            contraindications TEXT,   -- JSON array e.g. ["kidney_disease", "nut_allergy", "fluid_restriction"]
            evidence_source TEXT,      -- e.g. 'AHA / USDA FoodData Central'
            source_url TEXT,           -- direct official link
            clinical_rationale TEXT,
            is_verified INTEGER DEFAULT 1,
            last_reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 10. Disease Dietary Guidance (Condition-Specific Clinical Protocols)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS disease_dietary_guidance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            disease_key TEXT UNIQUE NOT NULL, -- 'hypertension', 'cad', 'heart_failure', 'heart_attack', 'stroke'
            title TEXT NOT NULL,
            guidance_summary TEXT NOT NULL,
            sodium_recommendation TEXT,
            fat_recommendation TEXT,
            fiber_recommendation TEXT,
            potassium_recommendation TEXT,
            evidence_source TEXT NOT NULL,
            source_url TEXT NOT NULL,
            last_reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 11. Legacy diet_resources table (kept for backward compatibility with existing tests)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS diet_resources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            target_condition TEXT DEFAULT 'general',
            short_summary TEXT,
            recommended_foods TEXT,
            foods_to_limit TEXT,
            sample_meals TEXT,
            hydration_salt_guidance TEXT,
            is_active INTEGER DEFAULT 1,
            created_by TEXT DEFAULT 'system',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 12. Wellness & Yoga Resources (Verified Videos, Breathing, Stretching)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS wellness_resources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            category TEXT NOT NULL, -- 'breathing', 'relaxation', 'gentle_yoga', 'stretching', 'aerobic'
            video_url TEXT NOT NULL,
            thumbnail_url TEXT,
            duration TEXT,
            difficulty TEXT DEFAULT 'Gentle',
            step_instructions TEXT,
            target_benefits TEXT,
            safety_contraindications TEXT,
            is_active INTEGER DEFAULT 1,
            created_by TEXT DEFAULT 'system',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 13. Favorite Resources
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS favorite_resources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_email TEXT NOT NULL,
            resource_type TEXT NOT NULL, -- 'diet', 'wellness', 'food'
            resource_id INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_email, resource_type, resource_id),
            FOREIGN KEY (user_email) REFERENCES users (email) ON DELETE CASCADE
        )
    ''')

    # 14. In-App Notifications
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_email TEXT NOT NULL,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT DEFAULT 'info', -- 'info', 'success', 'warning', 'appointment', 'review'
            link TEXT,
            is_read INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_email) REFERENCES users (email) ON DELETE CASCADE
        )
    ''')

    # 15. System Audit Logs
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            user_email TEXT,
            actor_email TEXT,
            actor_role TEXT,
            action TEXT NOT NULL,
            target_type TEXT,
            target_id TEXT,
            status TEXT DEFAULT 'success',
            details TEXT,
            ip_address TEXT,
            user_agent TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    safe_add_column(cursor, "audit_logs", "event_id TEXT")
    safe_add_column(cursor, "audit_logs", "actor_email TEXT")
    safe_add_column(cursor, "audit_logs", "actor_role TEXT")
    safe_add_column(cursor, "audit_logs", "status TEXT DEFAULT 'success'")
    safe_add_column(cursor, "audit_logs", "user_agent TEXT")
    safe_add_column(cursor, "audit_logs", "timestamp DATETIME")

    # 16. Privacy Requests (GDPR/HIPAA Data Export and Deletion Workflow)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS privacy_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_email TEXT NOT NULL,
            request_type TEXT NOT NULL, -- 'export', 'deletion'
            status TEXT DEFAULT 'pending', -- 'pending', 'completed', 'rejected'
            details TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            resolved_at DATETIME,
            FOREIGN KEY (user_email) REFERENCES users (email) ON DELETE CASCADE
        )
    ''')

    # 17. Disease Education table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS disease_education (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            disease_key TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            short_desc TEXT,
            overview TEXT,
            symptoms TEXT,
            risk_factors TEXT,
            prevention TEXT,
            warning_signs TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 18. Contacts table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            message TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 19. Real Patient Feedback & In-App Support System
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS patient_feedback (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            feedback_id TEXT UNIQUE NOT NULL,
            patient_email TEXT NOT NULL,
            patient_name TEXT,
            category TEXT NOT NULL,
            subject TEXT NOT NULL,
            message TEXT NOT NULL,
            rating INTEGER,
            status TEXT DEFAULT 'Submitted', -- 'Submitted', 'In Review', 'Responded', 'Closed'
            admin_response TEXT,
            responded_by TEXT,
            responded_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_email) REFERENCES users (email) ON DELETE CASCADE
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS feedback_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            feedback_id TEXT NOT NULL,
            sender_email TEXT NOT NULL,
            sender_name TEXT,
            sender_role TEXT NOT NULL, -- 'patient' or 'admin'
            message TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (feedback_id) REFERENCES patient_feedback (feedback_id) ON DELETE CASCADE
        )
    ''')

    # 20. Administrator Managed Doctor Profiles (10 Demo Profiles)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS managed_doctors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            doctor_code TEXT UNIQUE NOT NULL,
            display_name TEXT NOT NULL,
            specialization TEXT NOT NULL,
            qualifications TEXT NOT NULL,
            experience_years INTEGER DEFAULT 0,
            availability_status TEXT DEFAULT 'Available', -- 'Available', 'Busy', 'On Leave'
            is_active INTEGER DEFAULT 1,
            is_demo INTEGER DEFAULT 1,
            hospital_affiliation TEXT,
            department_notes TEXT,
            contact_email TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 21. Doctor Suggestion and Administrator-Controlled Assignment
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS doctor_assignments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            assignment_id TEXT UNIQUE NOT NULL,
            patient_email TEXT NOT NULL,
            patient_name TEXT,
            report_id INTEGER,
            primary_condition TEXT NOT NULL,
            risk_level TEXT NOT NULL,
            risk_score REAL,
            suggested_specialty TEXT NOT NULL,
            suggested_doctor_id INTEGER,
            clinical_rationale TEXT NOT NULL,
            status TEXT DEFAULT 'Pending Review', -- 'Pending Review', 'Assigned', 'Unassigned', 'Completed'
            assigned_doctor_id INTEGER,
            admin_notes TEXT,
            reviewed_by TEXT,
            reviewed_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_email) REFERENCES users (email) ON DELETE CASCADE,
            FOREIGN KEY (suggested_doctor_id) REFERENCES managed_doctors (id) ON DELETE SET NULL,
            FOREIGN KEY (assigned_doctor_id) REFERENCES managed_doctors (id) ON DELETE SET NULL
        )
    ''')

    # 22. AI-Powered Food Recommendations History
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ai_food_recommendations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_email TEXT NOT NULL,
            report_id INTEGER,
            primary_condition TEXT,
            risk_level TEXT,
            recommendations_json TEXT NOT NULL,
            ai_model_name TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_email) REFERENCES users (email) ON DELETE CASCADE
        )
    ''')

    # 22b. AI-Powered Prediction Analysis & Clinical Explanation
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS ai_prediction_analyses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_email TEXT NOT NULL,
            report_id INTEGER,
            primary_condition TEXT,
            risk_level TEXT,
            analysis_json TEXT NOT NULL,
            ai_model_name TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_email) REFERENCES users (email) ON DELETE CASCADE
        )
    ''')

    # 23. Patient Yoga & Daily Wellness Activity Logs
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS patient_wellness_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_email TEXT NOT NULL,
            log_date DATE NOT NULL,
            activity_key TEXT NOT NULL,
            activity_name TEXT NOT NULL,
            duration_minutes INTEGER DEFAULT 0,
            completed INTEGER DEFAULT 1,
            journal_entry TEXT,
            mood TEXT, -- 'Calm', 'Energized', 'Relaxed', 'Tired'
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_email) REFERENCES users (email) ON DELETE CASCADE
        )
    ''')

    # 24. Patient Wellness Preferences & Reminders
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS patient_wellness_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_email TEXT UNIQUE NOT NULL,
            reminders_enabled INTEGER DEFAULT 1,
            preferred_duration INTEGER DEFAULT 15,
            preferred_intensity TEXT DEFAULT 'beginner', -- 'beginner', 'seated', 'gentle'
            requires_seated_modification INTEGER DEFAULT 0,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_email) REFERENCES users (email) ON DELETE CASCADE
        )
    ''')

    conn.commit()

    # Seed baseline verified food catalog, default accounts, and 10 demo doctor profiles
    seed_verified_food_data(conn)
    seed_default_accounts(conn)
    seed_managed_doctors(conn)

    conn.close()

def log_audit(actor_email, action, target_type=None, target_id=None, details=None, ip_address=None, status="success", actor_role=None, user_agent=None):
    """
    Robust server-side audit logging service.
    Generates unique event_id and captures actor identity, target, status, and IP address.
    """
    try:
        conn = get_db_connection()
        event_id = str(uuid.uuid4())
        now_utc = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

        conn.execute('''
            INSERT INTO audit_logs
            (event_id, timestamp, user_email, actor_email, actor_role, action, target_type, target_id, status, details, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            event_id,
            now_utc,
            actor_email,
            actor_email,
            actor_role,
            action,
            target_type,
            str(target_id) if target_id else None,
            status,
            details,
            ip_address,
            user_agent
        ))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Failed to record audit log: {e}")

def create_notification(user_email, title, message, notif_type='info', link=None):
    """Utility to dispatch in-app notifications."""
    try:
        conn = get_db_connection()
        conn.execute('''
            INSERT INTO notifications (user_email, title, message, type, link)
            VALUES (?, ?, ?, ?, ?)
        ''', (user_email, title, message, notif_type, link))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Failed to create notification: {e}")

def seed_default_accounts(conn):
    """
    Sets up the initial administrator and demo patient for system testing.
    Doctor role is removed completely - only Patient and Admin exist.
    """
    cursor = conn.cursor()

    # Initial Admin Setup (only if no admin exists)
    cursor.execute("SELECT email FROM users WHERE role = 'admin'")
    if not cursor.fetchone():
        admin_email = (os.getenv("ADMIN_EMAIL") or "admin@cardiopredict.org").strip().lower()
        admin_pass = generate_password_hash(os.getenv("ADMIN_PASSWORD") or "Admin@12345")
        admin_name = os.getenv("ADMIN_NAME") or "System Administrator"
        admin_phone = os.getenv("ADMIN_PHONE") or "9876543210"
        cursor.execute('''
            INSERT OR REPLACE INTO users (email, username, full_name, phone, password, role, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'admin', 'active', datetime('now'), datetime('now'))
        ''', (admin_email, admin_name, admin_name, admin_phone, admin_pass))
        print(f"✅ Initial Administrator established: {admin_email}")

    # Initial Active Patient (Demo testing)
    patient_email = "patient.elena@cardiopredict.org"
    cursor.execute("SELECT email FROM users WHERE email = ?", (patient_email,))
    if not cursor.fetchone():
        patient_pass = generate_password_hash("Patient@12345")
        cursor.execute('''
            INSERT INTO users (email, username, full_name, phone, password, role, status, dob, consent_privacy, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'patient', 'active', '1988-06-15', 1, datetime('now'), datetime('now'))
        ''', (patient_email, "elena_r", "Elena Rostova", "9898989898", patient_pass))

        cursor.execute('''
            INSERT OR REPLACE INTO patient_profiles
            (email, dob, age, gender, blood_group, emergency_contact_name, emergency_contact_phone, address, allergies, chronic_conditions, current_medications, dietary_preference)
            VALUES (?, '1988-06-15', 36, 'Female', 'O+', 'Alexander Rostova', '9876543211', 'Seattle, WA', 'None reported', 'Mild seasonal allergies', 'None', 'standard')
        ''', (patient_email,))

    conn.commit()

def seed_verified_food_data(conn):
    """
    Populates food_catalog and disease_dietary_guidance with real nutrient data
    and official guidance from WHO, AHA, NHLBI, USDA FoodData Central, and ICMR-NIN.
    """
    cursor = conn.cursor()

    # 1. Condition-Specific Clinical Guidance
    guidelines = [
        (
            "hypertension",
            "DASH Dietary Pattern for Hypertension Management",
            "The Dietary Approaches to Stop Hypertension (DASH) eating plan is proven to lower blood pressure. It emphasizes vegetables, fruits, whole grains, and lean proteins while restricting sodium and saturated fat.",
            "Sodium limit: < 1500 mg per day for optimal blood pressure reduction.",
            "Total fat < 27% of total calories; saturated fat < 6%. Zero industrial trans-fat.",
            "Target 30 g or more of dietary fiber daily from whole grains, legumes, and produce.",
            "Aim for 3500-4700 mg of potassium per day from whole foods (not supplements) unless renal restriction applies.",
            "National Heart, Lung, and Blood Institute (NHLBI) & American Heart Association (AHA)",
            "https://www.nhlbi.nih.gov/education/dash-eating-plan"
        ),
        (
            "cad",
            "Cardiovascular Plaque Stabilization & Atherosclerosis Mitigation Protocol",
            "Targets reduction in circulating atherogenic apolipoprotein B-containing lipoproteins (LDL-C) and systemic vascular inflammation through viscous soluble fiber, omega-3 fatty acids, and polyphenol-rich plant foods.",
            "Sodium intake < 2000 mg daily to reduce left ventricular afterload.",
            "Saturated fat strictly below 5-6% of total caloric intake; replace with monounsaturated and polyunsaturated fats.",
            "Consume 25-35 g of soluble fiber daily (such as beta-glucan from oats and barley) to bind intestinal bile acids.",
            "Maintain balanced dietary potassium through varied legumes, leafy vegetables, and fruits.",
            "American Heart Association (AHA) Lifestyle Guidelines for CVD Prevention",
            "https://www.heart.org/en/healthy-living/healthy-eating/eat-smart/fats/saturated-fats"
        ),
        (
            "heart_failure",
            "Heart Failure Hemodynamic & Fluid Balance Dietary Protocol",
            "Focuses on maintaining euvolemia, preventing fluid congestion, and supporting cardiac myocyte metabolic efficiency. Prescribed sodium limits must be individualized by the treating cardiologist.",
            "Individualized sodium restriction: usually 1500 - 2000 mg/day as directed by clinician.",
            "Lean proteins to prevent cardiac cachexia; avoid high-sodium processed meats and cheeses.",
            "Adequate fiber from easily digestible vegetables and whole grains; avoid gas-producing legumes in acute dyspnea.",
            "CAUTION: Do not use potassium-based salt substitutes or take potassium supplements without physician review, as ACE inhibitors / ARBs / MRAs can cause hyperkalemia.",
            "American College of Cardiology / American Heart Association (ACC/AHA) Heart Failure Guidelines",
            "https://www.heart.org/en/health-topics/heart-failure"
        ),
        (
            "heart_attack",
            "Post-Myocardial Infarction Secondary Prevention Nutrition",
            "Comprehensive heart-healthy Mediterranean pattern designed to accelerate endothelial healing, stabilize vulnerable coronary plaques, and reduce recurrent ischemic events.",
            "Sodium < 1500-2000 mg/day to control myocardial oxygen demand.",
            "High in marine EPA/DHA and plant ALA omega-3 fatty acids to lower post-infarct ventricular arrhythmia vulnerability.",
            "High in antioxidant vitamins C and E and dietary fiber to counteract ischemia-reperfusion oxidative stress.",
            "Maintain dietary potassium through food sources to support normal cardiac conduction.",
            "American Heart Association (AHA) Life After a Heart Attack Guidelines",
            "https://www.heart.org/en/health-topics/heart-attack/life-after-a-heart-attack"
        ),
        (
            "stroke",
            "Cerebrovascular Health & Microvascular Stroke Prevention Diet",
            "Emphasizes arterial elasticity, blood pressure stabilization, and neurovascular protection through dietary nitrates, polyphenols, and potassium-rich plant foods.",
            "Strict sodium limitation < 1500 mg daily to prevent intracranial arterial wall shear stress.",
            "Plant-derived monounsaturated fats (extra virgin olive oil) and omega-3s to preserve cerebral perfusion.",
            "30 g+ dietary fiber daily to stabilize postprandial glucose and prevent microvascular glycemic spikes.",
            "Adequate dietary magnesium and potassium to support cerebral vascular tone.",
            "American Stroke Association (ASA) / American Heart Association (AHA) Guidelines",
            "https://www.stroke.org/en/about-stroke/stroke-risk-factors/healthy-eating-and-stroke"
        )
    ]

    for g in guidelines:
        cursor.execute('''
            INSERT OR REPLACE INTO disease_dietary_guidance
            (disease_key, title, guidance_summary, sodium_recommendation, fat_recommendation, fiber_recommendation, potassium_recommendation, evidence_source, source_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', g)

    # 2. Real Food Catalog with Verified Nutrients per 100g
    # Nutrients verified against USDA FoodData Central and ICMR-NIN Food Composition Tables
    foods = [
        # Grains
        (
            "Steel-Cut Whole Oats",
            "Whole Grains",
            375.0, 13.2, 6.5, 1.2, 10.6, 2.0, 362.0,
            "40g dry (approx. 1 cup cooked)",
            json.dumps(["cad", "hypertension", "heart_attack", "stroke", "general"]),
            json.dumps([]),
            "USDA FoodData Central (#1101825) & American Heart Association",
            "https://fdc.nal.usda.gov/",
            "Contains beta-glucan soluble fiber that binds cholesterol in the digestive tract, actively lowering circulating LDL levels."
        ),
        (
            "Brown Basmati Rice",
            "Whole Grains",
            360.0, 7.5, 2.7, 0.6, 3.5, 4.0, 223.0,
            "1/2 cup cooked (approx. 100g)",
            json.dumps(["hypertension", "cad", "stroke", "general"]),
            json.dumps([]),
            "ICMR-National Institute of Nutrition (NIN) & USDA",
            "https://fdc.nal.usda.gov/",
            "Low glycemic whole grain providing slow-release carbohydrates, magnesium, and dietary fiber without sodium."
        ),
        (
            "Whole Grain Quinoa",
            "Whole Grains",
            368.0, 14.1, 6.1, 0.7, 7.0, 5.0, 563.0,
            "1/2 cup cooked (approx. 90g)",
            json.dumps(["hypertension", "cad", "heart_failure", "stroke", "general"]),
            json.dumps([]),
            "USDA FoodData Central (#168874)",
            "https://fdc.nal.usda.gov/",
            "Complete plant protein containing all nine essential amino acids, rich in magnesium which assists in blood pressure regulation."
        ),

        # Legumes & Pulses
        (
            "Moong Dal (Yellow Split Mung Beans)",
            "Legumes & Pulses",
            347.0, 24.0, 1.2, 0.3, 16.3, 15.0, 1246.0,
            "1/2 cup cooked (approx. 100g)",
            json.dumps(["hypertension", "cad", "stroke", "general"]),
            json.dumps(["kidney_disease"]),
            "ICMR-National Institute of Nutrition (NIN) Tables of Indian Foods",
            "https://www.nin.res.in/",
            "High-protein, easy-to-digest pulse rich in potassium and dietary fiber; helps reduce arterial stiffness and stabilizes blood pressure."
        ),
        (
            "Chickpeas (Garbanzo / Kabuli Chana)",
            "Legumes & Pulses",
            364.0, 19.3, 6.0, 0.6, 17.4, 24.0, 875.0,
            "1/2 cup cooked (approx. 82g)",
            json.dumps(["cad", "hypertension", "stroke", "general"]),
            json.dumps(["kidney_disease"]),
            "USDA FoodData Central (#173757)",
            "https://fdc.nal.usda.gov/",
            "High in soluble fiber and resistant starch, binding bile salts to lower LDL cholesterol while providing substantial satiety."
        ),
        (
            "Red Lentils (Masoor Dal)",
            "Legumes & Pulses",
            353.0, 24.6, 1.1, 0.2, 10.7, 6.0, 677.0,
            "1/2 cup cooked (approx. 100g)",
            json.dumps(["hypertension", "cad", "heart_attack", "general"]),
            json.dumps(["kidney_disease"]),
            "ICMR-NIN & USDA FoodData Central (#172420)",
            "https://www.nin.res.in/",
            "Abundant in dietary folate and magnesium, supporting normal endothelial vascular function and preventing homocysteine accumulation."
        ),

        # Vegetables
        (
            "Fresh Baby Spinach (Palak)",
            "Vegetables",
            23.0, 2.9, 0.4, 0.1, 2.2, 79.0, 558.0,
            "1 cup raw or 1/2 cup cooked",
            json.dumps(["hypertension", "cad", "stroke", "heart_attack", "general"]),
            json.dumps(["kidney_disease"]),
            "USDA FoodData Central (#1999633) & American Heart Association",
            "https://www.heart.org/en/healthy-living/healthy-eating",
            "Rich in dietary inorganic nitrates, potassium, and lutein; promotes endothelial nitric oxide generation and arterial dilation."
        ),
        (
            "Beetroot (Chukandar)",
            "Vegetables",
            43.0, 1.6, 0.2, 0.0, 2.8, 78.0, 325.0,
            "1/2 cup boiled or sliced (approx. 85g)",
            json.dumps(["hypertension", "cad", "stroke", "general"]),
            json.dumps(["kidney_disease"]),
            "American Heart Association & USDA (#169145)",
            "https://www.heart.org/",
            "High concentration of dietary nitrates proven in clinical trials to systematically reduce systolic and diastolic blood pressure."
        ),
        (
            "Fresh Garlic (Lahsun)",
            "Vegetables",
            149.0, 6.4, 0.5, 0.1, 2.1, 17.0, 401.0,
            "1-2 fresh cloves daily (approx. 6g)",
            json.dumps(["hypertension", "cad", "stroke", "general"]),
            json.dumps([]),
            "USDA FoodData Central (#169230) & Peer-Reviewed Clinical Trials",
            "https://fdc.nal.usda.gov/",
            "Contains active allicin which inhibits angiotensin II activity and supports arterial flexibility."
        ),
        (
            "Fenugreek Leaves (Fresh Methi)",
            "Vegetables",
            49.0, 4.4, 0.9, 0.2, 3.2, 67.0, 770.0,
            "1 cup fresh chopped leaves (approx. 50g)",
            json.dumps(["cad", "hypertension", "general"]),
            json.dumps([]),
            "ICMR-National Institute of Nutrition (NIN)",
            "https://www.nin.res.in/",
            "Traditional Indian green containing bioactive saponins and galactomannan fiber that reduce intestinal cholesterol absorption."
        ),
        (
            "Steamed Broccoli Florets",
            "Vegetables",
            35.0, 2.4, 0.4, 0.1, 2.6, 41.0, 293.0,
            "1 cup chopped florets (approx. 90g)",
            json.dumps(["cad", "hypertension", "stroke", "general"]),
            json.dumps([]),
            "USDA FoodData Central (#170379)",
            "https://fdc.nal.usda.gov/",
            "Provides sulforaphane, an isothiocyanate compound that upregulates anti-inflammatory cytoprotective proteins in coronary arteries."
        ),

        # Fruits
        (
            "Fresh Blueberries",
            "Fruits",
            57.0, 0.7, 0.3, 0.0, 2.4, 1.0, 77.0,
            "1/2 cup fresh berries (approx. 75g)",
            json.dumps(["cad", "stroke", "hypertension", "heart_attack", "general"]),
            json.dumps([]),
            "American Heart Association & USDA (#171711)",
            "https://www.heart.org/",
            "Rich in anthocyanin flavonoids that scavenge reactive oxygen species and improve arterial endothelial flow-mediated dilation."
        ),
        (
            "Fresh Pomegranate Seeds (Anar)",
            "Fruits",
            83.0, 1.7, 1.2, 0.1, 4.0, 3.0, 236.0,
            "1/2 cup fresh arils (approx. 87g)",
            json.dumps(["cad", "stroke", "hypertension", "general"]),
            json.dumps([]),
            "USDA FoodData Central (#169134)",
            "https://fdc.nal.usda.gov/",
            "Contains punicalagins, unique potent polyphenols shown to prevent oxidation of circulating low-density lipoproteins (LDL)."
        ),
        (
            "Red Apple with Peel",
            "Fruits",
            52.0, 0.3, 0.2, 0.0, 2.4, 1.0, 107.0,
            "1 medium apple (approx. 180g)",
            json.dumps(["cad", "stroke", "general"]),
            json.dumps([]),
            "USDA FoodData Central (#171688) & AHA",
            "https://fdc.nal.usda.gov/",
            "Provides soluble pectin fiber and quercetin, supporting cardiovascular vascular tone and bile acid excretion."
        ),

        # Healthy Fats & Oils
        (
            "Extra Virgin Olive Oil (Cold-Pressed)",
            "Healthy Fats & Oils",
            884.0, 0.0, 100.0, 14.0, 0.0, 2.0, 1.0,
            "1 tablespoon (approx. 14g / 15ml)",
            json.dumps(["cad", "stroke", "heart_attack", "general"]),
            json.dumps([]),
            "PREDIMED Multicenter Trial & American Heart Association",
            "https://www.heart.org/",
            "Core cornerstone of Mediterranean cardiac nutrition; rich in oleic acid and oleocanthal, attenuating arterial inflammatory cascades."
        ),

        # Nuts & Seeds
        (
            "Raw English Walnuts",
            "Nuts & Seeds",
            654.0, 15.2, 65.2, 6.1, 6.7, 2.0, 441.0,
            "1 ounce / 7 whole shelled walnuts (approx. 28g)",
            json.dumps(["cad", "heart_attack", "stroke", "general"]),
            json.dumps(["nut_allergy", "kidney_disease"]),
            "American Heart Association & USDA (#170187)",
            "https://www.heart.org/en/healthy-living/healthy-eating",
            "Premier plant source of alpha-linolenic acid (ALA) omega-3, supporting vascular elasticity and microvascular endothelial health."
        ),
        (
            "Raw Unsalted Almonds (Badam)",
            "Nuts & Seeds",
            579.0, 21.2, 49.9, 3.8, 12.5, 1.0, 733.0,
            "20-23 kernels (approx. 28g)",
            json.dumps(["cad", "hypertension", "general"]),
            json.dumps(["nut_allergy", "kidney_disease"]),
            "USDA FoodData Central (#170567)",
            "https://fdc.nal.usda.gov/",
            "High in natural alpha-tocopherol (Vitamin E) and plant sterols, guarding arterial membranes against lipid peroxidation."
        ),
        (
            "Ground Whole Flaxseeds (Alsi)",
            "Nuts & Seeds",
            534.0, 18.3, 42.2, 3.7, 27.3, 30.0, 813.0,
            "1-2 tablespoons ground daily (approx. 10-15g)",
            json.dumps(["cad", "hypertension", "stroke", "general"]),
            json.dumps(["kidney_disease"]),
            "American Heart Association & USDA (#169414)",
            "https://www.heart.org/",
            "Extremely high in secoisolariciresinol diglucoside (SDG) lignans and soluble mucilage, proven to lower both systolic BP and total LDL."
        ),
        (
            "Whole Chia Seeds",
            "Nuts & Seeds",
            486.0, 16.5, 30.7, 3.3, 34.4, 16.0, 407.0,
            "1 tablespoon (approx. 12g)",
            json.dumps(["cad", "hypertension", "stroke", "general"]),
            json.dumps([]),
            "USDA FoodData Central (#170554)",
            "https://fdc.nal.usda.gov/",
            "Gel-forming soluble fiber and plant omega-3 fatty acids, decelerating carbohydrate digestion and improving vascular compliance."
        ),

        # Lean Proteins & Dairy
        (
            "Wild-Caught Salmon (Cooked)",
            "Lean Proteins",
            182.0, 25.4, 8.1, 1.3, 0.0, 60.0, 384.0,
            "3.5 oz / 100g cooked filet",
            json.dumps(["cad", "heart_attack", "heart_failure", "stroke", "general"]),
            json.dumps([]),
            "American Heart Association (AHA) Scientific Advisory",
            "https://www.heart.org/",
            "High concentrations of long-chain marine omega-3 fatty acids (EPA and DHA) that lower serum triglycerides and reduce ventricular arrhythmias."
        ),
        (
            "Skinless Baked Chicken Breast",
            "Lean Proteins",
            165.0, 31.0, 3.6, 1.0, 0.0, 74.0, 256.0,
            "3.5 oz / 100g portion",
            json.dumps(["heart_failure", "cad", "heart_attack", "general"]),
            json.dumps([]),
            "USDA FoodData Central (#171077)",
            "https://fdc.nal.usda.gov/",
            "Lean animal protein with minimal saturated fat, providing essential amino acids to prevent cardiac muscle wasting without sodium overload."
        ),
        (
            "Plain Non-Fat Greek Yogurt",
            "Lean Proteins",
            59.0, 10.2, 0.4, 0.1, 0.0, 36.0, 141.0,
            "3/4 cup (approx. 170g)",
            json.dumps(["hypertension", "stroke", "general"]),
            json.dumps([]),
            "USDA FoodData Central (#170889) & DASH Protocol",
            "https://fdc.nal.usda.gov/",
            "Provides bioavailable calcium and peptides associated with angiotensin-converting enzyme (ACE) inhibition in clinical DASH trials."
        ),
        (
            "Organic Firm Tofu",
            "Lean Proteins",
            76.0, 8.1, 4.8, 0.7, 1.9, 7.0, 121.0,
            "1/2 cup cubed (approx. 126g)",
            json.dumps(["cad", "hypertension", "stroke", "general"]),
            json.dumps([]),
            "USDA FoodData Central (#172448) & AHA",
            "https://fdc.nal.usda.gov/",
            "Soy isoflavones and plant protein shown to safely substitute for high-saturated-fat animal proteins in cardiovascular risk profiles."
        )
    ]

    for f in foods:
        cursor.execute('''
            INSERT OR REPLACE INTO food_catalog
            (name, category, calories_per_100g, protein_g, fat_g, saturated_fat_g, fiber_g, sodium_mg, potassium_mg, serving_size, supported_conditions, contraindications, evidence_source, source_url, clinical_rationale)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', f)

    # 3. Verified Cardiac Rehabilitation & Breathing Sessions
    cursor.execute("SELECT COUNT(*) FROM wellness_resources")
    if cursor.fetchone()[0] == 0:
        wellness_items = [
            (
                "Anulom Vilom Pranayama (Cardiac Vagal Tone & Autonomic Balance)",
                "breathing",
                "https://www.youtube.com/embed/YmqP0c5f20k",
                "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800",
                "10 mins",
                "Gentle",
                json.dumps([
                    "Sit upright in a comfortable chair with your spine straight and shoulders relaxed.",
                    "Close your right nostril with your right thumb and inhale slowly and deeply through your left nostril for 4 seconds.",
                    "Close your left nostril with your ring finger, release your thumb, and exhale gently through your right nostril for 6 seconds.",
                    "Inhale through the right nostril for 4 seconds, then switch and exhale through the left for 6 seconds.",
                    "Continue this rhythmic cadence smoothly for 5 to 10 minutes."
                ]),
                "Stimulates the vagus nerve, enhances baroreceptor sensitivity, reduces sympathetic outflow, and helps lower systolic blood pressure.",
                "Clinical Caution: Do not hold your breath (avoid Kumbhaka). Breathe at a relaxed, unhurried pace. Discontinue if you feel lightheaded."
            ),
            (
                "Gentle Cardiac Yoga Flow (Joint Mobility & Vascular Elasticity)",
                "gentle_yoga",
                "https://www.youtube.com/embed/g_tea8ZNk5A",
                "https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800",
                "15 mins",
                "Gentle",
                json.dumps([
                    "Begin with gentle neck and shoulder rolls to release tension in the cervical and thoracic regions.",
                    "Seated Cat-Cow: Inhale while gently lifting the chest; exhale while rounding the spine smoothly.",
                    "Seated Side Stretch: Elevate one arm and lean gently sideways without straining or breath-holding.",
                    "Gentle Ankle and Calf Pumps: Point and flex feet to stimulate venous return from the lower limbs.",
                    "Conclude with 3 minutes of quiet, diaphragmatic breathing in Savasana."
                ]),
                "Maintains peripheral vascular tone, stimulates musculoskeletal lymphatic circulation, and preserves joint range of motion without increasing cardiac workload.",
                "Clinical Caution: Avoid rapid position transitions from floor to standing (prevent orthostatic hypotension). Avoid inverted postures where the head is below the heart."
            ),
            (
                "Diaphragmatic Deep Relaxation for Cardiovascular Stress Reduction",
                "relaxation",
                "https://www.youtube.com/embed/inpok4MKVLM",
                "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=800",
                "12 mins",
                "Gentle",
                json.dumps([
                    "Lie on your back or recline comfortably with a cushion beneath your knees.",
                    "Place one hand on your chest and the other on your upper abdomen.",
                    "Inhale slowly through your nose, letting your abdomen gently expand while keeping your chest still.",
                    "Exhale slowly through pursed lips, allowing abdominal muscles to fall naturally.",
                    "Progressively release tension from toes to scalp with each exhalation."
                ]),
                "Reduces circulating cortisol and catecholamines, mitigates arterial vasoconstriction, and promotes parasympathetic stabilization.",
                "Clinical Caution: Safe for all cardiac patients. Can be practiced during periods of mild emotional stress or prior to sleep."
            ),
            (
                "Low-Impact Cardiac Rehabilitation Walking Guidance",
                "aerobic",
                "https://www.youtube.com/embed/enYITYwvPAQ",
                "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800",
                "20 mins",
                "Beginner",
                json.dumps([
                    "Begin with a 5-minute warm-up walk at a very comfortable, conversational pace.",
                    "Maintain an upright posture, swinging your arms naturally and rhythmically.",
                    "Walk at a moderate tempo where you can easily speak full sentences without gasping (Borg RPE scale 11-13).",
                    "Cool down for 5 minutes by gradually reducing walking speed and performing gentle calf stretches."
                ]),
                "Improves myocardial capillary perfusion, increases HDL-C, promotes endothelial nitric oxide synthase activity, and assists in long-term weight management.",
                "Clinical Caution: Stop immediately if you experience angina, palpitations, sudden dizziness, or unusual dyspnea. Consult your cardiologist before increasing walking speed."
            )
        ]

        for w in wellness_items:
            cursor.execute('''
                INSERT INTO wellness_resources
                (title, category, video_url, thumbnail_url, duration, difficulty, step_instructions, target_benefits, safety_contraindications)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', w)

    conn.commit()

def seed_managed_doctors(conn):
    """
    Seeds 10 clearly labelled demonstration doctor profiles for administrator assignment testing.
    All profiles are explicitly marked as is_demo = 1 with prominent educational labels.
    """
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM managed_doctors WHERE is_demo = 1")
    count = cursor.fetchone()[0]
    if count >= 10:
        return

    demo_doctors = [
        (
            "DOC-DEMO-001",
            "Dr. Aravind Swaminathan (Demo Profile)",
            "Cardiology",
            "MBBS, MD (General Medicine), DM (Cardiology)",
            18,
            "Available",
            1, 1,
            "Apollo Heart Institute (Simulated Wing)",
            "Specializes in ischemic heart disease, angina evaluation, and comprehensive cardiovascular assessment.",
            "dr.aravind.demo@hospital-sim.org"
        ),
        (
            "DOC-DEMO-002",
            "Dr. Meenakshi Sundaram (Demo Profile)",
            "Preventive Cardiology",
            "MBBS, DNB (Cardiology), FESC",
            12,
            "Available",
            1, 1,
            "Center for Cardiovascular Prevention (Simulated)",
            "Focuses on lipid disorders, lifestyle risk modification, and early arterial atherosclerosis mitigation.",
            "dr.meenakshi.demo@hospital-sim.org"
        ),
        (
            "DOC-DEMO-003",
            "Dr. Vikramaditya Rao (Demo Profile)",
            "Interventional Cardiology",
            "MBBS, MD, DM (Cardiology), FSCAI",
            16,
            "Available",
            1, 1,
            "Apex Cardiac Care & Catheterization Unit (Simulated)",
            "Expertise in coronary angiogram interpretation, stent follow-up, and acute myocardial infarction management.",
            "dr.vikram.demo@hospital-sim.org"
        ),
        (
            "DOC-DEMO-004",
            "Dr. Ananya Deshmukh (Demo Profile)",
            "Electrophysiology & Arrhythmia",
            "MBBS, MD, Fellowship in Clinical Cardiac EP",
            10,
            "Available",
            1, 1,
            "Heart Rhythm & Pacing Clinic (Simulated)",
            "Specializes in atrial fibrillation, palpitations, ECG rhythm abnormalities, and heart failure synchronization.",
            "dr.ananya.demo@hospital-sim.org"
        ),
        (
            "DOC-DEMO-005",
            "Dr. Sanjay K. Verma (Demo Profile)",
            "Cardiovascular Surgery",
            "MBBS, MS (General Surgery), MCh (CTVS)",
            20,
            "Busy",
            1, 1,
            "Department of Cardiothoracic Surgery (Simulated)",
            "Surgical consultation for coronary artery bypass graft (CABG), valvular heart disease, and aortic aneurysm.",
            "dr.sanjay.demo@hospital-sim.org"
        ),
        (
            "DOC-DEMO-006",
            "Dr. Priya Nair (Demo Profile)",
            "General Medicine",
            "MBBS, MD (General Medicine)",
            14,
            "Available",
            1, 1,
            "Primary Cardiovascular & Internal Care (Simulated)",
            "Broad spectrum internal medicine, baseline cardiac workups, routine metabolic evaluations, and general triage.",
            "dr.priya.demo@hospital-sim.org"
        ),
        (
            "DOC-DEMO-007",
            "Dr. Harish C. Patel (Demo Profile)",
            "Neurology (Stroke Care)",
            "MBBS, MD, DM (Neurology)",
            15,
            "Available",
            1, 1,
            "Comprehensive Stroke & Cerebrovascular Unit (Simulated)",
            "Dedicated to ischemic stroke prevention, carotid artery stenosis, transient ischemic attack (TIA) monitoring.",
            "dr.harish.demo@hospital-sim.org"
        ),
        (
            "DOC-DEMO-008",
            "Dr. Sunita Kulkarni (Demo Profile)",
            "Nephrology & Hypertension",
            "MBBS, MD, DM (Nephrology)",
            11,
            "Available",
            1, 1,
            "Renal-Cardiovascular Interface Clinic (Simulated)",
            "Focus on resistant hypertension, cardiorenal syndrome, secondary blood pressure disorders, and electrolyte balance.",
            "dr.sunita.demo@hospital-sim.org"
        ),
        (
            "DOC-DEMO-009",
            "Dr. Deepak Chhabra (Demo Profile)",
            "Pulmonology",
            "MBBS, MD (Respiratory Medicine), FCCP",
            13,
            "On Leave",
            1, 1,
            "Cardiopulmonary Diagnostic Center (Simulated)",
            "Specialized in pulmonary hypertension, dyspnea differential diagnosis, and exercise tolerance assessment.",
            "dr.deepak.demo@hospital-sim.org"
        ),
        (
            "DOC-DEMO-010",
            "Dr. Shalini Gupta (Demo Profile)",
            "Endocrinology",
            "MBBS, MD, DM (Endocrinology)",
            9,
            "Available",
            1, 1,
            "Cardiometabolic & Diabetic Health Division (Simulated)",
            "Management of diabetic cardiomyopathy, insulin resistance, metabolic syndrome, and advanced dyslipidemia.",
            "dr.shalini.demo@hospital-sim.org"
        )
    ]

    for doc in demo_doctors:
        cursor.execute('''
            INSERT OR IGNORE INTO managed_doctors
            (doctor_code, display_name, specialization, qualifications, experience_years, availability_status, is_active, is_demo, hospital_affiliation, department_notes, contact_email)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', doc)

    conn.commit()
    print("✅ Seeded 10 demonstration doctor profiles for administrator assignment workflow.")

