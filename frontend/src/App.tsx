import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import ProtectedRoute from "./components/ProtectedRoute";

import Dashboard from "./pages/Dashboard";
import Employees from "./pages/Employees";
import Attendance from "./pages/Attendance";
import LiveOperations from "./pages/LiveOperations";
import LiveLocation from "./pages/LiveLocation";
import FaceRecognition from "./pages/FaceRecognition";
import Analytics from "./pages/Analytics";
import Reports from "./pages/Reports";
import Locations from "./pages/Locations";
import AuditLogs from "./pages/AuditLogs";
import Settings from "./pages/Settings";

import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import ForceLogout from "./pages/ForceLogout";
import GoogleCallback from "./pages/GoogleCallback";

import "./App.css";

function AppLayout() {
  return (
    <div className="app-shell">
      <Sidebar />

      <div className="app-main">
        <Topbar />

        <main className="page-content">
          <Routes>
            {/* Dashboard */}
            <Route
              path="/dashboard"
              element={<Dashboard />}
            />

            {/* Employees */}
            <Route
              path="/employees"
              element={<Employees />}
            />

            {/* Attendance */}
            <Route
              path="/attendance"
              element={<Attendance />}
            />

            {/* Live Operations */}
            <Route
              path="/live-operations"
              element={<LiveOperations />}
            />

            {/* Live Employee Location */}
            <Route
              path="/live-location"
              element={<LiveLocation />}
            />

            {/* Locations */}
            <Route
              path="/locations"
              element={<Locations />}
            />

            {/* Face Recognition */}
            <Route
              path="/face-recognition"
              element={<FaceRecognition />}
            />

            {/* Analytics */}
            <Route
              path="/analytics"
              element={<Analytics />}
            />

            {/* Reports */}
            <Route
              path="/reports"
              element={<Reports />}
            />

            {/* Existing Location Management route */}
            <Route
              path="/location-management"
              element={<Locations />}
            />

            {/* Audit Logs */}
            <Route
              path="/audit-logs"
              element={<AuditLogs />}
            />

            {/* Settings */}
            <Route
              path="/settings"
              element={<Settings />}
            />

            {/* Default */}
            <Route
              path="/"
              element={
                <Navigate
                  to="/dashboard"
                  replace
                />
              }
            />

            {/* Unknown protected route */}
            <Route
              path="*"
              element={
                <Navigate
                  to="/dashboard"
                  replace
                />
              }
            />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ================================
            PUBLIC ROUTES
        ================================= */}

        {/* Login */}
        <Route
          path="/login"
          element={<Login />}
        />

        {/* Google OAuth Callback */}
        <Route
          path="/google-callback"
          element={<GoogleCallback />}
        />

        {/* Password Reset */}
        <Route
          path="/reset-password"
          element={<ResetPassword />}
        />

        {/* Force Logout */}
        <Route
          path="/reset-auth"
          element={<ForceLogout />}
        />

        {/* ================================
            PROTECTED APPLICATION
        ================================= */}

        <Route element={<ProtectedRoute />}>
          <Route
            path="/*"
            element={<AppLayout />}
          />
        </Route>

        {/* ================================
            FALLBACK
        ================================= */}

        <Route
          path="*"
          element={
            <Navigate
              to="/login"
              replace
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}