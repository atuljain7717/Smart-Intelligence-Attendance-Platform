import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import type { AuthUser } from "../services/authService";
import { useAuth } from "../context/AuthContext";

export default function GoogleCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setAuthSession } = useAuth();

  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const completeGoogleLogin = async () => {
      try {
        const token = searchParams.get("access_token");
        const userEncoded = searchParams.get("user");

        console.log("Google callback started");
        console.log("Access token received:", Boolean(token));
        console.log("User data received:", Boolean(userEncoded));

        if (!token || !userEncoded) {
          throw new Error(
            "Google authentication data is missing."
          );
        }

        // ------------------------------------------------------
        // DECODE USER
        // ------------------------------------------------------

        const normalizedBase64 = userEncoded
          .replace(/-/g, "+")
          .replace(/_/g, "/")
          .padEnd(
            userEncoded.length +
              ((4 - (userEncoded.length % 4)) % 4),
            "="
          );

        const binaryString = atob(normalizedBase64);

        const bytes = Uint8Array.from(
          binaryString,
          (character) => character.charCodeAt(0)
        );

        const userJson = new TextDecoder().decode(bytes);

        const user = JSON.parse(userJson) as AuthUser;

        console.log("Google user decoded:", user.email);

        if (cancelled) {
          return;
        }

        // ------------------------------------------------------
        // SAVE AUTH SESSION
        // ------------------------------------------------------

        setAuthSession(token, user);

        console.log("Google session saved");

        // ------------------------------------------------------
        // REDIRECT IMMEDIATELY
        // ------------------------------------------------------

        if (!cancelled) {
          navigate("/dashboard", {
            replace: true,
          });
        }
      } catch (err) {
        console.error("Google callback error:", err);

        if (cancelled) {
          return;
        }

        localStorage.removeItem("access_token");
        localStorage.removeItem("user");

        setError(
          err instanceof Error
            ? err.message
            : "Unable to complete Google authentication."
        );
      }
    };

    completeGoogleLogin();

    return () => {
      cancelled = true;
    };
  }, [navigate, searchParams, setAuthSession]);

  // ------------------------------------------------------------
  // ERROR
  // ------------------------------------------------------------

  if (error) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div
          style={{
            textAlign: "center",
            maxWidth: "460px",
          }}
        >
          <h2>Google Authentication Failed</h2>

          <p
            style={{
              marginTop: "10px",
              opacity: 0.75,
            }}
          >
            {error}
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/login", {
                replace: true,
              })
            }
            style={{
              marginTop: "20px",
              padding: "12px 20px",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            Back to Login
          </button>
        </div>
      </main>
    );
  }

  // ------------------------------------------------------------
  // LOADING
  // ------------------------------------------------------------

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "42px",
            height: "42px",
            border: "4px solid #ddd",
            borderTopColor: "#333",
            borderRadius: "50%",
            margin: "0 auto 20px",
            animation: "googleSpin 0.8s linear infinite",
          }}
        />

        <h2>Signing you in...</h2>

        <p
          style={{
            marginTop: "8px",
            opacity: 0.7,
          }}
        >
          Please wait while we complete Google authentication.
        </p>

        <style>
          {`
            @keyframes googleSpin {
              from {
                transform: rotate(0deg);
              }
              to {
                transform: rotate(360deg);
              }
            }
          `}
        </style>
      </div>
    </main>
  );
}