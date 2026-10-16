// src/components/PatientFeedbackModule.jsx
import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Send,
  Star,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  User,
  Shield,
  MessageCircle,
  X
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";

export const PatientFeedbackModule = () => {
  const { token, user } = useAuth();
  const { showToast } = useNotification();

  const [feedbackList, setFeedbackList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Form state
  const [category, setCategory] = useState("General Feedback");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState(5);

  // Active modal thread
  const [activeTicket, setActiveTicket] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [replyLoading, setReplyLoading] = useState(false);

  useEffect(() => {
    fetchFeedback();
  }, [token]);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://127.0.0.1:8000/api/patient/feedback", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setFeedbackList(json.feedback || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();

    if (!cleanSubject || !cleanMessage) {
      setErrorMsg("Please provide both a subject and your message.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/api/patient/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          category,
          subject: cleanSubject,
          message: cleanMessage,
          rating
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || "Failed to submit feedback.");
        return;
      }

      setSuccessMsg(`Your feedback has been logged in the database (#${data.feedback_id}). The administrator has been notified.`);
      setSubject("");
      setMessage("");
      setRating(5);
      showToast("Feedback submitted successfully!", "success");
      fetchFeedback();
    } catch (err) {
      setErrorMsg("Connection error while submitting feedback.");
    } finally {
      setSubmitting(false);
    }
  };

  const openThread = async (ticket) => {
    setActiveTicket(ticket);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/patient/feedback/${ticket.feedback_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setThreadMessages(json.messages || []);
      }
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  };

  const handleSendReply = async () => {
    if (!replyText.trim() || !activeTicket) return;
    setReplyLoading(true);

    try {
      const res = await fetch(`http://127.0.0.1:8000/api/patient/feedback/${activeTicket.feedback_id}/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ message: replyText.trim() })
      });

      if (res.ok) {
        setReplyText("");
        openThread(activeTicket);
        fetchFeedback();
        showToast("Reply sent to administrator.", "success");
      }
    } catch (err) {
      showToast("Failed to send reply.", "error");
    } finally {
      setReplyLoading(false);
    }
  };

  const getStatusBadge = (st) => {
    switch (st?.toLowerCase()) {
      case "responded":
        return "bg-emerald-50 text-emerald-800 border-emerald-200 font-bold";
      case "in review":
        return "bg-blue-50 text-blue-800 border-blue-200 font-bold";
      case "closed":
        return "bg-slate-100 text-slate-700 border-slate-200 font-medium";
      default:
        return "bg-amber-50 text-amber-800 border-amber-200 font-bold";
    }
  };

  return (
    <div id="patient-feedback" className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              Direct Communication
            </span>
            <span className="text-xs text-slate-400">• Database Connected</span>
          </div>
          <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1 flex items-center gap-2">
            <MessageSquare size={20} className="text-blue-600" /> Feedback & Administrator Support
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Submit questions regarding your predictions, report issues, or provide platform suggestions directly to the platform administrator.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Submission Form */}
        <div className="lg:col-span-5 bg-slate-50/70 p-5 sm:p-6 rounded-2xl border border-slate-200 space-y-4">
          <h4 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <Send size={15} className="text-blue-600" /> New Support Inquiry / Feedback
          </h4>

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Inquiry Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="General Feedback">General Feedback</option>
                <option value="Report Issue">Medical Report Issue</option>
                <option value="Prediction Inquiry">Prediction Assessment Inquiry</option>
                <option value="System Bug">System Bug / Technical Glitch</option>
                <option value="Doctor Suggestion">Doctor Recommendation Request</option>
                <option value="Diet & Nutrition">Food & Nutrition Feedback</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Subject *</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief summary of your question or issue"
                required
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Message *</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Provide detailed information for the administrator..."
                required
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
            </div>

            {/* Optional Star Rating */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Experience Rating (Optional)</label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(s)}
                    className="p-1 hover:scale-110 transition"
                  >
                    <Star
                      size={18}
                      className={s <= rating ? "text-amber-400 fill-amber-400" : "text-slate-300"}
                    />
                  </button>
                ))}
                <span className="text-[11px] text-slate-500 font-medium ml-1">({rating} / 5 stars)</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center justify-center gap-2"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Send size={14} /> Submit Feedback to Administrator
                </>
              )}
            </button>
          </form>
        </div>

        {/* Existing Feedback History */}
        <div className="lg:col-span-7 space-y-3">
          <h4 className="font-bold text-sm text-slate-800 flex items-center justify-between">
            <span>Your Submitted Inquiries ({feedbackList.length})</span>
            <span className="text-xs font-normal text-slate-400">Click ticket to view replies</span>
          </h4>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading your feedback tickets...</div>
          ) : feedbackList.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200/80">
              <MessageCircle size={32} className="text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-600">No support tickets submitted yet.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Use the form on the left to send inquiries directly to the platform administrator.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {feedbackList.map((item) => (
                <div
                  key={item.feedback_id}
                  onClick={() => openThread(item)}
                  className="p-4 rounded-2xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-xs transition cursor-pointer flex flex-col justify-between gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-slate-400">{item.feedback_id}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                          {item.category}
                        </span>
                      </div>
                      <h5 className="font-bold text-sm text-slate-800 mt-1">{item.subject}</h5>
                      <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{item.message}</p>
                    </div>

                    <span className={`text-[11px] px-2.5 py-1 rounded-full border shrink-0 ${getStatusBadge(item.status)}`}>
                      {item.status}
                    </span>
                  </div>

                  {item.admin_response && (
                    <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 mt-1 flex items-start gap-2">
                      <Shield size={14} className="text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Admin Response:</span> {item.admin_response}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                    <span className="flex items-center gap-1">
                      <Clock size={11} /> {item.created_at}
                    </span>
                    <span className="font-semibold text-blue-600 flex items-center gap-0.5 hover:underline">
                      View Conversation ({item.total_messages}) <ChevronRight size={12} />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Message Thread Modal */}
      {activeTicket && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-blue-600">{activeTicket.feedback_id}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getStatusBadge(activeTicket.status)}`}>
                    {activeTicket.status}
                  </span>
                </div>
                <h4 className="font-bold text-base text-slate-900 mt-1">{activeTicket.subject}</h4>
              </div>
              <button
                onClick={() => setActiveTicket(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Conversation Messages */}
            <div className="p-5 space-y-3 overflow-y-auto flex-1 bg-slate-50/50">
              {threadMessages.map((msg) => {
                const isAdmin = msg.sender_role === "admin";
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isAdmin ? "items-start" : "items-end"}`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5 text-[10px] font-semibold text-slate-400">
                      <span>{isAdmin ? "CardioPredict Administrator" : "You (Patient)"}</span>
                      <span>•</span>
                      <span>{msg.created_at}</span>
                    </div>
                    <div
                      className={`p-3.5 rounded-2xl max-w-[85%] text-xs leading-relaxed shadow-xs ${
                        isAdmin
                          ? "bg-white border border-slate-200 text-slate-800 rounded-tl-xs"
                          : "bg-blue-600 text-white rounded-tr-xs"
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply Input */}
            <div className="p-4 border-t border-slate-100 bg-white space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type a reply to the administrator..."
                  onKeyDown={(e) => e.key === "Enter" && handleSendReply()}
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button
                  onClick={handleSendReply}
                  disabled={replyLoading || !replyText.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send size={13} /> Reply
                </button>
              </div>
              <p className="text-[10px] text-slate-400 text-center">
                Replies are delivered immediately to the administrator inbox and set status to 'In Review'.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientFeedbackModule;
