// src/components/DoctorAssignmentCard.jsx
import React, { useState, useEffect } from "react";
import {
  Stethoscope,
  UserCheck,
  Clock,
  CheckCircle,
  AlertCircle,
  Shield,
  Hospital,
  Sparkles,
  Info
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const DoctorAssignmentCard = () => {
  const { token } = useAuth();
  const [assignmentData, setAssignmentData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAssignment();
  }, [token]);

  const fetchAssignment = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://127.0.0.1:8000/api/patient/doctor-assignment", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setAssignmentData(json.assignment);
      }
    } catch (err) {
      console.error("Failed to load doctor assignment:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm flex items-center justify-center gap-3">
        <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-500 font-medium">Checking specialist assignment status...</span>
      </div>
    );
  }

  if (!assignmentData) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-slate-100 text-slate-500 rounded-2xl shrink-0">
            <Stethoscope size={24} />
          </div>
          <div>
            <h4 className="font-bold text-sm text-slate-800">No Specialist Suggestions on File</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-lg leading-relaxed">
              Once you complete a PDF medical report upload or biomarker evaluation, the system will identify relevant doctor specialties and submit an assignment recommendation for administrator review.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isAssigned = assignmentData.status === "Assigned";
  const isPending = assignmentData.status === "Pending Review";
  const isUnassigned = assignmentData.status === "Unassigned";

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-7 space-y-5">
      {/* Header and Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0 border border-teal-100 shadow-xs">
            <Stethoscope size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                Clinical Decision Support
              </span>
              <span className="text-xs text-slate-400">• Specialty Mapping</span>
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 mt-0.5">
              Suggested Doctor & Specialist Assignment
            </h3>
          </div>
        </div>

        {/* Status Badge */}
        <div>
          {isPending && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
              <Clock size={13} className="text-amber-600 animate-pulse" /> Pending Administrator Triage
            </span>
          )}
          {isAssigned && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <CheckCircle size={13} className="text-emerald-600" /> Specialist Assigned
            </span>
          )}
          {isUnassigned && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
              <Info size={13} className="text-slate-500" /> Routine Monitoring Advised
            </span>
          )}
        </div>
      </div>

      {/* Specialty recommendation & rationale */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-slate-400 block font-semibold text-[10px] uppercase">Flagged Risk Profile:</span>
            <span className="font-bold text-slate-800 text-sm">
              {assignmentData.primary_condition} ({assignmentData.risk_level} Risk • {assignmentData.risk_score?.toFixed(1)}%)
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-semibold text-[10px] uppercase">Recommended Specialty:</span>
            <span className="font-extrabold text-teal-700 text-sm bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200 inline-block">
              {assignmentData.suggested_specialty}
            </span>
          </div>
        </div>

        <div>
          <span className="text-slate-400 block font-semibold text-[10px] uppercase mt-2">Clinical Rationale:</span>
          <p className="text-slate-700 leading-relaxed mt-0.5">
            {assignmentData.clinical_rationale}
          </p>
        </div>
      </div>

      {/* Assigned Doctor Card (if assigned) OR Suggested Demo Doctor */}
      {isAssigned && assignmentData.assigned_doctor_name ? (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-white border border-emerald-200">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
                Confirmed Doctor Assignment
              </span>
              <h4 className="font-extrabold text-slate-900 text-base">
                {assignmentData.assigned_doctor_name}
              </h4>
              <p className="text-xs text-slate-600 font-medium">
                {assignmentData.assigned_doctor_spec} • {assignmentData.assigned_doctor_qual} ({assignmentData.assigned_doctor_exp} yrs experience)
              </p>
            </div>
            {assignmentData.assigned_doctor_is_demo === 1 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold border border-slate-300">
                Demo Profile
              </span>
            )}
          </div>

          {assignmentData.admin_notes && (
            <div className="mt-2.5 pt-2.5 border-t border-emerald-200/70 text-xs">
              <span className="font-bold text-slate-700">Administrator Review Notes:</span>
              <p className="text-slate-600 mt-0.5 italic">"{assignmentData.admin_notes}"</p>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-white border border-slate-200">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Suggested Specialist Candidate
              </span>
              <h4 className="font-bold text-slate-800 text-sm mt-0.5">
                {assignmentData.suggested_doctor_name || "Specialist Matching in Progress"}
              </h4>
              <p className="text-xs text-slate-500">
                {assignmentData.suggested_doctor_spec} • {assignmentData.suggested_doctor_qual}
              </p>
            </div>
            {assignmentData.suggested_doctor_is_demo === 1 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                Demonstration Profile
              </span>
            )}
          </div>
          <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200 mt-3 leading-relaxed">
            The administrator reviews all algorithm suggestions and confirms or adjusts assignments based on clinical capacity and hospital protocol.
          </p>
        </div>
      )}

      {/* Legal & Educational Disclaimer */}
      <div className="text-[11px] text-slate-500 flex items-start gap-2 pt-1 border-t border-slate-100 leading-relaxed">
        <Shield size={14} className="text-slate-400 shrink-0 mt-0.5" />
        <span>
          <strong>Assistive Referral Notice:</strong> CardioPredict deep learning predictions provide mathematical risk scores for triage and education. They are not authoritative clinical diagnoses or direct patient referrals.
        </span>
      </div>
    </div>
  );
};

export default DoctorAssignmentCard;
