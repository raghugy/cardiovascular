// src/components/Navbar.jsx
import React from "react";
import { User, HeartPulse, LayoutDashboard, LogOut, LogIn } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = () => {
  const navigate = useNavigate();
  const { user, role, isAuthenticated, logout } = useAuth();
  const username = user?.full_name || user?.username || "Account";

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const getPortalPath = () => {
    if (role === "admin") return "/admin/dashboard";
    return "/patient/dashboard";
  };

  return (
    <nav className="px-6 md:px-10 py-4 flex justify-between items-center fixed top-0 left-0 w-full z-50 bg-white/70 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
      {/* Brand */}
      <div
        className="flex items-center gap-2.5 cursor-pointer"
        onClick={() => navigate("/home")}
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-teal-400 flex items-center justify-center shadow-md shadow-blue-500/20">
          <HeartPulse size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Cardio<span className="text-teal-600">Predict</span>
          </h1>
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
            Clinical AI Platform
          </span>
        </div>
      </div>

      {/* Menu */}
      <div className="flex items-center space-x-6 md:space-x-8 text-sm font-semibold">
        <NavLink
          to="/home"
          className={({ isActive }) =>
            isActive ? "text-blue-600 font-bold" : "text-slate-600 hover:text-blue-600 transition"
          }
        >
          Home
        </NavLink>

        <NavLink
          to="/about"
          className={({ isActive }) =>
            isActive ? "text-blue-600 font-bold" : "text-slate-600 hover:text-blue-600 transition"
          }
        >
          About
        </NavLink>

        <NavLink
          to="/contact"
          className={({ isActive }) =>
            isActive ? "text-blue-600 font-bold" : "text-slate-600 hover:text-blue-600 transition"
          }
        >
          Contact
        </NavLink>

        {isAuthenticated && (
          <NavLink
            to={getPortalPath()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition"
          >
            <LayoutDashboard size={15} /> My Portal
          </NavLink>
        )}

        {/* Profile / Account Dropdown */}
        <div className="relative group">
          <div className="flex items-center gap-2 cursor-pointer text-slate-700 hover:text-blue-600 transition py-1">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600">
              <User size={18} />
            </div>
            <span className="hidden sm:inline font-bold text-xs truncate max-w-[120px]">
              {isAuthenticated ? username.split(" ")[0] : "Sign In"}
            </span>
          </div>

          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 shadow-xl rounded-2xl p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
            {isAuthenticated ? (
              <>
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <p className="text-xs font-bold text-slate-800 truncate">{username}</p>
                  <p className="text-[10px] text-teal-600 font-bold uppercase tracking-wider">{role}</p>
                </div>
                <button
                  onClick={() => navigate(getPortalPath())}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition flex items-center gap-2"
                >
                  <LayoutDashboard size={14} /> Open Portal
                </button>
                {role === "patient" && (
                  <button
                    onClick={() => navigate("/patient/profile")}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-xl transition flex items-center gap-2"
                  >
                    <User size={14} /> Health Profile
                  </button>
                )}
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition flex items-center gap-2"
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="w-full text-left px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition flex items-center gap-2"
              >
                <LogIn size={14} /> Login / Register
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
