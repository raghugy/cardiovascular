# backend/auth_routes.py
import re
import secrets
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, g
from werkzeug.security import generate_password_hash, check_password_hash
from database import get_db_connection, log_audit, create_notification
from auth_middleware import generate_jwt_token, jwt_required_custom, get_client_ip

auth_bp = Blueprint("auth_api", __name__)

EMAIL_REGEX = re.compile(r"^[\w\.\+\-]+@[a-zA-Z0-9\-]+\.[a-zA-Z0-9\-\.]+$")
PHONE_REGEX = re.compile(r"^\d{10}$")

NAME_REGEX = re.compile(r"^[a-zA-Z\s\.'\-]{2,100}$")
# Strong password: min 8 chars, at least one uppercase, one lowercase, one digit, one special character
PASSWORD_REGEX = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#^()_\-+=\[\]{}|;:,.<>])[A-Za-z\d@$!%*?&#^()_\-+=\[\]{}|;:,.<>]{8,}$")

@auth_bp.route("/register", methods=["POST"])
def register():
    """
    Public registration endpoint.
    Supports Patient registration only.
    Administrator accounts are provisioned via secure bootstrap only.
    Doctor module has been removed.
    """
    data = request.get_json() or {}
    full_name = data.get("full_name", "").strip()
    email = data.get("email", "").strip().lower()
    phone = data.get("phone", "").strip()
    password = data.get("password", "")
    confirm_password = data.get("confirm_password", "")
    consent = data.get("consent_terms") or data.get("consent_privacy") or False
    role = data.get("role", "patient").strip().lower()

    # 1. Mandatory field checks
    if not full_name:
        return jsonify({"error": "Full name is required."}), 400
    if not email:
        return jsonify({"error": "Email address is required."}), 400
    if not phone:
        return jsonify({"error": "Mobile number is required."}), 400
    if not password:
        return jsonify({"error": "Password is required."}), 400
    if not confirm_password:
        return jsonify({"error": "Please confirm your password."}), 400
    if not consent:
        return jsonify({"error": "You must agree to the Terms of Service and Privacy Policy to register."}), 400

    # 2. Full Name validation
    # Reject names containing numbers (e.g. Raghu123, 123Raghu, Ra2ghu)
    if any(char.isdigit() for char in full_name):
        return jsonify({"error": "Name must contain letters and alphabetic characters only. Numbers are not allowed."}), 400

    # Accept legitimate names with alphabetic characters, spaces, hyphens, and apostrophes
    if not re.match(r"^[a-zA-Z][a-zA-Z\s'\-]{1,59}$", full_name):
        return jsonify({"error": "Name must contain letters only (2 to 60 characters). Special characters other than spaces, hyphens, and apostrophes are not allowed."}), 400

    # 3. Email format validation
    # Enforce alphabetic first character and explain to user
    if re.match(r"^\d", email):
        return jsonify({"error": "Email address must begin with an alphabetic letter (a-z). Leading numbers are not allowed in this system."}), 400

    # Reject consecutive or misplaced dots
    if ".." in email or email.startswith(".") or "@." in email or ".@" in email or email.endswith("."):
        return jsonify({"error": "Email address contains invalid consecutive or misplaced dots."}), 400

    # RFC-aligned structure with alphabetic first char, valid local part, valid domain, and at least 2-letter TLD
    EMAIL_STRICT_REGEX = re.compile(
        r"^[a-zA-Z][a-zA-Z0-9._%+-]*@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$"
    )
    if not EMAIL_STRICT_REGEX.match(email):
        return jsonify({"error": "Please provide a valid email address with a proper domain (e.g., patient.name@domain.com)."}), 400

    # 4. Indian Mobile number validation (exactly 10 digits starting with 6-9, optional +91 prefix)
    raw_phone = phone.strip()
    if raw_phone.startswith("+91"):
        raw_phone = raw_phone[3:].strip()
    elif raw_phone.startswith("91") and len(raw_phone) == 12:
        raw_phone = raw_phone[2:].strip()

    phone_digits = re.sub(r"\D", "", raw_phone)
    if len(phone_digits) != 10 or not re.match(r"^[6-9]\d{9}$", phone_digits):
        return jsonify({"error": "Indian mobile number must be exactly 10 numeric digits starting with 6, 7, 8, or 9 (e.g., 9876543210)."}), 400
    phone = phone_digits

    # 5. Password confirmation and policy enforcement
    if password != confirm_password:
        return jsonify({"error": "Passwords do not match."}), 400

    if not PASSWORD_REGEX.match(password):
        return jsonify({
            "error": "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character."
        }), 400

    # 6. Role Security: Public cannot create Admin accounts or Doctor accounts
    if role != "patient":
        return jsonify({"error": "Public registration is only available for Patient accounts."}), 400

    # 7. Check duplicates in database
    conn = get_db_connection()
    existing_user = conn.execute("SELECT email, phone FROM users WHERE email = ? OR phone = ?", (email, phone)).fetchone()
    if existing_user:
        conn.close()
        if existing_user["email"] == email:
            return jsonify({"error": "An account with this email address already exists. Please log in instead."}), 409
        else:
            return jsonify({"error": "This mobile number is already registered to another account."}), 409

    # 8. Create active patient record
    hashed_password = generate_password_hash(password)

    try:
        conn.execute('''
            INSERT INTO users (email, username, full_name, phone, password, role, status, consent_privacy, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'patient', 'active', 1, datetime('now'), datetime('now'))
        ''', (email, full_name, full_name, phone, hashed_password))

        # Create default patient profile
        conn.execute('''
            INSERT INTO patient_profiles (email, age, gender, created_at)
            VALUES (?, ?, ?, datetime('now'))
        ''', (email, int(data.get("age", 0) or 0) if data.get("age") else None, data.get("gender", "")))

        conn.commit()

        create_notification(
            email,
            "Welcome to CardioPredict",
            "Your patient account has been created. You can now upload medical reports, review AI cardiovascular risk assessments, and explore personalized heart-healthy nutrition.",
            "success",
            "/patient/upload"
        )

        conn.close()

        # Audit log
        log_audit(email, "USER_REGISTER", target_type="users", target_id=email,
                  details="Patient account registered successfully", ip_address=get_client_ip(), actor_role="patient")

        return jsonify({
            "message": "Account created successfully! You can now log in.",
            "status": "active",
            "role": "patient"
        }), 201

    except Exception as e:
        conn.rollback()
        conn.close()
        return jsonify({"error": f"Failed to register account: {str(e)}"}), 500

