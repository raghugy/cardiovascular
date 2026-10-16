# backend/app.py
import os
import sys
import json
import traceback
from datetime import datetime
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

# Enable UTF-8 output on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# -------------------------
# Load environment variables
# -------------------------
load_dotenv()

# -------------------------
# Database initialization
# -------------------------
from database import get_db_connection, init_db, log_audit
init_db()

# -------------------------
# ML Models loading
# -------------------------
from main import predict_all_diseases, load_all_models
models = load_all_models()
if models is None:
    print("❌ Warning: Models not loaded at startup. Check backend/models/*")
else:
    print("✅ All 5 Cardiovascular ML Models loaded successfully at startup.")

# -------------------------
# AI Recommendation Provider Check
# -------------------------
from ai_nutrition_service import check_ai_provider_connection
ai_check = check_ai_provider_connection()
if ai_check.get("configured"):
    print(f"🤖 AI Nutrition Service: {ai_check.get('provider')} - {ai_check.get('message')}")
else:
    print(f"ℹ️ AI Nutrition Service: Unconfigured ({ai_check.get('message')})")

# -------------------------
# Flask App Setup
# -------------------------
app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("FLASK_SECRET_KEY", "cardiopredict-dev-secret-key-12345")
app.config["MAX_CONTENT_LENGTH"] = int(os.getenv("MAX_CONTENT_LENGTH", 10 * 1024 * 1024))  # 10 MB limit
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

# -------------------------
# Blueprints Registration
# -------------------------
from auth_routes import auth_bp
from admin_routes import admin_bp
from patient_routes import patient_bp
from common_routes import common_bp
from auth_middleware import generate_jwt_token, get_client_ip

app.register_blueprint(auth_bp, url_prefix="/api/auth")
app.register_blueprint(admin_bp, url_prefix="/api/admin")
app.register_blueprint(patient_bp, url_prefix="/api/patient")
app.register_blueprint(common_bp, url_prefix="/api")

# -------------------------
# Root / Health check route
# -------------------------
@app.route("/", methods=["GET"])
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "app": "CardioPredict API",
        "version": "2.0.0",
        "models_loaded": bool(models),
        "available_models": list(models.keys()) if models else []
    })

@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({"error": "The uploaded file exceeds the 10 MB maximum size limit. Please upload a smaller PDF."}), 413

@app.errorhandler(400)
def bad_request(error):
    return jsonify({"error": str(error) if hasattr(error, 'description') else "Bad request."}), 400

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Requested resource was not found."}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "An internal server error occurred. Please try again."}), 500

# -------------------------------------------------------------
# Legacy Compatibility Routes (preserves original endpoints)
# -------------------------------------------------------------
@app.route("/signup", methods=["POST"])
def legacy_signup():
    """Legacy signup route adapted to support role-based user records."""
    try:
        data = request.get_json() or {}
        username = data.get("username", "").strip()
        full_name = data.get("full_name") or username
        email = data.get("email", "").strip().lower()
        phone = data.get("phone", "0000000000").strip()
        password = data.get("password", "")
        role = "patient"  # Only Patient supported for public registration

        if not all([username, email, password]):
            return jsonify({"error": "All fields required"}), 400

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT email FROM users WHERE email = ?", (email,))
        if cursor.fetchone():
            conn.close()
            return jsonify({"error": "User already exists"}), 409

        hashed_pw = generate_password_hash(password)
        cursor.execute('''
            INSERT INTO users (email, username, full_name, phone, password, role, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'patient', 'active', datetime('now'), datetime('now'))
        ''', (email, username, full_name, phone, hashed_pw))

        cursor.execute('''
            INSERT INTO patient_profiles (email, created_at) VALUES (?, datetime('now'))
        ''', (email,))

        conn.commit()
        conn.close()

        log_audit(email, "LEGACY_SIGNUP", target_type="users", target_id=email, details="Role: patient", ip_address=get_client_ip())
        return jsonify({"message": "Signup successful!"}), 201

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route("/login", methods=["POST"])
def legacy_login():
    """Legacy login route returning JWT token and role information."""
    try:
        data = request.get_json() or {}
        email = data.get("email", "").strip().lower()
        password = data.get("password", "")

        if not all([email, password]):
            return jsonify({"error": "Email and password required"}), 400

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
        user = cursor.fetchone()
        conn.close()

        if not user or not check_password_hash(user["password"], password):
            return jsonify({"error": "Invalid credentials"}), 401

        if user["status"] in ["suspended", "inactive"]:
            return jsonify({"error": "Your account has been deactivated or suspended."}), 403

        token = generate_jwt_token(dict(user))

        return jsonify({
            "message": "Login successful",
            "token": token,
            "username": user["username"],
            "full_name": user["full_name"] or user["username"],
            "email": email,
            "role": user["role"],
            "status": user["status"]
        }), 200

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route("/predict_all", methods=["POST"])
def legacy_predict_all():
    """Legacy predict_all route preserving existing model prediction workflow."""
    try:
        payload = request.get_json()
        if payload is None:
            return jsonify({"error": "No JSON body received"}), 400

        user_email = payload.get("email")

        # unwrap { "data": {...} }
        if "data" in payload and isinstance(payload["data"], dict):
            payload = payload["data"]

        result = predict_all_diseases(payload)

        # Store predictions in DB if email is provided
        if user_email and "predictions" in result:
            conn = get_db_connection()
            cursor = conn.cursor()
            for disease, d_val in result["predictions"].items():
                if "error" not in d_val:
                    cursor.execute('''
                        INSERT INTO predictions (email, disease_name, score, risk, features_snapshot)
                        VALUES (?, ?, ?, ?, ?)
                    ''', (user_email, disease, d_val.get("score"), d_val.get("risk"), json.dumps(payload)))
            conn.commit()
            conn.close()

            log_audit(user_email, "PREDICT_ALL", target_type="predictions", target_id=user_email,
                      details="Predictions stored from /predict_all", ip_address=get_client_ip())

        return jsonify(result)

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.route("/contact", methods=["POST"])
def legacy_contact():
    """Preserves contact form submissions."""
    try:
        data = request.get_json() or {}
        name = data.get("name")
        email = data.get("email")
        message = data.get("message")

        if not all([name, email, message]):
            return jsonify({"error": "All fields are required"}), 400

        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO contacts (name, email, message) VALUES (?, ?, ?)",
            (name, email, message)
        )
        conn.commit()
        conn.close()

        log_audit(email, "CONTACT_FORM_SUBMISSION", details=f"Name: {name}", ip_address=get_client_ip())

        return jsonify({"message": "Thank you for your message! We'll get back to you soon."}), 201

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({"error": "File size exceeds 10 MB limit. Please upload a smaller PDF report."}), 413

# -------------------------
# RUN APP
# -------------------------
if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    app.run(host="0.0.0.0", port=port, debug=False)
