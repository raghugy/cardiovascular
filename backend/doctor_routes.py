# backend/doctor_routes.py
import json
from flask import Blueprint, request, jsonify, g
from database import get_db_connection, log_audit, create_notification
from auth_middleware import role_required, get_client_ip

doctor_bp = Blueprint("doctor_api", __name__)

def check_doctor_approved(doctor_email):
    """Verifies that the doctor has been approved by an administrator."""
    conn = get_db_connection()
    doc = conn.execute("SELECT approval_status FROM doctor_profiles WHERE email = ?", (doctor_email,)).fetchone()
    conn.close()
    return doc and doc["approval_status"] == "approved"

@doctor_bp.route("/dashboard", methods=["GET"])
@role_required(["doctor"])
def get_doctor_dashboard():
    """
    Returns dashboard statistics and metrics for the logged-in doctor.
    """
    doctor_email = g.current_user["email"]

    if not check_doctor_approved(doctor_email):
        return jsonify({
            "error": "Your doctor credentials are under review by an administrator. Patient medical records will become accessible once approved."
        }), 403

    conn = get_db_connection()
    cursor = conn.cursor()

    # Assigned Patients Count
    cursor.execute('''
        SELECT COUNT(DISTINCT patient_email)
        FROM doctor_patient_assignments
        WHERE doctor_email = ? AND status = 'active' AND consent_granted = 1
    ''', (doctor_email,))
    assigned_patients_count = cursor.fetchone()[0]

    # Reports Awaiting Review
    cursor.execute('''
        SELECT COUNT(DISTINCT r.id)
        FROM medical_reports r
        JOIN doctor_patient_assignments a ON r.patient_email = a.patient_email
        WHERE a.doctor_email = ? AND a.status = 'active' AND a.consent_granted = 1
          AND r.reviewed_by IS NULL
    ''', (doctor_email,))
    reports_awaiting_review = cursor.fetchone()[0]

    # Pending and Upcoming Appointments
    cursor.execute('''
        SELECT COUNT(*)
        FROM appointments
        WHERE doctor_email = ? AND status IN ('pending', 'confirmed') AND appointment_date >= date('now')
    ''', (doctor_email,))
    upcoming_appointments = cursor.fetchone()[0]

    # Recently Reviewed Reports (Last 5)
    cursor.execute('''
        SELECT r.id, r.patient_email, u.full_name as patient_name, r.report_title, r.created_at as uploaded_at, r.reviewed_at
        FROM medical_reports r
        JOIN users u ON r.patient_email = u.email
        WHERE r.reviewed_by = ?
        ORDER BY r.reviewed_at DESC
        LIMIT 5
    ''', (doctor_email,))
    recently_reviewed = [dict(row) for row in cursor.fetchall()]

    # Upcoming Appointments List (Next 5)
    cursor.execute('''
        SELECT a.id, a.patient_email, u.full_name as patient_name, u.phone as patient_phone,
               a.appointment_date, a.time_slot, a.reason, a.status
        FROM appointments a
        JOIN users u ON a.patient_email = u.email
        WHERE a.doctor_email = ? AND a.appointment_date >= date('now')
        ORDER BY a.appointment_date ASC, a.time_slot ASC
        LIMIT 5
    ''', (doctor_email,))
    appointments_list = [dict(row) for row in cursor.fetchall()]

    conn.close()

    return jsonify({
        "stats": {
            "assigned_patients_count": assigned_patients_count,
            "reports_awaiting_review": reports_awaiting_review,
            "upcoming_appointments": upcoming_appointments,
            "recently_reviewed_count": len(recently_reviewed)
        },
        "recently_reviewed": recently_reviewed,
        "upcoming_appointments_list": appointments_list
    }), 200

