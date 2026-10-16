// src/pages/admin/AdminFeedback.jsx
import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Search,
  Filter,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
  Star,
  RefreshCw,
  X,
  MessageCircle,
  ShieldCheck
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import BackButton from "../../components/BackButton";

const AdminFeedback = () => {
  const { token } = useAuth();
  const { showToast } = useNotification();

  const [feedbackList, setFeedbackList] = useState([]);
  const [counts, setCounts] = useState({ total: 0, pending: 0, responded: 0, closed: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal inspection & response
  const [activeTicket, setActiveTicket] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [replyText, setReplyText] = useState("");
  const [newStatus, setNewStatus] = useState("Responded");
  const [submittingReply, setSubmittingReply] = useState(false);

  useEffect(() => {
    fetchFeedback();
  }, [statusFilter]);

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      let url = `http://127.0.0.1:8000/api/admin/feedback?status=${statusFilter}`;
      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setFeedbackList(json.feedback || []);
        setCounts(json.counts || { total: 0, pending: 0, responded: 0, closed: 0 });
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to load feedback tickets", "error");
    } finally {
      setLoading(false);
    }
  };

  const openTicketDetail = async (ticket) => {
    setActiveTicket(ticket);
    setNewStatus(ticket.status === "Closed" ? "Closed" : "Responded");
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/admin/feedback/${ticket.feedback_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setThreadMessages(json.messages || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendResponse = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !activeTicket) return;

    setSubmittingReply(true);
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/admin/feedback/${activeTicket.feedback_id}/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          response: replyText.trim(),
          status: newStatus
        })
      });

      if (res.ok) {
        showToast("Response delivered to patient successfully", "success");
        setReplyText("");
        openTicketDetail({ ...activeTicket, status: newStatus });
        fetchFeedback();
      } else {
        showToast("Failed to deliver response", "error");
      }
    } catch (err) {
      showToast("Connection error while sending response", "error");
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleStatusChange = async (ticketId, nextStatus) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/admin/feedback/${ticketId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        showToast(`Ticket status updated to ${nextStatus}`, "success");
        fetchFeedback();
        if (activeTicket && activeTicket.feedback_id === ticketId) {
          setActiveTicket({ ...activeTicket, status: nextStatus });
        }
      }
    } catch (err) {
      showToast("Failed to update status", "error");
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
    <div className="space-y-8 animate-in fade-in duration-300">
      <BackButton fallbackUrl="/admin/dashboard" label="Back to Dashboard" className="mb-2" />
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-600 text-xs font-bold uppercase tracking-wider mb-1">
            <MessageSquare size={16} /> Patient Inquiries & Feedback Inbox
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Patient Support & Feedback
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Real feedback tickets submitted by registered patients. Respond directly, provide clinical guidance, and update ticket statuses.
          </p>
        </div>

        <button
          onClick={fetchFeedback}
          className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 self-start md:self-auto"
        >
          <RefreshCw size={15} /> Refresh Inbox
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        {/* Status Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: "all", label: "All Tickets", count: counts.total },
            { key: "pending", label: "Pending Review", count: counts.pending },
            { key: "responded", label: "Responded", count: counts.responded },
            { key: "closed", label: "Closed", count: counts.closed }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                statusFilter === tab.key
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                statusFilter === tab.key ? "bg-slate-700 text-white" : "bg-slate-200 text-slate-700"
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[280px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchFeedback()}
            placeholder="Search patient, subject, or message..."
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Tickets List */}
      {loading ? (
        <div className="flex items-center justify-center p-12 bg-white rounded-3xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : feedbackList.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
          <MessageCircle size={36} className="text-slate-300 mx-auto mb-2" />
          <h3 className="font-bold text-sm text-slate-700">No Feedback Tickets Matching Filter</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            When patients submit inquiries regarding predictions, reports, or diet, they will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {feedbackList.map((ticket) => (
            <div
              key={ticket.feedback_id}
              onClick={() => openTicketDetail(ticket)}
              className="p-5 bg-white rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-xs transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1 flex-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-mono font-bold text-slate-400">{ticket.feedback_id}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                    {ticket.category}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getStatusBadge(ticket.status)}`}>
                    {ticket.status}
                  </span>
                  {ticket.rating && (
                    <span className="text-xs font-bold text-amber-500 flex items-center gap-0.5">
                      <Star size={12} className="fill-amber-400 text-amber-400" /> {ticket.rating}
                    </span>
                  )}
                </div>

                <h4 className="font-bold text-sm text-slate-900 mt-1">{ticket.subject}</h4>
                <p className="text-xs text-slate-600 line-clamp-1">{ticket.message}</p>

                <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                  <span className="font-semibold text-slate-700 flex items-center gap-1">
                    <User size={12} /> {ticket.patient_name || ticket.patient_email}
                  </span>
                  <span>•</span>
                  <span>{ticket.patient_email}</span>
                  <span>•</span>
                  <span>{ticket.created_at}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openTicketDetail(ticket);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  <Send size={13} /> Open & Reply ({ticket.total_messages})
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ticket Details & Response Modal */}
      {activeTicket && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono font-bold text-blue-600">{activeTicket.feedback_id}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getStatusBadge(activeTicket.status)}`}>
                    {activeTicket.status}
                  </span>
                  <span className="text-xs text-slate-400">• {activeTicket.category}</span>
                </div>
                <h3 className="font-bold text-lg text-slate-900">{activeTicket.subject}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Patient: <strong className="text-slate-800">{activeTicket.patient_name}</strong> ({activeTicket.patient_email})
                </p>
              </div>

              <button
                onClick={() => setActiveTicket(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Conversation Messages */}
            <div className="p-6 space-y-3.5 overflow-y-auto flex-1 bg-slate-50/50">
              {threadMessages.map((msg) => {
                const isAdmin = msg.sender_role === "admin";
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isAdmin ? "items-end" : "items-start"}`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-[10px] font-semibold text-slate-400">
                      <span>{isAdmin ? "You (Administrator)" : activeTicket.patient_name || "Patient"}</span>
                      <span>•</span>
                      <span>{msg.created_at}</span>
                    </div>
                    <div
                      className={`p-4 rounded-2xl max-w-[85%] text-xs leading-relaxed shadow-xs ${
                        isAdmin
                          ? "bg-slate-900 text-white rounded-tr-xs"
                          : "bg-white border border-slate-200 text-slate-800 rounded-tl-xs"
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Administrator Reply Form */}
            <form onSubmit={handleSendResponse} className="p-5 border-t border-slate-100 bg-white space-y-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-700">Write Administrator Reply:</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Set Status:</span>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 font-semibold bg-slate-50 outline-none"
                  >
                    <option value="Responded">Responded</option>
                    <option value="In Review">In Review</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>

              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={3}
                placeholder="Type your response to the patient. They will receive an in-app notification immediately..."
                required
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />

              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2">
                  {activeTicket.status !== "Closed" && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(activeTicket.feedback_id, "Closed")}
                      className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-semibold transition"
                    >
                      Close Ticket
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submittingReply || !replyText.trim()}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submittingReply ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send size={13} /> Deliver Reply to Patient
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFeedback;
