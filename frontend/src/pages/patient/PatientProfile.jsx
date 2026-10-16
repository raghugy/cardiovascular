// src/pages/patient/PatientProfile.jsx
import React, { useState, useEffect } from "react";
import {
  User,
  HeartPulse,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Utensils,
  AlertCircle,
  CheckCircle,
  Save,
  ShieldCheck,
  Activity,
  Droplet,
  Download,
  Trash2,
  Lock,
  FileText
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import BackButton from "../../components/BackButton";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const PatientProfile = () => {
  const { token, user, updateUser } = useAuth();
  const { showToast } = useNotification();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("male");
  const [bloodGroup, setBloodGroup] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [address, setAddress] = useState("");
  const [dietaryPreference, setDietaryPreference] = useState("standard");
  const [chronicConditions, setChronicConditions] = useState("");
  const [allergies, setAllergies] = useState("");

  useEffect(() => {
    fetchProfile();
  }, [token]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://127.0.0.1:8000/api/profile", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        const u = json.user || {};
        const p = u.patient_profile || {};

        setFullName(u.full_name || "");
        setPhone(u.phone || "");
        setAge(p.age || "");
        setGender(p.gender || "male");
        setBloodGroup(p.blood_group || "");
        setEmergencyContact(p.emergency_contact || "");
        setAddress(p.address || "");
        setDietaryPreference(p.dietary_preference || "standard");
        setChronicConditions(p.chronic_conditions || "");
        setAllergies(p.allergies || "");
      }
    } catch (err) {
      console.error(err);
      showToast("Unable to load profile data", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate phone if provided
    if (phone && !/^\d{10}$/.test(phone)) {
      showToast("Phone number must be exactly 10 digits", "error");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("http://127.0.0.1:8000/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: fullName,
          phone,
          age: age ? parseInt(age, 10) : null,
          gender,
          blood_group: bloodGroup,
          emergency_contact: emergencyContact,
          address,
          dietary_preference: dietaryPreference,
          chronic_conditions: chronicConditions,
          allergies
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Profile update failed");

      showToast("Health profile updated successfully!", "success");
      if (updateUser) {
        updateUser({ full_name: fullName, phone });
      }
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      showToast("Generating comprehensive health record export...", "info");
      const res = await fetch("http://127.0.0.1:8000/api/patient/export-data", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to export medical records");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CardioPredict_Health_Record_${user?.email ? user.email.split('@')[0] : 'patient'}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast("Personal health record downloaded successfully.", "success");
    } catch (err) {
      console.error(err);
      showToast("Error generating health record export.", "error");
    }
  };

  const handleRequestDeletion = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to submit a request for account and medical record deletion? In compliance with HIPAA and GDPR, this will queue your record for de-identification and legal retention review."
    );
    if (!confirmed) return;

    try {
      const res = await fetch("http://127.0.0.1:8000/api/patient/privacy-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          request_type: "deletion",
          details: "Patient requested account and clinical records erasure under GDPR Right to be Forgotten."
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit deletion request");
      showToast("Data erasure request logged. Compliance team will process it shortly.", "success");
    } catch (err) {
      console.error(err);
      showToast(err.message, "error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-600">Retrieving patient health record...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-4xl">
      <BackButton fallbackUrl="/patient/dashboard" label="Back to Dashboard" className="mb-2" />
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-blue-600 text-xs font-bold uppercase tracking-wider mb-1">
          <User size={16} /> Patient Health Profile
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Personal Medical Profile & Preferences
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Maintain accurate baseline health metrics and dietary preferences to personalize AI risk inferences and food recommendations.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Account Details Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <User size={18} className="text-blue-600" /> Account Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Registered Email (Read-Only)
              </label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-medium text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                10-Digit Mobile Number
              </label>
              <input
                type="tel"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="9876543210"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Residential City / Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Seattle, WA"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Clinical Baseline Metrics Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <HeartPulse size={18} className="text-rose-500" /> Clinical Baseline & Vitals
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Age (Years)
              </label>
              <input
                type="number"
                min={1}
                max={120}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="e.g. 52"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Biological Sex
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Blood Group
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Blood Group</option>
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Emergency Contact (Name & Phone)
              </label>
              <input
                type="text"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="e.g. Jane Doe (+1 555-0192)"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Primary Dietary Preference
              </label>
              <select
                value={dietaryPreference}
                onChange={(e) => setDietaryPreference(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="standard">Mediterranean Standard</option>
                <option value="vegetarian">Plant-Based (Vegetarian)</option>
                <option value="vegan">100% Vegan</option>
                <option value="low_sodium">Strict DASH / Low-Sodium</option>
              </select>
            </div>
          </div>
        </div>

        {/* Medical History & Chronic Conditions Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Activity size={18} className="text-teal-600" /> Medical History & Sensitivities
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Existing Chronic Conditions
              </label>
              <textarea
                value={chronicConditions}
                onChange={(e) => setChronicConditions(e.target.value)}
                placeholder="e.g. Hypertension diagnosed 2021, Type 2 Diabetes, Dyslipidemia..."
                rows={2}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Known Drug Allergies & Sensitivities
              </label>
              <textarea
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="e.g. Penicillin, ACE Inhibitors (cough), Shellfish..."
                rows={2}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Security / HIPAA Notice */}
        <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl flex items-start gap-3 text-xs text-blue-900">
          <ShieldCheck size={18} className="text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Confidentiality Guarantee:</span> Your profile metrics are encrypted and only accessible to you and licensed physicians to whom you explicitly grant consultation consent.
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-bold shadow-md transition flex items-center gap-2"
          >
            <Save size={16} /> {saving ? "Saving Changes..." : "Save Profile Details"}
          </button>
        </div>
      </form>

      {/* Patient Data Sovereignty & Privacy Controls (GDPR / HIPAA) */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Lock size={18} className="text-slate-700" /> Patient Data Rights & Sovereignty (HIPAA / GDPR)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            As a patient, you have complete legal ownership over your cardiovascular health records, AI predictions, and dietary recommendations.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* Download Personal Record */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <FileText size={15} className="text-blue-600" /> Export Complete Health Record
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                Download a verified JSON export containing your demographics, clinical reports, ML predictions, and dietary recommendations.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportData}
              className="mt-4 px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <Download size={14} /> Download Health Record JSON
            </button>
          </div>

          {/* Account Deletion Request */}
          <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200 flex flex-col justify-between">
            <div>
              <div className="font-bold text-xs text-rose-900 flex items-center gap-1.5">
                <Trash2 size={15} className="text-rose-600" /> Request Record Erasure
              </div>
              <p className="text-[11px] text-rose-700/80 mt-1.5 leading-relaxed">
                Formally submit a request for account deactivation and clinical data de-identification pursuant to medical retention guidelines.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRequestDeletion}
              className="mt-4 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <Trash2 size={14} /> Submit Erasure Request
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientProfile;