@auth_bp.route("/login", methods=["POST"])
def login():
    """
    User login endpoint.
    Authenticates both Patients and Administrators.
    Determines destination strictly from the verified server-side role.
    """
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password are required."}), 400

    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()

    if not user:
        return jsonify({"error": "Invalid email or password."}), 401

    if not check_password_hash(user["password"], password):
        log_audit(email, "FAILED_LOGIN_ATTEMPT", target_type="users", target_id=email,
                  details="Incorrect password provided", ip_address=get_client_ip(), actor_role=user["role"])
        return jsonify({"error": "Invalid email or password."}), 401

    # Check Account Status
    account_status = user["status"]
    if account_status in ["suspended", "inactive"]:
        return jsonify({
            "error": "Your account has been deactivated or suspended. Please contact the system administrator."
        }), 403

    # Generate JWT Token with server-determined role
    actual_role = user["role"]
    token = generate_jwt_token(dict(user))

    # Record login audit
    log_audit(email, "USER_LOGIN", target_type="users", target_id=email,
              details=f"Successful authentication as {actual_role}", ip_address=get_client_ip(), actor_role=actual_role)

    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": {
            "email": user["email"],
            "full_name": user["full_name"] or user["username"],
            "phone": user["phone"] or "",
            "role": actual_role,
            "status": user["status"]
        }
    }), 200

@auth_bp.route("/admin-login", methods=["POST"])
def admin_login():
    """
    Dedicated Administrator authentication endpoint.
    Strictly verifies credentials against the single authorized administrator account.
    Rejects patient accounts or unauthorized attempts with 401.
    """
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Administrator email and password are required."}), 400

    conn = get_db_connection()
    user = conn.execute("SELECT * FROM users WHERE email = ? AND role = 'admin'", (email,)).fetchone()
    conn.close()

    if not user or not check_password_hash(user["password"], password):
        log_audit(email, "FAILED_ADMIN_LOGIN", target_type="users", target_id=email,
                  details="Failed administrator authentication attempt", ip_address=get_client_ip(), actor_role="unknown")
        return jsonify({"error": "Invalid administrator credentials or unauthorized access."}), 401

    if user["status"] != "active":
        return jsonify({"error": "Administrator account is currently suspended or inactive."}), 403

    token = generate_jwt_token(dict(user))
    log_audit(email, "ADMIN_LOGIN_SUCCESS", target_type="users", target_id=email,
              details="Authorized administrator authenticated successfully", ip_address=get_client_ip(), actor_role="admin")

    return jsonify({
        "message": "Administrator authentication successful",
        "token": token,
        "user": {
            "email": user["email"],
            "full_name": user["full_name"] or user["username"],
            "phone": user["phone"] or "",
            "role": "admin",
            "status": user["status"]
        }
    }), 200