@doctor_bp.route("/patients", methods=["GET"])
@role_required(["doctor"])
def list_assigned_patients():
    """
    Lists only patients who have active consent-granted assignments with this doctor.
    Protects private patient records from unauthorized doctors.
    """
    doctor_email = g.current_user["email"]

    if not check_doctor_approved(doctor_email):
        return jsonify({"error": "Doctor approval required."}), 403

    conn = get_db_connection()
    patients = conn.execute('''
        SELECT u.email, u.full_name, u.phone, p.age, p.gender, p.blood_group,
               p.chronic_conditions, p.dietary_preference, a.created_at as assigned_at, a.consent_granted,
               (SELECT COUNT(*) FROM medical_reports r WHERE r.patient_email = u.email) as report_count,
               (SELECT MAX(timestamp) FROM predictions pred WHERE pred.email = u.email) as last_prediction_date
        FROM doctor_patient_assignments a
        JOIN users u ON a.patient_email = u.email
        LEFT JOIN patient_profiles p ON u.email = p.email
        WHERE a.doctor_email = ? AND a.status = 'active' AND a.consent_granted = 1
        ORDER BY u.full_name ASC
    ''', (doctor_email,)).fetchall()
    conn.close()

    return jsonify({"patients": [dict(row) for row in patients]}), 200

@doctor_bp.route("/patients/<patient_email>", methods=["GET"])
@role_required(["doctor"])
def get_patient_details(patient_email):
    """
    Retrieves a specific patient's profile, reports, and prediction history.
    Enforces authorization check: patient must be assigned with consent granted.
    """
    doctor_email = g.current_user["email"]

    if not check_doctor_approved(doctor_email):
        return jsonify({"error": "Doctor approval required."}), 403

    conn = get_db_connection()

    # IDOR Check: Ensure active assignment and patient consent exists
    assignment = conn.execute('''
        SELECT id, consent_granted FROM doctor_patient_assignments
        WHERE doctor_email = ? AND patient_email = ? AND status = 'active' AND consent_granted = 1
    ''', (doctor_email, patient_email)).fetchone()

    if not assignment:
        conn.close()
        return jsonify({
            "error": "Access forbidden. You are not assigned to this patient or patient consent has not been granted."
        }), 403

    # Patient info
    user = conn.execute("SELECT email, full_name, phone, created_at FROM users WHERE email = ?", (patient_email,)).fetchone()
    profile = conn.execute("SELECT * FROM patient_profiles WHERE email = ?", (patient_email,)).fetchone()

    # Medical reports
    reports = conn.execute('''
        SELECT id, report_title, original_filename, file_size, extraction_method,
               extracted_data, verified_data, status, reviewed_by, reviewed_at, created_at
        FROM medical_reports
        WHERE patient_email = ?
        ORDER BY created_at DESC
    ''', (patient_email,)).fetchall()

    reports_list = []
    for r in reports:
        rd = dict(r)
        try:
            rd["extracted_data"] = json.loads(rd["extracted_data"]) if rd["extracted_data"] else {}
            rd["verified_data"] = json.loads(rd["verified_data"]) if rd["verified_data"] else {}
        except Exception:
            pass
        reports_list.append(rd)

    # Predictions history
    predictions = conn.execute('''
        SELECT id, disease_name, score, risk, timestamp, report_id, features_snapshot
        FROM predictions
        WHERE email = ?
        ORDER BY timestamp DESC
    ''', (patient_email,)).fetchall()

    predictions_list = []
    for p in predictions:
        pd = dict(p)
        try:
            pd["features_snapshot"] = json.loads(pd["features_snapshot"]) if pd["features_snapshot"] else {}
        except Exception:
            pass
        predictions_list.append(pd)

    # Consultation History
    consultations = conn.execute('''
        SELECT id, clinical_notes, dietary_guidance, exercise_guidance, follow_up_advice, created_at
        FROM consultation_notes
        WHERE doctor_email = ? AND patient_email = ?
        ORDER BY created_at DESC
    ''', (doctor_email, patient_email)).fetchall()

    conn.close()

    log_audit(doctor_email, "DOCTOR_VIEW_PATIENT_RECORDS", target_type="patient_profiles", target_id=patient_email,
              details="Authorized clinical chart review", ip_address=get_client_ip())

    return jsonify({
        "patient": dict(user) if user else {},
        "profile": dict(profile) if profile else {},
        "reports": reports_list,
        "predictions": predictions_list,
        "consultations": [dict(c) for c in consultations]
    }), 200

