# backend/wellness_service.py
"""
CardioPredict Yoga, Guided Breathing & Daily Wellness Service

Features:
1. Evidence-based, beginner-friendly cardiac yoga & mobility exercise library with seated modifications.
2. Daily wellness routine with selectable activities and real database completion checklist.
3. Personal wellness journal and real 7-day user activity statistics.
4. Patient preferences (gentle reminders toggle, preferred session duration, seated-only filter).
5. Comprehensive cardiac safety warnings and clinical disclaimers.
"""

from datetime import datetime, timedelta
from database import get_db_connection, log_audit

YOGA_LIBRARY = [
    {
        "id": "yoga_01",
        "title": "Mountain Pose with Gentle Arm Reaches (Tadasana)",
        "category": "gentle_posture",
        "level": "beginner",
        "duration_minutes": 5,
        "suitable_for_seated": True,
        "instructions": [
            "Stand with feet hip-width apart or sit upright on a sturdy chair without armrests.",
            "Inhale slowly and raise both arms gently sideways up to shoulder height, keeping shoulders relaxed.",
            "Take 5 calm, diaphragmatic breaths, keeping your gaze soft and your chest open.",
            "Slowly exhale and lower arms back to your sides."
        ],
        "seated_modification": "Perform seated on a firm chair with flat feet firmly grounded on the floor.",
        "benefits": "Improves posture, expands lung capacity, and encourages calm respiratory pacing.",
        "safety_notes": "Do not lock knees or strain shoulders. Lower your arms immediately if lightheadedness occurs."
    },
    {
        "id": "yoga_02",
        "title": "Seated Cat-Cow Breath (Marjaryasana-Bitilasana)",
        "category": "mobility",
        "level": "seated",
        "duration_minutes": 7,
        "suitable_for_seated": True,
        "instructions": [
            "Sit toward the front edge of a sturdy chair with hands resting gently on your knees.",
            "Inhale smoothly, gently lift your chest forward, and arch your upper back softly (Cow).",
            "Exhale slowly, gently round your spine, and lower your chin slightly toward your chest (Cat).",
            "Repeat smoothly for 8 to 10 breath cycles at a natural, unforced pace."
        ],
        "seated_modification": "Standard chair seated position. Avoid deep arching if you have lumbar discomfort.",
        "benefits": "Gentle spinal decompression, stimulates parasympathetic vagal tone, and improves thoracic mobility.",
        "safety_notes": "Avoid extreme neck hyperextension or breath-holding. Maintain smooth, fluid rhythm."
    },
    {
        "id": "yoga_03",
        "title": "Supported Butterfly Pose (Supta Baddha Konasana)",
        "category": "restorative",
        "level": "beginner",
        "duration_minutes": 10,
        "suitable_for_seated": True,
        "instructions": [
            "Lie back gently on a firm mat supported by a bolster or firm pillows under your head and upper back.",
            "Bring the soles of your feet together with knees gently relaxing outwards, supported by pillows.",
            "Rest arms loosely at your sides with palms facing upward.",
            "Focus on calm abdominal breathing for 8 to 10 minutes."
        ],
        "seated_modification": "Sit comfortably with soles touching or knees comfortably apart resting on a stool.",
        "benefits": "Reduces sympathetic nervous tension, gently opens the chest, and supports lower blood pressure.",
        "safety_notes": "Ensure pillows under outer thighs so there is zero strain on hips or groin."
    },
    {
        "id": "yoga_04",
        "title": "Chair Seated Lateral Side Stretches",
        "category": "mobility",
        "level": "seated",
        "duration_minutes": 6,
        "suitable_for_seated": True,
        "instructions": [
            "Sit tall with both feet flat on the floor, spine lengthened.",
            "Rest your left hand on the chair edge for stability.",
            "Inhale and raise your right arm softly, then gently lean your torso slightly to the left on exhale.",
            "Hold for 3 calm breaths, return to center, and switch sides."
        ],
        "seated_modification": "Fully chair-supported. Keep both sit bones firmly planted on the chair.",
        "benefits": "Mobilizes the intercostal breathing muscles and supports thoracic blood flow.",
        "safety_notes": "Only lean as far as comfortable; avoid any sharp compression or breath retention."
    },
    {
        "id": "yoga_05",
        "title": "Gentle Calf Pumps & Vascular Hamstring Stretches",
        "category": "vascular_stretching",
        "level": "beginner",
        "duration_minutes": 8,
        "suitable_for_seated": True,
        "instructions": [
            "Sit in a chair, extend your right leg forward with heel resting on the floor.",
            "Slowly flex your toes upward toward your shin, hold for 2 seconds, then point toes down.",
            "Repeat 10 times per foot to activate venous muscle pump in the calves.",
            "Gently hinge slightly at hips with a flat back for a mild hamstring release."
        ],
        "seated_modification": "Designed specifically for seated vascular health.",
        "benefits": "Stimulates the calf muscle pump to enhance venous return from lower extremities back to the heart.",
        "safety_notes": "Do not round the lower back; stop if you feel any calf cramping."
    },
    {
        "id": "yoga_06",
        "title": "Legs-Up-The-Wall Restorative Pose (Viparita Karani)",
        "category": "restorative",
        "level": "gentle",
        "duration_minutes": 10,
        "suitable_for_seated": False,
        "instructions": [
            "Lie on your back on a mat, scoot hips near a wall, and extend legs vertically up against the wall.",
            "Place a folded blanket under your lower pelvis for comfort.",
            "Let arms rest naturally at your sides with palms turned upward.",
            "Breathe deeply and gently for 8 to 10 minutes."
        ],
        "seated_modification": "For lower mobility, elevate calves on a sofa or ottoman while seated in a recliner.",
        "benefits": "Assists passive venous blood return to the heart, eases leg edema, and induces restorative parasympathetic state.",
        "safety_notes": "Avoid if you have unmanaged severe hypertension or active glaucoma. Roll onto your side gently to exit."
    },
    {
        "id": "yoga_07",
        "title": "Gentle Chair Torso Twists",
        "category": "mobility",
        "level": "seated",
        "duration_minutes": 5,
        "suitable_for_seated": True,
        "instructions": [
            "Sit tall in a chair with feet hip-width apart.",
            "Place your right hand on the outside of your left thigh and left hand on the chair back.",
            "Inhale to lengthen your spine, exhale to gently rotate your torso to the left.",
            "Hold for 4 breaths, return to center, and repeat to the right."
        ],
        "seated_modification": "Seated chair twist with gentle rotation only.",
        "benefits": "Improves arterial elasticity, stimulates digestion, and relieves mid-back stiffness.",
        "safety_notes": "Rotate from the mid-back, not the lower back. Never force the rotation."
    },
    {
        "id": "yoga_08",
        "title": "Calming 4-4-4 Box Breathing (Sama Vritti)",
        "category": "breathing",
        "level": "beginner",
        "duration_minutes": 6,
        "suitable_for_seated": True,
        "instructions": [
            "Sit comfortably with shoulders relaxed and eyes gently closed.",
            "Inhale smoothly through your nose for a count of 4.",
            "Hold your breath gently and softly for a count of 4.",
            "Exhale smoothly through your nose or mouth for a count of 4.",
            "Pause in calm stillness for a count of 4 before the next breath."
        ],
        "seated_modification": "Can be performed seated or semi-reclined.",
        "benefits": "Rapidly balances autonomic nervous system, moderates sympathetic overdrive, and stabilizes heart rate.",
        "safety_notes": "For cardiac patients with shortness of breath, reduce hold time to 2 seconds or continuous rhythmic pacing."
    },
    {
        "id": "yoga_09",
        "title": "Diaphragmatic Belly Breathing (Adham Pranayama)",
        "category": "breathing",
        "level": "beginner",
        "duration_minutes": 8,
        "suitable_for_seated": True,
        "instructions": [
            "Place one hand on your chest and the other on your upper abdomen.",
            "Inhale slowly through your nose, feeling your abdomen rise gently while your chest remains quiet.",
            "Exhale slowly through pursed lips, feeling your abdomen fall naturally.",
            "Continue for 15 to 20 gentle, unforced breath cycles."
        ],
        "seated_modification": "Perform seated comfortably with back support.",
        "benefits": "Maximizes oxygenation, minimizes secondary respiratory muscle strain, and reduces resting heart rate.",
        "safety_notes": "Keep breathing slow and gentle. Never force hyperventilation."
    },
    {
        "id": "yoga_10",
        "title": "Guided Corpse Pose Relaxation (Shavasana)",
        "category": "restorative",
        "level": "beginner",
        "duration_minutes": 12,
        "suitable_for_seated": True,
        "instructions": [
            "Lie comfortably on your back with arms and legs naturally relaxed, or recline in a supportive armchair.",
            "Scan your body from toes to scalp, releasing muscular tension on each out-breath.",
            "Allow your breath to flow naturally without conscious effort.",
            "Rest quietly in conscious relaxation for 10 to 12 minutes."
        ],
        "seated_modification": "Recline in an armchair with head and neck comfortably cushioned.",
        "benefits": "Clinically proven to reduce systemic vascular resistance and support cardiovascular recovery.",
        "safety_notes": "Keep warm with a light blanket. Open eyes slowly before rising to prevent orthostatic dizziness."
    }
]

