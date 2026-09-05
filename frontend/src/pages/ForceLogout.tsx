import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ForceLogout() {
  const navigate = useNavigate();
  const [cleared, setCleared] = useState(false);

  useEffect(() => {
    // Clear all authentication data
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");

    // Also clear session storage
    sessionStorage.clear();

    setCleared(true);
  }, []);

  useEffect(() => {
    if (cleared) {
      navigate("/login", { replace: true });
    }
  }, [cleared, navigate]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h2>Signing out...</h2>
        <p>Clearing your authentication session.</p>
      </div>
    </div>
  );
}