@doctor_bp.route("/reports/<int:report_id>", methods=["GET"])
@role_required(["doctor"])
def get_report_detail(report_id):
    """
    Returns full details for a report, including OCR clinical parameters and predictions.
    Checks doctor-patient consent before granting access.
    """
    doctor_email = g.current_user["email"]

    if not check_doctor_approved(doctor_email):
        return jsonify({"error": "Doctor approval required."}), 403

    conn = get_db_connection()
    report = conn.execute("SELECT * FROM medical_reports WHERE id = ?", (report_id,)).fetchone()
    if not report:
        conn.close()
        return jsonify({"error": "Report not found."}), 404

    patient_email = report["patient_email"]

    # Verify assignment & consent
    assignment = conn.execute('''
        SELECT id FROM doctor_patient_assignments
        WHERE doctor_email = ? AND patient_email = ? AND status = 'active' AND consent_granted = 1
    ''', (doctor_email, patient_email)).fetchone()

    if not assignment:
        conn.close()
        return jsonify({"error": "Unauthorized access to report. Patient consent required."}), 403

    rep_data = dict(report)
    try:
        rep_data["extracted_data"] = json.loads(rep_data["extracted_data"]) if rep_data["extracted_data"] else {}
        rep_data["verified_data"] = json.loads(rep_data["verified_data"]) if rep_data["verified_data"] else {}
    except Exception:
        pass

    # Linked predictions
    preds = conn.execute("SELECT * FROM predictions WHERE report_id = ?", (report_id,)).fetchall()
    predictions_map = {}
    for p in preds:
        predictions_map[p["disease_name"]] = {"score": p["score"], "risk": p["risk"]}

    rep_data["predictions"] = predictions_map
    conn.close()

    return jsonify({"report": rep_data}), 200

@doctor_bp.route("/consultations", methods=["POST"])
@role_required(["doctor"])
def add_consultation_notes():
    """
    Doctor records clinical notes, dietary instructions, exercise guidelines,
    and follow-up recommendations for an assigned patient.
    """
    doctor_email = g.current_user["email"]

    if not check_doctor_approved(doctor_email):
        return jsonify({"error": "Doctor approval required."}), 403

    data = request.get_json() or {}
    patient_email = data.get("patient_email", "").strip().lower()
    report_id = data.get("report_id")
    clinical_notes = data.get("clinical_notes", "").strip()
    dietary_guidance = data.get("dietary_guidance", "").strip()
    exercise_guidance = data.get("exercise_guidance", "").strip()
    follow_up_advice = data.get("follow_up_advice", "").strip()

    if not patient_email or not clinical_notes:
        return jsonify({"error": "Patient email and clinical notes are required."}), 400

    conn = get_db_connection()

    # Verify assignment
    assignment = conn.execute('''
        SELECT id FROM doctor_patient_assignments
        WHERE doctor_email = ? AND patient_email = ? AND status = 'active' AND consent_granted = 1
    ''', (doctor_email, patient_email)).fetchone()

    if not assignment:
        conn.close()
        return jsonify({"error": "Access forbidden. Patient is not assigned with active consent."}), 403

    cur = conn.cursor()
    cur.execute('''
        INSERT INTO consultation_notes
        (doctor_email, patient_email, report_id, clinical_notes, dietary_guidance, exercise_guidance, follow_up_advice)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ''', (doctor_email, patient_email, report_id, clinical_notes, dietary_guidance, exercise_guidance, follow_up_advice))
    new_id = cur.lastrowid

    # If linked to report, mark report as reviewed
    if report_id:
        conn.execute('''
            UPDATE medical_reports
            SET reviewed_by = ?, reviewed_at = datetime('now'), status = 'reviewed'
            WHERE id = ?
        ''', (doctor_email, report_id))

    conn.commit()

    # Get doctor name for notification
    doc_info = conn.execute("SELECT full_name FROM users WHERE email = ?", (doctor_email,)).fetchone()
    doc_name = doc_info["full_name"] if doc_info else "Your Doctor"
    conn.close()

    log_audit(doctor_email, "DOCTOR_ADD_CONSULTATION", target_type="consultation_notes", target_id=new_id,
              details=f"Added consultation notes for {patient_email}", ip_address=get_client_ip())

    # Send in-app notification to patient
    create_notification(
        patient_email,
        "New Doctor Consultation Notes Available",
        f"{doc_name} has reviewed your health assessment and recorded personalized clinical and lifestyle recommendations.",
        "review",
        "/patient/diet"
    )

    return jsonify({"message": "Consultation notes recorded successfully.", "id": new_id}), 201

