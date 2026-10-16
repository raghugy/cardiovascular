import React, { useState, useEffect } from "react";
import {
  UploadCloud,
  FileText,
  Activity,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  ArrowRight,
  Download,
  Utensils,
  RefreshCw,
  Info,
  Check,
  Edit3,
  Sliders,
  Send,
  HelpCircle,
  ChevronRight,
  User,
  HeartPulse,
  X,
  FileCheck,
  ShieldCheck,
  ArrowLeft,
  Sparkles,
  Bot,
  ShieldAlert,
  Lock,
  Coffee,
  Sun,
  Moon,
  Apple,
  Droplets
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import BackButton from "../../components/BackButton";

const PatientUpload = () => {
  const { token, user } = useAuth();
  const { showToast } = useNotification();
  const navigate = useNavigate();

  // Workflow Stages: 1 = Upload, 2 = Review/Edit Extracted Values, 3 = Prediction Results, 4 = AI Analysis, 5 = Personalized Diet
  const [stage, setStage] = useState(1);

  // File & Upload State
  const [file, setFile] = useState(null);
  const [reportTitle, setReportTitle] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhaseText, setUploadPhaseText] = useState("");
  const [predictLoading, setPredictLoading] = useState(false);
  const [error, setError] = useState("");
  const [allowManualEntry, setAllowManualEntry] = useState(false);
  const [warnings, setWarnings] = useState({});

  // Extracted values state
  const [reportId, setReportId] = useState(null);
  const [extractionMethod, setExtractionMethod] = useState("digital");
  const [features, setFeatures] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [missingFields, setMissingFields] = useState([]);

  // Results state
  const [predictionResults, setPredictionResults] = useState(null);

  // AI Prediction Analysis State (Stage 4)
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiAnalysisData, setAiAnalysisData] = useState(null);
  const [aiAnalysisError, setAiAnalysisError] = useState("");

  // AI Diet Plan State (Stage 5)
  const [dietLoading, setDietLoading] = useState(false);
  const [dietPlanData, setDietPlanData] = useState(null);
  const [dietError, setDietError] = useState("");
  const [dietaryPreference, setDietaryPreference] = useState("standard");
  const [patientAllergies, setPatientAllergies] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const stepParam = params.get("step");
    if (stepParam === "4" || stepParam === "5") {
      fetchExistingAnalysis();
    }
  }, [token]);

  const fetchExistingAnalysis = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/patient/prediction-analysis", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.has_prediction && json.analysis) {
          setAiAnalysisData(json.analysis);
          setStage(4);
        }
      }
    } catch (e) {
      console.error("Analysis load error:", e);
    }
  };



  const validateAndSetFile = (selected) => {
    if (!selected) return;

    if (!selected.name.toLowerCase().endsWith(".pdf")) {
      setError("Invalid file format. Please select a valid PDF medical report (.pdf).");
      setFile(null);
      return;
    }

    if (selected.size > 10 * 1024 * 1024) {
      setError("File size exceeds 10 MB limit. Please choose a smaller PDF report.");
      setFile(null);
      return;
    }

    if (selected.size < 100) {
      setError("The selected file is empty or corrupted (under 100 bytes).");
      setFile(null);
      return;
    }

    setError("");
    setAllowManualEntry(false);
    setFile(selected);
    if (!reportTitle) {
      const cleanTitle = selected.name.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
      setReportTitle(cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1));
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setError("");
  };

  // Step 1: Upload and Extract Text + Clinical Values
  const handleUploadAndExtract = async (e) => {
    e.preventDefault();
    if (uploadLoading) return; // Prevent double submission

    if (!file) {
      setError("Please select a valid medical report PDF before uploading.");
      return;
    }

    setUploadLoading(true);
    setError("");
    setUploadProgress(20);
    setUploadPhaseText("Uploading medical report to secure server storage...");

    const progressTimer1 = setTimeout(() => {
      setUploadProgress(50);
      setUploadPhaseText("Scanning document structure & text streams...");
    }, 600);

    const progressTimer2 = setTimeout(() => {
      setUploadProgress(75);
      setUploadPhaseText("Executing OCR parsing across clinical panels...");
    }, 1400);

    const progressTimer3 = setTimeout(() => {
      setUploadProgress(90);
      setUploadPhaseText("Matching 51 biomarker patterns & reference ranges...");
    }, 2200);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("report_title", reportTitle || "Cardiovascular Diagnostic Report");

    try {
      const res = await fetch("http://127.0.0.1:8000/api/patient/upload-report", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      clearTimeout(progressTimer1);
      clearTimeout(progressTimer2);
      clearTimeout(progressTimer3);
      setUploadProgress(100);

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to process medical report.");
        if (data.allow_manual_entry) {
          setAllowManualEntry(true);
        }
        setUploadLoading(false);
        return;
      }

      setReportId(data.report_id);
      setExtractionMethod(data.extraction_method || "digital");
      setFeatures(data.extracted_data || {});
      setValidationErrors(data.validation_errors || {});
      setWarnings(data.warnings || {});
      setMissingFields(data.missing_fields || []);
      showToast("Report parsed successfully! Please verify extracted parameters.", "success");
      setStage(2); // Advance to editable review stage
    } catch (err) {
      clearTimeout(progressTimer1);
      clearTimeout(progressTimer2);
      clearTimeout(progressTimer3);
      console.error(err);
      setError("Server connection failed. Please ensure the backend server is reachable.");
      setAllowManualEntry(true);
    } finally {
      setUploadLoading(false);
      setUploadProgress(0);
      setUploadPhaseText("");
    }
  };

  // Manual Entry Route: Initialize a manual report session without a PDF
  const handleInitiateManualEntry = async () => {
    try {
      setError("");
      const res = await fetch("http://127.0.0.1:8000/api/patient/manual-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          report_title: reportTitle || "Manual Cardiovascular Panel"
        })
      });
      const data = await res.json();
      setReportId(data.report_id || null);
      setExtractionMethod("manual");
      setFeatures({
        Age: 50,
        Sex: "Male",
        systolic_bp: 120,
        diastolic_bp: 80,
        cholesterol: 190,
        glucose_level: 95
      });
      setValidationErrors({});
      setWarnings({});
      setMissingFields([]);
      setStage(2);
      showToast("Manual biomarker input mode activated.", "info");
    } catch (err) {
      // Offline fallback: advance directly to stage 2
      setExtractionMethod("manual");
      setStage(2);
    }
  };

  // Field change in Review stage
  const handleFeatureChange = (key, val) => {
    const updated = { ...features, [key]: val };

    // Auto calculate BMI if Weight and Length change
    if ((key === "Weight" || key === "Length") && updated.Weight && updated.Length) {
      const wt = parseFloat(updated.Weight);
      const ht_m = parseFloat(updated.Length) / 100.0;
      if (ht_m > 0 && wt > 0) {
        updated.BMI = Number((wt / (ht_m * ht_m)).toFixed(1));
      }
    }

    setFeatures(updated);

    // Clear field-specific validation error once edited
    if (validationErrors[key]) {
      const newErrors = { ...validationErrors };
      delete newErrors[key];
      setValidationErrors(newErrors);
    }
  };

  // Step 2: Confirm and Run AI Prediction Models
  const handleConfirmAndPredict = async () => {
    if (predictLoading) return; // Prevent double submission
    setPredictLoading(true);
    setError("");

    try {
      const res = await fetch("http://127.0.0.1:8000/api/patient/confirm-and-predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          report_id: reportId,
          features: features
        })
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.validation_errors) {
          setValidationErrors(data.validation_errors);
        }
        setError(data.error || "Clinical validation failed. Please correct required inputs.");
        setPredictLoading(false);
        return;
      }

      setPredictionResults(data.predictions);
      setWarnings(data.warnings || {});
      showToast("Cardiovascular risk prediction completed across all 5 models!", "success");
      setStage(3); // Advance to results stage
    } catch (err) {
      console.error(err);
      setError("Model execution error. Please try again.");
    } finally {
      setPredictLoading(false);
    }
  };



  const handleRunAiAnalysis = async () => {
    if (aiAnalysisLoading) return;
    try {
      setAiAnalysisLoading(true);
      setAiAnalysisError("");
      const res = await fetch("http://127.0.0.1:8000/api/patient/analyze-prediction-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok || data.status === "error" || data.status === "unavailable") {
        const errMsg = data.message || data.error || "AI clinical analysis is temporarily unavailable.";
        setAiAnalysisError(errMsg);
        showToast(errMsg, "error");
        return;
      }
      setAiAnalysisData(data.analysis || data);
      setStage(4);
      showToast("AI Clinical Analysis generated successfully!", "success");
    } catch (err) {
      console.error(err);
      setAiAnalysisError("Unable to reach backend AI analysis service.");
      showToast("Server connection error during AI analysis.", "error");
    } finally {
      setAiAnalysisLoading(false);
    }
  };

  const handleGenerateDietPlan = async () => {
    if (dietLoading) return;
    try {
      setDietLoading(true);
      setDietError("");
      const res = await fetch("http://127.0.0.1:8000/api/patient/generate-ai-diet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          preferences: {
            dietary_preference: dietaryPreference,
            allergies: patientAllergies
          }
        })
      });
      const data = await res.json();
      if (!res.ok || data.status === "error" || data.status === "unavailable") {
        const errMsg = data.message || data.error || "AI diet recommendation service is temporarily unavailable.";
        setDietError(errMsg);
        showToast(errMsg, "error");
        return;
      }
      setDietPlanData(data.recommendations || data);
      setStage(5);
      showToast("Personalized Diet Plan synthesized successfully!", "success");
    } catch (err) {
      console.error(err);
      setDietError("Server connection error during diet plan generation.");
      showToast("Error connecting to diet plan service.", "error");
    } finally {
      setDietLoading(false);
    }
  };

  const getRiskDetails = (risk) => {
    switch (risk?.toLowerCase()) {
      case "high":
        return {
          badge: "bg-rose-50 text-rose-700 border-rose-200 font-bold",
          bar: "bg-rose-600",
          desc: "Elevated risk profile detected. Clinical consultation and targeted lifestyle intervention recommended."
        };
      case "moderate":
        return {
          badge: "bg-amber-50 text-amber-700 border-amber-200 font-semibold",
          bar: "bg-amber-500",
          desc: "Borderline physiological biomarkers observed. Preventive dietary adjustments and regular monitoring advised."
        };
      default:
        return {
          badge: "bg-emerald-50 text-emerald-700 border-emerald-200 font-medium",
          bar: "bg-emerald-500",
          desc: "Optimal biomarker alignment within expected reference ranges. Maintain heart-healthy nutrition and active lifestyle."
        };
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Dynamic Back Navigation */}
      {stage === 1 ? (
        <BackButton fallback="/patient/dashboard" label="Back to Dashboard" />
      ) : stage === 2 ? (
        <div className="mb-4">
          <button
            onClick={() => setStage(1)}
            type="button"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200/90 rounded-xl hover:bg-slate-50 transition shadow-xs group cursor-pointer"
          >
            <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-1 text-slate-500" />
            <span>Back to Upload PDF</span>
          </button>
        </div>
      ) : stage === 3 ? (
        <div className="mb-4">
          <button
            onClick={() => setStage(2)}
            type="button"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200/90 rounded-xl hover:bg-slate-50 transition shadow-xs group cursor-pointer"
          >
            <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-1 text-slate-500" />
            <span>Back to Extracted Values</span>
          </button>
        </div>
      ) : stage === 4 ? (
        <div className="mb-4">
          <button
            onClick={() => setStage(3)}
            type="button"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200/90 rounded-xl hover:bg-slate-50 transition shadow-xs group cursor-pointer"
          >
            <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-1 text-slate-500" />
            <span>Back to Model Predictions</span>
          </button>
        </div>
      ) : (
        <div className="mb-4">
          <button
            onClick={() => setStage(4)}
            type="button"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200/90 rounded-xl hover:bg-slate-50 transition shadow-xs group cursor-pointer"
          >
            <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-1 text-slate-500" />
            <span>Back to AI Clinical Analysis</span>
          </button>
        </div>
      )}

      {/* 5-Step Workflow Stepper */}
      <div className="flex items-center justify-between max-w-3xl mx-auto px-4">
        {[
          { step: 1, label: "1. Upload Report" },
          { step: 2, label: "2. Verify Biomarkers" },
          { step: 3, label: "3. ML Predictions" },
          { step: 4, label: "4. AI Analysis" },
          { step: 5, label: "5. Personalized Diet" }
        ].map((s, idx) => (
          <React.Fragment key={s.step}>
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={() => {
                  if (s.step === 1) setStage(1);
                  else if (s.step === 2 && (reportId || Object.keys(features).length > 0)) setStage(2);
                  else if (s.step === 3 && predictionResults) setStage(3);
                  else if (s.step === 4 && aiAnalysisData) setStage(4);
                  else if (s.step === 5 && dietPlanData) setStage(5);
                }}
                className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-xs transition cursor-pointer ${
                  stage >= s.step
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                    : "bg-slate-200 text-slate-500 cursor-not-allowed"
                }`}
              >
                {stage > s.step ? <Check size={16} /> : s.step}
              </button>
              <span className={`text-[10px] sm:text-[11px] font-semibold mt-1.5 text-center ${stage >= s.step ? "text-slate-900" : "text-slate-400"}`}>
                {s.label}
              </span>
            </div>
            {idx < 4 && (
              <div className={`flex-1 h-0.5 mx-2 sm:mx-3 ${stage > s.step ? "bg-blue-600" : "bg-slate-200"}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Error Banner with Manual Recovery Option */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs flex flex-col sm:flex-row items-start justify-between gap-3 max-w-2xl mx-auto animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <AlertTriangle size={18} className="shrink-0 text-rose-600 mt-0.5" />
            <div>
              <p className="font-bold text-sm mb-0.5">Clinical Upload Notice</p>
              <p>{error}</p>
            </div>
          </div>
          {allowManualEntry && stage === 1 && (
            <button
              onClick={handleInitiateManualEntry}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs whitespace-nowrap self-end sm:self-center"
            >
              Enter Biomarkers Manually →
            </button>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 1: UPLOAD PDF & TEST WITH SAMPLES */}
      {/* ========================================================================= */}
      {stage === 1 && (
        <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <div className="text-center mb-6">
            <h3 className="text-xl font-extrabold text-slate-900">
              Upload Cardiovascular Medical Report
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Supports digital laboratory PDFs as well as scanned documents via Tesseract OCR extraction
            </p>
          </div>

          {/* Download Sample Reports Box */}
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl text-xs">
            <p className="font-bold text-blue-900 mb-2 flex items-center gap-1.5">
              <Download size={14} className="text-blue-600" /> Need a sample clinical report to test the AI models?
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href="/sample_reports/sample_patient_report_elevated_risk.pdf"
                download="sample_patient_report_elevated_risk.pdf"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition shadow-xs"
              >
                ⬇️ Sample Elevated Risk Report (PDF)
              </a>
              <a
                href="/sample_reports/sample_patient_report_healthy.pdf"
                download="sample_patient_report_healthy.pdf"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition shadow-xs"
              >
                ⬇️ Sample Healthy Report (PDF)
              </a>
            </div>
            <p className="text-[11px] text-blue-800/80 mt-2">
              Download one of these test PDFs and upload it below to verify end-to-end OCR extraction and model prediction.
            </p>
          </div>

          <form onSubmit={handleUploadAndExtract} className="space-y-5">
            {/* Report Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Report Title / Description
              </label>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder="e.g. Annual Cardiovascular Checkup Panel"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            {/* Dropzone with full Drag & Drop Event Handling */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all ${
                isDragging
                  ? "border-blue-600 bg-blue-50/50 scale-[1.01]"
                  : file
                  ? "border-emerald-400 bg-emerald-50/20"
                  : "border-slate-300 hover:border-blue-500 bg-slate-50/60 hover:bg-blue-50/20"
              }`}
            >
              <input
                type="file"
                id="pdf-upload-input"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                onClick={(e) => { e.target.value = null; }}
                className="hidden"
              />
              <label
                htmlFor="pdf-upload-input"
                className="cursor-pointer flex flex-col items-center justify-center"
              >
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-inner ${
                    file ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"
                  }`}
                >
                  {file ? <FileCheck size={28} /> : <UploadCloud size={28} />}
                </div>

                {file ? (
                  <div className="space-y-1">
                    <span className="font-bold text-sm text-slate-900 block">{file.name}</span>
                    <span className="text-xs text-slate-500 font-medium">
                      {(file.size / 1024).toFixed(1)} KB • Ready for extraction
                    </span>
                  </div>
                ) : (
                  <>
                    <span className="font-bold text-sm text-slate-800 mb-1">
                      {isDragging ? "Drop PDF file here..." : "Click or drag & drop medical report PDF here"}
                    </span>
                    <span className="text-xs text-slate-400">
                      Standard PDF documents up to 10 MB
                    </span>
                  </>
                )}
              </label>

              {file && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                  >
                    <X size={12} /> Remove file
                  </button>
                </div>
              )}
            </div>

            {/* Upload Progress Bar (when active) */}
            {uploadLoading && (
              <div className="space-y-2 p-4 bg-blue-50/60 border border-blue-100 rounded-2xl">
                <div className="flex items-center justify-between text-xs font-semibold text-blue-900">
                  <span>{uploadPhaseText}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-blue-200/60 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                type="submit"
                disabled={uploadLoading || !file}
                className={`w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition flex items-center justify-center gap-2 ${
                  uploadLoading || !file ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                {uploadLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing Medical Report...</span>
                  </>
                ) : (
                  <>
                    <span>Upload & Extract Clinical Values</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleInitiateManualEntry}
                  className="text-xs font-semibold text-slate-600 hover:text-blue-600 transition underline underline-offset-4"
                >
                  Don't have a PDF? Enter Biomarkers Manually
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 2: EDITABLE CONFIRMATION FORM & RANGE VALIDATION */}
      {/* ========================================================================= */}
      {stage === 2 && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
                  Mode: {extractionMethod.toUpperCase()}
                </span>
                {reportId && <span className="text-xs text-slate-400">Report #{reportId}</span>}
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Review & Confirm Clinical Values
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Carefully review the biomarker values. You can edit any parameter or supply missing fields before executing AI models.
              </p>
            </div>

            <button
              onClick={() => { setStage(1); setError(""); }}
              className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Upload Different File
            </button>
          </div>

          {/* Validation Warnings Header if any */}
          {Object.keys(warnings).length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
              <span className="font-bold flex items-center gap-1.5 text-amber-800">
                <AlertTriangle size={15} /> Clinical Physiological Warnings:
              </span>
              {Object.entries(warnings).map(([k, w]) => (
                <p key={k}>• <span className="font-semibold">{k}:</span> {w}</p>
              ))}
            </div>
          )}

          {/* Clinical Panels Confirmation Grid */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            {/* Panel 1: Vital Signs & Blood Pressure */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 pb-2 border-b border-slate-100 mb-4 flex items-center gap-1.5">
                <Activity size={15} /> 1. Hemodynamics & Vital Measurements
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { key: "systolic_bp", label: "Systolic BP", unit: "mmHg", placeholder: "120", required: true },
                  { key: "diastolic_bp", label: "Diastolic BP", unit: "mmHg", placeholder: "80", required: true },
                  { key: "resting_bp", label: "Resting BP", unit: "mmHg", placeholder: "120" },
                  { key: "heart_rate", label: "Heart Rate", unit: "bpm", placeholder: "72" },
                  { key: "max_hr", label: "Max Heart Rate", unit: "bpm", placeholder: "160" },
                  { key: "oldpeak", label: "ST Depression", unit: "mm", placeholder: "0.0" }
                ].map((item) => (
                  <div key={item.key}>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {item.label} {item.required && <span className="text-rose-500">*</span>}{" "}
                      <span className="text-[10px] text-slate-400">({item.unit})</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={features[item.key] ?? ""}
                      onChange={(e) => handleFeatureChange(item.key, e.target.value)}
                      placeholder={item.placeholder}
                      className={`w-full px-3 py-2 rounded-xl border text-xs outline-none font-mono transition ${
                        validationErrors[item.key]
                          ? "border-rose-400 bg-rose-50/30 focus:ring-2 focus:ring-rose-500"
                          : "border-slate-200 focus:ring-2 focus:ring-blue-500"
                      }`}
                    />
                    {validationErrors[item.key] && (
                      <p className="text-[10px] text-rose-500 mt-1">{validationErrors[item.key]}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Panel 2: Demographics & Body Metrics */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 pb-2 border-b border-slate-100 mb-4 flex items-center gap-1.5">
                <User size={15} /> 2. Demographics & Body Mass
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Age (Years) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={features.Age ?? ""}
                    onChange={(e) => handleFeatureChange("Age", e.target.value)}
                    placeholder="e.g. 52"
                    required
                    className={`w-full px-3 py-2 rounded-xl border text-xs outline-none font-mono transition ${
                      validationErrors.Age
                        ? "border-rose-400 bg-rose-50/30 focus:ring-2 focus:ring-rose-500"
                        : "border-slate-200 focus:ring-2 focus:ring-blue-500"
                    }`}
                  />
                  {validationErrors.Age && (
                    <p className="text-[10px] text-rose-500 mt-1">{validationErrors.Age}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Biological Sex <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={features.Sex || "Male"}
                    onChange={(e) => handleFeatureChange("Sex", e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    step="any"
                    value={features.Weight ?? ""}
                    onChange={(e) => handleFeatureChange("Weight", e.target.value)}
                    placeholder="e.g. 74"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Height / Length (cm)</label>
                  <input
                    type="number"
                    step="any"
                    value={features.Length ?? ""}
                    onChange={(e) => handleFeatureChange("Length", e.target.value)}
                    placeholder="e.g. 172"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">BMI (kg/m²)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={features.BMI ?? ""}
                    onChange={(e) => handleFeatureChange("BMI", e.target.value)}
                    placeholder="e.g. 25.0"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 outline-none font-mono bg-slate-50"
                  />
                </div>
              </div>
            </div>

            {/* Panel 3: Lipid Profile & Cardiac Biomarkers */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 pb-2 border-b border-slate-100 mb-4 flex items-center gap-1.5">
                <HeartPulse size={15} /> 3. Lipid Profile & Cardiac Biomarkers
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { key: "cholesterol", label: "Total Cholesterol", unit: "mg/dL", placeholder: "190", required: true },
                  { key: "LDL", label: "LDL Cholesterol", unit: "mg/dL", placeholder: "110" },
                  { key: "HDL", label: "HDL Cholesterol", unit: "mg/dL", placeholder: "50" },
                  { key: "triglycerides", label: "Triglycerides", unit: "mg/dL", placeholder: "150" },
                  { key: "glucose_level", label: "Fasting Blood Sugar", unit: "mg/dL", placeholder: "95", required: true },
                  { key: "Troponin", label: "Cardiac Troponin", unit: "ng/mL", placeholder: "0.01" },
                  { key: "CK_MB", label: "CK-MB Biomarker", unit: "ng/mL", placeholder: "2.0" },
                  { key: "EF-TTE", label: "Ejection Fraction (EF)", unit: "%", placeholder: "60" }
                ].map((item) => (
                  <div key={item.key}>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {item.label} {item.required && <span className="text-rose-500">*</span>}{" "}
                      <span className="text-[10px] text-slate-400">({item.unit})</span>
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={features[item.key] ?? ""}
                      onChange={(e) => handleFeatureChange(item.key, e.target.value)}
                      placeholder={item.placeholder}
                      className={`w-full px-3 py-2 rounded-xl border text-xs outline-none font-mono transition ${
                        validationErrors[item.key]
                          ? "border-rose-400 bg-rose-50/30 focus:ring-2 focus:ring-rose-500"
                          : "border-slate-200 focus:ring-2 focus:ring-blue-500"
                      }`}
                    />
                    {validationErrors[item.key] && (
                      <p className="text-[10px] text-rose-500 mt-1">{validationErrors[item.key]}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Confirm & Submit */}
            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-slate-500">
                Mandatory fields (<span className="text-rose-500 font-bold">*</span>) are validated before running the 5 deep learning models.
              </p>

              <button
                onClick={handleConfirmAndPredict}
                disabled={predictLoading}
                className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-blue-500/20 transition flex items-center justify-center gap-2"
              >
                {predictLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Executing AI Prediction Models...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm Values & Run AI Predictions</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 3: PREDICTION RESULTS DISPLAY */}
      {/* ========================================================================= */}
      {stage === 3 && predictionResults && (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in">
          {/* Results Header */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-teal-300 backdrop-blur-xs mb-2 inline-block">
                Evaluations Verified
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Cardiovascular Health Evaluation Results
              </h3>
              <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-xl">
                Analysis complete for 5 clinical heart conditions. Results represent risk categorization based on biomarker alignment.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => navigate("/patient/diet")}
                className="px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-teal-900/40 transition flex items-center gap-1.5"
              >
                <Utensils size={16} /> Food Recommendations
              </button>
              <button
                onClick={() => navigate("/patient/predictions")}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl border border-white/20 transition flex items-center gap-1.5"
              >
                <Activity size={15} /> Prediction History
              </button>
            </div>
          </div>

          {/* Clinical Disclaimer */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 flex items-start gap-2.5 leading-relaxed">
            <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Medical Device & Clinical Disclaimer: </span>
              AI model outputs are clinical risk estimation aids designed for screening and monitoring. They do not constitute an official medical diagnosis. Patients experiencing acute chest pain, shortness of breath, or numbness should seek emergency medical attention immediately.
            </div>
          </div>

          {/* Disease Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                key: "cad",
                name: "Coronary Artery Disease (CAD)",
                description: "Atherosclerotic plaque accumulation in coronary arteries.",
                inputs: ["Cholesterol", "Systolic BP", "Age", "BMI", "Smoking"]
              },
              {
                key: "heart_failure",
                name: "Heart Failure (HF)",
                description: "Impaired systolic contractile power or diastolic relaxation.",
                inputs: ["Ejection Fraction", "Resting BP", "Heart Rate", "Creatinine"]
              },
              {
                key: "heart_attack",
                name: "Myocardial Infarction",
                description: "Acute coronary occlusion and myocardial ischemic stress.",
                inputs: ["Troponin", "CK-MB", "Systolic BP", "Blood Sugar"]
              },
              {
                key: "stroke",
                name: "Stroke / Cerebrovascular Event",
                description: "Impaired cerebral perfusion or microvascular thrombosis.",
                inputs: ["Blood Pressure", "Glucose Level", "BMI", "Age"]
              },
              {
                key: "hypertension",
                name: "Hypertensive Heart Disease",
                description: "Chronic vascular afterload causing myocardial remodeling.",
                inputs: ["Systolic/Diastolic BP", "Cholesterol", "Heart Rate", "Age"]
              }
            ].map((d) => {
              const res = predictionResults[d.key] || { risk: "Low", score: 0 };
              const details = getRiskDetails(res.risk);

              return (
                <div
                  key={d.key}
                  className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs border ${details.badge}`}>
                        {res.risk} Risk
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-700">
                        Score: {Number(res.score).toFixed(1)}%
                      </span>
                    </div>

                    <h4 className="font-bold text-base text-slate-900 mb-1">{d.name}</h4>
                    <p className="text-xs text-slate-500 mb-4">{d.description}</p>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                      <div
                        className={`h-full transition-all duration-500 ${details.bar}`}
                        style={{ width: `${Math.min(100, Math.max(5, res.score))}%` }}
                      />
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{details.desc}</p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400 block mb-1">Key Inputs Evaluated:</span>
                    <div className="flex flex-wrap gap-1">
                      {d.inputs.map((inp) => (
                        <span key={inp} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px]">
                          {inp}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Row: Next Step is Step 4 AI Analysis */}
          <div className="p-6 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-3xl border border-indigo-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 uppercase tracking-wider">
                  Next Step: Step 4
                </span>
                <span className="text-xs font-bold text-slate-700">AI Clinical Explanation</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-lg">
                Translate mathematical model percentages into plain English, understand measured lab findings vs predictions, and get 4-5 tailored questions for your physician.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                onClick={() => { setStage(1); setFile(null); setPredictionResults(null); }}
                className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
              >
                New Report
              </button>
              <button
                onClick={handleRunAiAnalysis}
                disabled={aiAnalysisLoading}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-indigo-500/25 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                {aiAnalysisLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Analyzing Results with AI...</span>
                  </>
                ) : (
                  <>
                    <Bot size={16} />
                    <span>Analyze My Results with AI</span>
                    <Sparkles size={14} className="text-amber-300" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 4: AI CLINICAL ANALYSIS DISPLAY */}
      {/* ========================================================================= */}
      {stage === 4 && aiAnalysisData && (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in">
          {/* Analysis Header */}
          <div className="bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-purple-200 backdrop-blur-xs mb-2 inline-flex items-center gap-1.5">
                <Sparkles size={13} className="text-amber-300" /> Step 4: AI Clinical Analysis Complete
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Empathetic Clinical Findings Synthesis
              </h3>
              <p className="text-purple-200 text-xs sm:text-sm mt-1 max-w-xl">
                Synthesized by CardioPredict AI assistant. Distinguishing measured laboratory biomarkers from mathematical machine-learning risk predictions.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={handleGenerateDietPlan}
                disabled={dietLoading}
                className="px-5 py-3 bg-teal-500 hover:bg-teal-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-teal-900/40 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {dietLoading ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Generating Diet Plan...</span>
                  </>
                ) : (
                  <>
                    <Utensils size={15} />
                    <span>Generate My Personalized Diet Plan</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Clinical Disclaimer Notice */}
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl text-xs text-purple-900 flex items-start gap-2.5 leading-relaxed">
            <Info size={18} className="text-purple-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Clinical Communication Notice: </span>
              {aiAnalysisData.clinical_disclaimer || "AI analysis is designed for clinical decision-support and educational patient communication. It does not replace formal diagnosis, clinical care, or treatment prescription by a licensed cardiologist."}
            </div>
          </div>

          {/* Executive Summary & Risk Tier Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <span className="text-[11px] font-bold text-purple-600 uppercase tracking-wider">
                  Plain-Language Synthesis
                </span>
                <h4 className="text-lg font-extrabold text-slate-800 mt-0.5">
                  Summary for Patient & Family
                </h4>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 text-slate-700">
                  Concern: {aiAnalysisData.primary_flagged_concern || "Cardiovascular Health"}
                </span>
                <span className={`px-3 py-1 rounded-xl text-xs font-bold ${
                  aiAnalysisData.risk_tier === "High"
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : aiAnalysisData.risk_tier === "Moderate"
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}>
                  Risk Tier: {aiAnalysisData.risk_tier || "Standard"}
                </span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
              {aiAnalysisData.executive_summary}
            </p>
          </div>

          {/* Measured Lab Findings vs ML Mathematical Predictions */}
          <div className="bg-gradient-to-r from-blue-50/70 to-indigo-50/70 rounded-3xl border border-blue-200/90 p-6 sm:p-8 shadow-xs space-y-3">
            <h4 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
              <Activity size={18} className="text-blue-600" />
              Measured Laboratory Biomarkers vs Machine-Learning Predictions
            </h4>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
              {aiAnalysisData.measured_vs_predicted_explanation ||
                "Your lab numbers (such as blood pressure, cholesterol, glucose, and troponin) reflect physical measurements from blood and vital checks. In contrast, the 5 model risk scores are statistical probabilities computed across clinical cohort patterns. A predicted risk score indicates statistical alignment with historical risk factors, NOT a confirmed diagnosis."}
            </p>
          </div>

          {/* Risk Factors Breakdown */}
          {aiAnalysisData.risk_factors_breakdown && aiAnalysisData.risk_factors_breakdown.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-bold text-base text-slate-800">
                Key Cardiovascular Risk Factors & Observations
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {aiAnalysisData.risk_factors_breakdown.map((rf, idx) => (
                  <div key={idx} className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-2 shadow-xs">
                    <h5 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                      <CheckCircle size={15} className="text-blue-500" />
                      {rf.factor}
                    </h5>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      <span className="font-semibold text-slate-700">Observation:</span> {rf.observation}
                    </p>
                    {rf.practical_takeaway && (
                      <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-indigo-700 font-medium">
                        💡 Practical Takeaway: {rf.practical_takeaway}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Uncertainties & Questions for Doctor Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Uncertainties and Missing Data */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-3 shadow-xs">
              <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <AlertCircle size={16} className="text-amber-500" /> Clinical Uncertainty & Missing Information
              </h4>
              <p className="text-xs text-slate-500">
                A single report snapshot cannot capture long-term baseline trends or internal cardiac structures:
              </p>
              <div className="space-y-2 text-xs text-slate-600">
                {(aiAnalysisData.uncertainties_and_missing_data || [
                  "Longitudinal blood pressure and lipid trends over 6-12 months.",
                  "Direct anatomical imaging (e.g. Echocardiogram, Coronary Calcium Scan).",
                  "Family medical history and genetic cardiovascular predisposition."
                ]).map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-xl">
                    <span className="text-amber-500 font-bold">•</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Questions for Doctor */}
            <div className="bg-white rounded-3xl border border-teal-200/90 p-6 space-y-3 shadow-xs">
              <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <HelpCircle size={16} className="text-teal-600" /> Suggested Questions for Your Doctor
              </h4>
              <p className="text-xs text-slate-500">
                Take these discussion points to your next clinic or cardiology consultation:
              </p>
              <div className="space-y-2 text-xs text-slate-700">
                {(aiAnalysisData.suggested_questions_for_doctor || [
                  "Do my current blood pressure and lipid numbers warrant confirmatory lab re-tests?",
                  "Would you recommend a 24-hour ambulatory blood pressure monitor?",
                  "Are there specific target ranges we should set for my LDL and fasting glucose?",
                  "How frequently should we monitor my renal and electrolyte panel?"
                ]).map((q, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 p-2.5 bg-teal-50/50 border border-teal-100 rounded-xl">
                    <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span>{q}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Row: Advance to Step 5 Diet Plan */}
          <div className="p-6 bg-gradient-to-r from-teal-50 via-emerald-50 to-blue-50 rounded-3xl border border-teal-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 uppercase tracking-wider">
                  Next Step: Step 5
                </span>
                <span className="text-xs font-bold text-slate-800">Generate Personalized Diet Plan</span>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-lg">
                Now that your report and risk factors have been analyzed, generate a customized daily meal plan (Breakfast, Lunch, Dinner, Snacks) with portion and hydration guidance.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                onClick={() => setStage(3)}
                className="px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-xs cursor-pointer"
              >
                Back to Predictions
              </button>
              <button
                onClick={handleGenerateDietPlan}
                disabled={dietLoading}
                className="px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-teal-500/25 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
              >
                {dietLoading ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Synthesizing Diet Plan...</span>
                  </>
                ) : (
                  <>
                    <Utensils size={16} />
                    <span>Generate My Personalized Diet Plan</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STAGE 5: PERSONALIZED DIET PLAN DISPLAY */}
      {/* ========================================================================= */}
      {stage === 5 && dietPlanData && (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in">
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-800 via-emerald-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-teal-200 backdrop-blur-xs mb-2 inline-flex items-center gap-1.5">
                <CheckCircle size={13} className="text-emerald-300" /> Step 5: Personalized Diet Plan Ready
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {dietPlanData.evidence_dietary_pattern || "Personalized Cardiovascular Nutrition Plan"}
              </h3>
              <p className="text-teal-100 text-xs sm:text-sm mt-1 max-w-xl">
                Synthesized dynamically from your validated report biomarkers, risk evaluations, and stated dietary preferences.
              </p>
            </div>

            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => navigate("/patient/diet")}
                className="px-5 py-3 bg-white text-teal-800 hover:bg-teal-50 font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
              >
                <span>View Full Diet & Nutrition Hub</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Dietary Preferences Selector */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                  <Sliders size={16} className="text-teal-600" /> Customize Dietary Preferences & Allergies
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update your eating style or list allergies to re-synthesize this plan.
                </p>
              </div>
              <button
                onClick={handleGenerateDietPlan}
                disabled={dietLoading}
                className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={12} className={dietLoading ? "animate-spin" : ""} />
                <span>Update & Regenerate</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Dietary Pattern
                </label>
                <select
                  value={dietaryPreference}
                  onChange={(e) => setDietaryPreference(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                >
                  <option value="standard">Standard Balanced</option>
                  <option value="vegetarian">Vegetarian (Plant-Forward)</option>
                  <option value="vegan">Vegan (100% Plant-Based)</option>
                  <option value="low_sodium">Strict Low Sodium (&lt;1500mg/day)</option>
                  <option value="mediterranean">Mediterranean Pattern</option>
                  <option value="dash">DASH Pattern</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Known Food Allergies & Intolerances
                </label>
                <input
                  type="text"
                  placeholder="e.g. Peanuts, Shellfish, Dairy, Gluten"
                  value={patientAllergies}
                  onChange={(e) => setPatientAllergies(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none"
                >
                </input>
              </div>
            </div>
          </div>

          {/* Plan Summary */}
          <div className="bg-gradient-to-r from-teal-50/80 to-emerald-50/80 rounded-3xl border border-teal-200/90 p-6 sm:p-8 space-y-2">
            <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} className="text-teal-600" /> Evidence-Based Nutrition Synthesis
            </span>
            <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
              {dietPlanData.summary}
            </p>
          </div>

          {/* Daily Meal Structure Grid (Breakfast, Lunch, Dinner, Snacks) */}
          {dietPlanData.daily_meal_structure && (
            <div className="space-y-4">
              <h4 className="font-extrabold text-base text-slate-800 flex items-center gap-2">
                <Utensils size={18} className="text-teal-600" /> Structured Daily Meal Blueprint
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Breakfast */}
                {dietPlanData.daily_meal_structure.breakfast && (
                  <div className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h5 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        <Sun size={16} className="text-amber-500" /> Breakfast
                      </h5>
                      <span className="text-[10px] font-semibold text-slate-400">Morning Energy</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Primary Choice:</p>
                      <p className="text-xs text-slate-600 mt-0.5">{dietPlanData.daily_meal_structure.breakfast.primary_choice}</p>
                    </div>
                    {dietPlanData.daily_meal_structure.breakfast.practical_alternative && (
                      <div>
                        <p className="text-xs font-bold text-slate-800">Practical Alternative:</p>
                        <p className="text-xs text-slate-600 mt-0.5">{dietPlanData.daily_meal_structure.breakfast.practical_alternative}</p>
                      </div>
                    )}
                    {dietPlanData.daily_meal_structure.breakfast.portion_guidance && (
                      <p className="text-[11px] text-teal-700 bg-teal-50 p-2 rounded-xl">
                        🍽️ Portion: {dietPlanData.daily_meal_structure.breakfast.portion_guidance}
                      </p>
                    )}
                    {dietPlanData.daily_meal_structure.breakfast.prep_tips && (
                      <p className="text-[11px] text-slate-500 italic">
                        Prep Tip: {dietPlanData.daily_meal_structure.breakfast.prep_tips}
                      </p>
                    )}
                  </div>
                )}

                {/* Lunch */}
                {dietPlanData.daily_meal_structure.lunch && (
                  <div className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h5 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        <Utensils size={16} className="text-blue-500" /> Lunch
                      </h5>
                      <span className="text-[10px] font-semibold text-slate-400">Midday Sustenance</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Primary Choice:</p>
                      <p className="text-xs text-slate-600 mt-0.5">{dietPlanData.daily_meal_structure.lunch.primary_choice}</p>
                    </div>
                    {dietPlanData.daily_meal_structure.lunch.practical_alternative && (
                      <div>
                        <p className="text-xs font-bold text-slate-800">Practical Alternative:</p>
                        <p className="text-xs text-slate-600 mt-0.5">{dietPlanData.daily_meal_structure.lunch.practical_alternative}</p>
                      </div>
                    )}
                    {dietPlanData.daily_meal_structure.lunch.portion_guidance && (
                      <p className="text-[11px] text-teal-700 bg-teal-50 p-2 rounded-xl">
                        🍽️ Portion: {dietPlanData.daily_meal_structure.lunch.portion_guidance}
                      </p>
                    )}
                    {dietPlanData.daily_meal_structure.lunch.prep_tips && (
                      <p className="text-[11px] text-slate-500 italic">
                        Prep Tip: {dietPlanData.daily_meal_structure.lunch.prep_tips}
                      </p>
                    )}
                  </div>
                )}

                {/* Dinner */}
                {dietPlanData.daily_meal_structure.dinner && (
                  <div className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h5 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        <Moon size={16} className="text-indigo-500" /> Dinner
                      </h5>
                      <span className="text-[10px] font-semibold text-slate-400">Evening Nourishment</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Primary Choice:</p>
                      <p className="text-xs text-slate-600 mt-0.5">{dietPlanData.daily_meal_structure.dinner.primary_choice}</p>
                    </div>
                    {dietPlanData.daily_meal_structure.dinner.practical_alternative && (
                      <div>
                        <p className="text-xs font-bold text-slate-800">Practical Alternative:</p>
                        <p className="text-xs text-slate-600 mt-0.5">{dietPlanData.daily_meal_structure.dinner.practical_alternative}</p>
                      </div>
                    )}
                    {dietPlanData.daily_meal_structure.dinner.portion_guidance && (
                      <p className="text-[11px] text-teal-700 bg-teal-50 p-2 rounded-xl">
                        🍽️ Portion: {dietPlanData.daily_meal_structure.dinner.portion_guidance}
                      </p>
                    )}
                    {dietPlanData.daily_meal_structure.dinner.prep_tips && (
                      <p className="text-[11px] text-slate-500 italic">
                        Prep Tip: {dietPlanData.daily_meal_structure.dinner.prep_tips}
                      </p>
                    )}
                  </div>
                )}

                {/* Snacks */}
                {dietPlanData.daily_meal_structure.snacks && (
                  <div className="bg-white rounded-3xl border border-slate-200/90 p-6 space-y-3 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h5 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        <Apple size={16} className="text-emerald-500" /> Wholesome Snacks
                      </h5>
                      <span className="text-[10px] font-semibold text-slate-400">Metabolic Stability</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Primary Choice:</p>
                      <p className="text-xs text-slate-600 mt-0.5">{dietPlanData.daily_meal_structure.snacks.primary_choice}</p>
                    </div>
                    {dietPlanData.daily_meal_structure.snacks.practical_alternative && (
                      <div>
                        <p className="text-xs font-bold text-slate-800">Practical Alternative:</p>
                        <p className="text-xs text-slate-600 mt-0.5">{dietPlanData.daily_meal_structure.snacks.practical_alternative}</p>
                      </div>
                    )}
                    {dietPlanData.daily_meal_structure.snacks.portion_guidance && (
                      <p className="text-[11px] text-teal-700 bg-teal-50 p-2 rounded-xl">
                        🍽️ Portion: {dietPlanData.daily_meal_structure.snacks.portion_guidance}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Safe Hydration Guidance */}
          {dietPlanData.hydration_guidance && (
            <div className="bg-blue-50/70 rounded-3xl border border-blue-200/90 p-6 sm:p-7 space-y-2">
              <h4 className="font-extrabold text-blue-900 text-sm flex items-center gap-2">
                <Droplets size={16} className="text-blue-600" /> Safe Hydration Protocol
              </h4>
              <p className="text-xs font-bold text-blue-800">
                {typeof dietPlanData.hydration_guidance === "string"
                  ? dietPlanData.hydration_guidance
                  : dietPlanData.hydration_guidance.safe_guideline}
              </p>
              {typeof dietPlanData.hydration_guidance === "object" && dietPlanData.hydration_guidance.rationale && (
                <p className="text-xs text-slate-600">
                  {dietPlanData.hydration_guidance.rationale}
                </p>
              )}
              {typeof dietPlanData.hydration_guidance === "object" && dietPlanData.hydration_guidance.clinical_caution && (
                <p className="text-[11px] text-rose-700 bg-rose-50 p-2 rounded-xl mt-2 border border-rose-200">
                  ⚠️ Clinical Caution: {dietPlanData.hydration_guidance.clinical_caution}
                </p>
              )}
            </div>
          )}

          {/* Medical Notice */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-500 text-center leading-relaxed">
            <span className="font-bold text-slate-700">Medical Notice: </span>
            {dietPlanData.clinical_disclaimer || "AI-generated nutrition recommendations are for educational and self-management support. Consult a physician or registered dietitian before making significant changes to your diet, especially if taking blood pressure or anticoagulant medications."}
          </div>

          {/* Bottom Navigation */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => setStage(4)}
              className="px-6 py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-2xl text-xs font-semibold shadow-xs cursor-pointer"
            >
              Back to AI Clinical Analysis
            </button>
            <button
              onClick={() => navigate("/patient/diet")}
              className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-teal-500/20 flex items-center gap-2 cursor-pointer"
            >
              <Utensils size={16} /> Open Full Diet Page
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientUpload;
