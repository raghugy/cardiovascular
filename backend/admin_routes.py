# backend/admin_routes.py
import json
from datetime import datetime
from flask import Blueprint, request, jsonify, g
from database import get_db_connection, log_audit, create_notification
from auth_middleware import role_required, get_client_ip

admin_bp = Blueprint("admin_api", __name__)

@admin_bp.route("/dashboard-stats", methods=["GET"])
@role_required(["admin"])
def get_dashboard_stats():
    """
    Returns live statistics from the database for the Admin Dashboard.
    Uses actual DB counts, never hardcoded numbers.
    """
    conn = get_db_connection()
    cursor = conn.cursor()

    # User counts
    cursor.execute("SELECT COUNT(*) FROM users")
    total_users = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'patient'")
    total_patients = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM users WHERE status = 'active'")
    active_accounts = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM users WHERE status IN ('suspended', 'inactive')")
    inactive_or_suspended = cursor.fetchone()[0]

    # Clinical & Model counts
    cursor.execute("SELECT COUNT(*) FROM medical_reports")
    total_uploaded_reports = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM predictions")
    total_predictions = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM audit_logs")
    total_audit_events = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM food_catalog WHERE is_verified = 1")
    verified_foods_count = cursor.fetchone()[0]

    # Doctor profiles count
    cursor.execute("SELECT COUNT(*) FROM managed_doctors")
    total_doctors = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM managed_doctors WHERE is_active = 1")
    active_doctors = cursor.fetchone()[0]

    # Doctor assignments count
    cursor.execute("SELECT COUNT(*) FROM doctor_assignments")
    total_assignments = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM doctor_assignments WHERE status = 'Pending Review'")
    pending_assignments = cursor.fetchone()[0]

    # Patient feedback count
    cursor.execute("SELECT COUNT(*) FROM patient_feedback")
    total_feedback = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM patient_feedback WHERE status IN ('Submitted', 'In Review')")
    pending_feedback = cursor.fetchone()[0]

    # Recent Audit Activities (latest 10)
    cursor.execute('''
        SELECT id, user_email, action, target_type, target_id, details, ip_address, created_at
        FROM audit_logs
        ORDER BY created_at DESC
        LIMIT 10
    ''')
    recent_activities = [dict(row) for row in cursor.fetchall()]

    # Disease predictions breakdown by risk level
    cursor.execute('''
        SELECT disease_name, risk, COUNT(*) as count
        FROM predictions
        GROUP BY disease_name, risk
    ''')
    disease_risk_breakdown = {}
    for row in cursor.fetchall():
        d_name = row["disease_name"]
        if d_name not in disease_risk_breakdown:
            disease_risk_breakdown[d_name] = {"Low": 0, "Moderate": 0, "High": 0}
        disease_risk_breakdown[d_name][row["risk"]] = row["count"]

    # Monthly registrations trend (last 6 months)
    cursor.execute('''
        SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
        FROM users
        GROUP BY month
        ORDER BY month DESC
        LIMIT 6
    ''')
    registration_trends = [dict(row) for row in cursor.fetchall()]

    conn.close()

    return jsonify({
        "stats": {
            "total_users": total_users,
            "total_patients": total_patients,
            "active_accounts": active_accounts,
            "inactive_or_suspended": inactive_or_suspended,
            "total_uploaded_reports": total_uploaded_reports,
            "total_predictions": total_predictions,
            "total_audit_events": total_audit_events,
            "verified_foods_count": verified_foods_count,
            "total_doctors": total_doctors,
            "active_doctors": active_doctors,
            "total_assignments": total_assignments,
            "pending_assignments": pending_assignments,
            "total_feedback": total_feedback,
            "pending_feedback": pending_feedback
        },
        "recent_activities": recent_activities,
        "disease_risk_breakdown": disease_risk_breakdown,
        "registration_trends": registration_trends
    }), 200

# -------------------------------------------------------------
# User Management APIs
# -------------------------------------------------------------
@admin_bp.route("/users", methods=["GET"])
@role_required(["admin"])
def list_users():
    """
    Paginated search and filter for all users.
    Filters: role, status, search query (name, email, phone).
    """
    search = request.args.get("search", "").strip()
    role = request.args.get("role", "").strip()
    status = request.args.get("status", "").strip()
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 20))
    offset = (page - 1) * limit

    query = "SELECT email, username, full_name, phone, role, status, created_at FROM users WHERE 1=1"
    params = []

    if search:
        query += " AND (full_name LIKE ? OR email LIKE ? OR phone LIKE ?)"
        s_term = f"%{search}%"
        params.extend([s_term, s_term, s_term])

    if role:
        query += " AND role = ?"
        params.append(role)

    if status:
        query += " AND status = ?"
        params.append(status)

    count_query = query.replace("SELECT email, username, full_name, phone, role, status, created_at", "SELECT COUNT(*)")

    conn = get_db_connection()
    total_count = conn.execute(count_query, params).fetchone()[0]

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    users = [dict(row) for row in conn.execute(query, params).fetchall()]
    conn.close()

    return jsonify({
        "users": users,
        "total": total_count,
        "page": page,
        "limit": limit,
        "total_pages": (total_count + limit - 1) // limit
    }), 200

@admin_bp.route("/users/<email>/status", methods=["PATCH"])
@role_required(["admin"])
def update_user_status(email):
    """
    Activate, suspend, deactivate, or reactivate user accounts.
    """
    data = request.get_json() or {}
    new_status = data.get("status", "").strip().lower()

    if new_status not in ["active", "suspended", "inactive", "pending"]:
        return jsonify({"error": "Invalid status. Allowed values: active, suspended, inactive, pending."}), 400

    admin_email = g.current_user["email"]

    # Prevent admin from suspending themselves
    if email == admin_email and new_status != "active":
        return jsonify({"error": "You cannot suspend or deactivate your own administrative account."}), 400

    conn = get_db_connection()
    user = conn.execute("SELECT email, full_name, role, status FROM users WHERE email = ?", (email,)).fetchone()
    if not user:
        conn.close()
        return jsonify({"error": "User account not found."}), 404

    old_status = user["status"]
    conn.execute("UPDATE users SET status = ?, updated_at = datetime('now') WHERE email = ?", (new_status, email))

    # Also sync doctor_profiles approval_status if doctor
    if user["role"] == "doctor":
        if new_status == "active":
            conn.execute("UPDATE doctor_profiles SET approval_status = 'approved', approved_by = ?, approved_at = datetime('now') WHERE email = ?", (admin_email, email))
        elif new_status == "suspended":
            conn.execute("UPDATE doctor_profiles SET approval_status = 'suspended' WHERE email = ?", (email,))

    conn.commit()
    conn.close()

    log_audit(admin_email, "ADMIN_UPDATE_USER_STATUS", target_type="users", target_id=email,
              details=f"Status changed from {old_status} to {new_status}", ip_address=get_client_ip())

    create_notification(
        email,
        f"Account Status Updated: {new_status.capitalize()}",
        f"An administrator updated your account status to '{new_status}'.",
        "info"
    )

    return jsonify({"message": f"User status successfully updated to {new_status}.", "status": new_status}), 200

