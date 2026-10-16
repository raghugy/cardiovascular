// src/pages/admin/AdminDoctors.jsx
import React, { useState, useEffect } from "react";
import {
  Stethoscope,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Edit2,
  AlertCircle,
  ShieldAlert,
  UserCheck,
  Building,
  GraduationCap,
  Calendar,
  RefreshCw,
  Info
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import BackButton from "../../components/BackButton";

const AdminDoctors = () => {
  const { token } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [formData, setFormData] = useState({
    display_name: "",
    specialization: "Cardiology",
    qualifications: "",
    experience_years: 5,
    hospital_affiliation: "CardioPredict Clinical Academic Center",
    availability_status: "Available",
    is_active: 1,
    is_demo: 1
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const specializations = [
    "Cardiology",
    "Interventional Cardiology",
    "Heart Failure & Transplant",
    "Cardiac Electrophysiology",
    "Neurology & Stroke",
    "Vascular Neurology",
    "Nephrology & Hypertension",
    "Preventive Cardiology",
    "General Medicine"
  ];

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("http://127.0.0.1:8000/api/admin/doctors", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load doctor profiles");
      const data = await res.json();
      setDoctors(data.doctors || []);
    } catch (err) {
      console.error(err);
      setError("Unable to connect to doctor repository.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, [token]);

  const handleOpenAdd = () => {
    setEditingDoctor(null);
    setFormData({
      display_name: "",
      specialization: "Cardiology",
      qualifications: "MBBS, MD (Medicine), DM (Cardiology)",
      experience_years: 10,
      hospital_affiliation: "CardioPredict Clinical Academic Center",
      availability_status: "Available",
      is_active: 1,
      is_demo: 1
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (doc) => {
    setEditingDoctor(doc);
    setFormData({
      display_name: doc.display_name,
      specialization: doc.specialization,
      qualifications: doc.qualifications || "",
      experience_years: doc.experience_years || 0,
      hospital_affiliation: doc.hospital_affiliation || "",
      availability_status: doc.availability_status || "Available",
      is_active: doc.is_active ? 1 : 0,
      is_demo: doc.is_demo ? 1 : 0
    });
    setFormError("");
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (doc) => {
    const newStatus = doc.is_active ? 0 : 1;
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/admin/doctors/${doc.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ is_active: newStatus })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to update doctor status");
      }
      setActionSuccess(`Doctor ${doc.display_name} has been ${newStatus ? "activated" : "deactivated"}.`);
      setTimeout(() => setActionSuccess(""), 4000);
      fetchDoctors();
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.display_name.trim()) {
      setFormError("Doctor display name is required.");
      return;
    }
    if (!formData.qualifications.trim()) {
      setFormError("Qualifications field is required.");
      return;
    }

    try {
      setSaving(true);
      setFormError("");
      const url = editingDoctor
        ? `http://127.0.0.1:8000/api/admin/doctors/${editingDoctor.id}`
        : "http://127.0.0.1:8000/api/admin/doctors";
      const method = editingDoctor ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to save doctor profile");

      setActionSuccess(editingDoctor ? "Profile updated successfully." : "New doctor profile created.");
      setTimeout(() => setActionSuccess(""), 4000);
      setIsModalOpen(false);
      fetchDoctors();
    } catch (err) {
      console.error(err);
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredDoctors = doctors.filter((doc) => {
    const matchesSearch =
      doc.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.hospital_affiliation && doc.hospital_affiliation.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesSpecialty = specialtyFilter === "all" || doc.specialization === specialtyFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && doc.is_active) ||
      (statusFilter === "inactive" && !doc.is_active) ||
      (statusFilter === "available" && doc.availability_status === "Available");

    return matchesSearch && matchesSpecialty && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <BackButton fallbackUrl="/admin/dashboard" label="Back to Dashboard" className="mb-2" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
            <Stethoscope size={28} className="text-teal-600" /> Specialist Doctor Profiles
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Manage clinical specialist profiles for cardiovascular, stroke, and hypertension patient assignments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDoctors}
            className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Plus size={16} /> Add Doctor Profile
          </button>
        </div>
      </div>

      {/* Compliance Notice Banner */}
      <div className="p-4 bg-teal-50/70 border border-teal-200/80 rounded-2xl flex items-start gap-3">
        <Info size={18} className="text-teal-600 shrink-0 mt-0.5" />
        <div className="text-xs text-teal-900 leading-relaxed">
          <span className="font-bold">Medical Governance & Demonstration Notice:</span> Doctor profiles shown here are managed exclusively by the system administrator for specialist referral triage. Profiles marked with the <span className="inline-block px-1.5 py-0.5 bg-amber-100 text-amber-800 font-bold rounded text-[10px]">DEMO PROFILE</span> badge represent demonstration profiles for development and simulated triage. No public doctor portal or direct unverified claims exist.
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle size={16} className="text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-center gap-2">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search size={16} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, specialization, affiliation..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={specialtyFilter}
            onChange={(e) => setSpecialtyFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          >
            <option value="all">All Specialties ({doctors.length})</option>
            {specializations.map((spec) => (
              <option key={spec} value={spec}>
                {spec}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="available">Available Now</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Doctor Cards / Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500">Loading doctor profiles...</p>
          </div>
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
          <Stethoscope size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-sm font-bold text-slate-700">No doctor profiles found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search query or specialty filter to view matching profiles.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDoctors.map((doc) => (
            <div
              key={doc.id}
              className={`bg-white rounded-3xl border transition shadow-xs hover:shadow-md flex flex-col justify-between overflow-hidden ${
                doc.is_active ? "border-slate-200/90" : "border-slate-200 opacity-60 bg-slate-50/50"
              }`}
            >
              <div className="p-6 space-y-4">
                {/* Badges row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {doc.is_demo ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        DEMO PROFILE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200">
                        VERIFIED PROFILE
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                        doc.availability_status === "Available"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : doc.availability_status === "In Surgery"
                          ? "bg-purple-50 text-purple-700 border-purple-200"
                          : "bg-slate-100 text-slate-600 border-slate-200"
                      }`}
                    >
                      {doc.availability_status}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold ${
                      doc.is_active ? "text-emerald-600" : "text-rose-500"
                    }`}
                  >
                    {doc.is_active ? <CheckCircle size={13} /> : <XCircle size={13} />}
                    {doc.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                {/* Name & Specialization */}
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-1.5">
                    {doc.display_name}
                  </h3>
                  <p className="text-xs font-semibold text-teal-600 mt-0.5 flex items-center gap-1">
                    <Stethoscope size={13} /> {doc.specialization}
                  </p>
                </div>

                {/* Details */}
                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex items-start gap-2">
                    <GraduationCap size={14} className="text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{doc.qualifications || "Not specified"}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-slate-400 shrink-0" />
                    <span>{doc.experience_years} years clinical experience</span>
                  </div>

                  <div className="flex items-start gap-2">
                    <Building size={14} className="text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-1 text-slate-500 text-[11px]">
                      {doc.hospital_affiliation || "CardioPredict Clinical Academic Center"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => handleToggleStatus(doc)}
                  className={`text-xs font-semibold transition ${
                    doc.is_active ? "text-rose-600 hover:text-rose-700" : "text-emerald-600 hover:text-emerald-700"
                  }`}
                >
                  {doc.is_active ? "Deactivate" : "Activate"}
                </button>

                <button
                  onClick={() => handleOpenEdit(doc)}
                  className="flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-800 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs hover:bg-slate-50 transition"
                >
                  <Edit2 size={13} /> Edit Profile
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Doctor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800">
                  {editingDoctor ? "Edit Doctor Profile" : "Add Specialist Profile"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Managed centrally by administrator for referral triage.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle size={15} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Doctor Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="e.g. Dr. Rajesh Sharma, MD"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Specialization *
                  </label>
                  <select
                    value={formData.specialization}
                    onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  >
                    {specializations.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Experience (Years) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={formData.experience_years}
                    onChange={(e) => setFormData({ ...formData, experience_years: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Qualifications & Credentials *
                </label>
                <input
                  type="text"
                  required
                  value={formData.qualifications}
                  onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                  placeholder="e.g. MBBS, MD (Medicine), DM (Cardiology), FACC"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Hospital / Clinical Affiliation
                </label>
                <input
                  type="text"
                  value={formData.hospital_affiliation}
                  onChange={(e) => setFormData({ ...formData, hospital_affiliation: e.target.value })}
                  placeholder="e.g. CardioPredict Clinical Academic Center"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Availability Status
                  </label>
                  <select
                    value={formData.availability_status}
                    onChange={(e) => setFormData({ ...formData, availability_status: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  >
                    <option value="Available">Available</option>
                    <option value="In Surgery">In Surgery</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Teleconsult Only">Teleconsult Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Demonstration Profile Flag
                  </label>
                  <select
                    value={formData.is_demo}
                    onChange={(e) => setFormData({ ...formData, is_demo: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                  >
                    <option value={1}>Yes (Demonstration Profile)</option>
                    <option value={0}>No (Verified Real Specialist)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl transition shadow-sm disabled:opacity-50"
                >
                  {saving ? "Saving..." : editingDoctor ? "Save Changes" : "Create Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDoctors;
