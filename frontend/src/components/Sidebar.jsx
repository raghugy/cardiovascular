// src/components/Sidebar.jsx
import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  FileText,
  Activity,
  HeartPulse,
  Utensils,
  Video,
  Calendar,
  ShieldAlert,
  User,
  LogOut,
  ChevronRight,
  ClipboardList,
  Stethoscope,
  MessageSquare,
  Wind
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Sidebar = ({ isOpen, setIsOpen }) => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const adminNav = [
    { name: "Dashboard", path: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Patient Accounts", path: "/admin/users", icon: Users },
    { name: "Doctor Profiles", path: "/admin/doctors", icon: Stethoscope },
    { name: "Doctor Assignments", path: "/admin/doctor-assignments", icon: UserCheck },
    { name: "Patient Feedback", path: "/admin/feedback", icon: MessageSquare },
    { name: "Audit Logs", path: "/admin/audit-logs", icon: ShieldAlert },
    { name: "Report Processing", path: "/admin/reports", icon: ClipboardList },
    { name: "Nutrition Content", path: "/admin/diet-wellness", icon: Utensils },
    { name: "Food & Recipes", path: "/admin/food-catalog", icon: Activity },
  ];

  const patientNav = [
    { name: "Home", path: "/patient/dashboard", icon: LayoutDashboard },
    { name: "Upload Report", path: "/patient/upload", icon: FileText, highlight: true },
    { name: "My Predictions", path: "/patient/predictions", icon: Activity },
    { name: "AI Food Nutrition", path: "/patient/diet", icon: Utensils },
    { name: "Yoga & Wellness", path: "/patient/wellness", icon: Wind },
    { name: "Feedback & Support", path: "/patient/help", icon: MessageSquare },
    { name: "Profile", path: "/patient/profile", icon: User },
  ];

  const links = role === "admin" ? adminNav : patientNav;

  const getRoleBadge = () => {
    if (role === "admin") return { label: "Administrator", bg: "bg-slate-800 text-amber-300 border-amber-400/30" };
    return { label: "Patient", bg: "bg-blue-700 text-blue-100 border-blue-500/30" };
  };

  const badge = getRoleBadge();

  return (
    <aside
      className={`fixed top-0 left-0 h-full w-64 bg-slate-900 text-slate-200 z-40 flex flex-col transition-transform duration-300 ease-in-out border-r border-slate-800 shadow-xl ${
        isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      }`}
    >
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => navigate(`/${role}/dashboard`)}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-teal-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <HeartPulse size={22} className="text-white animate-heart-pulse" />
          </div>
          <div>
            <h2 className="font-bold text-lg text-white tracking-tight flex items-center gap-1">
              Cardio<span className="text-teal-400">Predict</span>
            </h2>
            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${badge.bg}`}>
              {badge.label}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 mb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Portal Menu
        </div>
        {links.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30 font-semibold"
                    : item.highlight
                    ? "bg-teal-500/10 text-teal-300 hover:bg-teal-500/20 border border-teal-500/20"
                    : "text-slate-400 hover:bg-slate-800/80 hover:text-white"
                }`
              }
            >
              <div className="flex items-center gap-3">
                <Icon size={19} className="shrink-0 transition-transform group-hover:scale-110" />
                <span>{item.name}</span>
              </div>
              <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400" />
            </NavLink>
          );
        })}
      </nav>

      {/* User Footer Profile */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/60">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-teal-400 text-white font-bold flex items-center justify-center shrink-0 text-sm shadow">
              {(user?.full_name || user?.username || user?.email || "U")[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate">
                {user?.full_name || user?.username || "Authorized User"}
              </p>
              <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition border border-rose-500/20"
        >
          <LogOut size={14} /> Log Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
