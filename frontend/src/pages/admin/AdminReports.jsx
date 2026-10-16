// src/pages/admin/AdminReports.jsx
import React, { useState, useEffect } from "react";
import {
  FileText,
  Search,
  Filter,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  User,
  RefreshCw,
  Eye,
  FileCheck,
  ShieldAlert
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import BackButton from "../../components/BackButton";

const AdminReports = () => {
  const { token } = useAuth();
  const [reports, setReports] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [deleteConfirmReport, setDeleteConfirmReport] = useState(null);

  useEffect(() => {
    fetchReports();
  }, [token, page, statusFilter]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError("");
      const params = new URLSearchParams({
        page,
        limit,
        search,
        status: statusFilter
      });
      const res = await fetch(`http://127.0.0.1:8000/api/admin/reports?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch medical reports.");
      const data = await res.json();
      setReports(data.reports || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
      setError("Unable to load reports from server.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchReports();
  };

  const handleDeleteReport = async () => {
    if (!deleteConfirmReport) return;
    try {
      setActionLoading(true);
      const res = await fetch(`http://127.0.0.1:8000/api/admin/reports/${deleteConfirmReport.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to delete report.");
      } else {
        setMessage(`Report #${deleteConfirmReport.id} (${deleteConfirmReport.original_filename}) deleted safely.`);
        setDeleteConfirmReport(null);
        fetchReports();
      }
    } catch (err) {
      console.error(err);
      alert("Error occurred while deleting report.");
    } finally {
      setActionLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "0 KB";
    const k = 1024;
    if (bytes < k) return `${bytes} B`;
    if (bytes < k * k) return `${(bytes / k).toFixed(1)} KB`;
    return `${(bytes / (k * k)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <BackButton fallbackUrl="/admin/dashboard" label="Back to Dashboard" className="mb-2" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <FileText size={26} className="text-indigo-600" /> Medical Report Processing
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Audit patient clinical PDF uploads, OCR extraction pipelines, and prediction ties
          </p>
        </div>
        <button
          onClick={fetchReports}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs self-start sm:self-auto"
        >
          <RefreshCw size={14} /> Refresh List
        </button>
      </div>

      {message && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-medium flex items-center gap-2">
          <CheckCircle size={16} className="text-emerald-600 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-medium flex items-center gap-2">
          <AlertTriangle size={16} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-3 justify-between">
        <form onSubmit={handleSearchSubmit} className="w-full md:w-96 relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by patient name, email, or report filename..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
        </form>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-700 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Processing Statuses</option>
            <option value="uploaded">Uploaded (Awaiting Prediction)</option>
            <option value="predicted">Prediction Complete</option>
            <option value="manual_entry">Manual Clinical Entry</option>
          </select>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Report ID</th>
                <th className="py-3.5 px-4">Patient</th>
                <th className="py-3.5 px-4">Filename & Title</th>
                <th className="py-3.5 px-4">Size</th>
                <th className="py-3.5 px-4">Extraction Method</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Predictions</th>
                <th className="py-3.5 px-4">Upload Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading medical reports from database...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No medical reports found matching the criteria.
                  </td>
                </tr>
              ) : (
                reports.map((rep) => (
                  <tr key={rep.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      #{rep.id}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{rep.patient_name || "Patient"}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{rep.patient_email}</div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-medium text-slate-800 truncate" title={rep.report_title || rep.original_filename}>
                        {rep.report_title || rep.original_filename}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono truncate">
                        {rep.original_filename}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {formatFileSize(rep.file_size)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        rep.extraction_method?.includes("OCR")
                          ? "bg-purple-50 text-purple-700 border border-purple-200"
                          : "bg-blue-50 text-blue-700 border border-blue-200"
                      }`}>
                        {rep.extraction_method || "Digital PDF"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        rep.status === "predicted"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}>
                        {rep.status === "predicted" ? "Predicted" : "Uploaded"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {rep.prediction_count > 0 ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600">
                          <Activity size={12} /> {rep.prediction_count} Run{rep.prediction_count > 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {rep.created_at}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setDeleteConfirmReport(rep)}
                        title="Delete Report Record"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-semibold">{reports.length}</span> of{" "}
            <span className="font-semibold">{total}</span> total reports
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 font-medium"
            >
              Previous
            </button>
            <span className="px-3 py-1 font-semibold text-slate-700">
              Page {page}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={reports.length < limit}
              className="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 font-medium"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="p-3 bg-rose-50 rounded-2xl">
                <ShieldAlert size={24} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Delete Medical Report</h3>
                <p className="text-xs text-slate-500">Report #{deleteConfirmReport.id}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Are you sure you want to permanently delete report <strong>{deleteConfirmReport.original_filename}</strong> for patient <strong>{deleteConfirmReport.patient_email}</strong>? Any associated prediction logs will also be cleared. This action is recorded in the system audit trail.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmReport(null)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteReport}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-sm flex items-center gap-1.5"
              >
                {actionLoading ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReports;
