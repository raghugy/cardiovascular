// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Clock, ShieldAlert, AlertCircle, LogOut } from "lucide-react";
import PortalLayout from "./PortalLayout";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, role, user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-600">Verifying security credentials...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Check role authorization (Strict RBAC)
  if (allowedRoles && !allowedRoles.includes(role)) {
    // If a patient attempts to access admin routes, redirect to patient dashboard
    if (role === "patient") {
      return <Navigate to="/patient/dashboard" replace />;
    }
    // If an administrator accesses other routes, redirect to admin dashboard
    if (role === "admin") {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <PortalLayout>{children}</PortalLayout>;
};

export default ProtectedRoute;