@admin_bp.route("/change-password", methods=["POST"])
@role_required(["admin"])
def admin_change_password():
    """
    Allows the single authorized administrator to securely change their password.
    Requires current password verification and enforces the strong password policy.
    """
    from werkzeug.security import check_password_hash, generate_password_hash
    import re
    data = request.get_json() or {}
    current_password = data.get("current_password", "")
    new_password = data.get("new_password", "")
    confirm_new_password = data.get("confirm_new_password", "")

    if not current_password or not new_password or not confirm_new_password:
        return jsonify({"error": "All password fields are required."}), 400

    if new_password != confirm_new_password:
        return jsonify({"error": "New passwords do not match."}), 400

    password_regex = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+=\[\]{}|;:,.<>])[A-Za-z\d@$!%*?&#^()_\-+=\[\]{}|;:,.<>]{8,}$")
    if not password_regex.match(new_password):
        return jsonify({
            "error": "New password must be at least 8 characters long and contain uppercase, lowercase, number, and special character."
        }), 400

    admin_email = g.current_user["email"]
    conn = get_db_connection()
    admin_row = conn.execute("SELECT password FROM users WHERE email = ? AND role = 'admin'", (admin_email,)).fetchone()

    if not admin_row or not check_password_hash(admin_row["password"], current_password):
        conn.close()
        return jsonify({"error": "Current administrator password is incorrect."}), 401

    hashed = generate_password_hash(new_password)
    conn.execute("UPDATE users SET password = ?, updated_at = datetime('now') WHERE email = ?", (hashed, admin_email))
    conn.commit()
    conn.close()

    log_audit(admin_email, "ADMIN_PASSWORD_CHANGED", target_type="users", target_id=admin_email,
              details="Administrator successfully updated account password", ip_address=get_client_ip(), actor_role="admin")

    return jsonify({"message": "Administrator password updated successfully."}), 200

@admin_bp.route("/users/<email>", methods=["PATCH"])
@role_required(["admin"])
def update_user_profile(email):
    """Updates permitted profile information for a user."""
    data = request.get_json() or {}
    full_name = data.get("full_name", "").strip()
    phone = data.get("phone", "").strip()

    admin_email = g.current_user["email"]

    conn = get_db_connection()
    user = conn.execute("SELECT email FROM users WHERE email = ?", (email,)).fetchone()
    if not user:
        conn.close()
        return jsonify({"error": "User not found."}), 404

    updates = []
    params = []
    if full_name:
        updates.append("full_name = ?")
        params.append(full_name)
    if phone:
        updates.append("phone = ?")
        params.append(phone)

    if not updates:
        conn.close()
        return jsonify({"error": "No update fields provided."}), 400

    updates.append("updated_at = datetime('now')")
    params.append(email)

    conn.execute(f"UPDATE users SET {', '.join(updates)} WHERE email = ?", params)
    conn.commit()
    conn.close()

    log_audit(admin_email, "ADMIN_UPDATE_USER_PROFILE", target_type="users", target_id=email,
              details=f"Updated profile fields for {email}", ip_address=get_client_ip())

    return jsonify({"message": "User profile updated successfully."}), 200

@admin_bp.route("/users/<email>", methods=["DELETE"])
@role_required(["admin"])
def anonymize_or_delete_user(email):
    """
    Safely deactivates and anonymizes account while preserving required medical records and audit history.
    """
    admin_email = g.current_user["email"]

    if email == admin_email:
        return jsonify({"error": "Cannot delete your own administrative account."}), 400

    conn = get_db_connection()
    user = conn.execute("SELECT email, role FROM users WHERE email = ?", (email,)).fetchone()
    if not user:
        conn.close()
        return jsonify({"error": "User not found."}), 404

    # Safe anonymization: mask name and phone, set status to 'inactive'
    anonymized_name = f"Anonymized User {secrets.token_hex(4)}"
    conn.execute('''
        UPDATE users SET full_name = ?, phone = '0000000000', status = 'inactive', updated_at = datetime('now')
        WHERE email = ?
    ''', (anonymized_name, email))

    conn.commit()
    conn.close()

    log_audit(admin_email, "ADMIN_ANONYMIZE_USER", target_type="users", target_id=email,
              details="User account safely anonymized and deactivated", ip_address=get_client_ip())

    return jsonify({"message": "User account has been safely anonymized and deactivated."}), 200

# -------------------------------------------------------------
# Report Processing & Medical Report Management APIs
# -------------------------------------------------------------
@admin_bp.route("/reports", methods=["GET"])
@role_required(["admin"])
def list_all_reports():
    """
    Lists all uploaded medical reports across patients.
    Supports filtering by status ('uploaded', 'predicted', 'manual_entry') and search.
    """
    search = request.args.get("search", "").strip()
    status = request.args.get("status", "").strip()
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 20))
    offset = (page - 1) * limit

    conn = get_db_connection()
    query = '''
        SELECT r.id, r.patient_email, u.full_name as patient_name, u.phone as patient_phone,
               r.report_title, r.original_filename, r.file_size, r.extraction_method,
               r.status, r.created_at,
               (SELECT COUNT(*) FROM predictions p WHERE p.report_id = r.id) as prediction_count
        FROM medical_reports r
        LEFT JOIN users u ON r.patient_email = u.email
        WHERE 1=1
    '''
    params = []

    if status:
        query += " AND r.status = ?"
        params.append(status)

    if search:
        query += " AND (r.patient_email LIKE ? OR u.full_name LIKE ? OR r.report_title LIKE ? OR r.original_filename LIKE ?)"
        s = f"%{search}%"
        params.extend([s, s, s, s])

    count_query = query.replace("SELECT r.id, r.patient_email, u.full_name as patient_name, u.phone as patient_phone,\n               r.report_title, r.original_filename, r.file_size, r.extraction_method,\n               r.status, r.created_at,\n               (SELECT COUNT(*) FROM predictions p WHERE p.report_id = r.id) as prediction_count", "SELECT COUNT(*)")

    total_count = conn.execute(count_query, params).fetchone()[0]

    query += " ORDER BY r.created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    reports = [dict(row) for row in conn.execute(query, params).fetchall()]
    conn.close()

    return jsonify({
        "reports": reports,
        "total": total_count,
        "page": page,
        "limit": limit,
        "total_pages": (total_count + limit - 1) // limit
    }), 200

