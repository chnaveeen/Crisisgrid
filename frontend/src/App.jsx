import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import CitizenDashboard from './pages/CitizenDashboard';
import ReportEmergencyPage from './pages/ReportEmergencyPage';
import ControlCenterPage from './pages/ControlCenterPage';
import IncidentDetailsPage from './pages/IncidentDetailsPage';
import ResourcesPage from './pages/ResourcesPage';
import CctvMonitoringPage from './pages/CctvMonitoringPage';

// Protected Route wrapper for Admin
const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Protected Route wrapper for Citizen
const CitizenRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            {/* Page 1: Landing Page */}
            <Route path="/" element={<LandingPage />} />

            {/* Page 2: Login */}
            <Route path="/login" element={<LoginPage />} />

            {/* Page 3: Citizen Dashboard */}
            <Route
              path="/dashboard"
              element={
                <CitizenRoute>
                  <CitizenDashboard />
                </CitizenRoute>
              }
            />

            {/* Page 4: Report Emergency (Accessible to all citizens & visitors) */}
            <Route path="/report" element={<ReportEmergencyPage />} />

            {/* Page 5: Control Center (Admin only) */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <ControlCenterPage />
                </AdminRoute>
              }
            />

            {/* Page 6: Incident Details & Resource Dispatch (Admin only) */}
            <Route
              path="/admin/incidents/:id"
              element={
                <AdminRoute>
                  <IncidentDetailsPage />
                </AdminRoute>
              }
            />

            {/* Page 7: Resources Fleet Management (Admin only) */}
            <Route
              path="/admin/resources"
              element={
                <AdminRoute>
                  <ResourcesPage />
                </AdminRoute>
              }
            />

            {/* Page 8: CCTV Surveillance Fleet Monitoring (Admin only) */}
            <Route
              path="/admin/cctv"
              element={
                <AdminRoute>
                  <CctvMonitoringPage />
                </AdminRoute>
              }
            />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
