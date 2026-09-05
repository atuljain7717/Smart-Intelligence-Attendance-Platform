import { useState } from "react";
import type { FormEvent } from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
} from "lucide-react";
import api from "../services/api";

export default function ResetPassword() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setError("");

    if (!token) {
      setError("Invalid or missing password reset token.");
      return;
    }

    if (password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      await api.post("/api/auth/reset-password", {
        token,
        new_password: password,
      });

      setSuccess(true);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
          "Unable to reset your password. The link may have expired."
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <section className="page">
        <div
          className="dashboard-card"
          style={{
            maxWidth: "520px",
            margin: "60px auto",
          }}
        >
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
            }}
          >
            <CheckCircle2 size={52} />

            <h1>Password Created</h1>

            <p>
              Your password has been updated successfully.
              You can now log in with your new password.
            </p>

            <button
              type="button"
              className="dashboard-refresh-button"
              onClick={() => {
                window.location.href = "/login";
              }}
            >
              Go to Login
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="page">
      <div
        className="dashboard-card"
        style={{
          maxWidth: "520px",
          margin: "60px auto",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: "30px",
          }}
        >
          <ShieldCheck size={42} />

          <h1>Create New Password</h1>

          <p>
            Create a secure password for your Smart Attendance
            Intelligence account.
          </p>
        </div>

        {error && (
          <div
            className="dashboard-error"
            style={{
              marginBottom: "20px",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label
            style={{
              display: "block",
              marginBottom: "20px",
            }}
          >
            <span>Password</span>

            <div
              style={{
                position: "relative",
              }}
            >
              <Lock
                size={18}
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />

              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                placeholder="Enter new password"
                autoComplete="new-password"
                required
                style={{
                  paddingLeft: "42px",
                  paddingRight: "45px",
                  width: "100%",
                }}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(!showPassword)
                }
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </label>

          <label
            style={{
              display: "block",
              marginBottom: "25px",
            }}
          >
            <span>Confirm Password</span>

            <div
              style={{
                position: "relative",
              }}
            >
              <Lock
                size={18}
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                }}
              />

              <input
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                value={confirmPassword}
                onChange={(event) =>
                  setConfirmPassword(event.target.value)
                }
                placeholder="Confirm new password"
                autoComplete="new-password"
                required
                style={{
                  paddingLeft: "42px",
                  paddingRight: "45px",
                  width: "100%",
                }}
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(
                    !showConfirmPassword
                  )
                }
                aria-label={
                  showConfirmPassword
                    ? "Hide password"
                    : "Show password"
                }
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                }}
              >
                {showConfirmPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </label>

          <button
            type="submit"
            className="dashboard-refresh-button"
            disabled={loading}
            style={{
              width: "100%",
            }}
          >
            {loading
              ? "Creating Password..."
              : "Create Password"}
          </button>
        </form>
      </div>
    </section>
  );
}