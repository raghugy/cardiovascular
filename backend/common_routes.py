# backend/common_routes.py
import json
from flask import Blueprint, request, jsonify, g
from database import get_db_connection, log_audit
from auth_middleware import jwt_required_custom, get_client_ip

common_bp = Blueprint("common_api", __name__)

@common_bp.route("/notifications", methods=["GET"])
@jwt_required_custom
def get_notifications():
    """Returns unread count and latest 20 notifications for the authenticated user."""
    user_email = g.current_user["email"]
    conn = get_db_connection()

    unread_count = conn.execute('''
        SELECT COUNT(*) FROM notifications WHERE user_email = ? AND is_read = 0
    ''', (user_email,)).fetchone()[0]

    rows = conn.execute('''
        SELECT id, title, message, type, link, is_read, created_at
        FROM notifications
        WHERE user_email = ?
        ORDER BY created_at DESC
        LIMIT 20
    ''', (user_email,)).fetchall()
    conn.close()

    return jsonify({
        "unread_count": unread_count,
        "notifications": [dict(r) for r in rows]
    }), 200

@common_bp.route("/notifications/<int:id>/read", methods=["PATCH"])
@jwt_required_custom
def mark_notification_read(id):
    """Marks a single notification as read."""
    user_email = g.current_user["email"]
    conn = get_db_connection()
    conn.execute("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_email = ?", (id, user_email))
    conn.commit()
    conn.close()
    return jsonify({"message": "Notification marked as read."}), 200

@common_bp.route("/notifications/read-all", methods=["PATCH"])
@jwt_required_custom
def mark_all_notifications_read():
    """Marks all notifications as read for current user."""
    user_email = g.current_user["email"]
    conn = get_db_connection()
    conn.execute("UPDATE notifications SET is_read = 1 WHERE user_email = ?", (user_email,))
    conn.commit()
    conn.close()
    return jsonify({"message": "All notifications marked as read."}), 200

@common_bp.route("/profile", methods=["GET"])
@jwt_required_custom
def get_profile():
    """Returns user profile details according to their role."""
    user_email = g.current_user["email"]
    role = g.current_user["role"]

    conn = get_db_connection()
    user = conn.execute("SELECT email, username, full_name, phone, role, status, created_at FROM users WHERE email = ?", (user_email,)).fetchone()
    user_data = dict(user) if user else {}

    if role == "doctor":
        doc_prof = conn.execute("SELECT * FROM doctor_profiles WHERE email = ?", (user_email,)).fetchone()
        user_data["doctor_profile"] = dict(doc_prof) if doc_prof else {}
    elif role == "patient":
        pat_prof = conn.execute("SELECT * FROM patient_profiles WHERE email = ?", (user_email,)).fetchone()
        user_data["patient_profile"] = dict(pat_prof) if pat_prof else {}

    conn.close()
    return jsonify({"user": user_data}), 200

@common_bp.route("/profile", methods=["PUT"])
@jwt_required_custom
def update_profile():
    """Allows user to update permitted profile fields."""
    user_email = g.current_user["email"]
    role = g.current_user["role"]
    data = request.get_json() or {}

    full_name = data.get("full_name", "").strip()
    phone = data.get("phone", "").strip()

    conn = get_db_connection()

    # Update users table
    if full_name or phone:
        conn.execute('''
            UPDATE users SET
                full_name = coalesce(nullif(?, ''), full_name),
                phone = coalesce(nullif(?, ''), phone),
                updated_at = datetime('now')
            WHERE email = ?
        ''', (full_name, phone, user_email))

    # Update role-specific profile
    if role == "patient":
        age = data.get("age")
        gender = data.get("gender")
        blood_group = data.get("blood_group")
        emergency_contact = data.get("emergency_contact")
        address = data.get("address")
        allergies = data.get("allergies")
        chronic_conditions = data.get("chronic_conditions")
        dietary_preference = data.get("dietary_preference")

        conn.execute('''
            UPDATE patient_profiles SET
                age = coalesce(?, age),
                gender = coalesce(?, gender),
                blood_group = coalesce(?, blood_group),
                emergency_contact = coalesce(?, emergency_contact),
                address = coalesce(?, address),
                allergies = coalesce(?, allergies),
                chronic_conditions = coalesce(?, chronic_conditions),
                dietary_preference = coalesce(?, dietary_preference),
                updated_at = datetime('now')
            WHERE email = ?
        ''', (age, gender, blood_group, emergency_contact, address, allergies, chronic_conditions, dietary_preference, user_email))

    elif role == "doctor":
        specialization = data.get("specialization")
        hospital_name = data.get("hospital_name")
        bio = data.get("bio")
        experience_years = data.get("experience_years")

        conn.execute('''
            UPDATE doctor_profiles SET
                specialization = coalesce(?, specialization),
                hospital_name = coalesce(?, hospital_name),
                bio = coalesce(?, bio),
                experience_years = coalesce(?, experience_years)
            WHERE email = ?
        ''', (specialization, hospital_name, bio, experience_years, user_email))

    conn.commit()
    conn.close()

    log_audit(user_email, "UPDATE_SELF_PROFILE", target_type="users", target_id=user_email,
              details="User updated profile details", ip_address=get_client_ip())

    return jsonify({"message": "Profile updated successfully."}), 200

@common_bp.route("/disease-education", methods=["GET"])
def get_disease_education():
    """Returns educational content for the 5 cardiovascular conditions."""
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM disease_education ORDER BY id ASC").fetchall()
    conn.close()

    diseases = []
    for r in rows:
        d = dict(r)
        try:
            d["symptoms"] = json.loads(d["symptoms"]) if d["symptoms"] else []
            d["risk_factors"] = json.loads(d["risk_factors"]) if d["risk_factors"] else []
            d["prevention"] = json.loads(d["prevention"]) if d["prevention"] else []
            d["warning_signs"] = json.loads(d["warning_signs"]) if d["warning_signs"] else []
        except Exception:
            pass
        diseases.append(d)

    return jsonify({"diseases": diseases}), 200