# -------------------------------------------------------------
# Doctor Appointments Management
# -------------------------------------------------------------
@doctor_bp.route("/appointments", methods=["GET"])
@role_required(["doctor"])
def list_doctor_appointments():
    """Lists all appointments for the logged-in doctor."""
    doctor_email = g.current_user["email"]

    if not check_doctor_approved(doctor_email):
        return jsonify({"error": "Doctor approval required."}), 403

    conn = get_db_connection()
    appts = conn.execute('''
        SELECT a.id, a.patient_email, u.full_name as patient_name, u.phone as patient_phone,
               a.appointment_date, a.time_slot, a.reason, a.status, a.doctor_notes, a.created_at
        FROM appointments a
        JOIN users u ON a.patient_email = u.email
        WHERE a.doctor_email = ?
        ORDER BY a.appointment_date DESC, a.time_slot ASC
    ''', (doctor_email,)).fetchall()
    conn.close()

    return jsonify({"appointments": [dict(row) for row in appts]}), 200

@doctor_bp.route("/appointments/<int:id>", methods=["PATCH"])
@role_required(["doctor"])
def update_appointment_status(id):
    """
    Doctor can confirm, complete, or cancel an appointment.
    """
    doctor_email = g.current_user["email"]

    if not check_doctor_approved(doctor_email):
        return jsonify({"error": "Doctor approval required."}), 403

    data = request.get_json() or {}
    new_status = data.get("status", "").strip().lower()
    doctor_notes = data.get("doctor_notes", "").strip()

    if new_status not in ["confirmed", "completed", "cancelled"]:
        return jsonify({"error": "Invalid status. Allowed: confirmed, completed, cancelled."}), 400

    conn = get_db_connection()
    appt = conn.execute("SELECT * FROM appointments WHERE id = ? AND doctor_email = ?", (id, doctor_email)).fetchone()
    if not appt:
        conn.close()
        return jsonify({"error": "Appointment not found or not assigned to you."}), 404

    conn.execute('''
        UPDATE appointments
        SET status = ?, doctor_notes = coalesce(?, doctor_notes), updated_at = datetime('now')
        WHERE id = ?
    ''', (new_status, doctor_notes if doctor_notes else None, id))
    conn.commit()

    patient_email = appt["patient_email"]
    appt_date = appt["appointment_date"]
    time_slot = appt["time_slot"]

    conn.close()

    log_audit(doctor_email, "DOCTOR_UPDATE_APPOINTMENT", target_type="appointments", target_id=id,
              details=f"Appointment #{id} status changed to {new_status}", ip_address=get_client_ip())

    # Notify patient
    create_notification(
        patient_email,
        f"Appointment {new_status.capitalize()}",
        f"Your appointment on {appt_date} at {time_slot} has been marked as '{new_status}'.",
        "appointment",
        "/patient/appointments"
    )

    return jsonify({"message": f"Appointment status updated to {new_status}."}), 200
