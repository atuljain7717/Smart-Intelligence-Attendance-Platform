import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Fingerprint,
  LockKeyhole,
  Mail,
  ScanFace,
  ShieldCheck,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";

import { useNavigate, useSearchParams } from "react-router-dom";

import { loginWithGoogle } from "../services/authService";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { login, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const googleError = searchParams.get("error");

    if (googleError) {
      setError("Google authentication failed. Please try again.");
    }
  }, [searchParams]);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    try {
      const user = await login(cleanEmail, password);

      const role = user.role?.trim().toLowerCase();

      if (role === "admin") {
        navigate("/dashboard", {
          replace: true,
        });
        return;
      }

      if (role === "employee") {
        navigate("/employee-dashboard", {
          replace: true,
        });
        return;
      }

      setError(
        "Your account role is not configured. Please contact the administrator."
      );
    } catch (err: any) {
      console.error("Normal login error:", err);

      const backendMessage = err?.response?.data?.detail;

      if (typeof backendMessage === "string") {
        setError(backendMessage);
      } else if (err?.response?.status === 401) {
        setError("Invalid email or password.");
      } else if (err?.response?.status === 403) {
        setError(
          "Your account is inactive or access is restricted."
        );
      } else {
        setError(
          "Unable to connect to the server. Please make sure the backend is running."
        );
      }
    }
  };

  const handleGoogleLogin = () => {
    setError("");
    setGoogleLoading(true);

    try {
      loginWithGoogle();
    } catch (err) {
      console.error("Google login error:", err);

      setGoogleLoading(false);
      setError(
        "Unable to start Google authentication."
      );
    }
  };

  const handleForgotPassword = () => {
    navigate("/forgot-password");
  };

  const handleRegister = () => {
    navigate("/register");
  };

  const isSubmitting = loading || googleLoading;

  return (
    <>
      <div className="auth-page">

        {/* =====================================================
            BACKGROUND
        ====================================================== */}

        <div className="grid-background" />

        <div className="ambient ambient-one" />
        <div className="ambient ambient-two" />
        <div className="ambient ambient-three" />

        {/* =====================================================
            LEFT AI PLATFORM PANEL
        ====================================================== */}

        <section className="platform-panel">

          <div className="platform-inner">

            {/* BRAND */}

            <div className="brand">
              <div className="brand-mark">
                <Fingerprint size={23} />
              </div>

              <div>
                <div className="brand-title">
                  SMART ATTENDANCE
                </div>

                <div className="brand-caption">
                  INTELLIGENCE PLATFORM
                </div>
              </div>
            </div>

            {/* HERO */}

            <div className="hero-copy">

              <div className="eyebrow">
                <Activity size={13} />
                INTELLIGENT WORKFORCE OPERATIONS
              </div>

              <h1>
                Attendance
                <br />
                <span>reimagined.</span>
              </h1>

              <p>
                A unified intelligence platform for
                biometric verification, workforce
                attendance, real-time monitoring and
                actionable analytics.
              </p>

            </div>

            {/* AI VISUAL */}

            <div className="ai-visual">

              <div className="visual-orbit orbit-one" />
              <div className="visual-orbit orbit-two" />
              <div className="visual-orbit orbit-three" />

              <div className="visual-core">
                <ScanFace size={42} />
              </div>

              <div className="visual-point point-one" />
              <div className="visual-point point-two" />
              <div className="visual-point point-three" />

              <div className="visual-label label-top">
                BIOMETRIC
              </div>

              <div className="visual-label label-bottom">
                VERIFIED IDENTITY
              </div>

            </div>

            {/* FEATURE CARDS */}

            <div className="feature-grid">

              <div className="feature-card">
                <div className="feature-icon">
                  <ScanFace size={18} />
                </div>

                <div>
                  <strong>AI Biometrics</strong>
                  <span>
                    Intelligent face verification
                  </span>
                </div>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <Users size={18} />
                </div>

                <div>
                  <strong>Workforce Intelligence</strong>
                  <span>
                    Real-time employee insights
                  </span>
                </div>
              </div>

              <div className="feature-card">
                <div className="feature-icon">
                  <Zap size={18} />
                </div>

                <div>
                  <strong>Smart Automation</strong>
                  <span>
                    Faster attendance operations
                  </span>
                </div>
              </div>

            </div>

            {/* FOOTER */}

            <div className="platform-footer">
              <CheckCircle2 size={15} />

              <span>
                Secure identity • Intelligent decisions •
                Connected operations
              </span>
            </div>

          </div>
        </section>

        {/* =====================================================
            LOGIN PANEL
        ====================================================== */}

        <section className="login-panel">

          <div className="login-container">

            {/* MOBILE BRAND */}

            <div className="mobile-brand">

              <div className="mobile-brand-mark">
                <Fingerprint size={20} />
              </div>

              <div>
                <strong>
                  SMART ATTENDANCE
                </strong>

                <span>
                  INTELLIGENCE PLATFORM
                </span>
              </div>

            </div>

            {/* LOGIN HEADER */}

            <div className="login-header">

              <div className="login-label">
                SECURE ACCESS
              </div>

              <h2>
                Welcome
                <br />
                <span>back.</span>
              </h2>

              <p>
                Sign in to access your Smart Attendance
                Intelligence workspace.
              </p>

            </div>

            {/* SYSTEM INDICATORS */}

            <div className="access-indicators">

              <div>
                <span className="indicator-dot" />
                Identity service
                <b>Online</b>
              </div>

              <div>
                <ShieldCheck size={13} />
                Encrypted session
              </div>

            </div>

            {/* ERROR */}

            {error && (
              <div className="error-box">

                <div className="error-icon">
                  !
                </div>

                <span>{error}</span>

              </div>
            )}

            {/* GOOGLE */}

            <button
              type="button"
              className="google-button"
              onClick={handleGoogleLogin}
              disabled={isSubmitting}
            >
              {googleLoading ? (
                <span className="spinner google-spinner" />
              ) : (
                <span className="google-logo">
                  G
                </span>
              )}

              <span>
                {googleLoading
                  ? "Connecting to Google..."
                  : "Continue with Google"}
              </span>

              {!googleLoading && (
                <ArrowRight size={16} />
              )}
            </button>

            {/* DIVIDER */}

            <div className="divider">

              <span />

              <small>
                OR SIGN IN WITH EMAIL
              </small>

              <span />

            </div>

            {/* FORM */}

            <form
              onSubmit={handleSubmit}
              className="login-form"
            >

              {/* EMAIL */}

              <div className="field">

                <label htmlFor="email">
                  Email address
                </label>

                <div className="input-wrapper">

                  <div className="input-icon">
                    <Mail size={17} />
                  </div>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="you@company.com"
                    autoComplete="email"
                    disabled={isSubmitting}
                  />

                </div>

              </div>

              {/* PASSWORD */}

              <div className="field">

                <div className="password-row">

                  <label htmlFor="password">
                    Password
                  </label>

                  <button
                    type="button"
                    className="forgot-button"
                    onClick={handleForgotPassword}
                    disabled={isSubmitting}
                  >
                    Forgot password?
                  </button>

                </div>

                <div className="input-wrapper">

                  <div className="input-icon">
                    <LockKeyhole size={17} />
                  </div>

                  <input
                    id="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={isSubmitting}
                  />

                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() =>
                      setShowPassword(
                        (value) => !value
                      )
                    }
                    disabled={isSubmitting}
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>

                </div>

              </div>

              {/* LOGIN BUTTON */}

              <button
                type="submit"
                className="login-button"
                disabled={isSubmitting}
              >

                <span className="button-shine" />

                {loading ? (
                  <>
                    <span className="spinner" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <span className="login-button-icon">
                      <ShieldCheck size={17} />
                    </span>

                    Sign in securely

                    <ArrowRight size={17} />
                  </>
                )}

              </button>

            </form>

            {/* REGISTER */}

            <div className="register-box">

              <div className="register-icon">
                <UserPlus size={16} />
              </div>

              <div className="register-text">
                <span>
                  New to the platform?
                </span>

                <button
                  type="button"
                  onClick={handleRegister}
                  disabled={isSubmitting}
                >
                  Create employee account
                  <ArrowRight size={14} />
                </button>
              </div>

            </div>

            {/* SECURITY */}

            <div className="security-card">

              <div className="security-icon">
                <ShieldCheck size={18} />
              </div>

              <div>

                <strong>
                  Protected workspace
                </strong>

                <span>
                  Authentication is protected with
                  encrypted sessions and secure
                  identity controls.
                </span>

              </div>

            </div>

            {/* BOTTOM META */}

            <div className="login-meta">

              <span>
                <span className="meta-dot" />
                SYSTEM OPERATIONAL
              </span>

              <span>
                SMART ATTENDANCE INTELLIGENCE
              </span>

            </div>

          </div>

        </section>

      </div>

      <style>{`

        * {
          box-sizing: border-box;
        }

        .auth-page {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1.18fr 0.82fr;
          position: relative;
          overflow: hidden;
          background: #06101d;
          color: #f8fafc;
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        /* =====================================================
           BACKGROUND
        ====================================================== */

        .grid-background {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.32;

          background-image:
            linear-gradient(
              rgba(148, 163, 184, 0.035) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(148, 163, 184, 0.035) 1px,
              transparent 1px
            );

          background-size: 44px 44px;
        }

        .ambient {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          filter: blur(100px);
        }

        .ambient-one {
          width: 520px;
          height: 520px;
          left: -230px;
          bottom: -260px;
          background: rgba(37, 99, 235, 0.22);
        }

        .ambient-two {
          width: 430px;
          height: 430px;
          right: 35%;
          top: -260px;
          background: rgba(6, 182, 212, 0.13);
        }

        .ambient-three {
          width: 340px;
          height: 340px;
          left: 38%;
          bottom: -220px;
          background: rgba(14, 165, 233, 0.08);
        }

        /* =====================================================
           LEFT PLATFORM
        ====================================================== */

        .platform-panel {
          position: relative;
          z-index: 2;
          min-height: 100vh;
          display: flex;
          align-items: center;
          padding: 58px 72px;
        }

        .platform-inner {
          width: 100%;
          max-width: 700px;
        }

        /* BRAND */

        .brand {
          display: flex;
          align-items: center;
          gap: 13px;
          margin-bottom: 48px;
        }

        .brand-mark {
          width: 47px;
          height: 47px;
          display: grid;
          place-items: center;
          border-radius: 14px;

          background:
            linear-gradient(
              135deg,
              #2563eb,
              #0891b2
            );

          color: white;

          box-shadow:
            0 15px 40px rgba(37, 99, 235, 0.3);

          position: relative;
        }

        .brand-mark::after {
          content: "";
          position: absolute;
          inset: -5px;
          border-radius: 17px;
          border: 1px solid rgba(96, 165, 250, 0.16);
        }

        .brand-title {
          font-size: 17px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .brand-caption {
          margin-top: 3px;
          color: #67e8f9;
          font-size: 8px;
          letter-spacing: 2.5px;
          font-weight: 800;
        }

        /* STATUS */

        .system-status {
          display: inline-flex;
          align-items: center;
          gap: 9px;

          padding: 8px 12px;

          border:
            1px solid
            rgba(96, 165, 250, 0.15);

          background:
            rgba(15, 23, 42, 0.6);

          border-radius: 999px;

          color: #93c5fd;

          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.4px;

          margin-bottom: 25px;
        }

        .status-pulse {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #22c55e;

          box-shadow:
            0 0 0 5px
            rgba(34, 197, 94, 0.09);

          animation: pulse 2s infinite;
        }

        .status-line {
          width: 1px;
          height: 13px;
          background: rgba(148, 163, 184, 0.2);
        }

        .status-version {
          color: #64748b;
          font-size: 8px;
        }

        /* HERO */

        .hero-copy {
          max-width: 650px;
        }

        .eyebrow {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #38bdf8;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 1.6px;
          margin-bottom: 15px;
        }

        .hero-copy h1 {
          margin: 0;

          font-size:
            clamp(48px, 5.5vw, 76px);

          line-height: 0.96;
          letter-spacing: -4px;
          font-weight: 900;
        }

        .hero-copy h1 span {
          background:
            linear-gradient(
              90deg,
              #60a5fa,
              #22d3ee
            );

          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .hero-copy p {
          max-width: 590px;
          margin: 27px 0 0;

          color: #94a3b8;

          font-size: 14px;
          line-height: 1.8;
        }

        /* =====================================================
           AI VISUAL
        ====================================================== */

        .ai-visual {
          width: 100%;
          height: 210px;
          margin: 35px 0 26px;

          position: relative;

          display: flex;
          align-items: center;
          justify-content: center;

          overflow: hidden;
        }

        .visual-orbit {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(56, 189, 248, 0.13);
        }

        .orbit-one {
          width: 125px;
          height: 125px;
        }

        .orbit-two {
          width: 190px;
          height: 190px;
          border-style: dashed;
          animation: rotate 15s linear infinite;
        }

        .orbit-three {
          width: 250px;
          height: 250px;
          opacity: 0.55;
          animation: rotateReverse 22s linear infinite;
        }

        .visual-core {
          width: 82px;
          height: 82px;

          display: grid;
          place-items: center;

          border-radius: 24px;

          color: #67e8f9;

          background:
            radial-gradient(
              circle,
              rgba(14, 165, 233, 0.22),
              rgba(15, 23, 42, 0.9)
            );

          border:
            1px solid
            rgba(56, 189, 248, 0.4);

          box-shadow:
            0 0 50px rgba(14, 165, 233, 0.18),
            inset 0 0 25px rgba(14, 165, 233, 0.08);

          z-index: 3;
        }

        .visual-point {
          width: 6px;
          height: 6px;
          position: absolute;
          border-radius: 50%;
          background: #38bdf8;

          box-shadow:
            0 0 15px rgba(56, 189, 248, 0.8);
        }

        .point-one {
          top: 28px;
          left: 31%;
        }

        .point-two {
          right: 29%;
          bottom: 35px;
          background: #22c55e;
        }

        .point-three {
          right: 37%;
          top: 39px;
          background: #818cf8;
        }

        .visual-label {
          position: absolute;
          color: #475569;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 2px;
        }

        .label-top {
          top: 9px;
        }

        .label-bottom {
          bottom: 7px;
        }

        /* =====================================================
           FEATURES
        ====================================================== */

        .feature-grid {
          display: grid;
          grid-template-columns:
            repeat(3, 1fr);
          gap: 10px;
        }

        .feature-card {
          min-height: 72px;

          display: flex;
          align-items: center;
          gap: 10px;

          padding: 13px;

          border:
            1px solid
            rgba(148, 163, 184, 0.09);

          background:
            rgba(15, 23, 42, 0.55);

          border-radius: 15px;

          transition:
            transform 0.2s ease,
            border-color 0.2s ease;
        }

        .feature-card:hover {
          transform: translateY(-2px);
          border-color:
            rgba(56, 189, 248, 0.22);
        }

        .feature-icon {
          width: 35px;
          height: 35px;

          flex-shrink: 0;

          display: grid;
          place-items: center;

          border-radius: 10px;

          color: #38bdf8;

          background:
            rgba(14, 165, 233, 0.08);

          border:
            1px solid
            rgba(56, 189, 248, 0.1);
        }

        .feature-card strong,
        .feature-card span {
          display: block;
        }

        .feature-card strong {
          color: #e2e8f0;
          font-size: 10px;
          margin-bottom: 4px;
        }

        .feature-card span {
          color: #64748b;
          font-size: 8px;
          line-height: 1.4;
        }

        .platform-footer {
          display: flex;
          align-items: center;
          gap: 8px;

          margin-top: 23px;

          color: #475569;
          font-size: 9px;
          letter-spacing: 0.3px;
        }

        .platform-footer svg {
          color: #22c55e;
        }

        /* =====================================================
           LOGIN PANEL
        ====================================================== */

        .login-panel {
          position: relative;
          z-index: 3;

          min-height: 100vh;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 45px;

          background:
            rgba(248, 250, 252, 0.98);

          color: #0f172a;

          border-top-left-radius: 38px;
          border-bottom-left-radius: 38px;

          box-shadow:
            -25px 0 70px
            rgba(2, 8, 23, 0.18);
        }

        .login-container {
          width: 100%;
          max-width: 430px;
        }

        /* MOBILE BRAND */

        .mobile-brand {
          display: none;
        }

        /* HEADER */

        .login-header {
          margin-bottom: 17px;
        }

        .login-label {
          display: flex;
          align-items: center;
          gap: 8px;

          color: #2563eb;

          font-size: 9px;
          font-weight: 900;
          letter-spacing: 2px;

          margin-bottom: 11px;
        }

        .login-label::before {
          content: "";
          width: 20px;
          height: 2px;
          border-radius: 5px;

          background:
            linear-gradient(
              90deg,
              #2563eb,
              #22d3ee
            );
        }

        .login-header h2 {
          margin: 0;

          font-size: 42px;
          line-height: 0.98;
          letter-spacing: -2px;
          font-weight: 900;

          color: #0f172a;
        }

        .login-header h2 span {
          color: #2563eb;
        }

        .login-header p {
          margin: 13px 0 0;

          color: #64748b;

          font-size: 13px;
          line-height: 1.65;
        }

        /* ACCESS STATUS */

        .access-indicators {
          display: flex;
          align-items: center;
          gap: 16px;

          margin: 20px 0;

          color: #64748b;

          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.7px;
        }

        .access-indicators > div {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .access-indicators b {
          color: #16a34a;
          font-weight: 900;
        }

        .indicator-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow:
            0 0 0 4px
            rgba(34, 197, 94, 0.08);
        }

        /* ERROR */

        .error-box {
          display: flex;
          align-items: center;
          gap: 10px;

          padding: 11px 13px;

          margin-bottom: 15px;

          border:
            1px solid
            #fecaca;

          border-radius: 12px;

          background: #fff1f2;
          color: #be123c;

          font-size: 11px;
          line-height: 1.45;
        }

        .error-icon {
          width: 22px;
          height: 22px;

          flex-shrink: 0;

          display: grid;
          place-items: center;

          border-radius: 50%;

          background: #e11d48;
          color: white;

          font-size: 11px;
          font-weight: 900;
        }

        /* GOOGLE */

        .google-button {
          width: 100%;
          height: 51px;

          position: relative;

          display: flex;
          align-items: center;
          justify-content: center;

          gap: 10px;

          border:
            1px solid
            #dbe3ec;

          border-radius: 13px;

          background: white;
          color: #1e293b;

          cursor: pointer;

          font-size: 12px;
          font-weight: 800;

          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease,
            border-color 0.2s ease;
        }

        .google-button:hover:not(:disabled) {
          transform: translateY(-2px);

          border-color: #bfdbfe;

          box-shadow:
            0 10px 25px
            rgba(37, 99, 235, 0.08);
        }

        .google-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .google-logo {
          width: 22px;
          height: 22px;

          display: grid;
          place-items: center;

          font-size: 18px;
          font-weight: 900;

          color: #4285f4;
        }

        /* DIVIDER */

        .divider {
          display: flex;
          align-items: center;
          gap: 10px;

          margin: 21px 0;
        }

        .divider span {
          flex: 1;
          height: 1px;
          background: #e2e8f0;
        }

        .divider small {
          color: #94a3b8;

          font-size: 7px;
          font-weight: 900;
          letter-spacing: 1.2px;

          white-space: nowrap;
        }

        /* FORM */

        .login-form {
          display: grid;
          gap: 17px;
        }

        .field label {
          display: block;

          color: #334155;

          font-size: 11px;
          font-weight: 800;

          margin-bottom: 7px;
        }

        .password-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        /* INPUT */

        .input-wrapper {
          height: 51px;

          display: flex;
          align-items: center;

          padding: 0 12px;

          gap: 10px;

          border:
            1px solid
            #dbe3ec;

          border-radius: 13px;

          background: white;

          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .input-wrapper:focus-within {
          border-color: #60a5fa;

          box-shadow:
            0 0 0 4px
            rgba(37, 99, 235, 0.08);
        }

        .input-icon {
          width: 28px;
          height: 28px;

          display: grid;
          place-items: center;

          border-radius: 8px;

          color: #2563eb;

          background:
            rgba(37, 99, 235, 0.07);

          flex-shrink: 0;
        }

        .input-wrapper input {
          width: 100%;

          border: none;
          outline: none;

          background: transparent;

          color: #0f172a;

          font-size: 12px;
        }

        .input-wrapper input::placeholder {
          color: #a8b3c1;
        }

        .password-toggle {
          border: none;
          background: transparent;

          color: #94a3b8;

          cursor: pointer;

          padding: 5px;

          display: grid;
          place-items: center;
        }

        .password-toggle:hover:not(:disabled) {
          color: #2563eb;
        }

        /* FORGOT */

        .forgot-button {
          border: none;
          background: transparent;

          color: #2563eb;

          font-size: 9px;
          font-weight: 800;

          cursor: pointer;
          padding: 0;
        }

        .forgot-button:hover:not(:disabled) {
          color: #1d4ed8;
        }

        .forgot-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* =====================================================
           MAIN LOGIN BUTTON
        ====================================================== */

        .login-button {
          width: 100%;
          height: 53px;

          position: relative;
          overflow: hidden;

          display: flex;
          align-items: center;
          justify-content: center;

          gap: 9px;

          margin-top: 2px;

          border: none;
          border-radius: 13px;

          background:
            linear-gradient(
              135deg,
              #1d4ed8,
              #2563eb 50%,
              #0891b2
            );

          color: white;

          font-size: 12px;
          font-weight: 900;

          cursor: pointer;

          box-shadow:
            0 13px 30px
            rgba(37, 99, 235, 0.24);

          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .login-button:hover:not(:disabled) {
          transform: translateY(-2px);

          box-shadow:
            0 18px 35px
            rgba(37, 99, 235, 0.3);
        }

        .login-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .button-shine {
          position: absolute;

          width: 90px;
          height: 180px;

          top: -60px;
          left: -130px;

          transform: rotate(25deg);

          background:
            rgba(255, 255, 255, 0.14);

          animation:
            buttonShine 4s
            ease-in-out infinite;
        }

        .login-button-icon {
          width: 25px;
          height: 25px;

          display: grid;
          place-items: center;

          border-radius: 7px;

          background:
            rgba(255, 255, 255, 0.13);
        }

        /* SPINNER */

        .spinner {
          width: 16px;
          height: 16px;

          display: inline-block;

          border:
            2px solid
            rgba(255, 255, 255, 0.3);

          border-top-color: white;

          border-radius: 50%;

          animation:
            spin 0.7s linear infinite;
        }

        .google-spinner {
          border-color: #dbeafe;
          border-top-color: #2563eb;
        }

        /* REGISTER */

        .register-box {
          display: flex;
          align-items: center;
          gap: 11px;

          margin-top: 21px;
          padding: 12px 13px;

          border:
            1px solid
            #e2e8f0;

          border-radius: 13px;

          background:
            #f8fafc;
        }

        .register-icon {
          width: 30px;
          height: 30px;

          display: grid;
          place-items: center;

          flex-shrink: 0;

          border-radius: 9px;

          color: #2563eb;

          background:
            #eff6ff;
        }

        .register-text {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .register-text span {
          color: #64748b;
          font-size: 9px;
        }

        .register-text button {
          display: inline-flex;
          align-items: center;
          gap: 4px;

          width: fit-content;

          border: none;
          background: transparent;

          padding: 0;

          color: #2563eb;

          font-size: 10px;
          font-weight: 900;

          cursor: pointer;
        }

        .register-text button:hover:not(:disabled) {
          color: #1d4ed8;
        }

        /* SECURITY */

        .security-card {
          display: flex;
          align-items: flex-start;
          gap: 10px;

          margin-top: 15px;
          padding: 13px;

          border-radius: 13px;

          background:
            linear-gradient(
              135deg,
              #eff6ff,
              #f0fdfa
            );

          border:
            1px solid
            #dbeafe;
        }

        .security-icon {
          width: 29px;
          height: 29px;

          display: grid;
          place-items: center;

          flex-shrink: 0;

          border-radius: 8px;

          color: #2563eb;

          background: white;
        }

        .security-card strong,
        .security-card span {
          display: block;
        }

        .security-card strong {
          color: #334155;
          font-size: 10px;
          margin-bottom: 3px;
        }

        .security-card span {
          color: #64748b;
          font-size: 8px;
          line-height: 1.5;
        }

        /* META */

        .login-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;

          margin-top: 22px;

          color: #94a3b8;

          font-size: 7px;
          font-weight: 800;
          letter-spacing: 0.8px;
        }

        .login-meta > span:first-child {
          display: flex;
          align-items: center;
          gap: 5px;

          color: #64748b;
        }

        .meta-dot {
          width: 5px;
          height: 5px;

          border-radius: 50%;

          background: #22c55e;
        }

        /* =====================================================
           ANIMATIONS
        ====================================================== */

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }

          50% {
            opacity: 0.45;
          }
        }

        @keyframes rotate {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        @keyframes rotateReverse {
          from {
            transform: rotate(360deg);
          }

          to {
            transform: rotate(0deg);
          }
        }

        @keyframes buttonShine {
          0% {
            left: -130px;
          }

          30%,
          100% {
            left: 120%;
          }
        }

        /* =====================================================
           TABLET
        ====================================================== */

        @media (max-width: 1100px) {

          .auth-page {
            grid-template-columns: 1fr 0.9fr;
          }

          .platform-panel {
            padding: 45px;
          }

          .hero-copy h1 {
            font-size: 57px;
          }

          .feature-card {
            padding: 10px;
          }

        }

        /* =====================================================
           MOBILE
        ====================================================== */

        @media (max-width: 850px) {

          .auth-page {
            display: block;
            min-height: 100vh;

            background:
              radial-gradient(
                circle at 20% 10%,
                rgba(37, 99, 235, 0.08),
                transparent 35%
              ),
              #f8fafc;
          }

          .platform-panel {
            display: none;
          }

          .login-panel {
            min-height: 100vh;

            border-radius: 0;

            padding:
              30px 20px;

            box-shadow: none;
          }

          .mobile-brand {
            display: flex;
            align-items: center;
            gap: 10px;

            margin-bottom: 42px;
          }

          .mobile-brand-mark {
            width: 39px;
            height: 39px;

            display: grid;
            place-items: center;

            border-radius: 11px;

            background:
              linear-gradient(
                135deg,
                #2563eb,
                #0891b2
              );

            color: white;

            box-shadow:
              0 9px 22px
              rgba(37, 99, 235, 0.2);
          }

          .mobile-brand strong,
          .mobile-brand span {
            display: block;
          }

          .mobile-brand strong {
            color: #0f172a;

            font-size: 14px;
            font-weight: 900;
            letter-spacing: 1.4px;
          }

          .mobile-brand span {
            margin-top: 2px;

            color: #2563eb;

            font-size: 7px;
            font-weight: 900;
            letter-spacing: 1.7px;
          }

          .login-container {
            max-width: 470px;
          }

        }

        /* =====================================================
           SMALL MOBILE
        ====================================================== */

        @media (max-width: 480px) {

          .login-panel {
            padding:
              23px 17px;
          }

          .mobile-brand {
            margin-bottom: 35px;
          }

          .login-header h2 {
            font-size: 35px;
          }

          .login-header p {
            font-size: 12px;
          }

          .access-indicators {
            flex-wrap: wrap;
            gap: 10px;
          }

          .register-box {
            align-items: flex-start;
          }

          .login-meta {
            flex-direction: column;
            align-items: flex-start;
            gap: 7px;
          }

        }

      `}</style>
    </>
  );
}