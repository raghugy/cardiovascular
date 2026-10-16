// src/pages/AuthLanding.jsx
import React, { useState, useEffect } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  User,
  UserPlus,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  HeartPulse,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  MoreVertical,
  ShieldCheck,
  Shield,
  X
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const AuthLanding = ({ defaultTab = "login", openAdminModal = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, role } = useAuth();

  // If already logged in, redirect to respective dashboard
  useEffect(() => {
    if (isAuthenticated) {
      if (role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else {
        navigate("/patient/dashboard", { replace: true });
      }
    }
  }, [isAuthenticated, role, navigate]);

  // Active Auth Tab: 'login' or 'register'
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Three-dot menu toggle
  const [showMenu, setShowMenu] = useState(false);

  // Administrator Login Modal toggle
  const [showAdminModal, setShowAdminModal] = useState(openAdminModal);

  // -------------------------------------------------------------
  // Patient Login Form State
  // -------------------------------------------------------------
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginSuccessMsg, setLoginSuccessMsg] = useState("");

  // Load remembered email if available
  useEffect(() => {
    const saved = localStorage.getItem("cardiopredict_remembered_email");
    if (saved) {
      setLoginEmail(saved);
      setRememberMe(true);
    }
  }, []);

  // -------------------------------------------------------------
  // Patient Registration Form State
  // -------------------------------------------------------------
  const [regForm, setRegForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    confirm_password: "",
    consent: false
  });
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);
  const [regErrors, setRegErrors] = useState({});
  const [regGeneralError, setRegGeneralError] = useState("");
  const [regLoading, setRegLoading] = useState(false);

  // -------------------------------------------------------------
  // Administrator Login Modal State
  // -------------------------------------------------------------
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminError, setAdminError] = useState("");

  // Real-time password strength calculation
  const getPasswordStrength = (pass) => {
    if (!pass) return { score: 0, text: "", color: "bg-slate-200", checks: [] };
    const checks = [
      { label: "At least 8 characters", met: pass.length >= 8 },
      { label: "One uppercase letter (A-Z)", met: /[A-Z]/.test(pass) },
      { label: "One lowercase letter (a-z)", met: /[a-z]/.test(pass) },
      { label: "One number (0-9)", met: /[0-9]/.test(pass) },
      { label: "One special symbol (@$!%*?)", met: /[@$!%*?&#^()_\-+=\[\]{}|;:,.<>]/.test(pass) }
    ];

    const score = checks.filter((c) => c.met).length;
    if (score <= 2) return { score: 25, text: "Weak", color: "bg-rose-500", textColor: "text-rose-600", checks };
    if (score === 3) return { score: 50, text: "Fair", color: "bg-amber-500", textColor: "text-amber-600", checks };
    if (score === 4) return { score: 75, text: "Good", color: "bg-blue-500", textColor: "text-blue-600", checks };
    return { score: 100, text: "Strong", color: "bg-emerald-500", textColor: "text-emerald-600", checks };
  };

  const strength = getPasswordStrength(regForm.password);

  // Handle Patient Registration input change
  const handleRegChange = (e) => {
    const { name, value, type, checked } = e.target;
    setRegForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
    if (regErrors[name]) {
      setRegErrors((prev) => ({ ...prev, [name]: "" }));
    }
    setRegGeneralError("");
  };

  // -------------------------------------------------------------
  // Submit Patient Login
  // -------------------------------------------------------------
  const handlePatientLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    setLoginSuccessMsg("");
    setLoginLoading(true);

    const email = loginEmail.trim().toLowerCase();
    if (!email || !loginPassword) {
      setLoginError("Please enter your registered email and password.");
      setLoginLoading(false);
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: loginPassword })
      });

      const data = await res.json();

      if (!res.ok) {
        setLoginError(data.error || "Authentication failed. Please verify your credentials.");
        setLoginLoading(false);
        return;
      }

      if (rememberMe) {
        localStorage.setItem("cardiopredict_remembered_email", email);
      } else {
        localStorage.removeItem("cardiopredict_remembered_email");
      }

      login(data.token, data.user);

      // Server-determined role routing
      if (data.user?.role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else {
        navigate("/patient/welcome", { replace: true });
      }
    } catch (err) {
      console.error(err);
      setLoginError("Unable to connect to CardioPredict server. Please verify backend is running on port 8000.");
    } finally {
      setLoginLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Submit Patient Registration
  // -------------------------------------------------------------
  const handlePatientRegister = async (e) => {
    e.preventDefault();
    setRegGeneralError("");

    const errs = {};
    const trimmedName = regForm.full_name.trim();
    if (!trimmedName) {
      errs.full_name = "Full name is required.";
    } else if (/\d/.test(trimmedName)) {
      errs.full_name = "Name must contain letters only. Numbers are not allowed.";
    } else if (!/^[a-zA-Z][a-zA-Z\s'\-]{1,59}$/.test(trimmedName)) {
      errs.full_name = "Please enter a valid name (letters, spaces, hyphens, and apostrophes only, 2-60 characters).";
    }

    const trimmedEmail = regForm.email.trim().toLowerCase();
    if (!trimmedEmail) {
      errs.email = "Email address is required.";
    } else if (/^\d/.test(trimmedEmail)) {
      errs.email = "Email address must begin with an alphabetic letter (a-z). Leading numbers are not allowed.";
    } else if (/\.\./.test(trimmedEmail) || trimmedEmail.startsWith(".") || trimmedEmail.endsWith(".") || /@\./.test(trimmedEmail) || /\.@/.test(trimmedEmail)) {
      errs.email = "Email address cannot contain consecutive or misplaced dots.";
    } else if (!/^[a-zA-Z][a-zA-Z0-9._%+-]*@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/.test(trimmedEmail)) {
      errs.email = "Please enter a valid email address with a proper domain (e.g., patient.name@domain.com).";
    }

    const cleanedPhone = regForm.phone.replace(/\D/g, "");
    if (!cleanedPhone) {
      errs.phone = "Indian mobile number is required.";
    } else if (cleanedPhone.length !== 10) {
      errs.phone = "Mobile number must be exactly 10 numeric digits.";
    } else if (!/^[6-9]\d{9}$/.test(cleanedPhone)) {
      errs.phone = "Please enter a valid Indian mobile number starting with 6, 7, 8, or 9.";
    }

    if (!regForm.password) {
      errs.password = "Password is required.";
    } else if (strength.score < 50) {
      errs.password = "Please choose a stronger password meeting the security criteria.";
    }

    if (!regForm.confirm_password) {
      errs.confirm_password = "Confirm password is required.";
    } else if (regForm.password !== regForm.confirm_password) {
      errs.confirm_password = "Passwords do not match.";
    }

    if (!regForm.consent) {
      errs.consent = "You must agree to the Terms of Service and Privacy Policy.";
    }

    if (Object.keys(errs).length > 0) {
      setRegErrors(errs);
      return;
    }

    setRegLoading(true);

    try {
      const res = await fetch("http://127.0.0.1:8000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: trimmedName,
          email: trimmedEmail,
          phone: cleanedPhone,
          password: regForm.password,
          confirm_password: regForm.confirm_password,
          consent_terms: true,
          consent_privacy: true,
          role: "patient"
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setRegGeneralError(data.error || "Registration failed. Please check your details.");
        setRegLoading(false);
        return;
      }

      // Success: pre-fill login email and switch to login tab
      setLoginEmail(trimmedEmail);
      setLoginSuccessMsg("Account registered successfully! Please sign in with your password.");
      setActiveTab("login");
      setRegForm({
        full_name: "",
        email: "",
        phone: "",
        password: "",
        confirm_password: "",
        consent: false
      });
    } catch (err) {
      console.error(err);
      setRegGeneralError("Unable to connect to CardioPredict server. Please verify backend is running.");
    } finally {
      setRegLoading(false);
    }
  };

  // -------------------------------------------------------------
  // Submit Administrator Login
  // -------------------------------------------------------------
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setAdminError("");
    setAdminLoading(true);

    const email = adminEmail.trim().toLowerCase();
    if (!email || !adminPassword) {
      setAdminError("Administrator email and password are required.");
      setAdminLoading(false);
      return;
    }

    try {
      const res = await fetch("http://127.0.0.1:8000/api/auth/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: adminPassword })
      });

      const data = await res.json();

      if (!res.ok) {
        setAdminError(data.error || "Invalid administrator credentials or unauthorized access.");
        setAdminLoading(false);
        return;
      }

      login(data.token, data.user);
      setShowAdminModal(false);
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      console.error(err);
      setAdminError("Unable to verify administrator credentials with server.");
    } finally {
      setAdminLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50/40 to-teal-50/30 px-4 py-10 relative">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border border-slate-100 p-7 sm:p-9 relative overflow-hidden">
        {/* Top Gradient Accent Banner */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 via-teal-500 to-indigo-600" />

        {/* Top-Right Three-Dot Menu (⋮) for Administrator Access */}
        <div className="absolute top-5 right-5">
          <button
            type="button"
            onClick={() => setShowMenu(!showMenu)}
            aria-label="Options Menu"
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <MoreVertical size={20} />
          </button>

          {/* Discreet Three-Dot Dropdown Menu */}
          {showMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 px-2 z-50 animate-in fade-in slide-in-from-top-2">
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  setShowAdminModal(true);
                  setAdminError("");
                }}
                className="w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-900 hover:text-white transition flex items-center gap-2.5 group"
              >
                <ShieldCheck size={16} className="text-teal-600 group-hover:text-amber-400 transition" />
                <span>Administrator Login</span>
              </button>
            </div>
          )}
        </div>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-teal-500 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/25">
            <HeartPulse size={30} className="text-white animate-heart-pulse" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
            Cardio<span className="text-teal-600">Predict</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Deep Learning Cardiovascular Health Assessment
          </p>
        </div>

        {/* Segmented Toggle Tabs: Patient Login & Patient Registration */}
        <div className="mb-6 p-1 bg-slate-100 rounded-2xl flex gap-1 border border-slate-200/70">
          <button
            type="button"
            onClick={() => {
              setActiveTab("login");
              setLoginError("");
              setRegGeneralError("");
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "login"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <User size={15} />
            <span>Patient Login</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("register");
              setLoginError("");
              setRegGeneralError("");
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "register"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <UserPlus size={15} />
            <span>Patient Register</span>
          </button>
        </div>

        {/* Success Alert Banner */}
        {loginSuccessMsg && activeTab === "login" && (
          <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-start gap-2.5 animate-in fade-in">
            <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600" />
            <p className="leading-relaxed">{loginSuccessMsg}</p>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 1: PATIENT LOGIN FORM */}
        {/* ========================================================= */}
        {activeTab === "login" && (
          <form onSubmit={handlePatientLogin} className="space-y-4">
            {loginError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                <p className="leading-relaxed">{loginError}</p>
              </div>
            )}

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Mail size={14} className="text-teal-600" />
                <span>Email Address</span>
              </label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="name@example.com"
                required
                autoComplete="email"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-xs sm:text-sm transition"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Lock size={14} className="text-teal-600" />
                  <span>Password</span>
                </label>
                <NavLink to="/forgot-password" className="text-xs text-blue-600 hover:underline font-medium">
                  Forgot password?
                </NavLink>
              </div>
              <div className="relative">
                <input
                  type={showLoginPassword ? "text" : "password"}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your account password"
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-xs sm:text-sm transition pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  aria-label={showLoginPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 transition"
                />
                <span className="text-xs text-slate-600">Remember email on this device</span>
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loginLoading}
              className={`w-full py-3 rounded-xl text-white font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 mt-2 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 ${
                loginLoading ? "opacity-75 cursor-not-allowed" : ""
              }`}
            >
              {loginLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In as Patient</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* ========================================================= */}
        {/* TAB 2: PATIENT REGISTRATION FORM */}
        {/* ========================================================= */}
        {activeTab === "register" && (
          <form onSubmit={handlePatientRegister} className="space-y-3.5">
            {regGeneralError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                <p className="leading-relaxed">{regGeneralError}</p>
              </div>
            )}

            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <User size={13} className="text-teal-600" />
                <span>Full Name *</span>
              </label>
              <input
                type="text"
                name="full_name"
                value={regForm.full_name}
                onChange={handleRegChange}
                placeholder="e.g. Ramesh Kumar"
                required
                className={`w-full px-3.5 py-2 rounded-xl border text-xs sm:text-sm outline-none transition ${
                  regErrors.full_name ? "border-rose-400 bg-rose-50/20" : "border-slate-200 focus:ring-2 focus:ring-blue-500"
                }`}
              />
              {regErrors.full_name && <p className="text-[11px] text-rose-600 mt-0.5">{regErrors.full_name}</p>}
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Mail size={13} className="text-teal-600" />
                <span>Email Address *</span>
              </label>
              <input
                type="email"
                name="email"
                value={regForm.email}
                onChange={handleRegChange}
                placeholder="name@example.com"
                required
                className={`w-full px-3.5 py-2 rounded-xl border text-xs sm:text-sm outline-none transition ${
                  regErrors.email ? "border-rose-400 bg-rose-50/20" : "border-slate-200 focus:ring-2 focus:ring-blue-500"
                }`}
              />
              {regErrors.email && <p className="text-[11px] text-rose-600 mt-0.5">{regErrors.email}</p>}
            </div>

            {/* Indian Mobile Number (10 Digits) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Phone size={13} className="text-teal-600" />
                <span>Indian Mobile Number (10 Digits) *</span>
              </label>
              <div className="relative flex">
                <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 text-slate-500 text-xs font-semibold select-none">
                  +91
                </span>
                <input
                  type="tel"
                  name="phone"
                  value={regForm.phone}
                  onChange={handleRegChange}
                  maxLength={10}
                  placeholder="9876543210"
                  required
                  className={`w-full px-3.5 py-2 rounded-r-xl border text-xs sm:text-sm outline-none transition ${
                    regErrors.phone ? "border-rose-400 bg-rose-50/20" : "border-slate-200 focus:ring-2 focus:ring-blue-500"
                  }`}
                />
              </div>
              {regErrors.phone && <p className="text-[11px] text-rose-600 mt-0.5">{regErrors.phone}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Lock size={13} className="text-teal-600" />
                <span>Password *</span>
              </label>
              <div className="relative">
                <input
                  type={showRegPassword ? "text" : "password"}
                  name="password"
                  value={regForm.password}
                  onChange={handleRegChange}
                  placeholder="At least 8 characters"
                  required
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs sm:text-sm outline-none transition pr-10 ${
                    regErrors.password ? "border-rose-400 bg-rose-50/20" : "border-slate-200 focus:ring-2 focus:ring-blue-500"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute right-3 top-2 text-slate-400 hover:text-slate-600"
                >
                  {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password Strength Meter */}
              {regForm.password && (
                <div className="mt-1.5 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Strength:</span>
                    <span className={`font-bold ${strength.textColor}`}>{strength.text}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${strength.color} transition-all duration-300`}
                      style={{ width: `${strength.score}%` }}
                    />
                  </div>
                </div>
              )}
              {regErrors.password && <p className="text-[11px] text-rose-600 mt-0.5">{regErrors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Lock size={13} className="text-teal-600" />
                <span>Confirm Password *</span>
              </label>
              <div className="relative">
                <input
                  type={showRegConfirmPassword ? "text" : "password"}
                  name="confirm_password"
                  value={regForm.confirm_password}
                  onChange={handleRegChange}
                  placeholder="Re-enter password"
                  required
                  className={`w-full px-3.5 py-2 rounded-xl border text-xs sm:text-sm outline-none transition pr-10 ${
                    regErrors.confirm_password ? "border-rose-400 bg-rose-50/20" : "border-slate-200 focus:ring-2 focus:ring-blue-500"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                  className="absolute right-3 top-2 text-slate-400 hover:text-slate-600"
                >
                  {showRegConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {regErrors.confirm_password && <p className="text-[11px] text-rose-600 mt-0.5">{regErrors.confirm_password}</p>}
            </div>

            {/* Consent Checkbox */}
            <div className="pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  name="consent"
                  checked={regForm.consent}
                  onChange={handleRegChange}
                  className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 shrink-0"
                />
                <span className="text-[11px] text-slate-600 leading-relaxed">
                  I agree to the <strong>Terms of Service</strong> and <strong>Privacy Policy</strong> for cardiovascular health assessment and secure data processing.
                </span>
              </label>
              {regErrors.consent && <p className="text-[11px] text-rose-600 mt-0.5">{regErrors.consent}</p>}
            </div>

            {/* Submit Registration Button */}
            <button
              type="submit"
              disabled={regLoading}
              className={`w-full py-3 rounded-xl text-white font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-teal-500/20 mt-2 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 ${
                regLoading ? "opacity-75 cursor-not-allowed" : ""
              }`}
            >
              {regLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Register Patient Account</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {/* Security Assurance Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <Shield size={13} className="text-teal-600" />
          <span>Encrypted with SHA-256 & HIPAA Privacy Safeguards</span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SEPARATE PROFESSIONAL ADMINISTRATOR LOGIN MODAL */}
      {/* ========================================================= */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative">
            {/* Modal Close Button */}
            <button
              type="button"
              onClick={() => {
                setShowAdminModal(false);
                setAdminError("");
              }}
              className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              aria-label="Close"
            >
              <X size={18} />
            </button>

            {/* Admin Header */}
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 text-amber-400 flex items-center justify-center mx-auto mb-2.5 shadow-md shadow-slate-900/20">
                <ShieldCheck size={26} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Administrator Login</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Restricted portal access for the authorized administrator
              </p>
            </div>

            {/* Error Message */}
            {adminError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5 text-rose-600" />
                <p className="leading-relaxed">{adminError}</p>
              </div>
            )}

            {/* Admin Login Form */}
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Mail size={13} className="text-slate-700" />
                  <span>Administrator Email</span>
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  placeholder="admin@cardiopredict.org"
                  required
                  autoComplete="username"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-800 outline-none text-xs sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Lock size={13} className="text-slate-700" />
                  <span>Administrator Password</span>
                </label>
                <div className="relative">
                  <input
                    type={showAdminPassword ? "text" : "password"}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter admin password"
                    required
                    autoComplete="current-password"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-800 outline-none text-xs sm:text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showAdminPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={adminLoading}
                className={`w-full py-3 rounded-xl text-white font-bold text-xs sm:text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 bg-slate-900 hover:bg-slate-800 mt-2 ${
                  adminLoading ? "opacity-75 cursor-not-allowed" : ""
                }`}
              >
                {adminLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Authenticate & Enter Admin Portal</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowAdminModal(false)}
                className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 text-center"
              >
                Back to Patient Portal
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuthLanding;
