// src/components/ModelPerformanceSection.jsx
import React, { useState, useEffect } from "react";
import {
  Activity,
  Award,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Shield,
  Layers,
  ChevronDown,
  Info
} from "lucide-react";

export const ModelPerformanceSection = ({ compact = false }) => {
  const [metricsData, setMetricsData] = useState(null);
  const [selectedDisease, setSelectedDisease] = useState("cad");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://127.0.0.1:8000/api/patient/model-metrics");
      if (res.ok) {
        const json = await res.json();
        setMetricsData(json.models);
      }
    } catch (err) {
      console.error("Failed to load model metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm flex items-center justify-center gap-3">
        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-500 font-medium">Loading genuine model validation benchmarks...</span>
      </div>
    );
  }

  if (!metricsData) return null;

  const current = metricsData[selectedDisease];
  if (!current) return null;

  const m = current.metrics;
  const cm = current.confusion_matrix;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
      {/* Header & Distinct Labeling */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
              Verified Model Validation Benchmark
            </span>
            <span className="text-xs font-semibold text-slate-400">• Held-Out Test Evaluation</span>
          </div>
          <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 size={22} className="text-blue-600" />
            Model Test Performance vs. Your Personal Result
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            The metrics below represent overall diagnostic test benchmarks calculated on standardized held-out medical test cohorts. This overall test accuracy is distinct from your personal estimated risk score.
          </p>
        </div>

        {/* Model Tabs */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-2xl shrink-0">
          {[
            { key: "cad", label: "CAD" },
            { key: "heart_failure", label: "Heart Failure" },
            { key: "heart_attack", label: "Heart Attack" },
            { key: "stroke", label: "Stroke" },
            { key: "hypertension", label: "Hypertension" }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedDisease(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedDisease === tab.key
                  ? "bg-white text-blue-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dataset & Evaluation Method Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
        <div>
          <span className="text-slate-400 block font-semibold text-[10px] uppercase">Benchmark Dataset:</span>
          <span className="font-bold text-slate-800 line-clamp-1">{current.dataset_name}</span>
          <span className="text-slate-500 block text-[11px] mt-0.5">Total Cohort: N = {current.dataset_sample_size.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-slate-400 block font-semibold text-[10px] uppercase">Evaluation Protocol:</span>
          <span className="font-bold text-slate-800">{current.evaluation_protocol}</span>
          <span className="text-slate-500 block text-[11px] mt-0.5">Held-Out Test Set: N = {current.test_sample_size.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-slate-400 block font-semibold text-[10px] uppercase">Input Features Used:</span>
          <span className="font-bold text-slate-800">{current.features_count} Verified Clinical Features</span>
          <span className="text-slate-500 block text-[11px] mt-0.5">{current.class_balance_test}</span>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Test Accuracy */}
        <div className="p-3.5 bg-gradient-to-br from-blue-50 to-indigo-50/50 rounded-2xl border border-blue-100 text-center">
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block mb-1">Test Accuracy</span>
          <span className="text-xl sm:text-2xl font-black text-blue-900 font-mono">{m.accuracy}%</span>
          <span className="text-[10px] text-blue-600 block mt-0.5 font-medium">Overall Correct</span>
        </div>

        {/* ROC-AUC */}
        <div className="p-3.5 bg-gradient-to-br from-teal-50 to-emerald-50/50 rounded-2xl border border-teal-100 text-center">
          <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block mb-1">ROC-AUC</span>
          <span className="text-xl sm:text-2xl font-black text-teal-900 font-mono">{m.roc_auc.toFixed(3)}</span>
          <span className="text-[10px] text-teal-600 block mt-0.5 font-medium">Discrimination</span>
        </div>

        {/* Sensitivity / Recall */}
        <div className="p-3.5 bg-gradient-to-br from-rose-50 to-red-50/50 rounded-2xl border border-rose-100 text-center">
          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block mb-1">Sensitivity</span>
          <span className="text-xl sm:text-2xl font-black text-rose-900 font-mono">{m.recall_sensitivity}%</span>
          <span className="text-[10px] text-rose-600 block mt-0.5 font-medium">Catches True Positives</span>
        </div>

        {/* Specificity */}
        <div className="p-3.5 bg-gradient-to-br from-emerald-50 to-green-50/50 rounded-2xl border border-emerald-100 text-center">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">Specificity</span>
          <span className="text-xl sm:text-2xl font-black text-emerald-900 font-mono">{m.specificity}%</span>
          <span className="text-[10px] text-emerald-600 block mt-0.5 font-medium">Rules Out Negatives</span>
        </div>

        {/* Precision */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-center">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">Precision</span>
          <span className="text-xl sm:text-2xl font-black text-slate-800 font-mono">{m.precision}%</span>
          <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">Positive Predictive</span>
        </div>

        {/* F1-Score */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-center">
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">F1-Score</span>
          <span className="text-xl sm:text-2xl font-black text-slate-800 font-mono">{m.f1_score}%</span>
          <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">Harmonic Mean</span>
        </div>
      </div>

      {/* Confusion Matrix & Clinical Explanation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Confusion Matrix Breakdown */}
        <div className="p-4 rounded-2xl border border-slate-200 bg-white">
          <h4 className="text-xs font-bold text-slate-800 mb-2.5 flex items-center gap-1.5">
            <Layers size={14} className="text-blue-600" />
            Held-Out Test Set Confusion Matrix (N = {current.test_sample_size})
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 bg-emerald-50/70 border border-emerald-200 rounded-xl">
              <span className="text-[10px] text-emerald-700 font-bold block">True Positive (TP)</span>
              <span className="text-base font-black text-emerald-900 font-mono">{cm.true_positive}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Correctly flagged high risk</span>
            </div>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] text-slate-600 font-bold block">False Positive (FP)</span>
              <span className="text-base font-black text-slate-800 font-mono">{cm.false_positive}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Non-condition called risk</span>
            </div>
            <div className="p-2.5 bg-rose-50/70 border border-rose-200 rounded-xl">
              <span className="text-[10px] text-rose-700 font-bold block">False Negative (FN)</span>
              <span className="text-base font-black text-rose-900 font-mono">{cm.false_negative}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Condition missed by test</span>
            </div>
            <div className="p-2.5 bg-blue-50/70 border border-blue-200 rounded-xl">
              <span className="text-[10px] text-blue-700 font-bold block">True Negative (TN)</span>
              <span className="text-base font-black text-blue-900 font-mono">{cm.true_negative}</span>
              <span className="text-[10px] text-slate-500 block mt-0.5">Correctly ruled out</span>
            </div>
          </div>
        </div>

        {/* Clinical Plain-Language Interpretation */}
        <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
              <Info size={14} className="text-teal-600" /> Clinical Evaluation Context
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              {current.clinical_context}
            </p>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-200/80 text-[11px] text-slate-500">
            Validation standard: Zero data leakage between training and testing folds; evaluated with standard cross-entropy loss and calibrated sigmoid decision thresholds.
          </div>
        </div>
      </div>

      {/* Prominent Medical Disclaimer */}
      <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 flex items-start gap-3 text-xs">
        <AlertCircle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold">Medical Disclaimer:</span> This tool provides an estimated result for educational and decision-support purposes. It is not a diagnosis. Consult a qualified healthcare professional.
        </div>
      </div>
    </div>
  );
};

export default ModelPerformanceSection;
