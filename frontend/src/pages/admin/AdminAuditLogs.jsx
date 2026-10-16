// src/pages/admin/AdminAuditLogs.jsx
import React, { useState, useEffect } from "react";
import { ShieldCheck, Search, Filter, RefreshCw, AlertCircle, User, Activity, Download } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import BackButton from "../../components/BackButton";

const AdminAuditLogs = () => {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [token, page, actionFilter]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page,
        limit,
        search,
        action: actionFilter
      });
      const res = await fetch(`http://127.0.0.1:8000/api/admin/audit-logs?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.audit_logs || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportAuditLogs = async () => {
    try {
      setExporting(true);
      const res = await fetch("http://127.0.0.1:8000/api/admin/audit-logs/export", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "CardioPredict_Audit_Log_Export.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Failed to export audit logs");
    } finally {
      setExporting(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <BackButton fallbackUrl="/admin/dashboard" label="Back to Dashboard" className="mb-2" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <ShieldCheck size={26} className="text-slate-800" /> Platform Security & Clinical Audit Logs
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Complete traceability for authentication, administrative oversight, and clinical data access
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportAuditLogs}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 shadow-xs cursor-pointer"
          >
            <Download size={14} /> {exporting ? "Exporting..." : "Export Audit Logs"}
          </button>
          <button
            onClick={fetchLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs cursor-pointer"
          >
            <RefreshCw size={14} /> Refresh Logs
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-3 justify-between">
        <form onSubmit={handleSearchSubmit} className="w-full md:w-80 relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email, details, target ID..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-slate-800 outline-none"
          />
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 outline-none focus:ring-2 focus:ring-slate-800"
          >
            <option value="">All Audit Actions</option>
            <option value="USER_LOGIN">User Logins</option>
            <option value="USER_REGISTER">User Registrations</option>
            <option value="UPLOAD_MEDICAL_REPORT">Report Uploads</option>
            <option value="RUN_PREDICTION_MODELS">AI Model Runs</option>
            <option value="ADMIN_APPROVE_DOCTOR">Doctor Approvals</option>
            <option value="ADMIN_UPDATE_USER_STATUS">User Status Toggles</option>
            <option value="DOCTOR_VIEW_PATIENT_RECORDS">Clinical Chart Reviews</option>
            <option value="DOCTOR_ADD_CONSULTATION">Consultation Notes</option>
            <option value="PATIENT_BOOK_APPOINTMENT">Appointment Bookings</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Timestamp (UTC)</th>
                <th className="py-3.5 px-4">User Email</th>
                <th className="py-3.5 px-4">Action Event</th>
                <th className="py-3.5 px-4">Target Resource</th>
                <th className="py-3.5 px-4">Details</th>
                <th className="py-3.5 px-4">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading audit trail...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No matching audit records found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {log.created_at}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {log.user_email || "System Automated"}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {log.target_type ? `${log.target_type} #${log.target_id || ""}` : "-"}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-sm truncate" title={log.details}>
                      {log.details || "-"}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {log.ip_address || "127.0.0.1"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Total {total} audit records logged</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-3 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition"
            >
              Previous
            </button>
            <span className="px-3 py-1 font-semibold text-slate-700">Page {page}</span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={logs.length < limit}
              className="px-3 py-1 bg-white border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAuditLogs;