@admin_bp.route("/reports/<int:id>", methods=["DELETE"])
@role_required(["admin"])
def delete_report(id):
    """Safely deletes a report record and removes its physical file if on disk."""
    admin_email = g.current_user["email"]
    conn = get_db_connection()
    rep = conn.execute("SELECT id, patient_email, file_path, original_filename FROM medical_reports WHERE id = ?", (id,)).fetchone()

    if not rep:
        conn.close()
        return jsonify({"error": "Report not found."}), 404

    # Remove file on disk if exists
    file_path = rep["file_path"]
    if file_path and os.path.exists(file_path):
        try:
            os.remove(file_path)
        except Exception:
            pass

    # Delete predictions linked to report
    conn.execute("DELETE FROM predictions WHERE report_id = ?", (id,))
    conn.execute("DELETE FROM medical_reports WHERE id = ?", (id,))
    conn.commit()
    conn.close()

    log_audit(admin_email, "ADMIN_DELETE_REPORT", target_type="medical_reports", target_id=id,
              details=f"Deleted report #{id} ({rep['original_filename']}) for patient {rep['patient_email']}",
              ip_address=get_client_ip(), actor_role="admin")

    return jsonify({"message": f"Report #{id} deleted successfully."}), 200

# -------------------------------------------------------------
# Patient Accounts API
# -------------------------------------------------------------
@admin_bp.route("/patients", methods=["GET"])
@role_required(["admin"])
def list_patients():
    """Returns detailed list of all registered patients."""
    search = request.args.get("search", "").strip()
    status = request.args.get("status", "").strip()

    conn = get_db_connection()
    query = '''
        SELECT u.email, u.full_name, u.phone, u.status, u.created_at,
               p.age, p.gender, p.blood_group, p.allergies, p.chronic_conditions, p.dietary_preference,
               (SELECT COUNT(*) FROM medical_reports r WHERE r.patient_email = u.email) as report_count,
               (SELECT COUNT(*) FROM predictions pr WHERE pr.email = u.email) as prediction_count
        FROM users u
        LEFT JOIN patient_profiles p ON u.email = p.email
        WHERE u.role = 'patient'
    '''
    params = []

    if status:
        query += " AND u.status = ?"
        params.append(status)

    if search:
        query += " AND (u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)"
        s = f"%{search}%"
        params.extend([s, s, s])

    query += " ORDER BY u.created_at DESC"
    patients = [dict(row) for row in conn.execute(query, params).fetchall()]
    conn.close()

    return jsonify({"patients": patients}), 200

# -------------------------------------------------------------
# Audit Logs API
# -------------------------------------------------------------
@admin_bp.route("/audit-logs", methods=["GET"])
@role_required(["admin"])
def get_audit_logs():
    """Returns paginated system security & clinical audit records."""
    search = request.args.get("search", "").strip()
    action = request.args.get("action", "").strip()
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 25))
    offset = (page - 1) * limit

    query = "SELECT * FROM audit_logs WHERE 1=1"
    params = []

    if search:
        query += " AND (user_email LIKE ? OR details LIKE ? OR target_id LIKE ?)"
        s = f"%{search}%"
        params.extend([s, s, s])

    if action:
        query += " AND action = ?"
        params.append(action)

    count_query = query.replace("SELECT *", "SELECT COUNT(*)")

    conn = get_db_connection()
    total_count = conn.execute(count_query, params).fetchone()[0]

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    logs = [dict(row) for row in conn.execute(query, params).fetchall()]
    conn.close()

    return jsonify({
        "audit_logs": logs,
        "total": total_count,
        "page": page,
        "limit": limit,
        "total_pages": (total_count + limit - 1) // limit
    }), 200

# -------------------------------------------------------------
# Diet Resources Admin Management
# -------------------------------------------------------------
@admin_bp.route("/diet-resources", methods=["GET"])
@role_required(["admin"])
def list_diet_resources():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM diet_resources ORDER BY created_at DESC").fetchall()
    conn.close()
    items = []
    for r in rows:
        d = dict(r)
        try:
            d["recommended_foods"] = json.loads(d["recommended_foods"]) if d["recommended_foods"] else []
            d["foods_to_limit"] = json.loads(d["foods_to_limit"]) if d["foods_to_limit"] else []
            d["sample_meals"] = json.loads(d["sample_meals"]) if d["sample_meals"] else {}
        except Exception:
            pass
        items.append(d)
    return jsonify({"diet_resources": items}), 200

