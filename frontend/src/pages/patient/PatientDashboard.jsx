import React, { useState, useEffect } from "react";
import {
  HeartPulse,
  FileText,
  Activity,
  Utensils,
  Video,
  ChevronRight,
  Sparkles,
  Bot,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  Wind,
  RefreshCw,
  Sliders,
  Check
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import DoctorAssignmentCard from "../../components/DoctorAssignmentCard";
import ModelPerformanceSection from "../../components/ModelPerformanceSection";
import PatientFeedbackModule from "../../components/PatientFeedbackModule";

const PatientDashboard = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, [token]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("http://127.0.0.1:8000/api/patient/dashboard", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || `Server responded with status ${res.status}`);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError("Unable to connect to CardioPredict backend server. Please check your network connection.");
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadge = (risk) => {
    switch (risk?.toLowerCase()) {
      case "high":
        return "bg-rose-50 text-rose-700 border-rose-200 font-bold";
      case "moderate":
        return "bg-amber-50 text-amber-700 border-amber-200 font-semibold";
      default:
        return "bg-emerald-50 text-emerald-700 border-emerald-200 font-medium";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-600">Loading your cardiovascular health dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <div className="bg-white rounded-3xl border border-rose-200 p-8 max-w-lg text-center shadow-sm space-y-4">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Unable to Load Patient Dashboard</h3>
          <p className="text-xs text-slate-600 leading-relaxed">{error}</p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={fetchDashboard}
              className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw size={14} /> Retry Loading
            </button>
            <button
              onClick={() => navigate("/patient/upload")}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Go to Report Upload
            </button>
          </div>
        </div>
      </div>
    );
  }

  const latestPredictions = data?.latest_predictions || {};
  const hasPredictions = Object.keys(latestPredictions).length > 0;
  const workflow = data?.workflow_status || {
    has_report: !!data?.latest_report,
    has_predictions: hasPredictions,
    has_ai_analysis: !!data?.has_ai_analysis,
    has_diet_plan: !!data?.has_diet_plan,
    current_step: !data?.latest_report ? 1 : (!hasPredictions ? 2 : (!data?.has_ai_analysis ? 4 : (!data?.has_diet_plan ? 5 : 5)))
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Hero Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-blue-200 text-xs font-bold uppercase tracking-wider mb-1">
              <HeartPulse size={16} className="text-rose-400" /> Patient Cardiovascular Health Portal
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Welcome back, {user?.full_name?.split(" ")[0] || "Patient"}!
            </h2>
            <p className="text-blue-100 text-xs sm:text-sm mt-1.5 max-w-xl leading-relaxed">
              Upload clinical PDF lab reports, review deep learning risk evaluations across 5 conditions, receive evidence-backed nutrition advice, and chat with your AI Health Assistant.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate("/patient/upload")}
              className="px-5 py-3 bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs rounded-2xl transition shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <FileText size={16} /> Upload Medical Report
            </button>
            <button
              onClick={() => navigate("/patient/diet")}
              className="px-4 py-3 bg-blue-600/40 hover:bg-blue-600/60 text-white font-semibold text-xs rounded-2xl border border-white/20 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Utensils size={15} /> Food Recommendations
            </button>
          </div>
        </div>
      </div>

      {/* 5-Step AI Cardiovascular Health Workflow Tracker */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
          <div>
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
              Care Pathway Progress
            </span>
            <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2 mt-0.5">
              <Sparkles size={18} className="text-blue-600" /> Complete 5-Step Cardiovascular Analysis Workflow
            </h3>
          </div>
          <div className="flex items-center gap-2">
            {!workflow.has_report ? (
              <button
                onClick={() => navigate("/patient/upload")}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Start Step 1: Upload Report</span>
                <ArrowRight size={14} />
              </button>
            ) : !workflow.has_predictions ? (
              <button
                onClick={() => navigate("/patient/upload")}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Continue Step 2: Confirm Values</span>
                <ArrowRight size={14} />
              </button>
            ) : !workflow.has_ai_analysis ? (
              <button
                onClick={() => navigate("/patient/upload?step=4")}
                className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Bot size={14} />
                <span>Step 4 Ready: Analyze with AI</span>
                <ArrowRight size={14} />
              </button>
            ) : !workflow.has_diet_plan ? (
              <button
                onClick={() => navigate("/patient/diet")}
                className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Utensils size={14} />
                <span>Step 5 Ready: Generate Diet Plan</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                onClick={() => navigate("/patient/diet")}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <CheckCircle size={14} />
                <span>All Steps Complete: View Plan</span>
                <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>

        {/* 5-Step Stepper Display */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {[
            {
              step: 1,
              title: "1. Upload Report",
              desc: "Digital PDF & Scanned OCR",
              done: workflow.has_report,
              active: !workflow.has_report
            },
            {
              step: 2,
              title: "2. Verify Biomarkers",
              desc: "Confirm extracted labs",
              done: workflow.has_predictions,
              active: workflow.has_report && !workflow.has_predictions
            },
            {
              step: 3,
              title: "3. ML Predictions",
              desc: "5 cardiac risk models",
              done: workflow.has_predictions,
              active: false
            },
            {
              step: 4,
              title: "4. AI Clinical Analysis",
              desc: "Plain-English synthesis",
              done: workflow.has_ai_analysis,
              active: workflow.has_predictions && !workflow.has_ai_analysis
            },
            {
              step: 5,
              title: "5. Personalized Diet",
              desc: "Daily meals & safe hydration",
              done: workflow.has_diet_plan,
              active: workflow.has_ai_analysis && !workflow.has_diet_plan
            }
          ].map((s) => (
            <div
              key={s.step}
              className={`p-3.5 rounded-2xl border transition flex flex-col justify-between ${
                s.done
                  ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                  : s.active
                  ? "bg-blue-50 border-blue-300 text-blue-900 ring-2 ring-blue-500/20"
                  : "bg-slate-50/70 border-slate-200 text-slate-500"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  Step {s.step}
                </span>
                {s.done ? (
                  <CheckCircle size={15} className="text-emerald-600" />
                ) : s.active ? (
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                ) : (
                  <span className="text-[10px] font-mono text-slate-400">Pending</span>
                )}
              </div>
              <div>
                <p className="font-bold text-xs text-slate-800">{s.title}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Latest Prediction Overview */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
          <div>
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <Activity size={20} className="text-rose-600" /> Latest Cardiovascular Risk Assessment
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Evaluated using validated deep learning models trained on clinical biomarker panels
            </p>
          </div>
          {hasPredictions && (
            <button
              onClick={() => navigate("/patient/predictions")}
              className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
            >
              Historical Trends <ChevronRight size={14} />
            </button>
          )}
        </div>

        {!hasPredictions ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
            <FileText size={36} className="text-slate-300 mx-auto mb-2" />
            <h4 className="font-bold text-sm text-slate-700">No Assessment Records Yet</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto my-2">
              Upload your medical lab report (or use our pre-loaded clinical sample reports) to receive instant risk evaluations across 5 conditions.
            </p>
            <button
              onClick={() => navigate("/patient/upload")}
              className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow transition"
            >
              Upload Medical Report Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { key: "cad", name: "Coronary Artery Disease", tag: "CAD" },
              { key: "heart_failure", name: "Heart Failure", tag: "HF" },
              { key: "heart_attack", name: "Heart Attack", tag: "MI" },
              { key: "stroke", name: "Stroke / CVA", tag: "Stroke" },
              { key: "hypertension", name: "Hypertension", tag: "HTN" },
            ].map((d) => {
              const res = latestPredictions[d.key] || { risk: "Low", score: 0 };
              return (
                <div
                  key={d.key}
                  className="p-5 rounded-2xl border border-slate-100 bg-slate-50/70 flex flex-col justify-between"
                >
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      {d.tag}
                    </span>
                    <h4 className="font-bold text-xs text-slate-800 line-clamp-1 mb-3">{d.name}</h4>
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-xs text-slate-500 font-medium">Risk Score:</span>
                      <span className="font-extrabold text-sm text-slate-900 font-mono">
                        {Number(res.score).toFixed(1)}%
                      </span>
                    </div>

                    <span className={`block w-full text-center py-1 rounded-xl text-xs border ${getRiskBadge(res.risk)}`}>
                      {res.risk} Risk
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* AI Health Assistant Interactive Feature Banner */}
      <div className="bg-gradient-to-r from-teal-50 via-blue-50 to-indigo-50 rounded-3xl border border-teal-200 p-6 sm:p-7 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3.5 bg-gradient-to-tr from-teal-600 to-blue-600 text-white rounded-2xl shrink-0 shadow-md">
              <Bot size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 border border-teal-200 uppercase tracking-wider">
                  AI Health Assistant
                </span>
                <span className="text-xs text-slate-400">• Evidence-Backed</span>
              </div>
              <h4 className="font-bold text-base text-slate-800">
                Have questions about your report or heart-healthy eating?
              </h4>
              <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                Your CardioPredict Health Assistant can explain your biomarker numbers, clarify the rationale behind specific foods, and formulate questions for your clinician.
              </p>
            </div>
          </div>

          <div className="text-xs text-teal-700 font-bold bg-white px-4 py-2 rounded-xl border border-teal-200 shrink-0 shadow-xs flex items-center gap-1.5">
            <Sparkles size={14} className="text-teal-600" />
            <span>Chat icon at bottom right</span>
          </div>
        </div>
      </div>

      {/* Quick Nav Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Evidence-Based Food Recommendations */}
        <div
          onClick={() => navigate("/patient/diet")}
          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <Utensils size={24} />
            </div>
            <h4 className="font-bold text-base text-slate-800 mb-1 group-hover:text-emerald-700 transition">
              AI Food Recommendations
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Dynamically synthesized cardiovascular nutrition generated after medical report analysis, taking into account verified lab markers, allergies, and dietary preferences.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-700">
            <span>Explore AI Nutrition</span>
            <ChevronRight size={16} />
          </div>
        </div>

        {/* Dedicated Yoga & Guided Wellness */}
        <div
          onClick={() => navigate("/patient/wellness")}
          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-teal-200 transition cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mb-4">
              <Wind size={24} />
            </div>
            <h4 className="font-bold text-base text-slate-800 mb-1 group-hover:text-teal-700 transition">
              Yoga & Guided Wellness
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Beginner-friendly cardiac yoga, chair-supported stretches, interactive 4-4-4 box breathing pacing, and daily wellness activity checklists.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-teal-700">
            <span>Start Guided Session</span>
            <ChevronRight size={16} />
          </div>
        </div>

        {/* Help & Emergency Protocol */}
        <div
          onClick={() => navigate("/patient/help")}
          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition cursor-pointer flex flex-col justify-between group"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <HelpCircle size={24} />
            </div>
            <h4 className="font-bold text-base text-slate-800 mb-1 group-hover:text-blue-700 transition">
              Help & Plain-Language FAQ
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Step-by-step guidance on uploading lab reports, understanding medical terms, and warning signs that require emergency care.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-700">
            <span>Read Help Guide</span>
            <ChevronRight size={16} />
          </div>
        </div>
      </div>

      {/* Suggested Doctor & Administrator Assignment Status */}
      <DoctorAssignmentCard />

      {/* Genuine Model Performance Validation Benchmarks */}
      <ModelPerformanceSection />

      {/* Real Patient Feedback & In-App Administrator Support */}
      <PatientFeedbackModule />
    </div>
  );
};

export default PatientDashboard;