DAILY_WELLNESS_ACTIVITIES = [
    {"key": "morning_breathing", "title": "Morning Diaphragmatic Breath", "duration": 5, "category": "Breathing", "icon": "Wind"},
    {"key": "seated_mobility", "title": "Midday Seated Spine & Chest Stretch", "duration": 8, "category": "Mobility", "icon": "Activity"},
    {"key": "evening_relaxation", "title": "Evening Restorative Shavasana", "duration": 10, "category": "Relaxation", "icon": "Moon"},
    {"key": "hydration_check", "title": "Cardiovascular Hydration Balance Check", "duration": 2, "category": "Habits", "icon": "Droplet"}
]

def get_yoga_library(level=None, duration=None, category=None, search=None):
    """Filters yoga library based on patient preferences."""
    results = YOGA_LIBRARY

    if level and level != "all":
        results = [y for y in results if y["level"] == level or (level == "seated" and y["suitable_for_seated"])]

    if category and category != "all":
        results = [y for y in results if y["category"] == category]

    if duration and duration != "all":
        if duration == "short": # < 8 mins
            results = [y for y in results if y["duration_minutes"] <= 7]
        elif duration == "medium": # 8 - 10 mins
            results = [y for y in results if 8 <= y["duration_minutes"] <= 10]
        elif duration == "long": # > 10 mins
            results = [y for y in results if y["duration_minutes"] > 10]

    if search:
        s = search.lower().strip()
        results = [
            y for y in results
            if s in y["title"].lower() or s in y["benefits"].lower() or s in y["category"].lower()
        ]

    return results

