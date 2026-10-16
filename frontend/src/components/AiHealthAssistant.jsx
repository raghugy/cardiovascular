// src/components/AiHealthAssistant.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  X,
  Send,
  HeartPulse,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  BookOpen,
  ChevronDown,
  Info
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const AiHealthAssistant = () => {
  const { user, token, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      sender: "assistant",
      text: "Hello! I am your **CardioPredict Health Assistant**.\n\nI can explain your assessment results, explain lab measurements (like Troponin, Blood Pressure, Cholesterol, or EF-TTE), guide you on heart-healthy eating, and suggest questions to ask your doctor.\n\nHow can I help you today?",
      category: "greeting",
      sources: ["World Health Organization", "American Heart Association"]
    }
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([
    "Explain my latest risk score",
    "What does high blood pressure mean?",
    "What questions should I ask my cardiologist?",
    "Why is Moong Dal recommended for heart health?",
    "How does the DASH diet help?"
  ]);

  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Fetch dynamic suggestions when opened
  useEffect(() => {
    if (isOpen && isAuthenticated && token) {
      fetch("http://127.0.0.1:8000/api/patient/assistant/suggestions", {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.suggestions && data.suggestions.length > 0) {
            setSuggestions(data.suggestions);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, isAuthenticated, token]);

  const handleSendMessage = async (textToSend) => {
    const query = (textToSend || inputText).trim();
    if (!query || loading) return;

    // Add user message to chat
    const userMsg = {
      id: `user-${Date.now()}`,
      sender: "user",
      text: query
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/patient/assistant/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          message: query,
          use_personal_context: true
        })
      });

      if (!res.ok) {
        throw new Error("Assistant response failed");
      }

      const data = await res.json();
      const botMsg = {
        id: `bot-${Date.now()}`,
        sender: "assistant",
        text: data.reply,
        isEmergency: data.is_emergency,
        category: data.category,
        sources: data.sources || ["Verified Clinical Practice Guidelines"]
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-err-${Date.now()}`,
          sender: "assistant",
          text: "I am having trouble connecting to the verified knowledge service right now. Please verify your connection or try asking a simpler question regarding common cardiovascular terms (e.g., 'What is Troponin?').",
          category: "error"
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isAuthenticated) return null;

  return (
    <>
      {/* Floating Action Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-blue-600 via-teal-600 to-indigo-600 text-white rounded-full shadow-2xl hover:shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all duration-300 group border border-white/20"
          aria-label="Open CardioPredict Health Assistant"
        >
          <div className="relative">
            <HeartPulse size={20} className="animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-white" />
          </div>
          <span className="text-xs sm:text-sm font-bold tracking-tight">
            Health Assistant
          </span>
          <Sparkles size={15} className="text-amber-300 animate-spin-slow opacity-80" />
        </button>
      )}

      {/* Slide-Up Chat Window */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] h-[580px] max-h-[85vh] bg-white rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-teal-900 text-white p-4 flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300">
                <HeartPulse size={20} className="animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold flex items-center gap-1.5 text-white">
                  CardioPredict Assistant
                  <span className="text-[10px] bg-teal-500/30 text-teal-200 px-2 py-0.5 rounded-full border border-teal-400/30">
                    AI Verified
                  </span>
                </h3>
                <p className="text-[11px] text-slate-300 flex items-center gap-1">
                  <ShieldCheck size={12} className="text-teal-400" /> Evidence-based educational guidance
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-300 hover:text-white transition"
              aria-label="Close assistant"
            >
              <X size={18} />
            </button>
          </div>

          {/* Quick Context Banner */}
          <div className="bg-blue-50/70 border-b border-blue-100 px-3.5 py-1.5 flex items-center gap-2 text-[11px] text-blue-900">
            <Info size={13} className="shrink-0 text-blue-600" />
            <span className="truncate">
              Personalized with your confirmed lab values and dietary preferences.
            </span>
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/60">
            {messages.map((m) => {
              const isUser = m.sender === "user";
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl p-3.5 text-xs sm:text-[13px] leading-relaxed shadow-sm ${
                      isUser
                        ? "bg-blue-600 text-white rounded-br-none"
                        : m.isEmergency
                        ? "bg-rose-50 border-2 border-rose-300 text-rose-950 rounded-bl-none font-medium"
                        : "bg-white border border-slate-200/80 text-slate-800 rounded-bl-none"
                    }`}
                  >
                    {/* Render message with basic markdown-like formatting */}
                    <div className="whitespace-pre-wrap space-y-1">
                      {m.text.split("\n").map((line, idx) => {
                        if (line.startsWith("• ") || line.startsWith("- ")) {
                          return (
                            <div key={idx} className="flex items-start gap-1.5 pl-1 my-0.5">
                              <span className="text-teal-600 font-bold">•</span>
                              <span>{line.replace(/^[•\-]\s*/, "")}</span>
                            </div>
                          );
                        }
                        if (line.startsWith("**") && line.endsWith("**")) {
                          return (
                            <p key={idx} className="font-bold text-slate-900 mt-1">
                              {line.replace(/\*\*/g, "")}
                            </p>
                          );
                        }
                        return <p key={idx}>{line}</p>;
                      })}
                    </div>

                    {/* Sources Badge */}
                    {!isUser && m.sources && m.sources.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[10px] text-slate-400">
                        <BookOpen size={11} className="text-teal-600 shrink-0" />
                        <span className="truncate">Source: {m.sources.join(", ")}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 p-3 bg-white rounded-2xl border border-slate-200 text-xs text-slate-500 max-w-[70%]">
                <HeartPulse size={16} className="text-teal-600 animate-spin" />
                <span>Reviewing clinical references...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Question Suggestions Pills */}
          <div className="px-3 py-2 bg-white border-t border-slate-100 overflow-x-auto flex gap-1.5 shrink-0 no-scrollbar">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(s)}
                className="shrink-0 text-[11px] font-medium bg-slate-100 hover:bg-teal-50 hover:text-teal-800 hover:border-teal-200 text-slate-600 px-3 py-1.5 rounded-full border border-slate-200/80 transition-all text-left"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about lab values, diet, or predictions..."
              className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-800 placeholder-slate-400"
              disabled={loading}
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || loading}
              className="w-9 h-9 rounded-xl bg-gradient-to-r from-blue-600 to-teal-600 text-white flex items-center justify-center hover:opacity-95 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-md shadow-blue-500/20"
              aria-label="Send query"
            >
              <Send size={15} />
            </button>
          </div>

          {/* Bottom Clinical Disclaimer */}
          <div className="bg-slate-50 px-3 py-1.5 text-center text-[10px] text-slate-400 border-t border-slate-100">
            Educational tool only • Does not substitute professional medical diagnosis
          </div>
        </div>
      )}
    </>
  );
};

export default AiHealthAssistant;
