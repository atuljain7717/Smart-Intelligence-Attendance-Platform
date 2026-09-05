
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  UserPlus,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

import api from "../services/api";

export default function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2) {
      setError("Please enter your full name.");
      return;
    }

    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (password.length < 8) {
      setError(
        "Password must contain at least 8 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);

      await api.post("/api/auth/register", {
        name: cleanName,
        email: cleanEmail,
        password,
      });

      setSuccess(true);
    } catch (err: any) {
      console.error("Registration error:", err);

      const detail = err?.response?.data?.detail;

      if (Array.isArray(detail)) {
        setError(
          detail
            .map((item: any) => item?.msg)
            .filter(Boolean)
            .join(", ")
        );
      } else {
        setError(
          detail ||
            err?.response?.data?.message ||
            "Unable to create account. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
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
              Account Created
            </h1>

            <p
              style={{
                margin: 0,
                color: "#64748b",
                fontSize: "14px",
                lineHeight: 1.6,
              }}
            >
              Your Smart Attendance account has been
              created successfully.
            </p>
          </div>

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
                marginBottom: "12px",
                color: "#334155",
                fontSize: "14px",
                fontWeight: 700,
              }}
            >
              <ShieldCheck size={18} />
              Account Details
            </div>

            <div
              style={{
                display: "grid",
                gap: "8px",
                fontSize: "13px",
                color: "#475569",
              }}
            >
              <div>
                <strong>Name:</strong> {name.trim()}
              </div>

              <div
                style={{
                  wordBreak: "break-word",
                }}
              >
                <strong>Email:</strong> {email.trim()}
              </div>

              <div>
                <strong>Role:</strong> Employee
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate("/login")}
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
            Continue to Login
          </button>
        </div>
      </main>
    );
  }

  /*
   * ============================================================
   * REGISTER FORM
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
          maxWidth: "450px",
          background: "#ffffff",
          borderRadius: "18px",
          padding: "36px",
          boxShadow:
            "0 20px 50px rgba(15, 23, 42, 0.12)",
          boxSizing: "border-box",
        }}
      >
        {/* BACK TO LOGIN */}

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
          <UserPlus
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
            Create Account
          </h1>

          <p
            style={{
              margin: 0,
              color: "#64748b",
              fontSize: "14px",
              lineHeight: 1.6,
            }}
          >
            Create your Smart Attendance account to
            continue.
          </p>
        </div>

        {/* ERROR */}

        {error && (
          <div
            role="alert"
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
          {/* NAME */}

          <label
            htmlFor="register-name"
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              fontWeight: 600,
              color: "#334155",
            }}
          >
            Full Name
          </label>

          <div
            style={{
              position: "relative",
              marginBottom: "18px",
            }}
          >
            <UserPlus
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
              id="register-name"
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="Enter your full name"
              autoComplete="name"
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

          {/* EMAIL */}

          <label
            htmlFor="register-email"
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
              marginBottom: "18px",
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
              id="register-email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="Enter your email address"
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

          {/* PASSWORD */}

          <label
            htmlFor="register-password"
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              fontWeight: 600,
              color: "#334155",
            }}
          >
            Password
          </label>

          <div
            style={{
              position: "relative",
              marginBottom: "18px",
            }}
          >
            <Lock
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
              id="register-password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="Create a password"
              autoComplete="new-password"
              disabled={loading}
              required
              minLength={8}
              style={{
                width: "100%",
                height: "48px",
                padding: "0 44px 0 42px",
                border: "1px solid #cbd5e1",
                borderRadius: "9px",
                outline: "none",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(!showPassword)
              }
              disabled={loading}
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
                color: "#64748b",
                cursor: "pointer",
                padding: "5px",
              }}
            >
              {showPassword ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>
          </div>

          {/* CONFIRM PASSWORD */}

          <label
            htmlFor="register-confirm-password"
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "14px",
              fontWeight: 600,
              color: "#334155",
            }}
          >
            Confirm Password
          </label>

          <div
            style={{
              position: "relative",
              marginBottom: "20px",
            }}
          >
            <Lock
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
              id="register-confirm-password"
              type={
                showConfirmPassword
                  ? "text"
                  : "password"
              }
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              placeholder="Confirm your password"
              autoComplete="new-password"
              disabled={loading}
              required
              minLength={8}
              style={{
                width: "100%",
                height: "48px",
                padding: "0 44px 0 42px",
                border: "1px solid #cbd5e1",
                borderRadius: "9px",
                outline: "none",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            />

            <button
              type="button"
              onClick={() =>
                setShowConfirmPassword(
                  !showConfirmPassword
                )
              }
              disabled={loading}
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
                color: "#64748b",
                cursor: "pointer",
                padding: "5px",
              }}
            >
              {showConfirmPassword ? (
                <EyeOff size={18} />
              ) : (
                <Eye size={18} />
              )}
            </button>
          </div>

          {/* CREATE ACCOUNT */}

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
              ? "Creating Account..."
              : "Create Account"}
          </button>
        </form>

        {/* LOGIN LINK */}

        <p
          style={{
            marginTop: "22px",
            marginBottom: 0,
            textAlign: "center",
            color: "#64748b",
            fontSize: "13px",
          }}
        >
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => navigate("/login")}
            style={{
              border: "none",
              background: "transparent",
              color: "#2563eb",
              fontWeight: 700,
              cursor: "pointer",
              padding: 0,
              fontSize: "13px",
            }}
          >
            Sign In
          </button>
        </p>
      </div>
    </main>
  );
}