@admin_bp.route("/diet-resources", methods=["POST"])
@role_required(["admin"])
def create_diet_resource():
    data = request.get_json() or {}
    title = data.get("title", "").strip()
    category = data.get("category", "heart_healthy").strip()
    target_condition = data.get("target_condition", "general").strip()
    short_summary = data.get("short_summary", "").strip()
    recommended_foods = json.dumps(data.get("recommended_foods", []))
    foods_to_limit = json.dumps(data.get("foods_to_limit", []))
    sample_meals = json.dumps(data.get("sample_meals", {}))
    hydration_salt_guidance = data.get("hydration_salt_guidance", "").strip()

    if not title or not short_summary:
        return jsonify({"error": "Title and summary are required."}), 400

    admin_email = g.current_user["email"]

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('''
        INSERT INTO diet_resources (title, category, target_condition, short_summary, recommended_foods, foods_to_limit, sample_meals, hydration_salt_guidance, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (title, category, target_condition, short_summary, recommended_foods, foods_to_limit, sample_meals, hydration_salt_guidance, admin_email))
    new_id = cur.lastrowid
    conn.commit()
    conn.close()

    log_audit(admin_email, "ADMIN_CREATE_DIET_RESOURCE", target_type="diet_resources", target_id=new_id,
              details=f"Created diet resource: {title}", ip_address=get_client_ip())

    return jsonify({"message": "Diet resource created successfully.", "id": new_id}), 201

@admin_bp.route("/diet-resources/<int:id>", methods=["DELETE"])
@role_required(["admin"])
def delete_diet_resource(id):
    admin_email = g.current_user["email"]
    conn = get_db_connection()
    conn.execute("DELETE FROM diet_resources WHERE id = ?", (id,))
    conn.commit()
    conn.close()

    log_audit(admin_email, "ADMIN_DELETE_DIET_RESOURCE", target_type="diet_resources", target_id=id,
              details=f"Deleted diet resource #{id}", ip_address=get_client_ip())
    return jsonify({"message": "Diet resource deleted."}), 200

# -------------------------------------------------------------
# Wellness & Yoga Resources Admin Management
# -------------------------------------------------------------
@admin_bp.route("/wellness-resources", methods=["GET"])
@role_required(["admin"])
def list_wellness_resources():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM wellness_resources ORDER BY created_at DESC").fetchall()
    conn.close()
    items = []
    for r in rows:
        d = dict(r)
        try:
            d["step_instructions"] = json.loads(d["step_instructions"]) if d["step_instructions"] else []
        except Exception:
            pass
        items.append(d)
    return jsonify({"wellness_resources": items}), 200

@admin_bp.route("/wellness-resources", methods=["POST"])
@role_required(["admin"])
def create_wellness_resource():
    data = request.get_json() or {}
    title = data.get("title", "").strip()
    category = data.get("category", "breathing").strip()
    video_url = data.get("video_url", "").strip()
    thumbnail_url = data.get("thumbnail_url", "").strip()
    duration = data.get("duration", "10 mins").strip()
    difficulty = data.get("difficulty", "Gentle").strip()
    step_instructions = json.dumps(data.get("step_instructions", []))
    target_benefits = data.get("target_benefits", "").strip()
    safety_contraindications = data.get("safety_contraindications", "").strip()

    if not title or not video_url:
        return jsonify({"error": "Title and Video URL are required."}), 400

    admin_email = g.current_user["email"]

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('''
        INSERT INTO wellness_resources
        (title, category, video_url, thumbnail_url, duration, difficulty, step_instructions, target_benefits, safety_contraindications, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (title, category, video_url, thumbnail_url, duration, difficulty, step_instructions, target_benefits, safety_contraindications, admin_email))
    new_id = cur.lastrowid
    conn.commit()
    conn.close()

    log_audit(admin_email, "ADMIN_CREATE_WELLNESS_RESOURCE", target_type="wellness_resources", target_id=new_id,
              details=f"Created wellness resource: {title}", ip_address=get_client_ip())

    return jsonify({"message": "Wellness resource created successfully.", "id": new_id}), 201

@admin_bp.route("/wellness-resources/<int:id>", methods=["DELETE"])
@role_required(["admin"])
def delete_wellness_resource(id):
    admin_email = g.current_user["email"]
    conn = get_db_connection()
    conn.execute("DELETE FROM wellness_resources WHERE id = ?", (id,))
    conn.commit()
    conn.close()

    log_audit(admin_email, "ADMIN_DELETE_WELLNESS_RESOURCE", target_type="wellness_resources", target_id=id,
              details=f"Deleted wellness resource #{id}", ip_address=get_client_ip())
    return jsonify({"message": "Wellness resource deleted."}), 200

# -------------------------------------------------------------
# Food Catalog Management
# -------------------------------------------------------------
@admin_bp.route("/food-catalog", methods=["GET"])
@role_required(["admin"])
def list_food_catalog():
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM food_catalog ORDER BY category, name").fetchall()
    conn.close()
    items = []
    for r in rows:
        d = dict(r)
        try:
            d["supported_conditions"] = json.loads(d["supported_conditions"]) if d["supported_conditions"] else []
            d["contraindications"] = json.loads(d["contraindications"]) if d["contraindications"] else []
        except Exception:
            pass
        items.append(d)
    return jsonify({"food_catalog": items}), 200

@admin_bp.route("/food-catalog", methods=["POST"])
@role_required(["admin"])
def create_food_catalog_item():
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    category = data.get("category", "Vegetables").strip()
    calories = float(data.get("calories_per_100g", 0) or 0)
    protein = float(data.get("protein_g", 0) or 0)
    fat = float(data.get("fat_g", 0) or 0)
    saturated_fat = float(data.get("saturated_fat_g", 0) or 0)
    fiber = float(data.get("fiber_g", 0) or 0)
    sodium = float(data.get("sodium_mg", 0) or 0)
    potassium = float(data.get("potassium_mg", 0) or 0)
    serving_size = data.get("serving_size", "100g").strip()
    supported_conditions = json.dumps(data.get("supported_conditions", ["general"]))
    contraindications = json.dumps(data.get("contraindications", []))
    evidence_source = data.get("evidence_source", "USDA FoodData Central").strip()
    source_url = data.get("source_url", "https://fdc.nal.usda.gov/").strip()
    clinical_rationale = data.get("clinical_rationale", "").strip()

    if not name or not clinical_rationale:
        return jsonify({"error": "Food name and clinical rationale are required."}), 400

    admin_email = g.current_user["email"]
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute('''
            INSERT INTO food_catalog
            (name, category, calories_per_100g, protein_g, fat_g, saturated_fat_g, fiber_g, sodium_mg, potassium_mg, serving_size, supported_conditions, contraindications, evidence_source, source_url, clinical_rationale, is_verified)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        ''', (name, category, calories, protein, fat, saturated_fat, fiber, sodium, potassium, serving_size, supported_conditions, contraindications, evidence_source, source_url, clinical_rationale))
        new_id = cur.lastrowid
        conn.commit()
    except Exception as e:
        conn.close()
        return jsonify({"error": f"Failed to add food item: {e}"}), 400

    conn.close()
    log_audit(admin_email, "ADMIN_CREATE_FOOD_ITEM", target_type="food_catalog", target_id=new_id,
              details=f"Added verified food item: {name}", ip_address=get_client_ip())
    return jsonify({"message": "Food item added successfully.", "id": new_id}), 201

@admin_bp.route("/food-catalog/<int:id>", methods=["PUT"])
@role_required(["admin"])
def update_food_catalog_item(id):
    data = request.get_json() or {}
    admin_email = g.current_user["email"]
    conn = get_db_connection()

    fields = []
    params = []
    for key in ["name", "category", "calories_per_100g", "protein_g", "fat_g", "saturated_fat_g", "fiber_g", "sodium_mg", "potassium_mg", "serving_size", "evidence_source", "source_url", "clinical_rationale", "is_verified"]:
        if key in data:
            fields.append(f"{key} = ?")
            params.append(data[key])

    if "supported_conditions" in data:
        fields.append("supported_conditions = ?")
        params.append(json.dumps(data["supported_conditions"]))

    if "contraindications" in data:
        fields.append("contraindications = ?")
        params.append(json.dumps(data["contraindications"]))

    if not fields:
        conn.close()
        return jsonify({"error": "No fields to update."}), 400

    fields.append("last_reviewed_at = CURRENT_TIMESTAMP")
    query = f"UPDATE food_catalog SET {', '.join(fields)} WHERE id = ?"
    params.append(id)

    conn.execute(query, params)
    conn.commit()
    conn.close()

    log_audit(admin_email, "ADMIN_UPDATE_FOOD_ITEM", target_type="food_catalog", target_id=id,
              details=f"Updated food item #{id}", ip_address=get_client_ip())
    return jsonify({"message": "Food item updated successfully."}), 200

@admin_bp.route("/food-catalog/<int:id>", methods=["DELETE"])
@role_required(["admin"])
def delete_food_catalog_item(id):
    admin_email = g.current_user["email"]
    conn = get_db_connection()
    conn.execute("DELETE FROM food_catalog WHERE id = ?", (id,))
    conn.commit()
    conn.close()

    log_audit(admin_email, "ADMIN_DELETE_FOOD_ITEM", target_type="food_catalog", target_id=id,
              details=f"Deleted food item #{id}", ip_address=get_client_ip())
    return jsonify({"message": "Food item deleted successfully."}), 200

# -------------------------------------------------------------
# Audit Logs Export API
# -------------------------------------------------------------
@admin_bp.route("/audit-logs/export", methods=["GET"])
@role_required(["admin"])
def export_audit_logs():
    """
    Exports all platform audit logs in a clean structured JSON format.
    Records an explicit ADMIN_EXPORT_AUDIT_LOGS audit event.
    """
    admin_email = g.current_user["email"]
    conn = get_db_connection()
    rows = conn.execute('''
        SELECT id, event_id, timestamp, actor_email, actor_role, action,
               target_type, target_id, status, details, ip_address, user_agent, created_at
        FROM audit_logs
        ORDER BY created_at DESC
    ''').fetchall()
    conn.close()

    log_audit(admin_email, "ADMIN_EXPORT_AUDIT_LOGS", target_type="audit_logs", target_id="ALL",
              details="Administrator exported system audit trail", ip_address=get_client_ip())

    logs = [dict(r) for r in rows]
    payload = {
        "export_metadata": {
            "exported_by": admin_email,
            "export_timestamp_utc": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            "total_events": len(logs),
            "compliance_standard": "HIPAA Security Rule § 164.312(b) Audit Controls"
        },
        "audit_trail": logs
    }
    response = jsonify(payload)
    response.headers["Content-Disposition"] = "attachment; filename=CardioPredict_Audit_Log_Export.json"
    return response, 200

# -------------------------------------------------------------
# Privacy Requests Management
# -------------------------------------------------------------
@admin_bp.route("/privacy-requests", methods=["GET"])
@role_required(["admin"])
def list_privacy_requests():
    conn = get_db_connection()
    rows = conn.execute('''
        SELECT p.id, p.user_email, u.full_name, u.role, p.request_type, p.status,
               p.details, p.created_at, p.resolved_at
        FROM privacy_requests p
        JOIN users u ON p.user_email = u.email
        ORDER BY p.created_at DESC
    ''').fetchall()
    conn.close()
    return jsonify({"privacy_requests": [dict(r) for r in rows]}), 200

@admin_bp.route("/privacy-requests/<int:id>", methods=["PATCH"])
@role_required(["admin"])
def update_privacy_request(id):
    data = request.get_json() or {}
    new_status = data.get("status", "").strip().lower()
    if new_status not in ["completed", "rejected"]:
        return jsonify({"error": "Invalid status. Must be 'completed' or 'rejected'."}), 400

    admin_email = g.current_user["email"]
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('''
        UPDATE privacy_requests
        SET status = ?, resolved_at = datetime('now')
        WHERE id = ?
    ''', (new_status, id))
    conn.commit()

    req_info = conn.execute("SELECT user_email, request_type FROM privacy_requests WHERE id = ?", (id,)).fetchone()
    conn.close()

    log_audit(admin_email, "ADMIN_RESOLVE_PRIVACY_REQUEST", target_type="privacy_requests", target_id=id,
              details=f"Marked privacy request #{id} as {new_status}", ip_address=get_client_ip())

    if req_info:
        create_notification(
            req_info["user_email"],
            f"Privacy Request {new_status.capitalize()}",
            f"Your data {req_info['request_type']} request (#{id}) has been processed and marked as {new_status}.",
            "info",
            "/patient/profile"
        )

    return jsonify({"message": f"Privacy request #{id} marked as {new_status}."}), 200

# -------------------------------------------------------------
# 1. Administrator Patient Feedback Management
# -------------------------------------------------------------
@admin_bp.route("/feedback", methods=["GET"])
@role_required(["admin"])
def list_admin_feedback():
    """
    Returns real patient feedback tickets from the database.
    Supports filtering by status (pending, responded, closed, all) and search queries.
    """
    status_filter = request.args.get("status", "").strip().lower()
    search = request.args.get("search", "").strip()

    conn = get_db_connection()

    query = '''
        SELECT f.id, f.feedback_id, f.patient_email, f.patient_name, f.category,
               f.subject, f.message, f.rating, f.status, f.admin_response,
               f.responded_by, f.responded_at, f.created_at, f.updated_at,
               (SELECT COUNT(*) FROM feedback_messages m WHERE m.feedback_id = f.feedback_id) as total_messages
        FROM patient_feedback f
        WHERE 1=1
    '''
    params = []

    if status_filter == "pending":
        query += " AND f.status IN ('Submitted', 'In Review')"
    elif status_filter == "responded":
        query += " AND f.status = 'Responded'"
    elif status_filter == "closed":
        query += " AND f.status = 'Closed'"

    if search:
        query += " AND (f.patient_email LIKE ? OR f.patient_name LIKE ? OR f.subject LIKE ? OR f.message LIKE ?)"
        s_param = f"%{search}%"
        params.extend([s_param, s_param, s_param, s_param])

    query += " ORDER BY f.created_at DESC"

    rows = conn.execute(query, params).fetchall()

    # Counts summary
    total_count = conn.execute("SELECT COUNT(*) FROM patient_feedback").fetchone()[0]
    pending_count = conn.execute("SELECT COUNT(*) FROM patient_feedback WHERE status IN ('Submitted', 'In Review')").fetchone()[0]
    responded_count = conn.execute("SELECT COUNT(*) FROM patient_feedback WHERE status = 'Responded'").fetchone()[0]
    closed_count = conn.execute("SELECT COUNT(*) FROM patient_feedback WHERE status = 'Closed'").fetchone()[0]

    conn.close()

    return jsonify({
        "feedback": [dict(r) for r in rows],
        "counts": {
            "total": total_count,
            "pending": pending_count,
            "responded": responded_count,
            "closed": closed_count
        }
    }), 200

@admin_bp.route("/feedback/<feedback_id>", methods=["GET"])
@role_required(["admin"])
def get_admin_feedback_detail(feedback_id):
    """
    Returns single feedback ticket and full conversation message thread.
    """
    conn = get_db_connection()
    feedback = conn.execute("SELECT * FROM patient_feedback WHERE feedback_id = ?", (feedback_id,)).fetchone()

    if not feedback:
        conn.close()
        return jsonify({"error": "Feedback ticket not found."}), 404

    messages = conn.execute('''
        SELECT id, feedback_id, sender_email, sender_name, sender_role, message, created_at
        FROM feedback_messages
        WHERE feedback_id = ?
        ORDER BY created_at ASC
    ''', (feedback_id,)).fetchall()

    conn.close()

    return jsonify({
        "feedback": dict(feedback),
        "messages": [dict(m) for m in messages]
    }), 200

@admin_bp.route("/feedback/<feedback_id>/respond", methods=["POST"])
@role_required(["admin"])
def respond_to_feedback(feedback_id):
    """
    Administrator responds to patient feedback.
    Stores reply in message thread, updates feedback status to 'Responded',
    records administrator email/timestamp, and notifies the patient in-app.
    """
    admin_email = g.current_user["email"]
    data = request.get_json() or {}
    reply_message = data.get("response", "").strip() or data.get("message", "").strip()
    new_status = data.get("status", "Responded").strip()

    if not reply_message:
        return jsonify({"error": "Response message cannot be empty."}), 400

    valid_statuses = ["Responded", "In Review", "Closed"]
    if new_status not in valid_statuses:
        new_status = "Responded"

    conn = get_db_connection()
    cur = conn.cursor()

    feedback = cur.execute("SELECT id, patient_email, patient_name, subject FROM patient_feedback WHERE feedback_id = ?", (feedback_id,)).fetchone()
    if not feedback:
        conn.close()
        return jsonify({"error": "Feedback ticket not found."}), 404

    patient_email = feedback["patient_email"]

    # 1. Add admin reply to thread
    cur.execute('''
        INSERT INTO feedback_messages
        (feedback_id, sender_email, sender_name, sender_role, message, created_at)
        VALUES (?, ?, 'Administrator', 'admin', ?, datetime('now'))
    ''', (feedback_id, admin_email, reply_message))

    # 2. Update patient_feedback summary
    cur.execute('''
        UPDATE patient_feedback
        SET admin_response = ?, responded_by = ?, responded_at = datetime('now'),
            status = ?, updated_at = datetime('now')
        WHERE feedback_id = ?
    ''', (reply_message, admin_email, new_status, feedback_id))

    conn.commit()
    conn.close()

    # 3. In-app notification to the patient
    create_notification(
        patient_email,
        "Administrator Responded to Your Feedback",
        f"The administrator responded to your inquiry regarding '{feedback['subject']}'.",
        "info",
        "/patient/dashboard"
    )

    # 4. Audit log
    log_audit(admin_email, "ADMIN_FEEDBACK_RESPONSE", target_type="patient_feedback", target_id=feedback_id,
              details=f"Admin replied to patient {patient_email}. Status set to {new_status}.", ip_address=get_client_ip(), actor_role="admin")

    return jsonify({
        "message": "Response submitted and delivered to patient successfully.",
        "feedback_id": feedback_id,
        "status": new_status,
        "responded_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }), 200

@admin_bp.route("/feedback/<feedback_id>/status", methods=["PATCH"])
@role_required(["admin"])
def update_feedback_status(feedback_id):
    """
    Updates feedback status (e.g., marks ticket Closed or In Review).
    """
    admin_email = g.current_user["email"]
    data = request.get_json() or {}
    new_status = data.get("status", "").strip()

    valid_statuses = ["Submitted", "In Review", "Responded", "Closed"]
    if new_status not in valid_statuses:
        return jsonify({"error": f"Invalid status. Must be one of: {', '.join(valid_statuses)}"}), 400

    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute('''
        UPDATE patient_feedback
        SET status = ?, updated_at = datetime('now')
        WHERE feedback_id = ?
    ''', (new_status, feedback_id))

    if cur.rowcount == 0:
        conn.close()
        return jsonify({"error": "Feedback ticket not found."}), 404

    conn.commit()
    conn.close()

    log_audit(admin_email, "ADMIN_FEEDBACK_STATUS_CHANGE", target_type="patient_feedback", target_id=feedback_id,
              details=f"Status updated to '{new_status}'", ip_address=get_client_ip(), actor_role="admin")

    return jsonify({"message": f"Feedback ticket status updated to {new_status}.", "status": new_status}), 200

# -------------------------------------------------------------
# 2. Administrator Doctor Profile Management (10 Demo Profiles)
# -------------------------------------------------------------
@admin_bp.route("/doctors", methods=["GET"])
@role_required(["admin"])
def list_managed_doctors():
    """
    Lists all managed doctor profiles (10 demo profiles).
    Supports searching by name, specialty, or availability status.
    """
    search = request.args.get("search", "").strip()
    specialty = request.args.get("specialty", "").strip()

    conn = get_db_connection()
    query = "SELECT * FROM managed_doctors WHERE 1=1"
    params = []

    if search:
        query += " AND (display_name LIKE ? OR qualifications LIKE ? OR department_notes LIKE ?)"
        s_param = f"%{search}%"
        params.extend([s_param, s_param, s_param])

    if specialty:
        query += " AND specialization LIKE ?"
        params.append(f"%{specialty}%")

    query += " ORDER BY id ASC"

    rows = conn.execute(query, params).fetchall()
    total_count = conn.execute("SELECT COUNT(*) FROM managed_doctors").fetchone()[0]
    active_count = conn.execute("SELECT COUNT(*) FROM managed_doctors WHERE is_active = 1").fetchone()[0]

    conn.close()

    return jsonify({
        "doctors": [dict(r) for r in rows],
        "total_count": total_count,
        "active_count": active_count
    }), 200

@admin_bp.route("/doctors", methods=["POST"])
@role_required(["admin"])
def create_managed_doctor():
    """
    Allows administrator to register a new doctor profile.
    Explicitly tags educational demonstration profiles as is_demo = 1.
    """
    admin_email = g.current_user["email"]
    data = request.get_json() or {}

    display_name = data.get("display_name", "").strip()
    specialization = data.get("specialization", "").strip()
    qualifications = data.get("qualifications", "").strip()
    experience_years = int(data.get("experience_years", 0) or 0)
    availability_status = data.get("availability_status", "Available").strip()
    hospital_affiliation = data.get("hospital_affiliation", "Simulated Health Network").strip()
    department_notes = data.get("department_notes", "").strip()
    contact_email = data.get("contact_email", "").strip()
    is_demo = 1 if data.get("is_demo", True) else 0

    if not display_name or not specialization or not qualifications:
        return jsonify({"error": "Doctor name, specialization, and qualifications are required."}), 400

    doctor_code = f"DOC-{secrets.token_hex(3).upper()}"

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('''
        INSERT INTO managed_doctors
        (doctor_code, display_name, specialization, qualifications, experience_years, availability_status, is_active, is_demo, hospital_affiliation, department_notes, contact_email)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
    ''', (doctor_code, display_name, specialization, qualifications, experience_years, availability_status, is_demo, hospital_affiliation, department_notes, contact_email))

    new_id = cur.lastrowid
    conn.commit()
    conn.close()

    log_audit(admin_email, "ADMIN_CREATE_DOCTOR", target_type="managed_doctors", target_id=new_id,
              details=f"Created doctor profile: {display_name} ({specialization})", ip_address=get_client_ip(), actor_role="admin")

    return jsonify({
        "message": "Doctor profile created successfully.",
        "doctor_id": new_id,
        "doctor_code": doctor_code
    }), 201

@admin_bp.route("/doctors/<int:doc_id>", methods=["PUT"])
@role_required(["admin"])
def update_managed_doctor(doc_id):
    """
    Allows administrator to edit details of a managed doctor profile.
    """
    admin_email = g.current_user["email"]
    data = request.get_json() or {}

    display_name = data.get("display_name", "").strip()
    specialization = data.get("specialization", "").strip()
    qualifications = data.get("qualifications", "").strip()
    experience_years = int(data.get("experience_years", 0) or 0)
    availability_status = data.get("availability_status", "Available").strip()
    hospital_affiliation = data.get("hospital_affiliation", "").strip()
    department_notes = data.get("department_notes", "").strip()
    contact_email = data.get("contact_email", "").strip()
    is_active = 1 if data.get("is_active", True) else 0

    if not display_name or not specialization or not qualifications:
        return jsonify({"error": "Doctor name, specialization, and qualifications are required."}), 400

    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute('''
        UPDATE managed_doctors
        SET display_name = ?, specialization = ?, qualifications = ?,
            experience_years = ?, availability_status = ?, hospital_affiliation = ?,
            department_notes = ?, contact_email = ?, is_active = ?, updated_at = datetime('now')
        WHERE id = ?
    ''', (display_name, specialization, qualifications, experience_years, availability_status, hospital_affiliation, department_notes, contact_email, is_active, doc_id))

    if cur.rowcount == 0:
        conn.close()
        return jsonify({"error": "Doctor profile not found."}), 404

    conn.commit()
    conn.close()

    log_audit(admin_email, "ADMIN_UPDATE_DOCTOR", target_type="managed_doctors", target_id=doc_id,
              details=f"Updated doctor profile #{doc_id}: {display_name}", ip_address=get_client_ip(), actor_role="admin")

    return jsonify({"message": "Doctor profile updated successfully."}), 200

@admin_bp.route("/doctors/<int:doc_id>/status", methods=["PATCH"])
@role_required(["admin"])
def toggle_doctor_status(doc_id):
    """
    Toggles doctor active/inactive status or updates availability status.
    """
    admin_email = g.current_user["email"]
    data = request.get_json() or {}

    conn = get_db_connection()
    cur = conn.cursor()

    doctor = cur.execute("SELECT id, display_name, is_active, availability_status FROM managed_doctors WHERE id = ?", (doc_id,)).fetchone()
    if not doctor:
        conn.close()
        return jsonify({"error": "Doctor profile not found."}), 404

    new_active = doctor["is_active"]
    new_avail = doctor["availability_status"]

    if "is_active" in data:
        new_active = 1 if data["is_active"] else 0
    if "availability_status" in data:
        new_avail = data["availability_status"].strip()

    cur.execute('''
        UPDATE managed_doctors
        SET is_active = ?, availability_status = ?, updated_at = datetime('now')
        WHERE id = ?
    ''', (new_active, new_avail, doc_id))

    conn.commit()
    conn.close()

    log_audit(admin_email, "ADMIN_TOGGLE_DOCTOR_STATUS", target_type="managed_doctors", target_id=doc_id,
              details=f"Active: {new_active}, Availability: {new_avail}", ip_address=get_client_ip(), actor_role="admin")

    return jsonify({
        "message": f"Status updated for {doctor['display_name']}.",
        "is_active": new_active,
        "availability_status": new_avail
    }), 200

# -------------------------------------------------------------
# 3. Administrator Prediction Review & Doctor Assignment
# -------------------------------------------------------------
@admin_bp.route("/doctor-assignments", methods=["GET"])
@role_required(["admin"])
def list_doctor_assignments():
    """
    Lists prediction review cases and doctor assignment requests.
    Enforces that only the administrator can review and confirm specialist assignments.
    """
    status_filter = request.args.get("status", "").strip()

    conn = get_db_connection()
    query = '''
        SELECT a.id, a.assignment_id, a.patient_email, a.patient_name, a.report_id,
               a.primary_condition, a.risk_level, a.risk_score, a.suggested_specialty,
               a.suggested_doctor_id, a.clinical_rationale, a.status,
               a.assigned_doctor_id, a.admin_notes, a.reviewed_by, a.reviewed_at,
               a.created_at, a.updated_at,
               sd.display_name as suggested_doctor_name, sd.specialization as suggested_doctor_spec,
               ad.display_name as assigned_doctor_name, ad.specialization as assigned_doctor_spec,
               ad.hospital_affiliation as assigned_doctor_hospital
        FROM doctor_assignments a
        LEFT JOIN managed_doctors sd ON a.suggested_doctor_id = sd.id
        LEFT JOIN managed_doctors ad ON a.assigned_doctor_id = ad.id
        WHERE 1=1
    '''
    params = []
    if status_filter:
        query += " AND a.status = ?"
        params.append(status_filter)

    query += " ORDER BY a.created_at DESC"

    rows = conn.execute(query, params).fetchall()

    pending_count = conn.execute("SELECT COUNT(*) FROM doctor_assignments WHERE status = 'Pending Review'").fetchone()[0]
    assigned_count = conn.execute("SELECT COUNT(*) FROM doctor_assignments WHERE status = 'Assigned'").fetchone()[0]
    unassigned_count = conn.execute("SELECT COUNT(*) FROM doctor_assignments WHERE status = 'Unassigned'").fetchone()[0]

    conn.close()

    return jsonify({
        "assignments": [dict(r) for r in rows],
        "counts": {
            "pending": pending_count,
            "assigned": assigned_count,
            "unassigned": unassigned_count,
            "total": len(rows)
        }
    }), 200

@admin_bp.route("/doctor-assignments/<assignment_id>/assign", methods=["POST"])
@role_required(["admin"])
def confirm_doctor_assignment(assignment_id):
    """
    Administrator assigns a specialist doctor to a patient assessment case.
    Can confirm the suggested doctor, change to another doctor, or leave unassigned.
    Persists assignment, records admin ID, timestamp, and writes an audit log.
    Notifies the patient in-app.
    """
    admin_email = g.current_user["email"]
    data = request.get_json() or {}

    assigned_doctor_id = data.get("assigned_doctor_id")
    status = data.get("status", "Assigned").strip()  # 'Assigned', 'Unassigned', 'Completed'
    admin_notes = data.get("admin_notes", "").strip()

    valid_statuses = ["Assigned", "Unassigned", "Completed", "Pending Review"]
    if status not in valid_statuses:
        status = "Assigned"

    conn = get_db_connection()
    cur = conn.cursor()

    assignment = cur.execute("SELECT * FROM doctor_assignments WHERE assignment_id = ?", (assignment_id,)).fetchone()
    if not assignment:
        conn.close()
        return jsonify({"error": "Assignment record not found."}), 404

    patient_email = assignment["patient_email"]
    doc_name = "Unassigned"

    if assigned_doctor_id:
        doc_row = cur.execute("SELECT display_name, specialization FROM managed_doctors WHERE id = ?", (assigned_doctor_id,)).fetchone()
        if doc_row:
            doc_name = doc_row["display_name"]
    else:
        assigned_doctor_id = None
        if status == "Assigned":
            status = "Unassigned"

    cur.execute('''
        UPDATE doctor_assignments
        SET assigned_doctor_id = ?, status = ?, admin_notes = ?,
            reviewed_by = ?, reviewed_at = datetime('now'), updated_at = datetime('now')
        WHERE assignment_id = ?
    ''', (assigned_doctor_id, status, admin_notes, admin_email, assignment_id))

    conn.commit()
    conn.close()

    # Log audit
    log_audit(admin_email, "DOCTOR_ASSIGNED", target_type="doctor_assignments", target_id=assignment_id,
              details=f"Patient: {patient_email}, Assigned Doctor: {doc_name}, Status: {status}", ip_address=get_client_ip(), actor_role="admin")

    # In-app notification to patient
    if status == "Assigned" and doc_name != "Unassigned":
        create_notification(
            patient_email,
            "Specialist Assigned to Your Assessment",
            f"Administrator has assigned {doc_name} to review your cardiovascular assessment.",
            "success",
            "/patient/dashboard"
        )
    elif status == "Unassigned":
        create_notification(
            patient_email,
            "Assessment Review Completed",
            "Administrator has reviewed your report. Routine preventive monitoring advised.",
            "info",
            "/patient/dashboard"
        )

    return jsonify({
        "message": f"Assignment updated successfully to '{status}'.",
        "assignment_id": assignment_id,
        "status": status,
        "assigned_doctor": doc_name,
        "reviewed_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }), 200


