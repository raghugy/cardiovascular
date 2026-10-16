// src/pages/patient/PatientWellness.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  Wind,
  HeartPulse,
  Activity,
  CheckCircle,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Search,
  Filter,
  ShieldAlert,
  Calendar,
  Smile,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Bell,
  BellOff,
  UserCheck,
  AlertTriangle,
  Info
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import BackButton from "../../components/BackButton";

const PatientWellness = () => {
  const { token } = useAuth();
  const { showToast } = useNotification();

  // Active View Tab
  const [activeTab, setActiveTab] = useState("yoga"); // 'yoga', 'breathing', 'daily', 'journal'

  // Yoga Library State
  const [yogaExercises, setYogaExercises] = useState([]);
  const [yogaLoading, setYogaLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [durationFilter, setDurationFilter] = useState("all");
  const [expandedExerciseId, setExpandedExerciseId] = useState(null);

  // Daily Routine State
  const [dailyData, setDailyData] = useState(null);
  const [dailyLoading, setDailyLoading] = useState(true);
  const [loggingActivity, setLoggingActivity] = useState(false);

  // Weekly Summary State
  const [weeklySummary, setWeeklySummary] = useState(null);

  // Guided Breathing Interactive State
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathingPaused, setBreathingPaused] = useState(false);
  const [breathPhase, setBreathPhase] = useState("Inhale"); // 'Inhale', 'Hold', 'Exhale', 'Rest'
  const [phaseSeconds, setPhaseSeconds] = useState(4);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const [breathingSessionSeconds, setBreathingSessionSeconds] = useState(0);
  const timerRef = useRef(null);

  // Journal State
  const [journalMood, setJournalMood] = useState("Calm");
  const [journalText, setJournalText] = useState("");
  const [savingJournal, setSavingJournal] = useState(false);

  // Settings State
  const [remindersEnabled, setRemindersEnabled] = useState(true);

  useEffect(() => {
    fetchYogaLibrary();
    fetchDailyRoutine();
    fetchWeeklySummary();
  }, [token]);

  // Fetch Yoga Library
  const fetchYogaLibrary = async () => {
    try {
      setYogaLoading(true);
      let url = "http://127.0.0.1:8000/api/patient/wellness/yoga-library?";
      if (levelFilter !== "all") url += `level=${levelFilter}&`;
      if (categoryFilter !== "all") url += `category=${categoryFilter}&`;
      if (durationFilter !== "all") url += `duration=${durationFilter}&`;
      if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const json = await res.json();
        setYogaExercises(json.exercises || []);
      }
    } catch (err) {
      console.error(err);
      showToast("Unable to load yoga library", "error");
    } finally {
      setYogaLoading(false);
    }
  };

  // Fetch Daily Routine & Checklist
  const fetchDailyRoutine = async () => {
    try {
      setDailyLoading(true);
      const res = await fetch("http://127.0.0.1:8000/api/patient/wellness/daily-routine", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setDailyData(json);
        setRemindersEnabled(json.settings?.reminders_enabled ?? true);
        if (json.today_journal) setJournalText(json.today_journal);
        if (json.today_mood) setJournalMood(json.today_mood);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDailyLoading(false);
    }
  };

  // Fetch Weekly Activity Summary
  const fetchWeeklySummary = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/patient/wellness/weekly-summary", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setWeeklySummary(json);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Log Activity Completion
  const handleToggleActivity = async (activity) => {
    try {
      setLoggingActivity(true);
      const res = await fetch("http://127.0.0.1:8000/api/patient/wellness/log-activity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          activity_key: activity.key,
          duration_minutes: activity.duration,
          mood: journalMood
        })
      });
      if (res.ok) {
        showToast(`Logged '${activity.title}'`, "success");
        fetchDailyRoutine();
        fetchWeeklySummary();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoggingActivity(false);
    }
  };

  // Handle Journal Submission
  const handleSaveJournal = async (e) => {
    e.preventDefault();
    if (!journalText.trim()) {
      showToast("Please enter your reflections before saving", "info");
      return;
    }
    try {
      setSavingJournal(true);
      const res = await fetch("http://127.0.0.1:8000/api/patient/wellness/journal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          journal_entry: journalText,
          mood: journalMood
        })
      });
      if (res.ok) {
        showToast("Personal reflection saved to your health journal", "success");
        fetchDailyRoutine();
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to save journal reflection", "error");
    } finally {
      setSavingJournal(false);
    }
  };

  // Handle Reminders Toggle
  const handleToggleReminders = async () => {
    const newState = !remindersEnabled;
    setRemindersEnabled(newState);
    try {
      await fetch("http://127.0.0.1:8000/api/patient/wellness/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reminders_enabled: newState })
      });
      showToast(
        newState ? "Gentle wellness reminders enabled" : "Wellness reminders disabled",
        "info"
      );
    } catch (err) {
      console.error(err);
    }
  };

  // -------------------------------------------------------------
  // Guided Breathing Animation Timer Engine (Box Breathing: 4-4-4-4)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!breathingActive || breathingPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setBreathingSessionSeconds((prev) => prev + 1);

      setPhaseSeconds((prevSec) => {
        if (prevSec > 1) {
          return prevSec - 1;
        } else {
          // Transition to next breathing phase
          setBreathPhase((currentPhase) => {
            if (currentPhase === "Inhale") return "Hold";
            if (currentPhase === "Hold") return "Exhale";
            if (currentPhase === "Exhale") return "Rest";
            if (currentPhase === "Rest") {
              setCyclesCompleted((c) => c + 1);
              return "Inhale";
            }
            return "Inhale";
          });
          return 4; // Reset to 4-second intervals
        }
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [breathingActive, breathingPaused]);

  const handleStartBreathing = () => {
    setBreathingActive(true);
    setBreathingPaused(false);
    setBreathPhase("Inhale");
    setPhaseSeconds(4);
  };

  const handlePauseBreathing = () => {
    setBreathingPaused(true);
  };

  const handleResumeBreathing = () => {
    setBreathingPaused(false);
  };

  const handleStopBreathing = () => {
    if (breathingActive && breathingSessionSeconds >= 60) {
      // Log completed session if at least 1 minute
      fetch("http://127.0.0.1:8000/api/patient/wellness/log-activity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          activity_key: "guided_breathing",
          duration_minutes: Math.ceil(breathingSessionSeconds / 60),
          mood: journalMood
        })
      }).then(() => {
        fetchDailyRoutine();
        fetchWeeklySummary();
        showToast("Breathing session logged successfully", "success");
      });
    }

    setBreathingActive(false);
    setBreathingPaused(false);
    setBreathPhase("Inhale");
    setPhaseSeconds(4);
    setCyclesCompleted(0);
    setBreathingSessionSeconds(0);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Back Button */}
      <BackButton fallback="/patient/dashboard" label="Back to Dashboard" />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2.5">
            <Wind size={28} className="text-teal-600" /> Cardiovascular Yoga & Guided Wellness
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Gentle restorative yoga, seated mobility routines, and interactive paced breathing designed for cardiovascular well-being.
          </p>
        </div>

        {/* Reminders Toggle Button */}
        <button
          onClick={handleToggleReminders}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition border shadow-xs ${
            remindersEnabled
              ? "bg-teal-50 text-teal-800 border-teal-200"
              : "bg-slate-100 text-slate-600 border-slate-200"
          }`}
        >
          {remindersEnabled ? <Bell size={15} className="text-teal-600" /> : <BellOff size={15} />}
          <span>{remindersEnabled ? "Daily Reminders Active" : "Reminders Muted"}</span>
        </button>
      </div>

      {/* Mandatory Cardiac Safety Advisory Banner (Prompt Requirement 3) */}
      <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <span className="font-bold">Cardiovascular Exercise & Safety Advisory:</span> Yoga, gentle stretching, and guided breathing are supportive lifestyle practices and do <span className="font-semibold underline">not</span> replace prescribed cardiovascular medical treatments or medications. <span className="font-bold text-rose-800">Immediately STOP</span> if you experience chest pain, unusual shortness of breath, palpitations, or lightheadedness, and seek emergency clinical care. Consult your cardiologist before starting a new routine if you have unmanaged cardiac symptoms.
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-bold gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("yoga")}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === "yoga"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Activity size={16} /> Yoga & Mobility Library ({yogaExercises.length})
        </button>

        <button
          onClick={() => setActiveTab("breathing")}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === "breathing"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Wind size={16} /> Interactive Guided Breathing
        </button>

        <button
          onClick={() => setActiveTab("daily")}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === "daily"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Calendar size={16} /> Daily Routine & Checklist
        </button>

        <button
          onClick={() => setActiveTab("journal")}
          className={`pb-3 px-4 flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
            activeTab === "journal"
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <BookOpen size={16} /> Wellness Journal & 7-Day Stats
        </button>
      </div>

      {/* TAB 1: YOGA & MOBILITY LIBRARY */}
      {activeTab === "yoga" && (
        <div className="space-y-5">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search size={16} className="absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchYogaLibrary()}
                placeholder="Search yoga poses, benefits..."
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none"
              >
                <option value="all">All Levels</option>
                <option value="beginner">Beginner Friendly</option>
                <option value="seated">Seated / Chair Only</option>
                <option value="gentle">Gentle Restorative</option>
              </select>

              <select
                value={durationFilter}
                onChange={(e) => setDurationFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none"
              >
                <option value="all">All Durations</option>
                <option value="short">Quick (&le; 7 mins)</option>
                <option value="medium">Standard (8 - 10 mins)</option>
                <option value="long">Deep Relax (&gt; 10 mins)</option>
              </select>

              <button
                onClick={fetchYogaLibrary}
                className="px-3.5 py-2 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition"
              >
                Apply
              </button>
            </div>
          </div>

          {/* Yoga Cards Grid */}
          {yogaLoading ? (
            <div className="flex items-center justify-center min-h-[30vh]">
              <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {yogaExercises.map((pose) => {
                const isExpanded = expandedExerciseId === pose.id;
                return (
                  <div
                    key={pose.id}
                    className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4 hover:border-teal-300 transition"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 uppercase">
                            {pose.category.replace("_", " ")}
                          </span>
                          {pose.suitable_for_seated && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              Chair / Seated Ready
                            </span>
                          )}
                        </div>
                        <h3 className="font-extrabold text-slate-800 text-base">{pose.title}</h3>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-xl shrink-0">
                        <Clock size={13} /> {pose.duration_minutes}m
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      {pose.benefits}
                    </p>

                    {/* Seated Modification Highlight */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700">
                      <span className="font-bold text-slate-800 block text-[11px] mb-0.5">
                        ♿ Seated / Low-Mobility Modification:
                      </span>
                      <span>{pose.seated_modification}</span>
                    </div>

                    {/* Step-by-Step Instructions Drawer */}
                    {isExpanded && (
                      <div className="space-y-3 pt-3 border-t border-slate-100 text-xs animate-in fade-in duration-200">
                        <p className="font-bold text-slate-800">Guided Step-by-Step Instructions:</p>
                        <ol className="list-decimal list-inside space-y-1.5 text-slate-600 pl-1">
                          {pose.instructions.map((step, i) => (
                            <li key={i} className="leading-relaxed">
                              {step}
                            </li>
                          ))}
                        </ol>

                        <div className="p-2.5 bg-rose-50 border border-rose-200/60 rounded-xl text-rose-800 text-[11px]">
                          <span className="font-bold">Safety Note:</span> {pose.safety_notes}
                        </div>
                      </div>
                    )}

                    <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                      <button
                        onClick={() => setExpandedExerciseId(isExpanded ? null : pose.id)}
                        className="text-xs font-bold text-teal-700 hover:text-teal-800 flex items-center gap-1"
                      >
                        {isExpanded ? (
                          <>
                            Hide Instructions <ChevronUp size={14} />
                          </>
                        ) : (
                          <>
                            View Instructions <ChevronDown size={14} />
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => {
                          handleToggleActivity({ key: pose.id, title: pose.title, duration: pose.duration_minutes });
                        }}
                        className="px-3 py-1.5 bg-teal-50 hover:bg-teal-600 hover:text-white text-teal-800 border border-teal-200 text-xs font-bold rounded-xl transition cursor-pointer"
                      >
                        Mark Completed Today
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INTERACTIVE GUIDED BREATHING (Prompt Requirement 3) */}
      {activeTab === "breathing" && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-8 shadow-xs max-w-2xl mx-auto text-center space-y-6">
          <div>
            <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">
              Vagal Tone & Heart Rate Regulation
            </span>
            <h3 className="text-xl font-extrabold text-slate-800 mt-1">
              Interactive 4-4-4 Box Breathing Guide
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Follow the expanding and contracting visual rhythm. Controlled pacing activates parasympathetic tone, moderating blood pressure and resting pulse.
            </p>
          </div>

          {/* Animated Interactive Breathing Circle */}
          <div className="py-8 flex flex-col items-center justify-center">
            <div
              className={`w-56 h-56 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-1000 border-4 ${
                !breathingActive
                  ? "bg-slate-50 border-slate-200 text-slate-400 scale-95"
                  : breathPhase === "Inhale"
                  ? "bg-teal-50 border-teal-500 text-teal-900 scale-110 shadow-teal-500/20"
                  : breathPhase === "Hold"
                  ? "bg-blue-50 border-blue-500 text-blue-900 scale-110 shadow-blue-500/20"
                  : breathPhase === "Exhale"
                  ? "bg-rose-50 border-rose-400 text-rose-900 scale-90 shadow-rose-500/20"
                  : "bg-slate-100 border-slate-400 text-slate-800 scale-90"
              }`}
            >
              <span className="text-2xl font-black tracking-tight">{breathPhase}</span>
              <span className="text-4xl font-extrabold font-mono mt-1">{phaseSeconds}s</span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-2">
                {breathingActive ? `Cycle ${cyclesCompleted + 1}` : "Ready"}
              </span>
            </div>

            {breathingActive && (
              <div className="mt-4 text-xs font-mono font-semibold text-slate-500">
                Session Duration: {Math.floor(breathingSessionSeconds / 60)}:
                {(breathingSessionSeconds % 60).toString().padStart(2, "0")} • {cyclesCompleted} Cycles Finished
              </div>
            )}
          </div>

          {/* Interactive Start / Pause / Stop Controls (Prompt Requirement 3) */}
          <div className="flex items-center justify-center gap-3">
            {!breathingActive ? (
              <button
                onClick={handleStartBreathing}
                className="flex items-center gap-2 px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-sm rounded-2xl shadow-md transition cursor-pointer"
              >
                <Play size={18} /> Start Breathing Session
              </button>
            ) : (
              <>
                {breathingPaused ? (
                  <button
                    onClick={handleResumeBreathing}
                    className="flex items-center gap-2 px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                  >
                    <Play size={16} /> Resume
                  </button>
                ) : (
                  <button
                    onClick={handlePauseBreathing}
                    className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition"
                  >
                    <Pause size={16} /> Pause
                  </button>
                )}

                <button
                  onClick={handleStopBreathing}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  <RotateCcw size={16} /> Stop & Save
                </button>
              </>
            )}
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-left text-xs text-slate-600 space-y-1">
            <p className="font-bold text-slate-800">Clinical Tip:</p>
            <p>
              Maintain smooth, unforced diaphragmatic expansion. If you ever feel short of breath, stop the timer, sit calmly, and resume normal resting breathing.
            </p>
          </div>
        </div>
      )}

      {/* TAB 3: DAILY ROUTINE & CHECKLIST */}
      {activeTab === "daily" && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                <Calendar size={20} className="text-teal-600" /> Today's Selectable Wellness Checklist
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Target daily mobility and calming habits. Complete each task at your own pace.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">
                {dailyData?.completed_count || 0} of {dailyData?.total_activities || 4} Completed
              </span>
              <div className="w-24 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-500 transition-all duration-300"
                  style={{ width: `${dailyData?.progress_percentage || 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Activities List */}
          <div className="space-y-3">
            {(dailyData?.activities || []).map((act) => (
              <div
                key={act.key}
                onClick={() => handleToggleActivity(act)}
                className={`p-4 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                  act.completed
                    ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                    : "bg-slate-50 border-slate-200/80 hover:bg-slate-100/70"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center border ${
                      act.completed
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "bg-white border-slate-300"
                    }`}
                  >
                    {act.completed && <CheckCircle size={15} />}
                  </div>
                  <div>
                    <h4
                      className={`text-xs font-bold ${
                        act.completed ? "line-through text-slate-500" : "text-slate-800"
                      }`}
                    >
                      {act.title}
                    </h4>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {act.category} • {act.duration} minutes
                    </span>
                  </div>
                </div>

                <span
                  className={`text-xs font-bold px-3 py-1 rounded-xl border ${
                    act.completed
                      ? "bg-white text-emerald-700 border-emerald-200"
                      : "bg-white text-slate-600 border-slate-200"
                  }`}
                >
                  {act.completed ? "Done" : "Mark Done"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: JOURNAL & 7-DAY SUMMARY (Prompt Requirement 3) */}
      {activeTab === "journal" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Daily Reflection Journal Form */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
              <BookOpen size={18} className="text-teal-600" /> Personal Wellness Reflection Journal
            </h3>
            <p className="text-xs text-slate-500 leading-normal">
              Record how your body felt today, your energy, and any subjective notes to share during medical follow-ups.
            </p>

            {/* Mood Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                How do you feel today?
              </label>
              <div className="grid grid-cols-4 gap-2">
                {["Calm", "Energized", "Relaxed", "Tired"].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setJournalMood(m)}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      journalMood === m
                        ? "bg-teal-600 text-white border-teal-600 shadow-xs"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSaveJournal} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Daily Notes & Sensations
                </label>
                <textarea
                  rows={4}
                  value={journalText}
                  onChange={(e) => setJournalText(e.target.value)}
                  placeholder="e.g. Completed 10 minutes of gentle chair stretches and 4-4-4 breathing. Felt calm with no chest tightness."
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={savingJournal}
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl transition shadow-xs disabled:opacity-50"
              >
                {savingJournal ? "Saving..." : "Save Today's Reflection"}
              </button>
            </form>
          </div>

          {/* Real 7-Day Activity Statistics Bar */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-5 flex flex-col justify-between">
            <div>
              <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-2">
                <Sparkles size={18} className="text-teal-600" /> 7-Day Activity Summary
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Real activity metrics computed from your recorded sessions in the database.
              </p>

              <div className="grid grid-cols-3 gap-3 my-4">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Active Days</span>
                  <span className="text-xl font-extrabold text-slate-800">
                    {weeklySummary?.days_active || 0} / 7
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Sessions</span>
                  <span className="text-xl font-extrabold text-teal-600">
                    {weeklySummary?.total_sessions || 0}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Active Mins</span>
                  <span className="text-xl font-extrabold text-blue-600">
                    {weeklySummary?.total_minutes || 0}m
                  </span>
                </div>
              </div>

              {/* Day-by-Day Visual Bar */}
              <div className="space-y-1.5 pt-2">
                <span className="text-[11px] font-bold text-slate-600 block">7-Day Consistency:</span>
                <div className="grid grid-cols-7 gap-1.5 text-center">
                  {(weeklySummary?.daily_breakdown || []).map((day, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div
                        className={`w-full h-12 rounded-lg flex items-center justify-center text-[10px] font-bold transition ${
                          day.completed
                            ? "bg-teal-500 text-white shadow-xs"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {day.minutes ? `${day.minutes}m` : "-"}
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500">{day.day}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-3 bg-teal-50/70 border border-teal-200/60 rounded-xl text-teal-900 text-xs">
              <span className="font-bold">Consistency Rate:</span> {weeklySummary?.consistency_rate || 0}% of weekly wellness goals met.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientWellness;
