// src/components/Header.jsx
import React, { useState } from "react";
import { Menu, X, HeartPulse, User, LogOut, ChevronDown, ShieldCheck, Stethoscope, UserCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";

const Header = ({ sidebarOpen, setSidebarOpen }) => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const getRoleDisplay = () => {
    if (role === "admin") {
      return {
        label: "Administrator",
        icon: <ShieldCheck size={14} className="text-amber-500" />,
        badgeClass: "bg-amber-50 text-amber-700 border-amber-200"
      };
    }
    if (role === "doctor") {
      return {
        label: "Doctor",
        icon: <Stethoscope size={14} className="text-teal-600" />,
        badgeClass: "bg-teal-50 text-teal-700 border-teal-200"
      };
    }
    return {
      label: "Patient",
      icon: <UserCircle size={14} className="text-blue-600" />,
      badgeClass: "bg-blue-50 text-blue-700 border-blue-200"
    };
  };

  const roleInfo = getRoleDisplay();

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between">
      {/* Left side: Hamburger toggle + Greeting */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 text-slate-600 hover:text-blue-600 hover:bg-slate-100 rounded-lg md:hidden focus:outline-none"
        >
          {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <div className="hidden sm:block">
          <h1 className="text-base font-bold text-slate-800 tracking-tight flex items-center gap-2">
            Cardiovascular Health Evaluation Platform
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            AI-Assisted Diagnostic Screening & Predictive Modeling
          </p>
        </div>
      </div>

      {/* Right side: Role badge, Notification Bell, User menu */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Role badge */}
        <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${roleInfo.badgeClass}`}>
          {roleInfo.icon}
          <span>{roleInfo.label} Portal</span>
        </div>

        {/* Notifications Bell */}
        <NotificationBell />

        {/* User Dropdown */}
        <div className="relative">
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2.5 p-1.5 pr-2.5 rounded-full hover:bg-slate-100 transition border border-slate-200 focus:outline-none"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-teal-500 text-white font-bold text-xs flex items-center justify-center shadow-sm">
              {(user?.full_name || user?.email || "U")[0].toUpperCase()}
            </div>
            <span className="hidden md:inline-block text-xs font-semibold text-slate-700 max-w-[120px] truncate">
              {user?.full_name || user?.username || "Account"}
            </span>
            <ChevronDown size={14} className="text-slate-400" />
          </button>

          {profileOpen && (
            <div
              className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
              onMouseLeave={() => setProfileOpen(false)}
            >
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-800 truncate">{user?.full_name || user?.username}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
              </div>

              {role === "patient" && (
                <button
                  onClick={() => {
                    setProfileOpen(false);
                    navigate("/patient/profile");
                  }}
                  className="w-full text-left px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <User size={14} /> My Profile
                </button>
              )}

              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 flex items-center gap-2"
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
