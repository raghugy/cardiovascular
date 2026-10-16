// src/App.jsx
import React from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";

// Context Providers
import { AuthProvider, useAuth } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";

// Public Components
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import AiHealthAssistant from "./components/AiHealthAssistant";

// Public Pages
import Hero from "./pages/Hero";
import Home from "./pages/Home";
import About from "./pages/About";
import Contact from "./pages/Contact";
import DiseaseDetail from "./pages/DiseaseDetail";
import AuthLanding from "./pages/AuthLanding";
import ForgotPassword from "./pages/ForgotPassword";

// Route Guard
import ProtectedRoute from "./components/ProtectedRoute";

// Admin Portal Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminDoctors from "./pages/admin/AdminDoctors";
import AdminDoctorAssignments from "./pages/admin/AdminDoctorAssignments";
import AdminFeedback from "./pages/admin/AdminFeedback";
import AdminReports from "./pages/admin/AdminReports";
import AdminDietWellness from "./pages/admin/AdminDietWellness";
import AdminFoodCatalog from "./pages/admin/AdminFoodCatalog";
import AdminAuditLogs from "./pages/admin/AdminAuditLogs";

// Patient Portal Pages
import PatientWelcome from "./pages/patient/PatientWelcome";
import PatientDashboard from "./pages/patient/PatientDashboard";
import PatientUpload from "./pages/patient/PatientUpload";
import PatientPredictions from "./pages/patient/PatientPredictions";
import PatientDiet from "./pages/patient/PatientDiet";
import PatientWellness from "./pages/patient/PatientWellness";
import PatientProfile from "./pages/patient/PatientProfile";
import PatientHelp from "./pages/patient/PatientHelp";

const LayoutWrapper = ({ children }) => {
  const location = useLocation();
  const { isAuthenticated, role } = useAuth();

  const isPortal =
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/patient");

  const hidePublicNav =
    location.pathname === "/" ||
    location.pathname === "/login" ||
    location.pathname === "/signup" ||
    location.pathname === "/admin-login" ||
    location.pathname === "/forgot-password" ||
    isPortal;

  return (
    <div className="flex flex-col min-h-screen">
      {!hidePublicNav && <Navbar />}

      <main className={`flex-grow ${!hidePublicNav ? "pt-20" : ""}`}>
        {children}
      </main>

      {/* Floating AI Health Assistant for Patients */}
      {isAuthenticated && role === "patient" && location.pathname !== "/patient/welcome" && (
        <AiHealthAssistant />
      )}

      {!hidePublicNav && <Footer />}
    </div>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <LayoutWrapper>
          <Routes>
            {/* Initial Landing & Authentication Routes */}
            <Route path="/" element={<AuthLanding defaultTab="login" />} />
            <Route path="/login" element={<AuthLanding defaultTab="login" />} />
            <Route path="/signup" element={<AuthLanding defaultTab="register" />} />
            <Route path="/admin-login" element={<AuthLanding openAdminModal={true} />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Public Health Education Routes */}
            <Route path="/home" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/disease/:diseaseId" element={<DiseaseDetail />} />

            {/* Admin Portal Routes */}
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/reports"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/diet-wellness"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminDietWellness />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/food-catalog"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminFoodCatalog />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/audit-logs"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminAuditLogs />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/doctors"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminDoctors />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/doctor-assignments"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminDoctorAssignments />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/feedback"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminFeedback />
                </ProtectedRoute>
              }
            />

            {/* Patient Portal Routes */}
            <Route
              path="/patient/welcome"
              element={
                <ProtectedRoute allowedRoles={["patient"]}>
                  <PatientWelcome />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/dashboard"
              element={
                <ProtectedRoute allowedRoles={["patient"]}>
                  <PatientDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/upload"
              element={
                <ProtectedRoute allowedRoles={["patient"]}>
                  <PatientUpload />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/predictions"
              element={
                <ProtectedRoute allowedRoles={["patient"]}>
                  <PatientPredictions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/diet"
              element={
                <ProtectedRoute allowedRoles={["patient"]}>
                  <PatientDiet />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/wellness"
              element={
                <ProtectedRoute allowedRoles={["patient"]}>
                  <PatientWellness />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/profile"
              element={
                <ProtectedRoute allowedRoles={["patient"]}>
                  <PatientProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/help"
              element={
                <ProtectedRoute allowedRoles={["patient"]}>
                  <PatientHelp />
                </ProtectedRoute>
              }
            />

            {/* Legacy & Convenience Redirects */}
            <Route path="/doctor/*" element={<Navigate to="/login" replace />} />
            <Route path="/patient/feedback" element={<Navigate to="/patient/help" replace />} />
            <Route path="/patient/appointments" element={<Navigate to="/patient/help" replace />} />
            <Route path="/prediction" element={<Navigate to="/patient/upload" replace />} />
            <Route path="/profile" element={<Navigate to="/patient/profile" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </LayoutWrapper>
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;
