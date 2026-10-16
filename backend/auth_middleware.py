# backend/auth_middleware.py
import os
import jwt
from functools import wraps
from datetime import datetime, timedelta
from flask import request, jsonify, g
from database import get_db_connection

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "cardiopredict-dev-jwt-key-2026-secure")
JWT_ALGORITHM = "HS256"

def generate_jwt_token(user_dict: dict, expires_in_hours: int = 12) -> str:
    """Generates a signed JWT access token containing user identity and role."""
    payload = {
        "sub": user_dict["email"],
        "email": user_dict["email"],
        "full_name": user_dict.get("full_name") or user_dict.get("username", ""),
        "role": user_dict.get("role", "patient"),
        "status": user_dict.get("status", "active"),
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(hours=expires_in_hours)
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def decode_jwt_token(token: str) -> dict:
    """Decodes and validates a JWT access token."""
    return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])

def get_token_from_header() -> str:
    """Extracts the Bearer token from the Authorization header."""
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header.split(" ", 1)[1].strip()
    # Check query param as fallback for file download streaming
    token_param = request.args.get("token")
    if token_param:
        return token_param.strip()
    return ""

def jwt_required_custom(f):
    """Decorator to enforce valid JWT token on protected endpoints."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = get_token_from_header()
        if not token:
            return jsonify({"error": "Authorization token is missing. Please log in."}), 401

        try:
            payload = decode_jwt_token(token)
            # Verify user exists and check active status in database
            conn = get_db_connection()
            user = conn.execute("SELECT email, full_name, role, status FROM users WHERE email = ?", (payload["email"],)).fetchone()
            conn.close()

            if not user:
                return jsonify({"error": "User account not found."}), 401

            if user["status"] in ["suspended", "inactive"]:
                return jsonify({"error": "Your account has been deactivated or suspended. Please contact the administrator."}), 403

            g.current_user = {
                "email": user["email"],
                "full_name": user["full_name"],
                "role": user["role"],
                "status": user["status"]
            }
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Session has expired. Please log in again."}), 401
        except (jwt.InvalidTokenError, Exception) as e:
            return jsonify({"error": f"Invalid authorization token: {str(e)}"}), 401

        return f(*args, **kwargs)
    return decorated_function

def role_required(allowed_roles: list):
    """Decorator to enforce role-based access control (Admin, Doctor, Patient)."""
    def decorator(f):
        @wraps(f)
        @jwt_required_custom
        def decorated_function(*args, **kwargs):
            current_user = getattr(g, "current_user", None)
            if not current_user:
                return jsonify({"error": "Authentication required."}), 401

            user_role = current_user.get("role", "")
            if user_role not in allowed_roles:
                return jsonify({
                    "error": f"Access forbidden. Role '{user_role}' is not authorized to access this module."
                }), 403

            # Special verification for doctors: must be approved (status == 'active')
            if user_role == "doctor" and current_user.get("status") == "pending":
                return jsonify({
                    "error": "Your doctor registration is pending administrator approval. Patient records cannot be accessed yet."
                }), 403

            return f(*args, **kwargs)
        return decorated_function
    return decorator

def get_client_ip() -> str:
    """Utility to retrieve client IP address for security audit logs."""
    if request.headers.get("X-Forwarded-For"):
        return request.headers.get("X-Forwarded-For").split(",")[0].strip()
    return request.remote_addr or "127.0.0.1"
