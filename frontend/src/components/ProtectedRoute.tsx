import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export default function ProtectedRoute({
  allowedRoles,
}: ProtectedRouteProps) {
  const location = useLocation();
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "Inter, system-ui, sans-serif",
          background: "#f8fafc",
          color: "#334155",
        }}
      >
        Checking authentication...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  if (
    allowedRoles &&
    allowedRoles.length > 0 &&
    !allowedRoles.some(
      (role) => role.toLowerCase() === user.role?.toLowerCase()
    )
  ) {
    const fallbackPath =
      user.role?.toLowerCase() === "employee"
        ? "/employee-dashboard"
        : "/dashboard";

    return <Navigate to={fallbackPath} replace />;
  }

  return <Outlet />;
}