// src/pages/admin/AdminDoctorAssignments.jsx
import React, { useState, useEffect } from "react";
import {
  UserCheck,
  Stethoscope,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  Clock,
  ChevronRight,
  ShieldAlert,
  Building,
  User,
  Activity,
  FileText,
  RefreshCw,
  Info,
  Calendar
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import BackButton from "../../components/BackButton";

const AdminDoctorAssignments = () => {
  const { token } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Assignment Modal
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [assignmentStatus, setAssignmentStatus] = useState("Assigned");
  const [saving, setSaving] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError("");
      const [resAssignments, resDoctors] = await Promise.all([
        fetch("http://127.0.0.1:8000/api/admin/doctor-assignments", {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch("http://127.0.0.1:8000/api/admin/doctors", {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (!resAssignments.ok || !resDoctors.ok) {
        throw new Error("Failed to load doctor triage and assignment data.");
      }

      const dataAssignments = await resAssignments.json();
      const dataDoctors = await resDoctors.json();

      setAssignments(dataAssignments.assignments || []);
      setDoctors(dataDoctors.doctors || []);
    } catch (err) {
      console.error(err);
      setError("Unable to connect to doctor assignment database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleOpenAssignModal = (assignment) => {
    setSelectedAssignment(assignment);
    setSelectedDoctorId(assignment.assigned_doctor_id ? String(assignment.assigned_doctor_id) : "");
    setAdminNotes(assignment.admin_notes || "");
    setAssignmentStatus(assignment.status === "Pending Review" ? "Assigned" : assignment.status);
  };

  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    if (assignmentStatus === "Assigned" && !selectedDoctorId) {
      setError("Please select a specialist doctor to assign or choose 'Mark Unassigned'.");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const res = await fetch(
        `http://127.0.0.1:8000/api/admin/doctor-assignments/${selectedAssignment.id}/assign`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            doctor_id: assignmentStatus === "Assigned" ? parseInt(selectedDoctorId) : null,
            admin_notes: adminNotes,
            status: assignmentStatus
          })
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to update assignment.");

      setActionSuccess(`Assignment for ${selectedAssignment.patient_name} updated successfully.`);
      setTimeout(() => setActionSuccess(""), 4000);
      setSelectedAssignment(null);
      fetchData();
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const filteredAssignments = assignments.filter((item) => {
    const matchesSearch =
      item.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.patient_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.condition_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.suggested_specialty.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "pending" && item.status === "Pending Review") ||
      (statusFilter === "assigned" && item.status === "Assigned") ||
      (statusFilter === "unassigned" && item.status === "Unassigned");

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case "Assigned":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Pending Review":
        return "bg-amber-50 text-amber-700 border-amber-200 animate-pulse";
      case "Unassigned":
        return "bg-slate-100 text-slate-600 border-slate-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const getRiskBadge = (level) => {
    switch (level?.toLowerCase()) {
      case "high":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "moderate":
        return "bg-amber-50 text-amber-700 border-amber-200";
      default:
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <BackButton fallbackUrl="/admin/dashboard" label="Back to Dashboard" className="mb-2" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
            <UserCheck size={28} className="text-blue-600" /> Prediction Review & Doctor Assignment
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Review AI model risk classifications, examine specialty recommendations, and assign qualified specialists.
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs self-start sm:self-auto"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Clinical Protocol Banner */}
      <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl flex items-start gap-3">
        <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 leading-relaxed">
          <span className="font-bold">Clinical Governance & Human-in-the-Loop Triage:</span> Model outputs are probabilistic risk estimates and must never trigger automatic clinical referrals. The system provides an algorithmic specialty suggestion based on the condition supported by the model. The administrator evaluates the findings and makes the final decision on specialist assignment.
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
            placeholder="Search by patient, condition, specialty..."
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Statuses ({assignments.length})</option>
            <option value="pending">
              Pending Review ({assignments.filter((a) => a.status === "Pending Review").length})
            </option>
            <option value="assigned">
              Assigned ({assignments.filter((a) => a.status === "Assigned").length})
            </option>
            <option value="unassigned">
              Unassigned ({assignments.filter((a) => a.status === "Unassigned").length})
            </option>
          </select>
        </div>
      </div>

      {/* Assignment Table */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500">Loading prediction triage items...</p>
          </div>
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center">
          <UserCheck size={40} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-sm font-bold text-slate-700">No triage requests found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            When patients complete a medical report prediction with flagged risk, assignment recommendations will appear here for administrative triage.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Flagged Risk & Condition</th>
                  <th className="py-3 px-4">Suggested Specialty</th>
                  <th className="py-3 px-4">Assigned Doctor</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredAssignments.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">{item.patient_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{item.patient_email}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase ${getRiskBadge(
                            item.risk_level
                          )}`}
                        >
                          {item.risk_level} Risk
                        </span>
                        <span className="font-semibold text-slate-700">{item.condition_name}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-blue-700 font-semibold">
                        <Stethoscope size={14} className="shrink-0" />
                        <span>{item.suggested_specialty}</span>
                      </div>
                      <div
                        className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5"
                        title={item.rationale}
                      >
                        {item.rationale}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {item.assigned_doctor_name ? (
                        <div>
                          <span className="font-bold text-slate-800">{item.assigned_doctor_name}</span>
                          <span className="block text-[11px] text-slate-400">
                            {item.assigned_doctor_specialty}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">None assigned</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenAssignModal(item)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 transition"
                      >
                        {item.status === "Pending Review" ? "Assign Doctor" : "Update"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Assignment Modal */}
      {selectedAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800">Assign Clinical Specialist</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Triage patient risk classification and select appropriate specialist.
                </p>
              </div>
              <button
                onClick={() => setSelectedAssignment(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Assessment Summary Box */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Patient:</span>
                <span className="font-bold text-slate-800">{selectedAssignment.patient_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Flagged Model Condition:</span>
                <span className="font-bold text-slate-800">{selectedAssignment.condition_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Risk Severity:</span>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase ${getRiskBadge(
                    selectedAssignment.risk_level
                  )}`}
                >
                  {selectedAssignment.risk_level} Risk
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200/70">
                <span className="block text-slate-500 mb-1">Algorithmic Suggestion & Rationale:</span>
                <p className="text-slate-700 italic bg-white p-2.5 rounded-xl border border-slate-200/60">
                  "{selectedAssignment.rationale}"
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Assignment Decision *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAssignmentStatus("Assigned")}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      assignmentStatus === "Assigned"
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Assign Specialist Doctor
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAssignmentStatus("Unassigned");
                      setSelectedDoctorId("");
                    }}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      assignmentStatus === "Unassigned"
                        ? "bg-slate-800 text-white border-slate-800 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Leave Unassigned
                  </button>
                </div>
              </div>

              {assignmentStatus === "Assigned" && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Select Specialist Doctor *
                  </label>
                  <select
                    required
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">-- Choose from 10 Managed Doctor Profiles --</option>
                    {doctors
                      .filter((d) => d.is_active)
                      .map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.display_name} — {doc.specialization} ({doc.availability_status})
                          {doc.is_demo ? " [Demo]" : ""}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Administrator Triage Notes (Visible to Patient)
                </label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="e.g. Assigned to Dr. Sharma for comprehensive coronary angiogram and risk stratification review."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedAssignment(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-sm disabled:opacity-50"
                >
                  {saving ? "Updating..." : "Confirm Specialist Assignment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDoctorAssignments;
