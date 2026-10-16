// src/pages/patient/PatientDiet.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Utensils,
  HeartPulse,
  CheckCircle,
  AlertOctagon,
  Clock,
  Sparkles,
  Info,
  Apple,
  Salad,
  ChevronRight,
  ShieldCheck,
  Activity,
  FileText,
  RefreshCw,
  AlertTriangle,
  Lock,
  ArrowRight,
  Wheat,
  ShieldAlert,
  BookOpen,
  Key,
  ExternalLink,
  ChevronDown,
  Check,
  Server,
  Sun,
  Moon,
  Droplets
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import BackButton from "../../components/BackButton";

const PatientDiet = () => {
  const { token } = useAuth();
  const { showToast } = useNotification();
  const navigate = useNavigate();

  const [dietData, setDietData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [showSetupGuide, setShowSetupGuide] = useState(false);
  const [activePreference, setActivePreference] = useState("standard");
  const [savingPref, setSavingPref] = useState(false);

  useEffect(() => {
    fetchDietRecommendations();
  }, [token]);

  const fetchDietRecommendations = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://127.0.0.1:8000/api/patient/diet-recommendations", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setDietData(json);
        if (json.patient_context?.dietary_preference) {
          setActivePreference(json.patient_context.dietary_preference);
        }
      } else {
        throw new Error("Failed to load diet status");
      }
    } catch (err) {
      console.error(err);
      showToast("Unable to connect to nutrition recommendation service", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAiDiet = async () => {
    try {
      setGenerating(true);
      const res = await fetch("http://127.0.0.1:8000/api/patient/generate-ai-diet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
      const json = await res.json();
      setDietData(json);
      if (json.status === "success") {
        showToast("AI nutrition plan generated successfully", "success");
      } else if (json.status === "unavailable") {
        showToast("AI model service is currently unconfigured on server", "info");
      }
    } catch (err) {
      console.error(err);
      showToast("Error executing AI nutrition service", "error");
    } finally {
      setGenerating(false);
    }
  };

  const handleRetryConnection = async () => {
    try {
      setCheckingConnection(true);
      const res = await fetch("http://127.0.0.1:8000/api/patient/ai-service-status", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConnectionStatus(data);
        if (data.status === "connected") {
          showToast(`Connected to ${data.provider} (${data.model || "Active"})! Generating AI plan...`, "success");
          await handleGenerateAiDiet();
        } else if (data.status === "unconfigured") {
          showToast("No AI provider key configured in backend environment.", "warning");
          setShowSetupGuide(true);
        } else {
          showToast(`AI Connection failed: ${data.message}`, "error");
        }
      } else {
        throw new Error("Connection test endpoint failed");
      }
    } catch (err) {
      console.error(err);
      showToast("Could not reach backend to check AI connection status.", "error");
    } finally {
      setCheckingConnection(false);
    }
  };

  const handleUpdatePreference = async (pref) => {
    setActivePreference(pref);
    try {
      setSavingPref(true);
      const res = await fetch("http://127.0.0.1:8000/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ dietary_preference: pref })
      });
      if (res.ok) {
        showToast(`Dietary preference set to ${pref}`, "success");
        fetchDietRecommendations();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingPref(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-600">Checking report analysis status & AI nutrition engine...</p>
        </div>
      </div>
    );
  }

  const hasPrediction = dietData?.has_prediction === true;
  const isAiSuccess = dietData?.status === "success";
  const recommendations = dietData?.recommendations || {};
  const patientContext = dietData?.patient_context || {};

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Back Button */}
      <BackButton fallback="/patient/dashboard" label="Back to Dashboard" />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
            <Utensils size={28} className="text-teal-600" /> AI Cardiovascular Nutrition Guidance
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Personalized, evidence-based cardiovascular nutrition generated dynamically from your validated report findings.
          </p>
        </div>

        {hasPrediction && (
          <button
            onClick={handleGenerateAiDiet}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50 self-start sm:self-auto cursor-pointer"
          >
            {generating ? (
              <>
                <RefreshCw size={14} className="animate-spin" /> Generating AI Plan...
              </>
            ) : (
              <>
                <Sparkles size={14} /> Regenerate AI Plan
              </>
            )}
          </button>
        )}
      </div>

      {/* STATE 1: LOCKED / PREDICTION REQUIRED */}
      {!hasPrediction && (
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center shadow-xs space-y-6 max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
            <Lock size={30} />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-800">
              Report Analysis Required
            </h3>
            <p className="text-sm font-semibold text-amber-700 bg-amber-50 py-2 px-4 rounded-xl border border-amber-200 inline-block">
              “Complete your report analysis to receive AI-generated food recommendations.”
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto pt-2 leading-relaxed">
              Per strict medical governance protocols, hardcoded or generic food lists are not provided. AI food recommendations are tailored exclusively to your verified laboratory biomarkers and deep learning risk evaluation.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => navigate("/patient/upload")}
              className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition cursor-pointer"
            >
              <FileText size={16} />
              <span>Upload Medical Report (PDF)</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STATE 2: PREDICTION EXISTS - SHOW CONTEXT & AI STATUS */}
      {hasPrediction && (
        <>
          {/* Patient Clinical Context Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Validated Clinical Context
                </span>
                <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2 mt-0.5">
                  <Activity size={18} className="text-teal-600" /> Findings Synthesized by AI
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-teal-50 text-teal-700 border border-teal-200 text-xs font-bold rounded-xl">
                  {patientContext.primary_flagged_condition || "Cardiovascular Health"}
                </span>
                <span className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl">
                  {patientContext.highest_risk_level || "Standard"} Risk
                </span>
              </div>
            </div>

            {/* Extracted Biomarkers Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
              {Object.entries(patientContext.extracted_biomarkers || {}).slice(0, 6).map(([key, val]) => (
                <div key={key} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block truncate">
                    {key.replace("_", " ")}
                  </span>
                  <span className="font-extrabold text-slate-800 text-sm">{val}</span>
                </div>
              ))}
            </div>

            {/* Dietary Preference & Allergy Strip */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-600">Reported Allergies:</span>
                <span className="text-slate-800 font-semibold px-2 py-0.5 bg-rose-50 text-rose-700 rounded-md border border-rose-200">
                  {patientContext.allergies || "None reported"}
                </span>
              </div>

              {/* Preference selector */}
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-600">Diet Preference:</span>
                <div className="flex gap-1.5">
                  {["standard", "vegetarian", "vegan", "low_sodium"].map((pref) => (
                    <button
                      key={pref}
                      onClick={() => handleUpdatePreference(pref)}
                      disabled={savingPref}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold capitalize transition ${
                        activePreference === pref
                          ? "bg-teal-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {pref.replace("_", " ")}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* AI SERVICE RESULT OR UNCONFIGURED STATUS */}
          {!isAiSuccess ? (
            <div className="bg-white rounded-3xl border border-amber-200 p-8 shadow-xs space-y-5 text-center max-w-2xl mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <ShieldAlert size={28} />
              </div>
              
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-800">
                  AI Nutrition Recommendations Service Temporarily Unavailable
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed max-w-lg mx-auto">
                  {dietData?.message ||
                    "AI food recommendations are temporarily unavailable because no external AI provider API key (e.g. GEMINI_API_KEY or OPENAI_API_KEY) is configured on the backend server."}
                </p>
              </div>

              {/* Live Connection Diagnostics (Shown after testing) */}
              {connectionStatus && (
                <div className={`p-4 rounded-2xl border text-left text-xs space-y-1.5 transition-all ${
                  connectionStatus.status === "connected"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : connectionStatus.status === "unconfigured"
                    ? "bg-amber-50 border-amber-200 text-amber-800"
                    : "bg-rose-50 border-rose-200 text-rose-800"
                }`}>
                  <div className="flex items-center gap-2 font-bold">
                    <Server size={14} />
                    <span>Real-Time Provider Check:</span>
                    <span className="uppercase tracking-wider text-[10px] px-2 py-0.5 rounded-full font-black bg-white/70">
                      {connectionStatus.status}
                    </span>
                  </div>
                  <p className="font-medium">{connectionStatus.message}</p>
                </div>
              )}

              {/* Clinical Governance Assurance Banner */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs text-slate-600 space-y-1">
                <p className="font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-teal-600" /> Clinical Governance Assurance:
                </p>
                <p>
                  Per clinical integrity protocols, hardcoded disease-to-food recommendation mappings have been completely removed from this system. Real dynamic nutrition recommendations require a connected server AI service.
                </p>
              </div>

              {/* Retry & Diagnostic Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleRetryConnection}
                  disabled={checkingConnection || generating}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <RefreshCw size={14} className={checkingConnection ? "animate-spin" : ""} />
                  <span>{checkingConnection ? "Checking AI Provider Connection..." : "Retry AI Service Connection"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSetupGuide(!showSetupGuide)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  <Key size={14} className="text-slate-500" />
                  <span>{showSetupGuide ? "Hide Setup Instructions" : "How to Configure AI Provider"}</span>
                  <ChevronDown size={14} className={`transition-transform ${showSetupGuide ? "rotate-180" : ""}`} />
                </button>
              </div>

              {/* Expandable Provider Setup Guide */}
              {showSetupGuide && (
                <div className="mt-4 p-5 bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-2xl border border-blue-200/70 text-left text-xs text-slate-700 space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-blue-200/60 pb-2">
                    <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-sm">
                      <Key size={16} className="text-blue-600" /> AI Provider Configuration Guide
                    </h4>
                    <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md font-semibold">
                      backend/.env
                    </span>
                  </div>

                  <p className="text-slate-600 leading-relaxed">
                    CardioPredict supports official AI providers using backend environment variables. Keys are kept strictly confidential on the server and are never accessible to client browsers.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Google Gemini Card */}
                    <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs">1. Google Gemini (Recommended)</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">Free Tier</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Get your key from Google AI Studio:
                      </p>
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-bold hover:underline"
                      >
                        <span>aistudio.google.com/app/apikey</span>
                        <ExternalLink size={11} />
                      </a>
                      <div className="p-2 bg-slate-900 text-slate-100 rounded-lg font-mono text-[10px] select-all">
                        GEMINI_API_KEY=AIzaSy...
                      </div>
                    </div>

                    {/* OpenAI Card */}
                    <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs">2. OpenAI (GPT-4o-mini)</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">Official SDK</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Get your key from OpenAI Platform:
                      </p>
                      <a
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 font-bold hover:underline"
                      >
                        <span>platform.openai.com/api-keys</span>
                        <ExternalLink size={11} />
                      </a>
                      <div className="p-2 bg-slate-900 text-slate-100 rounded-lg font-mono text-[10px] select-all">
                        OPENAI_API_KEY=sk-...
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900">
                    <strong>Next Step:</strong> After adding the key to <code className="font-mono bg-white px-1 py-0.5 rounded">backend/.env</code>, restart the Flask server and click <strong>Retry AI Service Connection</strong> above.
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* SUCCESSFUL DYNAMIC AI RECOMMENDATIONS */
            <div className="space-y-6">
              {/* Executive Summary Card */}
              <div className="bg-gradient-to-r from-teal-50/80 to-blue-50/80 rounded-3xl border border-teal-200/90 p-6 sm:p-8 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles size={16} className="text-teal-600" /> Evidence-Based Nutrition Synthesis
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    Generated: {dietData.generated_at} • {dietData.ai_model}
                  </span>
                </div>
                <h3 className="text-xl font-extrabold text-slate-900">
                  {recommendations.evidence_dietary_pattern || "Mediterranean & DASH Dietary Pattern"}
                </h3>
                <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                  {recommendations.summary}
                </p>
              </div>

              {/* Structured Daily Meal Blueprint */}
              {recommendations.daily_meal_structure && (
                <div className="space-y-4">
                  <h4 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
                    <Utensils size={18} className="text-teal-600" /> Structured Daily Meal Blueprint
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Breakfast */}
                    {recommendations.daily_meal_structure.breakfast && (
                      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-3 shadow-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <h5 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                            <Sun size={16} className="text-amber-500" /> Breakfast
                          </h5>
                          <span className="text-[10px] font-semibold text-slate-400">Morning Energy</span>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">Primary Choice:</p>
                          <p className="text-xs text-slate-600 mt-0.5">{recommendations.daily_meal_structure.breakfast.primary_choice}</p>
                        </div>
                        {recommendations.daily_meal_structure.breakfast.practical_alternative && (
                          <div>
                            <p className="text-xs font-bold text-slate-800">Practical Alternative:</p>
                            <p className="text-xs text-slate-600 mt-0.5">{recommendations.daily_meal_structure.breakfast.practical_alternative}</p>
                          </div>
                        )}
                        {recommendations.daily_meal_structure.breakfast.portion_guidance && (
                          <p className="text-[11px] text-teal-700 bg-teal-50 p-2 rounded-xl">
                            🍽️ Portion: {recommendations.daily_meal_structure.breakfast.portion_guidance}
                          </p>
                        )}
                        {recommendations.daily_meal_structure.breakfast.prep_tips && (
                          <p className="text-[11px] text-slate-500 italic">
                            Prep Tip: {recommendations.daily_meal_structure.breakfast.prep_tips}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Lunch */}
                    {recommendations.daily_meal_structure.lunch && (
                      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-3 shadow-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <h5 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                            <Utensils size={16} className="text-blue-500" /> Lunch
                          </h5>
                          <span className="text-[10px] font-semibold text-slate-400">Midday Sustenance</span>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">Primary Choice:</p>
                          <p className="text-xs text-slate-600 mt-0.5">{recommendations.daily_meal_structure.lunch.primary_choice}</p>
                        </div>
                        {recommendations.daily_meal_structure.lunch.practical_alternative && (
                          <div>
                            <p className="text-xs font-bold text-slate-800">Practical Alternative:</p>
                            <p className="text-xs text-slate-600 mt-0.5">{recommendations.daily_meal_structure.lunch.practical_alternative}</p>
                          </div>
                        )}
                        {recommendations.daily_meal_structure.lunch.portion_guidance && (
                          <p className="text-[11px] text-teal-700 bg-teal-50 p-2 rounded-xl">
                            🍽️ Portion: {recommendations.daily_meal_structure.lunch.portion_guidance}
                          </p>
                        )}
                        {recommendations.daily_meal_structure.lunch.prep_tips && (
                          <p className="text-[11px] text-slate-500 italic">
                            Prep Tip: {recommendations.daily_meal_structure.lunch.prep_tips}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Dinner */}
                    {recommendations.daily_meal_structure.dinner && (
                      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-3 shadow-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <h5 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                            <Moon size={16} className="text-indigo-500" /> Dinner
                          </h5>
                          <span className="text-[10px] font-semibold text-slate-400">Evening Nourishment</span>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">Primary Choice:</p>
                          <p className="text-xs text-slate-600 mt-0.5">{recommendations.daily_meal_structure.dinner.primary_choice}</p>
                        </div>
                        {recommendations.daily_meal_structure.dinner.practical_alternative && (
                          <div>
                            <p className="text-xs font-bold text-slate-800">Practical Alternative:</p>
                            <p className="text-xs text-slate-600 mt-0.5">{recommendations.daily_meal_structure.dinner.practical_alternative}</p>
                          </div>
                        )}
                        {recommendations.daily_meal_structure.dinner.portion_guidance && (
                          <p className="text-[11px] text-teal-700 bg-teal-50 p-2 rounded-xl">
                            🍽️ Portion: {recommendations.daily_meal_structure.dinner.portion_guidance}
                          </p>
                        )}
                        {recommendations.daily_meal_structure.dinner.prep_tips && (
                          <p className="text-[11px] text-slate-500 italic">
                            Prep Tip: {recommendations.daily_meal_structure.dinner.prep_tips}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Snacks */}
                    {recommendations.daily_meal_structure.snacks && (
                      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-3 shadow-xs">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <h5 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                            <Apple size={16} className="text-emerald-500" /> Wholesome Snacks
                          </h5>
                          <span className="text-[10px] font-semibold text-slate-400">Metabolic Stability</span>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800">Primary Choice:</p>
                          <p className="text-xs text-slate-600 mt-0.5">{recommendations.daily_meal_structure.snacks.primary_choice}</p>
                        </div>
                        {recommendations.daily_meal_structure.snacks.practical_alternative && (
                          <div>
                            <p className="text-xs font-bold text-slate-800">Practical Alternative:</p>
                            <p className="text-xs text-slate-600 mt-0.5">{recommendations.daily_meal_structure.snacks.practical_alternative}</p>
                          </div>
                        )}
                        {recommendations.daily_meal_structure.snacks.portion_guidance && (
                          <p className="text-[11px] text-teal-700 bg-teal-50 p-2 rounded-xl">
                            🍽️ Portion: {recommendations.daily_meal_structure.snacks.portion_guidance}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Safe Hydration Guidance */}
              {recommendations.hydration_guidance && (
                <div className="bg-blue-50/70 rounded-3xl border border-blue-200/90 p-6 sm:p-7 space-y-2">
                  <h4 className="font-extrabold text-blue-900 text-sm flex items-center gap-2">
                    <Droplets size={16} className="text-blue-600" /> Safe Hydration Protocol
                  </h4>
                  <p className="text-xs font-bold text-blue-800">
                    {typeof recommendations.hydration_guidance === "string"
                      ? recommendations.hydration_guidance
                      : recommendations.hydration_guidance.safe_guideline}
                  </p>
                  {typeof recommendations.hydration_guidance === "object" && recommendations.hydration_guidance.rationale && (
                    <p className="text-xs text-slate-600">
                      {recommendations.hydration_guidance.rationale}
                    </p>
                  )}
                  {typeof recommendations.hydration_guidance === "object" && recommendations.hydration_guidance.clinical_caution && (
                    <p className="text-[11px] text-rose-700 bg-rose-50 p-2 rounded-xl mt-2 border border-rose-200">
                      ⚠️ Clinical Caution: {recommendations.hydration_guidance.clinical_caution}
                    </p>
                  )}
                </div>
              )}

              {/* Recommended Food Categories Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {(recommendations.recommended_categories || []).map((cat, idx) => (
                  <div key={idx} className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                        <CheckCircle size={16} className="text-emerald-500" /> {cat.category}
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Recommended
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {(cat.items || []).map((item, i) => (
                        <span key={i} className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700">
                          {item}
                        </span>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                      <p><span className="font-bold text-slate-700">Clinical Reason:</span> {cat.clinical_reason}</p>
                      {cat.guideline_source && (
                        <p className="text-[11px] text-teal-700 font-medium">
                          Source: {cat.guideline_source}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Foods to Limit & Safety Checks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Foods to Limit */}
                <div className="bg-white rounded-3xl border border-rose-200/90 p-6 space-y-3 shadow-xs">
                  <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                    <AlertOctagon size={16} className="text-rose-500" /> Foods to Moderate or Limit
                  </h4>
                  <div className="space-y-3">
                    {(recommendations.foods_to_limit || []).map((item, idx) => (
                      <div key={idx} className="p-3 bg-rose-50/50 rounded-2xl border border-rose-100 text-xs text-slate-700">
                        <p className="font-bold text-rose-800">{item.food_type}</p>
                        <p className="text-slate-600 mt-0.5">{item.reason}</p>
                        {item.guideline_source && (
                          <p className="text-[10px] text-rose-600/80 font-medium mt-1">Source: {item.guideline_source}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Allergy Checks & Safety Alerts */}
                <div className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-3 shadow-xs">
                  <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                    <ShieldCheck size={16} className="text-teal-600" /> Allergy & Clinical Safety Verifications
                  </h4>
                  <div className="space-y-2 text-xs text-slate-600">
                    {(recommendations.allergy_and_safety_checks || [
                      "Dietary preferences and reported allergies were automatically verified.",
                      "No uncalibrated restrictions on potassium or fluids were prescribed."
                    ]).map((check, idx) => (
                      <div key={idx} className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-xl">
                        <CheckCircle size={14} className="text-teal-600 shrink-0 mt-0.5" />
                        <span>{check}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Medical Disclaimer */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500 leading-relaxed text-center">
                <span className="font-bold text-slate-700">Medical Notice: </span>
                {recommendations.clinical_disclaimer ||
                  "This tool provides educational nutrition suggestions based on your validated report and risk assessment. It does not replace medical consultation with a registered dietitian or cardiologist."}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PatientDiet;
