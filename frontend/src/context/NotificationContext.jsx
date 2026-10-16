// src/context/NotificationContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { CheckCircle, AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Floating Toast State
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "info") => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast((current) => (current && current.id === current.id ? null : current));
    }, 4000);
  };

  const fetchNotifications = useCallback(async () => {
    if (!token || !isAuthenticated) return;
    try {
      setLoading(true);
      const res = await fetch("http://127.0.0.1:8000/api/notifications", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unread_count || 0);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [token, isAuthenticated]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const markAsRead = async (id) => {
    try {
      await fetch(`http://127.0.0.1:8000/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: 1 } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("http://127.0.0.1:8000/api/notifications/read-all", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const getToastIcon = (type) => {
    switch (type) {
      case "success":
        return <CheckCircle size={18} className="text-emerald-500 shrink-0" />;
      case "error":
        return <AlertCircle size={18} className="text-rose-500 shrink-0" />;
      case "warning":
        return <AlertTriangle size={18} className="text-amber-500 shrink-0" />;
      default:
        return <Info size={18} className="text-blue-500 shrink-0" />;
    }
  };

  const getToastStyle = (type) => {
    switch (type) {
      case "success":
        return "bg-emerald-950/90 text-emerald-100 border-emerald-500/40";
      case "error":
        return "bg-rose-950/90 text-rose-100 border-rose-500/40";
      case "warning":
        return "bg-amber-950/90 text-amber-100 border-amber-500/40";
      default:
        return "bg-slate-900/90 text-slate-100 border-slate-700";
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        showToast
      }}
    >
      {children}

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md border ${getToastStyle(
              toast.type
            )} max-w-md text-xs sm:text-sm font-medium`}
          >
            {getToastIcon(toast.type)}
            <span className="flex-1 leading-snug">{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="text-white/60 hover:text-white p-1 rounded-lg"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};

export const useNotification = useNotifications;
