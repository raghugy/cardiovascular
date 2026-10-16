// src/pages/patient/PatientWelcome.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  HeartPulse,
  Activity,
  FileText,
  Utensils,
  Wind,
  ArrowRight,
  ShieldCheck,
  LogOut,
  Sparkles,
  Stethoscope
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const PatientWelcome = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const patientName = user?.full_name || user?.username || "Patient";

  return (
    <div
      className="min-h-screen relative flex flex-col justify-between bg-cover bg-center bg-no-repeat overflow-x-hidden font-sans"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(255, 245, 247, 0.88), rgba(254, 242, 244, 0.94)), url('/welcome_bg.jpg')`
      }}
    >
      {/* Top Navigation Bar */}
      <header className="w-full px-6 py-5 flex items-center justify-between backdrop-blur-md bg-white/70 border-b border-rose-100/80 shadow-xs z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-teal-500 flex items-center justify-center shadow-md shadow-rose-500/20">
            <HeartPulse size={22} className="text-white animate-pulse" />
          </div>
          <div>
            <span className="font-extrabold text-lg text-slate-800 tracking-tight flex items-center gap-1">
              Cardio<span className="text-teal-600">Predict</span>
            </span>
            <span className="block text-[10px] font-bold text-rose-600 uppercase tracking-wider">
              Patient Portal • Active Session
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-rose-50/80 border border-rose-200/60 rounded-full text-xs font-semibold text-rose-800">
            <ShieldCheck size={14} className="text-rose-600" />
            <span>Secure Clinical Session</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-rose-600 bg-white/90 hover:bg-rose-50 border border-slate-200 rounded-xl transition shadow-xs"
          >
            <LogOut size={14} /> Log Out
          </button>
        </div>
      </header>

      {/* Main Welcome Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8 z-10 my-6">
        <div className="max-w-4xl w-full bg-white/85 backdrop-blur-md rounded-3xl border border-rose-200/70 p-6 sm:p-12 shadow-xl shadow-rose-900/5 space-y-8 animate-in fade-in zoom-in-95 duration-400">
          
          {/* Header Visual & Titles */}
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-rose-100/90 to-teal-100/90 border border-rose-300/40 text-slate-800 text-xs font-bold shadow-xs">
              <Sparkles size={14} className="text-rose-600" />
              <span>Welcome Back, {patientName}</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              Welcome to <span className="bg-gradient-to-r from-rose-600 via-teal-600 to-blue-700 bg-clip-text text-transparent">CardioPredict</span>
            </h1>

            <p className="text-slate-600 text-sm sm:text-base font-medium leading-relaxed">
              AI-powered cardiovascular health assessment and monitoring. Your personal portal for medical report extraction, deep learning risk analysis, and heart-healthy lifestyle guidance.
            </p>

            {/* Prominent Get Started Button */}
            <div className="pt-2">
              <button
                onClick={() => navigate("/patient/dashboard")}
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 via-teal-600 to-teal-700 hover:from-blue-700 hover:to-teal-800 text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-lg shadow-teal-700/25 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group"
              >
                <span>Get Started</span>
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* Core Modules Preview Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t border-rose-100">
            {/* 1. Upload Report */}
            <div
              onClick={() => navigate("/patient/upload")}
              className="bg-white/80 p-5 rounded-2xl border border-rose-100/80 hover:border-teal-300 hover:shadow-md transition cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition">
                  <FileText size={20} />
                </div>
                <h3 className="font-bold text-slate-800 text-sm mb-1 group-hover:text-blue-700 transition">
                  Upload Medical Report
                </h3>
                <p className="text-xs text-slate-500 leading-normal">
                  Extract clinical biomarkers via PDF text and OCR image extraction.
                </p>
              </div>
              <span className="text-[11px] font-bold text-blue-600 mt-3 inline-flex items-center gap-1">
                Upload now <ArrowRight size={12} />
              </span>
            </div>

            {/* 2. My Predictions */}
            <div
              onClick={() => navigate("/patient/predictions")}
              className="bg-white/80 p-5 rounded-2xl border border-rose-100/80 hover:border-teal-300 hover:shadow-md transition cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3 group-hover:bg-rose-600 group-hover:text-white transition">
                  <Activity size={20} />
                </div>
                <h3 className="font-bold text-slate-800 text-sm mb-1 group-hover:text-rose-700 transition">
                  Cardiovascular Risk
                </h3>
                <p className="text-xs text-slate-500 leading-normal">
                  Multi-condition predictions for CAD, Heart Failure, Stroke & Hypertension.
                </p>
              </div>
              <span className="text-[11px] font-bold text-rose-600 mt-3 inline-flex items-center gap-1">
                View results <ArrowRight size={12} />
              </span>
            </div>

            {/* 3. AI Food Recommendations */}
            <div
              onClick={() => navigate("/patient/diet")}
              className="bg-white/80 p-5 rounded-2xl border border-rose-100/80 hover:border-teal-300 hover:shadow-md transition cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center mb-3 group-hover:bg-teal-600 group-hover:text-white transition">
                  <Utensils size={20} />
                </div>
                <h3 className="font-bold text-slate-800 text-sm mb-1 group-hover:text-teal-700 transition">
                  AI Nutrition Guidance
                </h3>
                <p className="text-xs text-slate-500 leading-normal">
                  Evidence-based nutrition tailored to your validated lab findings.
                </p>
              </div>
              <span className="text-[11px] font-bold text-teal-600 mt-3 inline-flex items-center gap-1">
                Explore food <ArrowRight size={12} />
              </span>
            </div>

            {/* 4. Yoga & Guided Breathing */}
            <div
              onClick={() => navigate("/patient/wellness")}
              className="bg-white/80 p-5 rounded-2xl border border-rose-100/80 hover:border-teal-300 hover:shadow-md transition cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3 group-hover:bg-indigo-600 group-hover:text-white transition">
                  <Wind size={20} />
                </div>
                <h3 className="font-bold text-slate-800 text-sm mb-1 group-hover:text-indigo-700 transition">
                  Yoga & Wellness
                </h3>
                <p className="text-xs text-slate-500 leading-normal">
                  Gentle seated stretches, mobility routines, and interactive breathing guidance.
                </p>
              </div>
              <span className="text-[11px] font-bold text-indigo-600 mt-3 inline-flex items-center gap-1">
                Start wellness <ArrowRight size={12} />
              </span>
            </div>
          </div>

          {/* Clinical Governance Footnote */}
          <div className="text-center pt-2 text-[11px] text-slate-400">
            CardioPredict decision-support system. All model risk scores and nutritional guidance are educational and do not substitute professional clinical diagnosis.
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-slate-500 border-t border-rose-100 bg-white/60 backdrop-blur-xs z-10">
        © {new Date().getFullYear()} CardioPredict Health Assessment & Monitoring System. All rights reserved.
      </footer>
    </div>
  );
};

export default PatientWelcome;