def get_patient_daily_routine(patient_email):
    """Returns today's activities, completion states, settings, and journal."""
    conn = get_db_connection()
    cursor = conn.cursor()

    today_str = datetime.utcnow().strftime("%Y-%m-%d")

    # Get settings
    cursor.execute('''
        SELECT reminders_enabled, preferred_duration, preferred_intensity, requires_seated_modification
        FROM patient_wellness_settings
        WHERE patient_email = ?
    ''', (patient_email,))
    settings_row = cursor.fetchone()

    settings = {
        "reminders_enabled": bool(settings_row["reminders_enabled"]) if settings_row else True,
        "preferred_duration": settings_row["preferred_duration"] if settings_row else 15,
        "preferred_intensity": settings_row["preferred_intensity"] if settings_row else "beginner",
        "requires_seated_modification": bool(settings_row["requires_seated_modification"]) if settings_row else False
    }

    # Get today's completed logs
    cursor.execute('''
        SELECT activity_key, duration_minutes, completed, journal_entry, mood, created_at
        FROM patient_wellness_logs
        WHERE patient_email = ? AND log_date = ?
    ''', (patient_email, today_str))
    today_logs = cursor.fetchall()

    completed_keys = {r["activity_key"] for r in today_logs}
    today_journal = next((r["journal_entry"] for r in today_logs if r["journal_entry"]), "")
    today_mood = next((r["mood"] for r in today_logs if r["mood"]), "Calm")

    activities_with_status = []
    for act in DAILY_WELLNESS_ACTIVITIES:
        act_copy = dict(act)
        act_copy["completed"] = act["key"] in completed_keys
        activities_with_status.append(act_copy)

    conn.close()

    total_activities = len(activities_with_status)
    completed_count = len(completed_keys)
    progress_percentage = int((completed_count / total_activities) * 100) if total_activities else 0

    return {
        "date": today_str,
        "activities": activities_with_status,
        "completed_count": completed_count,
        "total_activities": total_activities,
        "progress_percentage": progress_percentage,
        "settings": settings,
        "today_journal": today_journal,
        "today_mood": today_mood
    }

