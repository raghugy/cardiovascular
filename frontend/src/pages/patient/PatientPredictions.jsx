// src/pages/patient/PatientPredictions.jsx
import React, { useState, useEffect } from "react";
import {
  Activity,
  HeartPulse,
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Download,
  Utensils,
  ChevronRight,
  Filter,
  ArrowUpRight,
  Info,
  Clock,
  ShieldCheck,
  RefreshCw
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import DoctorAssignmentCard from "../../components/DoctorAssignmentCard";
import ModelPerformanceSection from "../../components/ModelPerformanceSection";
import BackButton from "../../components/BackButton";

const DISEASE_LABELS = {
  cad: {
    title: "Coronary Artery Disease (CAD)",
    desc: "Atherosclerotic plaque accumulation in coronary arteries reducing myocardial blood flow.",
    icon: HeartPulse,
    color: "from-rose-500 to-red-600"
  },
  heart_failure: {
    title: "Heart Failure",
    desc: "Impaired myocardial contractility or ventricular filling leading to fluid retention.",
    icon: Activity,
    color: "from-amber-500 to-orange-600"
  },
  heart_attack: {
    title: "Myocardial Infarction (Heart Attack)",
    desc: "Acute ischemic necrosis of myocardial tissue following coronary occlusion.",
    icon: HeartPulse,
    color: "from-red-600 to-rose-700"
  },
  stroke: {
    title: "Cerebrovascular Accident (Stroke)",
    desc: "Neurological deficit resulting from acute focal disruption of cerebral circulation.",
    icon: Activity,
    color: "from-purple-500 to-indigo-600"
  },
  hypertension: {
    title: "Systemic Hypertension",
    desc: "Persistent arterial pressure elevation exceeding 130/80 mmHg promoting vascular stress.",
    icon: HeartPulse,
    color: "from-blue-500 to-cyan-600"
  }
};

const PatientPredictions = () => {
  const { token, user } = useAuth();
  const { showToast } = useNotification();
  const navigate = useNavigate();

  const [history, setHistory] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterRisk, setFilterRisk] = useState("all");
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [predsRes, reportsRes] = await Promise.all([
        fetch("http://127.0.0.1:8000/api/patient/predictions", {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch("http://127.0.0.1:8000/api/patient/reports", {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (predsRes.ok) {
        const pData = await predsRes.json();
        setHistory(pData.history || []);
      }
      if (reportsRes.ok) {
        const rData = await reportsRes.json();
        setReports(rData.reports || []);
      }
    } catch (err) {
      console.error(err);
      showToast("Unable to load prediction records", "error");
    } finally {
      setLoading(false);
    }
  };



  const handleDownloadReport = async (reportId, filename) => {
    try {
      setDownloadingId(reportId);
      const res = await fetch(`http://127.0.0.1:8000/api/patient/report-file/${reportId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error("Download failed");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename || `Medical_Report_${reportId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showToast("Report downloaded successfully", "success");
    } catch (err) {
      console.error(err);
      showToast("Failed to download PDF report", "error");
    } finally {
      setDownloadingId(null);
    }
  };



  const getRiskColor = (risk) => {
    switch (risk?.toLowerCase()) {
      case "high":
        return {
          bg: "bg-rose-50 text-rose-700 border-rose-200",
          bar: "bg-rose-500",
          badge: "bg-rose-600 text-white"
        };
      case "moderate":
        return {
          bg: "bg-amber-50 text-amber-700 border-amber-200",
          bar: "bg-amber-500",
          badge: "bg-amber-600 text-white"
        };
      default:
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          bar: "bg-emerald-500",
          badge: "bg-emerald-600 text-white"
        };
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-600">Retrieving cardiovascular evaluation logs...</p>
        </div>
      </div>
    );
  }

  // Filter history if risk filter is selected
  const filteredHistory = history.filter((item) => {
    if (filterRisk === "all") return true;
    const preds = item.predictions || {};
    return Object.values(preds).some((p) => p.risk?.toLowerCase() === filterRisk);
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Back Button */}
      <BackButton fallback="/patient/dashboard" label="Back to Dashboard" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 text-xs font-bold uppercase tracking-wider mb-1">
            <Activity size={16} /> Diagnostic Assessment Registry
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Cardiovascular Health Evaluations
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Detailed clinical inference across 5 deep learning models trained on standardized biomarker panels.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/patient/upload")}
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md flex items-center gap-2"
          >
            <FileText size={15} /> Upload New Report
          </button>
          <button
            onClick={fetchData}
            title="Refresh Records"
            className="p-2.5 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-xl transition shadow-sm"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {/* Filter and stats banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
          <Filter size={14} className="text-slate-400" /> Filter by Risk Level:
          {["all", "high", "moderate", "low"].map((r) => (
            <button
              key={r}
              onClick={() => setFilterRisk(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition ${
                filterRisk === r
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <span className="font-bold text-slate-800">{filteredHistory.length}</span> evaluation session(s)
        </div>
      </div>

      {/* Evaluations List */}
      {filteredHistory.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <HeartPulse size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">No Assessment Records Found</h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">
            Upload your medical report PDF to run automated OCR and extract your cardiovascular biomarker profile.
          </p>
          <button
            onClick={() => navigate("/patient/upload")}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition"
          >
            Upload Diagnostic PDF
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredHistory.map((item, index) => {
            const rep = reports.find((r) => r.id === item.report_id);
            const preds = item.predictions || {};
            const highCount = Object.values(preds).filter((p) => p.risk?.toLowerCase() === "high").length;
            const hasDoctorReview = rep?.reviewed_by || rep?.doctor_review_requested;

            return (
              <div
                key={item.report_id || index}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition duration-200"
              >
                {/* Header bar of assessment card */}
                <div className="p-6 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                        <Activity size={18} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">
                          {rep?.report_title || `Cardiovascular Panel Evaluation #${item.report_id || index + 1}`}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Clock size={12} /> {item.timestamp || "Recent"}
                          </span>
                          {rep?.original_filename && (
                            <span className="hidden sm:inline-block text-slate-400">•</span>
                          )}
                          {rep?.original_filename && (
                            <span className="hidden sm:inline-flex items-center gap-1 text-slate-600">
                              <FileText size={12} /> {rep.original_filename}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => navigate("/patient/diet")}
                      className="px-3.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                    >
                      <Utensils size={14} /> View Food Recommendations
                    </button>

                    {item.report_id && (
                      <button
                        onClick={() => handleDownloadReport(item.report_id, rep?.original_filename)}
                        disabled={downloadingId === item.report_id}
                        className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                      >
                        <Download size={14} />
                        {downloadingId === item.report_id ? "Downloading..." : "PDF Report"}
                      </button>
                    )}
                  </div>
                </div>

                {/* 5 Disease Predictions Grid */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {Object.entries(DISEASE_LABELS).map(([diseaseKey, meta]) => {
                      const res = preds[diseaseKey] || { score: 0, risk: "Low" };
                      const rawScore = Number(res.score || 0);
                      const scorePct = (rawScore <= 1 ? rawScore * 100 : rawScore).toFixed(1);
                      const colors = getRiskColor(res.risk);

                      return (
                        <div
                          key={diseaseKey}
                          className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between hover:bg-slate-50 transition"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                                {diseaseKey.replace("_", " ")}
                              </span>
                              <span
                                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${colors.badge}`}
                              >
                                {res.risk}
                              </span>
                            </div>

                            <h4 className="font-bold text-slate-900 text-sm leading-snug mb-1">
                              {meta.title}
                            </h4>
                            <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-3">
                              {meta.desc}
                            </p>
                          </div>

                          <div>
                            <div className="flex items-center justify-between text-xs font-bold mb-1">
                              <span className="text-slate-600 text-[11px]">Your Prediction Result</span>
                              <span className="text-slate-900 font-mono">{scorePct}%</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all duration-500 ${colors.bar}`}
                                style={{ width: `${Math.max(5, Math.min(100, scorePct))}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary / Clinical Advisory Notice */}
                  <div className="mt-6 p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-start gap-3 text-xs text-amber-900">
                    <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <span className="font-bold">Medical Disclaimer:</span> This tool provides an estimated result for educational and decision-support purposes. It is not a diagnosis. Consult a qualified healthcare professional.
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Suggested Doctor & Administrator Assignment Section */}
      <DoctorAssignmentCard />

      {/* Genuine Model Performance Validation Benchmarks */}
      <ModelPerformanceSection />


    </div>
  );
};

export default PatientPredictions;
