import React, { useState } from "react";
import axios from "axios";
import * as pdfjsLib from "pdfjs-dist/webpack";

const REQUIRED_ATTRIBUTES = [
  "Age","heart_disease","Married","BMI","Hypertension",
  "glucose_level","Sex","smoking_status",
  "systolic_bp","BP_Medications","diastolic_bp","sex",
  "diabetes","heart_rate","cigsPerDay","cholesterol","smokes",
  "oldpeak","cholesterol","max_hr","resting_bp","fasting_bs",
  "Chest_pain_type","Resting_ecg","Fasting_bs","St_slope",
  "Troponin","CK_MB","blood_sugar",
  "typical_angina","Region","RWMA","K","EF-TTE","hypertension",
  "FH","Tinversion","HDL","ESR","Lymph","HB","WBC","Weight",
  "CR","triglycerides","FBS","Na","LDL","PLT","BUN","Neut","Length"
];

const Prediction = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");
  const [missingFields, setMissingFields] = useState([]);
  const [manualInputs, setManualInputs] = useState({});
  const [parsedFeatures, setParsedFeatures] = useState({});

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const extractTextFromPDF = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let textContent = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const text = await page.getTextContent();
      text.items.forEach((item) => (textContent += item.str + " "));
    }
    return textContent;
  };

  const parsePDFtoJSON = async (file) => {
    const text = await extractTextFromPDF(file);
    const parsed = {};
    REQUIRED_ATTRIBUTES.forEach((feature) => {
      // Look for feature preceded by word boundary/whitespace and followed by colon or dash
      const regex = new RegExp(`(?:^|\\s)${feature}\\s*[:\\-]\\s*([A-Za-z0-9\\.]+)`, "i");
      const match = text.match(regex);
      if (match) {
        let value = match[1];
        if (!isNaN(value)) value = parseFloat(value);
        parsed[feature] = value;
      }
    });
    return parsed;
  };

  const handleInputChange = (e, field) => {
    setManualInputs({ ...manualInputs, [field]: e.target.value });
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a PDF report before uploading.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const extracted = await parsePDFtoJSON(file);
      setParsedFeatures(extracted);
      const missing = REQUIRED_ATTRIBUTES.filter(
        (attr) => !(attr in extracted) || extracted[attr] === "" || extracted[attr] === undefined
      );
      if (missing.length > 0) {
        setMissingFields(missing);
        setError("Some required fields are missing. Please enter them below.");
        setLoading(false);
        return;
      }
      await sendToBackend(extracted);
    } catch (err) {
      console.error(err);
      setError("Error processing the file.");
      setLoading(false);
    }
  };

  const handleManualSubmit = async () => {
    const finalData = { ...parsedFeatures, ...manualInputs };
    const stillMissing = REQUIRED_ATTRIBUTES.filter(
      (attr) => !(attr in finalData) || finalData[attr] === "" || finalData[attr] === undefined
    );
    if (stillMissing.length > 0) {
      alert(`Please fill all required fields: ${stillMissing.join(", ")}`);
      return;
    }
    await sendToBackend(finalData);
  };

  const sendToBackend = async (data) => {
    try {
      const response = await axios.post("http://127.0.0.1:8000/predict_all", {
        email: localStorage.getItem("email"),
        data,
      });
      setResults(response.data.predictions);
      setMissingFields([]);
      setError("");
    } catch (err) {
      console.error("❌ Backend Error:", err);
      setError("Failed to get prediction from backend.");
    } finally {
      setLoading(false);
    }
  };

  const getColor = (riskLevel) => {
    if (!riskLevel) return "#9E9E9E";
    switch (riskLevel.toLowerCase()) {
      case "low": return "#4CAF50";
      case "moderate": return "#FFC107";
      case "high": return "#F44336";
      default: return "#9E9E9E";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex flex-col items-center pt-24 px-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-2xl">
        <h2 className="text-2xl font-bold text-center mb-4 text-blue-600">
          Upload Report for Prediction
        </h2>

        {/* Sample Reports Helper */}
        <div className="mb-5 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl text-sm">
          <p className="font-semibold text-blue-900 mb-2">📋 Need a sample report to test the AI model?</p>
          <div className="flex flex-wrap gap-2">
            <a
              href="/sample_reports/sample_patient_report_elevated_risk.pdf"
              download="sample_patient_report_elevated_risk.pdf"
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg shadow-sm transition"
            >
              ⬇️ Sample Elevated Risk Report (PDF)
            </a>
            <a
              href="/sample_reports/sample_patient_report_healthy.pdf"
              download="sample_patient_report_healthy.pdf"
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg shadow-sm transition"
            >
              ⬇️ Sample Healthy Report (PDF)
            </a>
          </div>
        </div>

        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="mb-4 block w-full border rounded-lg p-2"
        />

        <button
          onClick={handleUpload}
          disabled={loading}
          className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          {loading ? "Processing..." : "Upload & Predict"}
        </button>

        {error && <p className="text-red-500 text-center mt-4">{error}</p>}
      </div>

      {missingFields.length > 0 && (
        <div className="mt-6 bg-white p-6 rounded-xl shadow-lg w-full max-w-2xl">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">
            Please provide missing fields:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {missingFields.map((field) => (
              <div key={field}>
                <label className="block text-sm font-medium text-gray-600">
                  {field}
                </label>
                <input
                  type="text"
                  onChange={(e) => handleInputChange(e, field)}
                  className="mt-1 block w-full rounded-lg border px-3 py-2 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            ))}
          </div>
          <button
            onClick={handleManualSubmit}
            className="mt-4 w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
          >
            Submit Missing Fields
          </button>
        </div>
      )}

      {results && (
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
          {Object.entries(results).map(([disease, output]) => (
            <div
              key={disease}
              className="bg-white p-6 rounded-xl shadow-md border-l-8"
              style={{ borderLeftColor: getColor(output.risk) }}
            >
              <h3 className="text-lg font-semibold text-gray-700">{disease}</h3>
              {output.error ? (
                <p className="text-red-500">Error: {output.error}</p>
              ) : (
                <p className="text-gray-900 font-bold">
                  Risk:{" "}
                  <span style={{ color: getColor(output.risk) }}>
                    {output.risk}
                  </span>{" "}
                  <br />
                  Score: {Number(output.score).toFixed(2)}%
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Prediction;