def log_patient_activity(patient_email, activity_key, duration_minutes=0, journal_entry=None, mood="Calm"):
    """Records an activity or journal entry in the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    today_str = datetime.utcnow().strftime("%Y-%m-%d")

    act_name = next((a["title"] for a in DAILY_WELLNESS_ACTIVITIES if a["key"] == activity_key), activity_key)

    # Check if already logged today
    cursor.execute('''
        SELECT id FROM patient_wellness_logs
        WHERE patient_email = ? AND log_date = ? AND activity_key = ?
    ''', (patient_email, today_str, activity_key))
    existing = cursor.fetchone()

    if existing:
        cursor.execute('''
            UPDATE patient_wellness_logs
            SET completed = 1, duration_minutes = ?, journal_entry = COALESCE(?, journal_entry), mood = COALESCE(?, mood)
            WHERE id = ?
        ''', (duration_minutes, journal_entry, mood, existing["id"]))
    else:
        cursor.execute('''
            INSERT INTO patient_wellness_logs (patient_email, log_date, activity_key, activity_name, duration_minutes, completed, journal_entry, mood)
            VALUES (?, ?, ?, ?, ?, 1, ?, ?)
        ''', (patient_email, today_str, activity_key, act_name, duration_minutes, journal_entry, mood))

    conn.commit()
    conn.close()

    log_audit(patient_email, "WELLNESS_ACTIVITY_LOGGED", target_type="patient_wellness_logs",
              target_id=activity_key, details=f"Logged activity: {act_name} ({duration_minutes}m)", actor_role="patient")
    return True

def get_weekly_wellness_summary(patient_email):
    """Calculates real 7-day activity metrics from patient_wellness_logs."""
    conn = get_db_connection()
    cursor = conn.cursor()

    seven_days_ago = (datetime.utcnow() - timedelta(days=6)).strftime("%Y-%m-%d")

    cursor.execute('''
        SELECT log_date, COUNT(*) as sessions_count, SUM(duration_minutes) as total_mins
        FROM patient_wellness_logs
        WHERE patient_email = ? AND log_date >= ?
        GROUP BY log_date
        ORDER BY log_date ASC
    ''', (patient_email, seven_days_ago))
    rows = cursor.fetchall()

    logged_days_map = {r["log_date"]: {"sessions": r["sessions_count"], "minutes": r["total_mins"] or 0} for r in rows}

    daily_stats = []
    total_minutes = 0
    total_sessions = 0
    days_active = 0

    for i in range(7):
        d = (datetime.utcnow() - timedelta(days=6 - i)).strftime("%Y-%m-%d")
        day_label = (datetime.utcnow() - timedelta(days=6 - i)).strftime("%a")
        data = logged_days_map.get(d, {"sessions": 0, "minutes": 0})
        if data["sessions"] > 0:
            days_active += 1
            total_sessions += data["sessions"]
            total_minutes += data["minutes"]
        daily_stats.append({
            "date": d,
            "day": day_label,
            "sessions": data["sessions"],
            "minutes": data["minutes"],
            "completed": data["sessions"] > 0
        })

    conn.close()

    consistency_rate = int((days_active / 7) * 100)

    return {
        "days_active": days_active,
        "total_sessions": total_sessions,
        "total_minutes": total_minutes,
        "consistency_rate": consistency_rate,
        "daily_breakdown": daily_stats
    }

def parse_duration_val(val):
    if val is None:
        return 15
    if isinstance(val, (int, float)):
        return int(val)
    import re
    m = re.search(r'\d+', str(val))
    return int(m.group()) if m else 15

def update_wellness_settings(patient_email, reminders_enabled=None, preferred_duration=None, preferred_intensity=None, requires_seated_modification=None):
    """Updates patient preferences for wellness and reminders."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM patient_wellness_settings WHERE patient_email = ?", (patient_email,))
    existing = cursor.fetchone()

    dur_val = parse_duration_val(preferred_duration) if preferred_duration is not None else None

    if existing:
        updates = []
        params = []
        if reminders_enabled is not None:
            updates.append("reminders_enabled = ?")
            params.append(1 if reminders_enabled else 0)
        if dur_val is not None:
            updates.append("preferred_duration = ?")
            params.append(dur_val)
        if preferred_intensity is not None:
            updates.append("preferred_intensity = ?")
            params.append(preferred_intensity)
        if requires_seated_modification is not None:
            updates.append("requires_seated_modification = ?")
            params.append(1 if requires_seated_modification else 0)

        if updates:
            updates.append("updated_at = CURRENT_TIMESTAMP")
            params.append(patient_email)
            sql = f"UPDATE patient_wellness_settings SET {', '.join(updates)} WHERE patient_email = ?"
            cursor.execute(sql, params)
    else:
        cursor.execute('''
            INSERT INTO patient_wellness_settings (patient_email, reminders_enabled, preferred_duration, preferred_intensity, requires_seated_modification)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            patient_email,
            1 if reminders_enabled or reminders_enabled is None else 0,
            dur_val if dur_val is not None else 15,
            preferred_intensity or "beginner",
            1 if requires_seated_modification else 0
        ))

    conn.commit()
    conn.close()
    return True
