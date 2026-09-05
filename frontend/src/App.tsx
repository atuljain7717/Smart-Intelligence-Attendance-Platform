
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
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
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
            <Route
              path="/dashboard"
              element={<Dashboard />}
            />

            <Route
              path="/employees"
              element={<Employees />}
            />

            <Route
              path="/attendance"
              element={<Attendance />}
            />

            <Route
              path="/live-operations"
              element={<LiveOperations />}
            />

            <Route
              path="/live-location"
              element={<LiveLocation />}
            />

            <Route
              path="/locations"
              element={<Locations />}
            />

            <Route
              path="/face-recognition"
              element={<FaceRecognition />}
            />

            <Route
              path="/analytics"
              element={<Analytics />}
            />

            <Route
              path="/reports"
              element={<Reports />}
            />

            <Route
              path="/location-management"
              element={<Locations />}
            />

            <Route
              path="/audit-logs"
              element={<AuditLogs />}
            />

            <Route
              path="/settings"
              element={<Settings />}
            />

            <Route
              path="/"
              element={
                <Navigate
                  to="/dashboard"
                  replace
                />
              }
            />

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

        {/* Create Account */}
        <Route
          path="/register"
          element={<Register />}
        />

        {/* Forgot Password */}
        <Route
          path="/forgot-password"
          element={<ForgotPassword />}
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
