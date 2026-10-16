// src/components/BackButton.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const BackButton = ({ to, label = "Back", fallback, className = "" }) => {
  const navigate = useNavigate();
  const { role } = useAuth();

  const defaultFallback = role === "admin" ? "/admin/dashboard" : "/patient/dashboard";
  const targetFallback = fallback || defaultFallback;

  const handleBack = () => {
    if (to) {
      navigate(to);
    } else if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate(targetFallback);
    }
  };

  return (
    <div className={`mb-4 ${className}`}>
      <button
        onClick={handleBack}
        type="button"
        className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-200/90 rounded-xl hover:bg-slate-50 hover:text-slate-900 shadow-xs transition group focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        aria-label={label}
      >
        <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-1 text-slate-500" />
        <span>{label}</span>
      </button>
    </div>
  );
};

export default BackButton;
