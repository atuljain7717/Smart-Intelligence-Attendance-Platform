import {
  Bell,
  Building2,
  Camera,
  CheckCircle2,
  Clock3,
  Lock,
  Mail,
  MapPin,
  Save,
  ShieldCheck,
  User,
} from "lucide-react";

import { useEffect, useState } from "react";

import {
  getSettings,
  updateSettings,
  type PlatformSettings,
} from "../services/settingsService";

const defaultSettings: PlatformSettings = {
  organization_name: "Smart Attendance Intelligence",
  default_location: "Nagpur, Maharashtra",
  timezone: "Asia/Kolkata",
  notifications_enabled: true,
  location_tracking_enabled: true,
  face_recognition_enabled: true,
};

export default function Settings() {
  const [settings, setSettings] =
    useState<PlatformSettings>(defaultSettings);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadSettings = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getSettings();

        if (mounted) {
          setSettings(data);
        }
      } catch (err: unknown) {
        console.error("Settings load error:", err);

        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load settings."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void loadSettings();

    return () => {
      mounted = false;
    };
  }, []);

  const updateField = <
    K extends keyof PlatformSettings
  >(
    field: K,
    value: PlatformSettings[K]
  ) => {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }));

    setSaved(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setSaved(false);
      setError("");

      const updated =
        await updateSettings(settings);

      setSettings(updated);
      setSaved(true);

      window.setTimeout(() => {
        setSaved(false);
      }, 2500);
    } catch (err: unknown) {
      console.error("Settings save error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to save settings."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className="page settings-page">
        <div className="settings-loading">
          <div className="settings-loading-icon">
            <ShieldCheck size={24} />
          </div>

          <strong>Loading settings</strong>

          <span>
            Reading platform configuration...
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="page settings-page">

      {/* =====================================================
          PAGE STYLES
      ===================================================== */}

      <style>{`

        /* ===================================================
           PAGE
        =================================================== */

        .settings-page {
          width: 100%;
          max-width: 1380px;
          margin: 0 auto;
          padding: 28px;
          box-sizing: border-box;
        }


        /* ===================================================
           HEADER
        =================================================== */

        .settings-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 26px;
        }

        .settings-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;

          margin-bottom: 8px;

          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.12em;

          opacity: 0.55;
        }

        .settings-title {
          margin: 0;

          font-size: 30px;
          line-height: 1.15;
          font-weight: 750;

          letter-spacing: -0.03em;
        }

        .settings-description {
          margin: 8px 0 0;

          max-width: 650px;

          font-size: 14px;
          line-height: 1.6;

          opacity: 0.58;
        }


        /* ===================================================
           SAVE BUTTON
        =================================================== */

        .settings-save-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;

          min-width: 145px;
          height: 44px;

          padding: 0 18px;

          border: 1px solid rgba(99, 102, 241, 0.45);
          border-radius: 11px;

          background: linear-gradient(
            135deg,
            #4f46e5,
            #6366f1
          );

          color: #ffffff;

          font-size: 13px;
          font-weight: 750;

          cursor: pointer;

          box-shadow:
            0 8px 22px rgba(79, 70, 229, 0.20);

          transition:
            transform 0.18s ease,
            box-shadow 0.18s ease,
            opacity 0.18s ease;
        }

        .settings-save-button:hover:not(:disabled) {
          transform: translateY(-2px);

          box-shadow:
            0 12px 28px rgba(79, 70, 229, 0.28);
        }

        .settings-save-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .settings-save-button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }


        /* ===================================================
           ALERTS
        =================================================== */

        .settings-alert {
          display: flex;
          align-items: flex-start;
          gap: 12px;

          padding: 14px 16px;
          margin-bottom: 20px;

          border-radius: 13px;

          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.035);
        }

        .settings-alert-icon {
          display: flex;
          align-items: center;
          justify-content: center;

          width: 34px;
          height: 34px;

          flex-shrink: 0;

          border-radius: 9px;
        }

        .settings-alert.error
        .settings-alert-icon {
          background: rgba(239, 68, 68, 0.10);
          color: #ef4444;
        }

        .settings-alert.success
        .settings-alert-icon {
          background: rgba(34, 197, 94, 0.10);
          color: #22c55e;
        }

        .settings-alert-content {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .settings-alert-content strong {
          font-size: 13px;
        }

        .settings-alert-content span {
          font-size: 12px;
          opacity: 0.58;
        }


        /* ===================================================
           MAIN GRID
        =================================================== */

        .settings-modern-grid {
          display: grid;

          grid-template-columns:
            repeat(2, minmax(0, 1fr));

          gap: 18px;
        }


        /* ===================================================
           CARD
        =================================================== */

        .settings-modern-card {
          position: relative;

          padding: 22px;

          border: 1px solid rgba(255, 255, 255, 0.075);
          border-radius: 17px;

          background:
            linear-gradient(
              145deg,
              rgba(255,255,255,0.045),
              rgba(255,255,255,0.018)
            );

          box-shadow:
            0 12px 35px rgba(0, 0, 0, 0.10);

          overflow: hidden;

          transition:
            border-color 0.2s ease,
            transform 0.2s ease;
        }

        .settings-modern-card:hover {
          border-color: rgba(255,255,255,0.12);
        }


        /* ===================================================
           CARD HEADER
        =================================================== */

        .settings-modern-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;

          padding-bottom: 18px;
          margin-bottom: 19px;

          border-bottom:
            1px solid rgba(255,255,255,0.065);
        }

        .settings-card-title-area {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .settings-card-icon {
          display: flex;
          align-items: center;
          justify-content: center;

          width: 38px;
          height: 38px;

          flex-shrink: 0;

          border-radius: 11px;

          background: rgba(99,102,241,0.10);
          color: #6366f1;
        }

        .settings-modern-card h2 {
          margin: 0;

          font-size: 16px;
          font-weight: 720;
        }

        .settings-modern-card-header p {
          margin: 4px 0 0;

          font-size: 12px;
          line-height: 1.4;

          opacity: 0.50;
        }


        /* ===================================================
           FORM
        =================================================== */

        .settings-modern-form {
          display: flex;
          flex-direction: column;
          gap: 17px;
        }

        .settings-modern-field {
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .settings-modern-field label {
          display: flex;
          align-items: center;
          gap: 7px;

          font-size: 11px;
          font-weight: 750;

          letter-spacing: 0.02em;

          opacity: 0.64;
        }

        .settings-modern-field input,
        .settings-modern-field select {
          width: 100%;
          height: 44px;

          box-sizing: border-box;

          padding: 0 13px;

          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 10px;

          background: rgba(255,255,255,0.035);

          color: inherit;

          outline: none;

          font-family: inherit;
          font-size: 13px;

          transition:
            border-color 0.18s ease,
            background 0.18s ease,
            box-shadow 0.18s ease;
        }

        .settings-modern-field input:hover,
        .settings-modern-field select:hover {
          background: rgba(255,255,255,0.055);

          border-color:
            rgba(255,255,255,0.14);
        }

        .settings-modern-field input:focus,
        .settings-modern-field select:focus {
          border-color:
            rgba(99,102,241,0.70);

          background:
            rgba(99,102,241,0.045);

          box-shadow:
            0 0 0 3px
            rgba(99,102,241,0.10);
        }

        .settings-modern-field input::placeholder {
          opacity: 0.30;
        }

        .settings-modern-field input:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }


        /* ===================================================
           SELECT
        =================================================== */

        .settings-modern-field select {
          cursor: pointer;
        }


        /* ===================================================
           TOGGLE
        =================================================== */

        .settings-toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 20px;
        }

        .settings-toggle-info {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .settings-toggle-info strong {
          font-size: 13px;
          font-weight: 700;
        }

        .settings-toggle-info span {
          max-width: 480px;

          font-size: 12px;
          line-height: 1.5;

          opacity: 0.52;
        }

        .settings-toggle {
          position: relative;

          width: 48px;
          height: 27px;

          flex-shrink: 0;

          padding: 0;

          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 999px;

          background: rgba(255,255,255,0.08);

          cursor: pointer;

          transition:
            background 0.2s ease,
            border-color 0.2s ease;
        }

        .settings-toggle span {
          position: absolute;

          top: 4px;
          left: 4px;

          width: 17px;
          height: 17px;

          border-radius: 50%;

          background: #ffffff;

          box-shadow:
            0 2px 7px rgba(0,0,0,0.20);

          transition:
            transform 0.2s ease;
        }

        .settings-toggle.active {
          background: #4f46e5;

          border-color: #6366f1;
        }

        .settings-toggle.active span {
          transform: translateX(21px);
        }


        /* ===================================================
           SECURITY
        =================================================== */

        .settings-security-box {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 18px;
        }

        .settings-security-info {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .settings-security-info strong {
          font-size: 13px;
        }

        .settings-security-info span {
          font-size: 12px;
          line-height: 1.5;

          opacity: 0.52;
        }

        .settings-password-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;

          height: 39px;

          padding: 0 14px;

          flex-shrink: 0;

          border:
            1px solid rgba(99,102,241,0.28);

          border-radius: 10px;

          background:
            rgba(99,102,241,0.08);

          color: #6366f1;

          font-family: inherit;
          font-size: 12px;
          font-weight: 750;

          cursor: pointer;

          transition:
            transform 0.18s ease,
            background 0.18s ease,
            border-color 0.18s ease;
        }

        .settings-password-button:hover {
          transform: translateY(-1px);

          background:
            rgba(99,102,241,0.14);

          border-color:
            rgba(99,102,241,0.48);
        }


        /* ===================================================
           LOADING
        =================================================== */

        .settings-loading {
          min-height: 300px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          gap: 8px;

          text-align: center;
        }

        .settings-loading-icon {
          display: flex;
          align-items: center;
          justify-content: center;

          width: 54px;
          height: 54px;

          margin-bottom: 8px;

          border-radius: 15px;

          background: rgba(99,102,241,0.10);
          color: #6366f1;
        }

        .settings-loading strong {
          font-size: 15px;
        }

        .settings-loading span {
          font-size: 12px;
          opacity: 0.50;
        }


        /* ===================================================
           RESPONSIVE
        =================================================== */

        @media (max-width: 900px) {
          .settings-modern-grid {
            grid-template-columns: 1fr;
          }

          .settings-header {
            align-items: stretch;
            flex-direction: column;
          }

          .settings-save-button {
            width: 100%;
          }
        }

        @media (max-width: 600px) {
          .settings-page {
            padding: 18px;
          }

          .settings-title {
            font-size: 25px;
          }

          .settings-modern-card {
            padding: 18px;
            border-radius: 14px;
          }

          .settings-security-box {
            align-items: stretch;
            flex-direction: column;
          }

          .settings-password-button {
            width: 100%;
          }

          .settings-toggle-row {
            align-items: flex-start;
          }
        }

      `}</style>


      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="settings-header">

        <div>

          <div className="settings-eyebrow">
            <ShieldCheck size={13} />
            SYSTEM CONFIGURATION
          </div>

          <h1 className="settings-title">
            Settings
          </h1>

          <p className="settings-description">
            Manage your Smart Attendance Intelligence
            platform preferences, monitoring controls
            and security configuration.
          </p>

        </div>


        <button
          type="button"
          className="settings-save-button"
          onClick={() => void handleSave()}
          disabled={saving}
        >

          <Save size={16} />

          {saving
            ? "Saving..."
            : saved
              ? "Saved"
              : "Save Changes"}

        </button>

      </header>


      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div className="settings-alert error">

          <div className="settings-alert-icon">
            <ShieldCheck size={18} />
          </div>

          <div className="settings-alert-content">

            <strong>
              Settings error
            </strong>

            <span>
              {error}
            </span>

          </div>

        </div>
      )}


      {/* =====================================================
          SUCCESS
      ===================================================== */}

      {saved && (
        <div className="settings-alert success">

          <div className="settings-alert-icon">
            <CheckCircle2 size={18} />
          </div>

          <div className="settings-alert-content">

            <strong>
              Settings saved successfully
            </strong>

            <span>
              Your platform configuration has been
              updated.
            </span>

          </div>

        </div>
      )}


      {/* =====================================================
          SETTINGS GRID
      ===================================================== */}

      <div className="settings-modern-grid">


        {/* ===================================================
            PROFILE
        =================================================== */}

        <div className="settings-modern-card">

          <div className="settings-modern-card-header">

            <div className="settings-card-title-area">

              <div className="settings-card-icon">
                <User size={19} />
              </div>

              <div>

                <h2>
                  Profile
                </h2>

                <p>
                  Administrator account information
                </p>

              </div>

            </div>

          </div>


          <div className="settings-modern-form">

            <div className="settings-modern-field">

              <label>
                <User size={13} />
                FULL NAME
              </label>

              <input
                type="text"
                defaultValue="Administrator"
                placeholder="Enter full name"
              />

            </div>


            <div className="settings-modern-field">

              <label>
                <Mail size={13} />
                EMAIL ADDRESS
              </label>

              <input
                type="email"
                defaultValue="admin@example.com"
                placeholder="Enter email address"
              />

            </div>


            <div className="settings-modern-field">

              <label>
                <ShieldCheck size={13} />
                ROLE
              </label>

              <input
                type="text"
                value="Administrator"
                disabled
                readOnly
              />

            </div>

          </div>

        </div>


        {/* ===================================================
            ORGANIZATION
        =================================================== */}

        <div className="settings-modern-card">

          <div className="settings-modern-card-header">

            <div className="settings-card-title-area">

              <div className="settings-card-icon">
                <Building2 size={19} />
              </div>

              <div>

                <h2>
                  Organization
                </h2>

                <p>
                  Workforce organization settings
                </p>

              </div>

            </div>

          </div>


          <div className="settings-modern-form">

            <div className="settings-modern-field">

              <label>
                <Building2 size={13} />
                ORGANIZATION NAME
              </label>

              <input
                type="text"
                value={settings.organization_name}
                onChange={(event) =>
                  updateField(
                    "organization_name",
                    event.target.value
                  )
                }
                placeholder="Organization name"
              />

            </div>


            <div className="settings-modern-field">

              <label>
                <MapPin size={13} />
                DEFAULT LOCATION
              </label>

              <input
                type="text"
                value={settings.default_location}
                onChange={(event) =>
                  updateField(
                    "default_location",
                    event.target.value
                  )
                }
                placeholder="Default location"
              />

            </div>


            <div className="settings-modern-field">

              <label>
                <Clock3 size={13} />
                TIME ZONE
              </label>

              <select
                value={settings.timezone}
                onChange={(event) =>
                  updateField(
                    "timezone",
                    event.target.value
                  )
                }
              >

                <option value="Asia/Kolkata">
                  India Standard Time (IST)
                </option>

                <option value="UTC">
                  Coordinated Universal Time (UTC)
                </option>

              </select>

            </div>

          </div>

        </div>


        {/* ===================================================
            NOTIFICATIONS
        =================================================== */}

        <div className="settings-modern-card">

          <div className="settings-modern-card-header">

            <div className="settings-card-title-area">

              <div className="settings-card-icon">
                <Bell size={19} />
              </div>

              <div>

                <h2>
                  Notifications
                </h2>

                <p>
                  Control system notifications
                </p>

              </div>

            </div>

          </div>


          <SettingToggle
            title="System Notifications"
            description="Receive important alerts about attendance, security and system activity."
            enabled={
              settings.notifications_enabled
            }
            onChange={() =>
              updateField(
                "notifications_enabled",
                !settings.notifications_enabled
              )
            }
          />

        </div>


        {/* ===================================================
            LOCATION & PRIVACY
        =================================================== */}

        <div className="settings-modern-card">

          <div className="settings-modern-card-header">

            <div className="settings-card-title-area">

              <div className="settings-card-icon">
                <MapPin size={19} />
              </div>

              <div>

                <h2>
                  Location & Privacy
                </h2>

                <p>
                  Employee location monitoring controls
                </p>

              </div>

            </div>

          </div>


          <SettingToggle
            title="Live Location Tracking"
            description="Allow the platform to receive employee GPS positions for location-based attendance."
            enabled={
              settings.location_tracking_enabled
            }
            onChange={() =>
              updateField(
                "location_tracking_enabled",
                !settings.location_tracking_enabled
              )
            }
          />

        </div>


        {/* ===================================================
            FACE RECOGNITION
        =================================================== */}

        <div className="settings-modern-card">

          <div className="settings-modern-card-header">

            <div className="settings-card-title-area">

              <div className="settings-card-icon">
                <Camera size={19} />
              </div>

              <div>

                <h2>
                  Face Recognition
                </h2>

                <p>
                  Biometric attendance verification
                </p>

              </div>

            </div>

          </div>


          <SettingToggle
            title="Face Recognition"
            description="Enable face recognition for secure attendance verification."
            enabled={
              settings.face_recognition_enabled
            }
            onChange={() =>
              updateField(
                "face_recognition_enabled",
                !settings.face_recognition_enabled
              )
            }
          />

        </div>


        {/* ===================================================
            SECURITY
        =================================================== */}

        <div className="settings-modern-card">

          <div className="settings-modern-card-header">

            <div className="settings-card-title-area">

              <div className="settings-card-icon">
                <Lock size={19} />
              </div>

              <div>

                <h2>
                  Security
                </h2>

                <p>
                  Account and authentication settings
                </p>

              </div>

            </div>

          </div>


          <div className="settings-security-box">

            <div className="settings-security-info">

              <strong>
                Administrator Security
              </strong>

              <span>
                Manage your password and authentication
                preferences.
              </span>

            </div>


            <button
              type="button"
              className="settings-password-button"
              onClick={() =>
                alert(
                  "Password change functionality will be connected here."
                )
              }
            >

              <Lock size={15} />

              Change Password

            </button>

          </div>

        </div>

      </div>

    </section>
  );
}


/* =========================================================
   TOGGLE COMPONENT
========================================================= */

function SettingToggle({
  title,
  description,
  enabled,
  onChange,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onChange: () => void;
}) {
  return (
    <div className="settings-toggle-row">

      <div className="settings-toggle-info">

        <strong>
          {title}
        </strong>

        <span>
          {description}
        </span>

      </div>


      <button
        type="button"
        className={
          enabled
            ? "settings-toggle active"
            : "settings-toggle"
        }
        aria-pressed={enabled}
        aria-label={`${title}: ${
          enabled ? "enabled" : "disabled"
        }`}
        onClick={onChange}
      >

        <span />

      </button>

    </div>
  );
}