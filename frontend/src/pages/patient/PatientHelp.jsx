// src/pages/patient/PatientHelp.jsx
import React, { useState } from "react";
import {
  HelpCircle,
  AlertOctagon,
  FileText,
  Activity,
  Utensils,
  Bot,
  ChevronDown,
  ChevronUp,
  Heart,
  ShieldCheck,
  PhoneCall,
  CheckCircle2,
  Info
} from "lucide-react";
import PatientFeedbackModule from "../../components/PatientFeedbackModule";
import BackButton from "../../components/BackButton";

const PatientHelp = () => {
  const [openFaq, setOpenFaq] = useState(null);

  const toggleFaq = (index) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const faqs = [
    {
      q: "How does CardioPredict analyze my medical report?",
      a: "When you upload a lab report PDF, our secure server reads the text or scans the document using OCR (Optical Character Recognition). It finds measurements like your blood pressure, cholesterol, and blood sugar, and lets you verify them on screen before running our 5 trained machine learning models."
    },
    {
      q: "What if the scanner misreads a number on my report?",
      a: "You are always in full control! After reading the PDF, the system displays every detected value in an easy form. You can review, correct, or fill in any missing numbers before clicking 'Confirm & Run Prediction'."
    },
    {
      q: "Are the predictions a medical diagnosis?",
      a: "No. CardioPredict is an educational and risk-assessment tool powered by machine learning. It provides risk estimations and evidence-based nutrition tips, but it does not replace the diagnosis, advice, or treatment of a qualified healthcare provider."
    },
    {
      q: "Where do the food recommendations come from?",
      a: "All food recommendations are derived from verified clinical guidelines published by the American Heart Association (AHA), World Health Organization (WHO), and the Indian Council of Medical Research (ICMR-NIN). We do not invent nutritional numbers or promote commercial products."
    },
    {
      q: "How is my private medical data kept safe?",
      a: "All passwords are cryptographically hashed using PBKDF2/SHA-256 with unique salts. Uploaded reports and predictions are strictly accessible only by your authenticated account and authorized system administrators for audit purposes. We never sell your personal information."
    },
    {
      q: "Can I use the AI Health Assistant on my phone?",
      a: "Yes! The AI Health Assistant is available at the bottom-right of your screen on mobile phones, tablets, and desktop computers. You can ask questions about your numbers, suggested foods, or terms in plain language anytime."
    }
  ];

  const glossary = [
    {
      term: "Systolic Blood Pressure",
      simple: "The top number in your BP reading (e.g., 120 in 120/80). It measures the pressure in your arteries when your heart beats."
    },
    {
      term: "Diastolic Blood Pressure",
      simple: "The bottom number in your BP reading (e.g., 80 in 120/80). It measures the pressure in your arteries when your heart rests between beats."
    },
    {
      term: "Total Cholesterol",
      simple: "The total amount of cholesterol in your bloodstream, including HDL ('good') and LDL ('bad') cholesterol."
    },
    {
      term: "LDL Cholesterol ('Bad')",
      simple: "Cholesterol that can slowly build up along artery walls, forming plaques that narrow your vessels."
    },
    {
      term: "HDL Cholesterol ('Good')",
      simple: "Cholesterol that helps carry excess cholesterol away from your arteries back to your liver."
    },
    {
      term: "Fasting Blood Glucose",
      simple: "The amount of sugar in your blood after not eating for at least 8 hours. Healthy levels are typically below 100 mg/dL."
    },
    {
      term: "Body Mass Index (BMI)",
      simple: "A measure of your weight in relation to your height that helps assess overall body composition."
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-5xl mx-auto">
      <BackButton fallbackUrl="/patient/dashboard" label="Back to Dashboard" className="mb-2" />
      {/* Page Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
          <HelpCircle size={28} className="text-blue-600" /> Patient Help & Plain-Language Guide
        </h2>
        <p className="text-slate-500 text-sm mt-1">
          Simple instructions, medical definitions, and urgent care protocols written for everyone.
        </p>
      </div>

      {/* Emergency Warning Box */}
      <div className="p-6 bg-gradient-to-r from-rose-600 to-rose-700 rounded-3xl text-white shadow-xl">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white/20 rounded-2xl shrink-0 backdrop-blur-xs">
            <AlertOctagon size={28} className="text-white" />
          </div>
          <div className="space-y-2">
            <h3 className="font-extrabold text-lg flex items-center gap-2">
              🚨 Emergency Warning Signs — When to Seek Immediate Hospital Care
            </h3>
            <p className="text-xs sm:text-sm text-rose-100 leading-relaxed">
              If you or someone around you experiences any of the following symptoms, <strong>do not wait for website predictions</strong>. Call emergency medical services immediately:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
              <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-xl">
                <span>• Chest pain, pressure, heaviness, or squeezing</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-xl">
                <span>• Pain spreading to jaw, neck, back, or left arm</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-xl">
                <span>• Sudden shortness of breath or cold sweats</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 px-3 py-2 rounded-xl">
                <span>• Sudden weakness, face drooping, or slurred speech</span>
              </div>
            </div>
            <div className="pt-2 flex items-center gap-3 text-xs font-bold text-white">
              <span className="flex items-center gap-1.5 bg-white text-rose-700 px-3 py-1.5 rounded-xl shadow-xs">
                <PhoneCall size={14} /> National Emergency Numbers: 112 (India / EU) / 108 (India Ambulance) / 911 (US)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Step by step guide */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm">
        <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center gap-2">
          <CheckCircle2 size={20} className="text-teal-600" /> How to Use CardioPredict in 3 Easy Steps
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-100">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white font-extrabold flex items-center justify-center text-sm mb-3 shadow">
              1
            </div>
            <h4 className="font-bold text-sm text-slate-800 mb-1 flex items-center gap-1.5">
              <FileText size={16} className="text-blue-600" /> Upload Your PDF
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Navigate to "Upload Report" and select your digital or scanned medical lab report. Our OCR system automatically scans for key biomarker measurements.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-teal-50/50 border border-teal-100">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white font-extrabold flex items-center justify-center text-sm mb-3 shadow">
              2
            </div>
            <h4 className="font-bold text-sm text-slate-800 mb-1 flex items-center gap-1.5">
              <Activity size={16} className="text-teal-600" /> Confirm Your Numbers
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Review the extracted values on screen. You can adjust any number or add additional metrics before confirming and running the prediction models.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-extrabold flex items-center justify-center text-sm mb-3 shadow">
              3
            </div>
            <h4 className="font-bold text-sm text-slate-800 mb-1 flex items-center gap-1.5">
              <Utensils size={16} className="text-indigo-600" /> Review Risk & Diet
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              View your personalized risk assessments for CAD, Heart Failure, Heart Attack, Stroke, and Hypertension, along with verified food recommendations.
            </p>
          </div>
        </div>
      </div>

      {/* Medical Glossary in Plain English */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm">
        <h3 className="font-bold text-lg text-slate-800 mb-2 flex items-center gap-2">
          <Info size={20} className="text-blue-600" /> Common Lab Terms in Plain English
        </h3>
        <p className="text-xs text-slate-500 mb-6">
          Understanding the numbers on your laboratory report without confusing medical jargon.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {glossary.map((item, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
              <h4 className="font-bold text-xs text-slate-800 mb-1">{item.term}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">{item.simple}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Direct Feedback & Administrator Support System */}
      <PatientFeedbackModule />

      {/* FAQ Accordion */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8 shadow-sm">
        <h3 className="font-bold text-lg text-slate-800 mb-2 flex items-center gap-2">
          <HelpCircle size={20} className="text-teal-600" /> Frequently Asked Questions
        </h3>
        <p className="text-xs text-slate-500 mb-6">
          Quick answers to common questions about using CardioPredict.
        </p>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="border border-slate-100 rounded-2xl overflow-hidden transition"
            >
              <button
                type="button"
                onClick={() => toggleFaq(index)}
                className="w-full text-left p-4 bg-slate-50/70 hover:bg-slate-100/70 flex items-center justify-between gap-4 text-xs font-bold text-slate-800 transition"
              >
                <span>{faq.q}</span>
                {openFaq === index ? (
                  <ChevronUp size={16} className="text-slate-400 shrink-0" />
                ) : (
                  <ChevronDown size={16} className="text-slate-400 shrink-0" />
                )}
              </button>
              {openFaq === index && (
                <div className="p-4 text-xs text-slate-600 leading-relaxed bg-white border-t border-slate-100">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PatientHelp;