@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    """Generates a secure password reset token."""
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()

    if not email:
        return jsonify({"error": "Please provide your registered email address."}), 400

    conn = get_db_connection()
    user = conn.execute("SELECT email, full_name FROM users WHERE email = ?", (email,)).fetchone()

    if not user:
        conn.close()
        # For security, avoid enumerating emails, but return friendly instruction
        return jsonify({
            "message": "If an account exists with this email address, password reset instructions have been generated."
        }), 200

    reset_token = secrets.token_hex(20)
    expiry = datetime.utcnow() + timedelta(hours=1)

    conn.execute('''
        UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE email = ?
    ''', (reset_token, expiry, email))
    conn.commit()
    conn.close()

    log_audit(email, "PASSWORD_RESET_REQUESTED", target_type="users", target_id=email,
              details="Reset token generated", ip_address=get_client_ip())

    # Return reset_token directly in response for seamless development/testing without SMTP configuration
    return jsonify({
        "message": "Password reset token generated successfully. (In production, this is emailed to the user).",
        "reset_token": reset_token,
        "email": email,
        "instructions": "Enter this token on the Reset Password page to configure a new password."
    }), 200

@auth_bp.route("/reset-password", methods=["POST"])
def reset_password():
    """Resets user password with a valid token."""
    data = request.get_json() or {}
    email = data.get("email", "").strip().lower()
    reset_token = data.get("reset_token", "").strip()
    new_password = data.get("new_password", "")
    confirm_password = data.get("confirm_password", "")

    if not all([email, reset_token, new_password, confirm_password]):
        return jsonify({"error": "All fields are required (Email, Reset Token, New Password, Confirm Password)."}), 400

    if new_password != confirm_password:
        return jsonify({"error": "New passwords do not match."}), 400

    if len(new_password) < 8:
        return jsonify({"error": "Password must be at least 8 characters long."}), 400

    conn = get_db_connection()
    user = conn.execute('''
        SELECT email, reset_token, reset_token_expiry FROM users WHERE email = ?
    ''', (email,)).fetchone()

    if not user or user["reset_token"] != reset_token:
        conn.close()
        return jsonify({"error": "Invalid or expired password reset token."}), 400

    # Check token expiry if set
    if user["reset_token_expiry"]:
        try:
            exp_time = datetime.fromisoformat(str(user["reset_token_expiry"]))
            if datetime.utcnow() > exp_time:
                conn.close()
                return jsonify({"error": "Reset token has expired. Please request a new one."}), 400
        except Exception:
            pass

    hashed_pw = generate_password_hash(new_password)
    conn.execute('''
        UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL, updated_at = datetime('now')
        WHERE email = ?
    ''', (hashed_pw, email))
    conn.commit()
    conn.close()

    log_audit(email, "PASSWORD_RESET_SUCCESS", target_type="users", target_id=email,
              details="Password changed via reset token", ip_address=get_client_ip())

    create_notification(email, "Password Updated", "Your password has been successfully updated.", "info")

    return jsonify({"message": "Password reset successfully! You can now log in with your new password."}), 200

@auth_bp.route("/me", methods=["GET"])
@jwt_required_custom
def get_current_user_profile():
    """Returns the authenticated user's profile and permissions."""
    current_user = g.current_user
    email = current_user["email"]

    conn = get_db_connection()
    user = conn.execute("SELECT email, username, full_name, phone, role, status, created_at FROM users WHERE email = ?", (email,)).fetchone()

    profile_data = dict(user) if user else {}

    if current_user["role"] == "doctor":
        doc_prof = conn.execute("SELECT * FROM doctor_profiles WHERE email = ?", (email,)).fetchone()
        profile_data["doctor_profile"] = dict(doc_prof) if doc_prof else {}
    elif current_user["role"] == "patient":
        pat_prof = conn.execute("SELECT * FROM patient_profiles WHERE email = ?", (email,)).fetchone()
        profile_data["patient_profile"] = dict(pat_prof) if pat_prof else {}

    conn.close()
    return jsonify({"user": profile_data}), 200
