from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import (
    JWTManager, create_access_token, jwt_required, get_jwt_identity
)
import sqlite3
from flask_cors import CORS
import datetime

auth_bp = Blueprint("auth", __name__)
CORS(auth_bp)

DB_PATH = "sachin.db"

# Create table if not exists
def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT,
                phone TEXT,
                email TEXT UNIQUE,
                password TEXT
            )
        """)
        conn.commit()
init_db()

# ----------------------------
# 🔹 USER REGISTRATION
# ----------------------------
@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username")
    phone = data.get("phone")
    email = data.get("email")
    password = data.get("password")

    if not (username and email and password):
        return jsonify({"error": "Missing required fields"}), 400

    hashed_password = generate_password_hash(password)

    try:
        with sqlite3.connect(DB_PATH) as conn:
            conn.execute(
                "INSERT INTO users (username, phone, email, password) VALUES (?, ?, ?, ?)",
                (username, phone, email, hashed_password)
            )
            conn.commit()
        return jsonify({"message": "User registered successfully!"}), 201
    except sqlite3.IntegrityError:
        return jsonify({"error": "Email already registered"}), 400

# ----------------------------
# 🔹 USER LOGIN
# ----------------------------
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    with sqlite3.connect(DB_PATH) as conn:
        cur = conn.cursor()
        cur.execute("SELECT id, username, email, password FROM users WHERE email = ?", (email,))
        user = cur.fetchone()

    if not user:
        return jsonify({"error": "User not found"}), 404

    user_id, username, email, hashed_password = user

    if not check_password_hash(hashed_password, password):
        return jsonify({"error": "Invalid credentials"}), 401

    # Create JWT Token
    access_token = create_access_token(
        identity={"id": user_id, "username": username, "email": email},
        expires_delta=datetime.timedelta(hours=5)
    )

    return jsonify({"token": access_token, "username": username}), 200

# ----------------------------
# 🔹 PROTECTED TEST ROUTE
# ----------------------------
@auth_bp.route("/profile", methods=["GET"])
@jwt_required()
def profile():
    user = get_jwt_identity()
    return jsonify({"message": "Access granted", "user": user}), 200
