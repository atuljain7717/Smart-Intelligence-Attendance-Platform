
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Mail,
  ShieldCheck,
} from "lucide-react";

import { forgotPassword } from "../services/authService";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resetUrl, setResetUrl] = useState("");

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);

      const response = await forgotPassword({
        email: cleanEmail,
      });

      setSuccess(true);

      if (response.development_reset_url) {
        setResetUrl(response.development_reset_url);
      }
    } catch (err: any) {
      console.error("Forgot password error:", err);

      setError(
        err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Unable to create password reset request. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleResetPassword() {
    if (!resetUrl) {
      setError(
        "Reset link is not available. Please request a new reset link."
      );
      return;
    }

    window.location.href = resetUrl;
  }

  /*
   * ============================================================
   * SUCCESS SCREEN
   * ============================================================
   */

  if (success) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          background:
            "linear-gradient(135deg, #eef2ff, #f8fafc)",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "520px",
            background: "#ffffff",
            borderRadius: "18px",
            padding: "40px",
            boxShadow:
              "0 20px 50px rgba(15, 23, 42, 0.12)",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              textAlign: "center",
              marginBottom: "28px",
            }}
          >
            <CheckCircle2
              size={58}
              style={{
                marginBottom: "14px",
              }}
            />

            <h1
              style={{
                margin: "0 0 10px",
                color: "#0f172a",
                fontSize: "28px",
                fontWeight: 700,
              }}
            >
              Reset Link Created
            </h1>

            <p
              style={{
                margin: 0,
                color: "#64748b",
                fontSize: "14px",
                lineHeight: 1.6,
              }}
            >
              Your password reset request was created
              successfully.
            </p>
          </div>

          {resetUrl ? (
            <div
              style={{
                marginBottom: "20px",
                padding: "18px",
                borderRadius: "12px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "10px",
                  color: "#334155",
                  fontSize: "13px",
                  fontWeight: 700,
                }}
              >
                <ShieldCheck size={17} />
                Password Reset Link
              </div>

              <div
                style={{
                  wordBreak: "break-all",
                  padding: "12px",
                  background: "#ffffff",
                  border: "1px solid #cbd5e1",
                  borderRadius: "8px",
                  color: "#475569",
                  fontSize: "12px",
                  lineHeight: 1.5,
                  marginBottom: "14px",
                }}
              >
                {resetUrl}
              </div>

              {/* RESET PASSWORD BUTTON */}
              <button
                type="button"
                onClick={handleResetPassword}
                style={{
                  width: "100%",
                  height: "48px",
                  border: "none",
                  borderRadius: "10px",
                  background: "#2563eb",
                  color: "#ffffff",
                  fontSize: "15px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Reset Password
              </button>
            </div>
          ) : (
            <div
              style={{
                marginBottom: "20px",
                padding: "15px",
                borderRadius: "10px",
                background: "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#1e40af",
                fontSize: "14px",
                lineHeight: 1.5,
              }}
            >
              Your reset request was created successfully.
              If email delivery is configured, check your
              inbox for the password reset link.
            </div>
          )}

          {/* BACK TO LOGIN */}
          <button
            type="button"
            onClick={() => navigate("/login")}
            style={{
              width: "100%",
              height: "46px",
              border: "1px solid #cbd5e1",
              borderRadius: "9px",
              background: "#ffffff",
              color: "#334155",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Back to Login
          </button>
        </div>
      </main>
    );
  }

  /*
   * ============================================================
   * FORGOT PASSWORD FORM
   * ============================================================
   */

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background:
          "linear-gradient(135deg, #eef2ff, #f8fafc)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "430px",
          background: "#ffffff",
          borderRadius: "18px",
          padding: "36px",
          boxShadow:
            "0 20px 50px rgba(15, 23, 42, 0.12)",
          boxSizing: "border-box",
        }}
      >
        {/* BACK */}
        <button
          type="button"
          onClick={() => navigate("/login")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            border: "none",
            background: "transparent",
            color: "#64748b",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: 600,
            padding: 0,
            marginBottom: "25px",
          }}
        >
          <ArrowLeft size={16} />
          Back to Login
        </button>

        {/* HEADER */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "30px",
          }}
        >
          <ShieldCheck
            size={44}
            style={{
              marginBottom: "10px",
            }}
          />

          <h1
            style={{
              margin: "0 0 8px",
              fontSize: "28px",
              fontWeight: 700,
              color: "#0f172a",
            }}
          >
            Forgot Password?
          </h1>

          <p
            style={{
              margin: 0,
              color: "#64748b",
              fontSize: "14px",
              lineHeight: 1.6,
            }}
          >
            Enter your registered email address to create
            a secure password reset link.
          </p>
        </div>

        {/* ERROR */}
        {error && (
          <div
            style={{
              marginBottom: "20px",
              padding: "12px 14px",
              borderRadius: "10px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              fontSize: "14px",
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleSubmit}>
          <label
            htmlFor="forgot-email"
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              fontWeight: 600,
              color: "#334155",
            }}
          >
            Email Address
          </label>

          <div
            style={{
              position: "relative",
              marginBottom: "20px",
            }}
          >
            <Mail
              size={18}
              style={{
                position: "absolute",
                left: "13px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "#64748b",
              }}
            />

            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="Enter your registered email"
              autoComplete="email"
              disabled={loading}
              required
              style={{
                width: "100%",
                height: "48px",
                padding: "0 13px 0 42px",
                border: "1px solid #cbd5e1",
                borderRadius: "9px",
                outline: "none",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              height: "48px",
              border: "none",
              borderRadius: "10px",
              background: "#2563eb",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: 700,
              cursor: loading
                ? "not-allowed"
                : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading
              ? "Creating Reset Link..."
              : "Create Reset Link"}
          </button>
        </form>

        <p
          style={{
            marginTop: "22px",
            marginBottom: 0,
            textAlign: "center",
            color: "#94a3b8",
            fontSize: "12px",
            lineHeight: 1.5,
          }}
        >
          For local development, the reset link may appear
          directly on this page.
        </p>
      </div>
    </main>
  );
}

