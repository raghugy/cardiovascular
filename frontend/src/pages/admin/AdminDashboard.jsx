// src/pages/admin/AdminDashboard.jsx
import React, { useState, useEffect } from "react";
import {
  Users,
  UserCheck,
  FileText,
  Activity,
  ShieldCheck,
  AlertTriangle,
  HeartPulse,
  Utensils,
  ChevronRight,
  Database,
  RefreshCw,
  Stethoscope,
  MessageSquare,
  ShieldAlert
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const AdminDashboard = () => {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [recentActivities, setRecentActivities] = useState([]);
  const [diseaseBreakdown, setDiseaseBreakdown] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStats();
  }, [token]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("http://127.0.0.1:8000/api/admin/dashboard-stats", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to load dashboard statistics.");
      const data = await res.json();
      setStats(data.stats);
      setRecentActivities(data.recent_activities || []);
      setDiseaseBreakdown(data.disease_risk_breakdown || {});
    } catch (err) {
      console.error(err);
      setError("Error connecting to database stats.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-slate-800 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-600">Loading live database metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
            <ShieldCheck size={28} className="text-slate-800" /> System Administration
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Real-time platform metrics, patient account management, specialist assignments, and clinical audit records
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live DB Sync
          </span>
          <button
            onClick={fetchStats}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-center gap-2">
          <AlertTriangle size={16} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stat Cards Grid - Real DB Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Total Patients */}
        <div
          onClick={() => navigate("/admin/users")}
          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Patient Accounts</span>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition">
              <Users size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-800">{stats?.total_patients || 0}</span>
            <span className="text-xs text-slate-400 font-medium">registered</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-emerald-600">{stats?.active_accounts || 0} active</span>
            <span>•</span>
            <span className="text-rose-500">{stats?.inactive_or_suspended || 0} suspended</span>
          </div>
        </div>

        {/* Doctor Profiles */}
        <div
          onClick={() => navigate("/admin/doctors")}
          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Specialist Doctors</span>
            <div className="p-2.5 bg-teal-50 text-teal-600 rounded-2xl group-hover:bg-teal-600 group-hover:text-white transition">
              <Stethoscope size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-800">{stats?.total_doctors || 0}</span>
            <span className="text-xs text-slate-400 font-medium">profiles</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-emerald-600">{stats?.active_doctors || 0} active</span>
            <span>•</span>
            <span className="text-amber-600 font-medium">10 Demo Profiles</span>
          </div>
        </div>

        {/* Doctor Assignments */}
        <div
          onClick={() => navigate("/admin/doctor-assignments")}
          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Doctor Assignments</span>
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-2xl group-hover:bg-purple-600 group-hover:text-white transition">
              <UserCheck size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-800">{stats?.total_assignments || 0}</span>
            <span className="text-xs text-slate-400 font-medium">total cases</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="font-bold text-amber-600">{stats?.pending_assignments || 0} pending review</span>
          </div>
        </div>

        {/* Patient Feedback */}
        <div
          onClick={() => navigate("/admin/feedback")}
          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Patient Feedback</span>
            <div className="p-2.5 bg-sky-50 text-sky-600 rounded-2xl group-hover:bg-sky-600 group-hover:text-white transition">
              <MessageSquare size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-800">{stats?.total_feedback || 0}</span>
            <span className="text-xs text-slate-400 font-medium">tickets</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="font-bold text-rose-600">{stats?.pending_feedback || 0} awaiting reply</span>
          </div>
        </div>

        {/* Uploaded Reports */}
        <div
          onClick={() => navigate("/admin/reports")}
          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Medical Reports</span>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:bg-indigo-600 group-hover:text-white transition">
              <FileText size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-800">{stats?.total_uploaded_reports || 0}</span>
            <span className="text-xs text-slate-400 font-medium">PDFs</span>
          </div>
          <div className="mt-3 text-xs text-slate-500 font-medium">
            Extracted via Digital & Tesseract OCR
          </div>
        </div>

        {/* AI Predictions Executed */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">AI Model Runs</span>
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl">
              <Activity size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-800">{stats?.total_predictions || 0}</span>
            <span className="text-xs text-slate-400 font-medium">evaluations</span>
          </div>
          <div className="mt-3 text-xs text-slate-500 font-medium">
            Covering 5 cardiovascular conditions
          </div>
        </div>

        {/* Verified Nutrition Items */}
        <div
          onClick={() => navigate("/admin/food-catalog")}
          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Verified Foods</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition">
              <Utensils size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-800">{stats?.verified_foods_count || 0}</span>
            <span className="text-xs text-slate-400 font-medium">items</span>
          </div>
          <div className="mt-3 text-xs text-slate-500 font-medium">
            WHO, AHA & ICMR-NIN verified
          </div>
        </div>

        {/* System Audit Events */}
        <div
          onClick={() => navigate("/admin/audit-logs")}
          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Audit Trail</span>
            <div className="p-2.5 bg-slate-100 text-slate-700 rounded-2xl group-hover:bg-slate-800 group-hover:text-white transition">
              <ShieldAlert size={20} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-800">{stats?.total_audit_events || 0}</span>
            <span className="text-xs text-slate-400 font-medium">logged events</span>
          </div>
          <div className="mt-3 text-xs text-slate-500 font-medium">
            Full compliance & access logs
          </div>
        </div>
      </div>

      {/* Disease Model Risk Distributions */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
          <div>
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <HeartPulse size={20} className="text-rose-500" /> Cardiovascular Risk Predictions by Condition
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Cumulative risk outcomes classified across trained deep learning models
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[
            { key: "cad", name: "Coronary Artery Disease", tag: "CAD" },
            { key: "heart_failure", name: "Heart Failure", tag: "HF" },
            { key: "heart_attack", name: "Heart Attack (MI)", tag: "MI" },
            { key: "stroke", name: "Stroke / CVA", tag: "CVA" },
            { key: "hypertension", name: "Hypertensive Disease", tag: "HTN" },
          ].map((d) => {
            const riskData = diseaseBreakdown[d.key] || { Low: 0, Moderate: 0, High: 0 };
            const total = (riskData.Low || 0) + (riskData.Moderate || 0) + (riskData.High || 0);
            return (
              <div key={d.key} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800">{d.tag}</span>
                    <span className="text-[10px] font-semibold text-slate-400">{total} runs</span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium line-clamp-1 mb-3">{d.name}</p>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center text-rose-600 font-semibold">
                      <span>High Risk</span>
                      <span>{riskData.High || 0}</span>
                    </div>
                    <div className="flex justify-between items-center text-amber-600 font-medium">
                      <span>Moderate Risk</span>
                      <span>{riskData.Moderate || 0}</span>
                    </div>
                    <div className="flex justify-between items-center text-emerald-600 font-medium">
                      <span>Low Risk</span>
                      <span>{riskData.Low || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Micro visual bar */}
                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden mt-4 flex">
                  <div
                    className="h-full bg-rose-500"
                    style={{ width: `${total ? ((riskData.High || 0) / total) * 100 : 0}%` }}
                    title="High"
                  />
                  <div
                    className="h-full bg-amber-400"
                    style={{ width: `${total ? ((riskData.Moderate || 0) / total) * 100 : 0}%` }}
                    title="Moderate"
                  />
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${total ? ((riskData.Low || 0) / total) * 100 : 0}%` }}
                    title="Low"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Activity Table */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <ShieldCheck size={20} className="text-slate-700" /> Recent System Audit Events
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Live audit logs of user registrations, clinical uploads, and security events
            </p>
          </div>
          <button
            onClick={() => navigate("/admin/audit-logs")}
            className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
          >
            View Full Audit Trail <ChevronRight size={14} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 px-3">Timestamp</th>
                <th className="pb-3 px-3">Actor</th>
                <th className="pb-3 px-3">Action</th>
                <th className="pb-3 px-3">Details</th>
                <th className="pb-3 px-3">Client IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {recentActivities.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-slate-400">
                    No recent audit activities recorded.
                  </td>
                </tr>
              ) : (
                recentActivities.map((act) => (
                  <tr key={act.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                      {act.created_at}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {act.user_email || "System"}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {act.action}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600 max-w-xs truncate" title={act.details}>
                      {act.details || "-"}
                    </td>
                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                      {act.ip_address || "127.0.0.1"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
