# backend/bootstrap_admin.py
"""
Secure one-time administrator bootstrap script for CardioPredict.
Can be executed via CLI:
    python bootstrap_admin.py [--email admin@example.com] [--password SecurePass123!]
Or configured via environment variables:
    ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, ADMIN_PHONE
"""
import os
import sys
import argparse
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash
from database import get_db_connection, init_db, log_audit

load_dotenv()

def bootstrap_admin(email=None, password=None, full_name=None, phone=None, force=False):
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()

    # Check if an admin already exists
    cursor.execute("SELECT email, full_name, created_at FROM users WHERE role = 'admin'")
    existing_admin = cursor.fetchone()

    if existing_admin and not force:
        print(f"⚠️ Administrator account already exists: {existing_admin['email']} (created {existing_admin['created_at']}).")
        print("Initial bootstrap is locked to prevent repeated unauthorized resets. Pass --force to reconfigure.")
        conn.close()
        return False

    admin_email = (email or os.getenv("ADMIN_EMAIL") or "admin@cardiopredict.org").strip().lower()
    admin_password = password or os.getenv("ADMIN_PASSWORD") or "Admin@12345"
    admin_name = full_name or os.getenv("ADMIN_NAME") or "System Administrator"
    admin_phone = phone or os.getenv("ADMIN_PHONE") or "9876543210"

    if len(admin_password) < 8:
        print("❌ Error: Administrator password must be at least 8 characters.")
        conn.close()
        return False

    hashed_pw = generate_password_hash(admin_password)

    if existing_admin and force:
        cursor.execute('''
            UPDATE users
            SET full_name = ?, phone = ?, password = ?, status = 'active', updated_at = datetime('now')
            WHERE email = ? AND role = 'admin'
        ''', (admin_name, admin_phone, hashed_pw, admin_email))
        action_name = "ADMIN_BOOTSTRAP_RESET"
    else:
        cursor.execute('''
            INSERT OR REPLACE INTO users (email, username, full_name, phone, password, role, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 'admin', 'active', datetime('now'), datetime('now'))
        ''', (admin_email, admin_name, admin_name, admin_phone, hashed_pw))
        action_name = "ADMIN_INITIAL_BOOTSTRAP"

    conn.commit()
    conn.close()

    log_audit(admin_email, action_name, target_type="users", target_id=admin_email,
              details=f"Admin account bootstrapped ({admin_name})", ip_address="127.0.0.1", actor_role="admin")

    print(f"✅ Administrator established successfully: {admin_email}")
    return True

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CardioPredict Admin Bootstrap")
    parser.add_argument("--email", type=str, help="Admin email address")
    parser.add_argument("--password", type=str, help="Admin password (min 8 chars)")
    parser.add_argument("--name", type=str, help="Admin full name")
    parser.add_argument("--phone", type=str, help="Admin 10-digit mobile number")
    parser.add_argument("--force", action="store_true", help="Force reconfiguration of existing admin")
    args = parser.parse_args()

    bootstrap_admin(args.email, args.password, args.name, args.phone, args.force)
