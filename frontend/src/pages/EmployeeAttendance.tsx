import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  CheckCircle2,
  Clock3,
  Crosshair,
  LogIn,
  LogOut,
  MapPin,
  Navigation,
  RefreshCw,
  ShieldCheck,
  Signal,
  Wifi,
  WifiOff,
} from "lucide-react";
import api from "../services/api";

type AttendanceStatus = {
  checked_in: boolean;
  attendance_id?: number | null;
  check_in?: string | null;
  check_out?: string | null;
  status?: string | null;
};

type GPSState = {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  updatedAt: string | null;
};

const GPS_UPDATE_INTERVAL = 5000;

export default function EmployeeAttendance() {
  const [attendance, setAttendance] = useState<AttendanceStatus>({
    checked_in: false,
  });

  const [gps, setGps] = useState<GPSState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    updatedAt: null,
  });

  const [tracking, setTracking] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const loadAttendanceStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/api/attendance/my-status");

      const data = response.data;

      setAttendance({
        checked_in: Boolean(
          data?.checked_in ??
            data?.is_checked_in ??
            data?.attendance?.checked_in
        ),
        attendance_id:
          data?.attendance_id ??
          data?.id ??
          data?.attendance?.id ??
          null,
        check_in:
          data?.check_in ??
          data?.attendance?.check_in ??
          null,
        check_out:
          data?.check_out ??
          data?.attendance?.check_out ??
          null,
        status:
          data?.status ??
          data?.attendance?.status ??
          null,
      });
    } catch (err: any) {
      console.error("Attendance status error:", err);

      setError(
        err?.response?.data?.detail ||
          "Unable to load your attendance status."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const sendLocation = useCallback(
    async (position: GeolocationPosition, force = false) => {
      const now = Date.now();

      if (!force && now - lastUpdateRef.current < GPS_UPDATE_INTERVAL) {
        return;
      }

      lastUpdateRef.current = now;

      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      const accuracy = position.coords.accuracy;

      setGps({
        latitude,
        longitude,
        accuracy,
        updatedAt: new Date().toISOString(),
      });

      try {
        await api.post("/api/live-location/update", {
          latitude,
          longitude,
          accuracy_meters: accuracy,
          speed: position.coords.speed ?? undefined,
          heading: position.coords.heading ?? undefined,
        });

        setTracking(true);
      } catch (err) {
        console.error("Live GPS update failed:", err);
        setTracking(false);
      }
    },
    []
  );

  const startGPSTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }

    if (watchIdRef.current !== null) {
      return;
    }

    setError("");

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        void sendLocation(position);
      },
      (geoError) => {
        console.error("GPS error:", geoError);

        setTracking(false);

        if (geoError.code === geoError.PERMISSION_DENIED) {
          setError(
            "Location permission was denied. Please allow location access."
          );
        } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
          setError("Your current GPS position is unavailable.");
        } else if (geoError.code === geoError.TIMEOUT) {
          setError("GPS request timed out. Trying again...");
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 3000,
        timeout: 15000,
      }
    );
  }, [sendLocation]);

  const stopGPSTracking = useCallback(async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setTracking(false);

    try {
      await api.post("/api/live-location/stop");
    } catch (err) {
      console.error("Unable to stop live location:", err);
    }
  }, []);

  const getCurrentPosition = () => {
    return new Promise<GeolocationPosition>((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 15000,
        }
      );
    });
  };

  const handleCheckIn = async () => {
    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      const position = await getCurrentPosition();

      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      /*
       * IMPORTANT:
       * Replace this with the employee's assigned location_id
       * if your employee account stores it.
       *
       * The backend currently requires location_id.
       */
      const locationId = Number(
        localStorage.getItem("assigned_location_id") || 1
      );

      if (!locationId) {
        throw new Error("No assigned office location was found.");
      }

      const response = await api.post("/api/attendance/check-in", {
        latitude,
        longitude,
        location_id: locationId,
      });

      setGps({
        latitude,
        longitude,
        accuracy: position.coords.accuracy,
        updatedAt: new Date().toISOString(),
      });

      setAttendance((previous) => ({
        ...previous,
        checked_in: true,
        attendance_id:
          response.data?.attendance_id ??
          response.data?.id ??
          previous.attendance_id ??
          null,
        check_in:
          response.data?.check_in ??
          new Date().toISOString(),
        status: response.data?.status ?? "Present",
      }));

      setMessage(
        response.data?.message ||
          "Check-in successful. Live GPS tracking has started."
      );

      /*
       * Send the first GPS location immediately.
       */
      await sendLocation(position, true);

      /*
       * Start continuous GPS tracking.
       */
      startGPSTracking();
    } catch (err: any) {
      console.error("Check-in error:", err);

      if (err?.code === 1) {
        setError(
          "Location permission was denied. Please allow GPS access and try again."
        );
      } else {
        setError(
          err?.response?.data?.detail ||
            err?.message ||
            "Check-in failed."
        );
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    try {
      setActionLoading(true);
      setError("");
      setMessage("");

      await api.post("/api/attendance/check-out");

      await stopGPSTracking();

      setAttendance((previous) => ({
        ...previous,
        checked_in: false,
        check_out: new Date().toISOString(),
        status: "Checked Out",
      }));

      setMessage("Check-out successful. Live GPS tracking has stopped.");
    } catch (err: any) {
      console.error("Check-out error:", err);

      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Check-out failed."
      );
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    void loadAttendanceStatus();
  }, [loadAttendanceStatus]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (attendance.checked_in) {
      startGPSTracking();
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [attendance.checked_in, loading, startGPSTracking]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  const formatTime = (value?: string | null) => {
    if (!value) {
      return "--";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "--";
    }

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCoordinates = () => {
    if (gps.latitude === null || gps.longitude === null) {
      return "Waiting for GPS...";
    }

    return `${gps.latitude.toFixed(6)}, ${gps.longitude.toFixed(6)}`;
  };

  const formatAccuracy = () => {
    if (gps.accuracy === null) {
      return "--";
    }

    return `${Math.round(gps.accuracy)} m`;
  };

  return (
    <div className="employee-attendance-page">
      <style>{`
        * {
          box-sizing: border-box;
        }

        .employee-attendance-page {
          min-height: 100vh;
          padding: 28px;
          background:
            radial-gradient(circle at top left, rgba(59, 130, 246, 0.10), transparent 32%),
            radial-gradient(circle at bottom right, rgba(16, 185, 129, 0.08), transparent 30%),
            #07111f;
          color: #e5eefc;
        }

        .attendance-shell {
          width: min(1180px, 100%);
          margin: 0 auto;
        }

        .attendance-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 20px;
          margin-bottom: 24px;
        }

        .eyebrow {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #7dd3fc;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .attendance-header h1 {
          margin: 0;
          font-size: clamp(28px, 4vw, 42px);
          letter-spacing: -0.03em;
        }

        .attendance-header p {
          margin: 8px 0 0;
          color: #8ea2bd;
          max-width: 650px;
          line-height: 1.6;
        }

        .connection-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 13px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 999px;
          background: rgba(255,255,255,.04);
          color: #b8c7da;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }

        .connection-pill.live {
          color: #86efac;
          border-color: rgba(34,197,94,.22);
          background: rgba(34,197,94,.07);
        }

        .connection-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: currentColor;
          box-shadow: 0 0 14px currentColor;
        }

        .attendance-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.35fr) minmax(320px, .65fr);
          gap: 18px;
        }

        .card {
          border: 1px solid rgba(148,163,184,.13);
          border-radius: 22px;
          background: rgba(15, 27, 44, .86);
          box-shadow: 0 22px 60px rgba(0,0,0,.22);
          overflow: hidden;
        }

        .main-card {
          padding: 28px;
        }

        .status-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 28px;
        }

        .status-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .status-title-icon {
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: rgba(59,130,246,.10);
          color: #60a5fa;
        }

        .status-title h2 {
          margin: 0;
          font-size: 20px;
        }

        .status-title span {
          display: block;
          margin-top: 4px;
          color: #8193aa;
          font-size: 13px;
        }

        .status-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 11px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
          color: #fbbf24;
          background: rgba(245,158,11,.08);
          border: 1px solid rgba(245,158,11,.15);
        }

        .status-badge.present {
          color: #86efac;
          background: rgba(34,197,94,.08);
          border-color: rgba(34,197,94,.16);
        }

        .status-badge.out {
          color: #94a3b8;
          background: rgba(148,163,184,.08);
          border-color: rgba(148,163,184,.13);
        }

        .time-panel {
          padding: 28px;
          border-radius: 20px;
          background: linear-gradient(135deg, rgba(30,64,175,.16), rgba(15,118,110,.08));
          border: 1px solid rgba(96,165,250,.10);
          text-align: center;
        }

        .time-label {
          color: #91a4bb;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: .12em;
          font-weight: 800;
        }

        .time-value {
          margin: 8px 0 0;
          font-size: clamp(38px, 6vw, 64px);
          line-height: 1;
          font-weight: 900;
          letter-spacing: -.05em;
        }

        .action-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-top: 18px;
        }

        .action-button {
          min-height: 58px;
          border: 0;
          border-radius: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          font-size: 15px;
          font-weight: 850;
          cursor: pointer;
          transition: transform .18s ease, opacity .18s ease;
        }

        .action-button:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        .action-button:disabled {
          cursor: not-allowed;
          opacity: .42;
        }

        .check-in-button {
          background: #2563eb;
          color: white;
          box-shadow: 0 10px 30px rgba(37,99,235,.20);
        }

        .check-out-button {
          background: rgba(239,68,68,.10);
          color: #fca5a5;
          border: 1px solid rgba(239,68,68,.18);
        }

        .message,
        .error {
          margin-top: 16px;
          padding: 13px 15px;
          border-radius: 13px;
          font-size: 13px;
          line-height: 1.5;
        }

        .message {
          color: #86efac;
          background: rgba(34,197,94,.07);
          border: 1px solid rgba(34,197,94,.13);
        }

        .error {
          color: #fca5a5;
          background: rgba(239,68,68,.07);
          border: 1px solid rgba(239,68,68,.13);
        }

        .side-stack {
          display: grid;
          gap: 18px;
        }

        .info-card {
          padding: 22px;
        }

        .info-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 18px;
        }

        .info-card-header h3 {
          margin: 0;
          font-size: 15px;
        }

        .info-card-header svg {
          color: #60a5fa;
        }

        .metric-list {
          display: grid;
          gap: 12px;
        }

        .metric {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 13px 0;
          border-bottom: 1px solid rgba(148,163,184,.08);
        }

        .metric:last-child {
          border-bottom: 0;
        }

        .metric-label {
          display: flex;
          align-items: center;
          gap: 9px;
          color: #8da0b7;
          font-size: 12px;
        }

        .metric-value {
          color: #dce8f8;
          font-size: 12px;
          font-weight: 800;
          text-align: right;
        }

        .gps-live {
          color: #86efac;
        }

        .gps-waiting {
          color: #fbbf24;
        }

        .security-box {
          display: flex;
          gap: 12px;
          padding: 16px;
          border-radius: 15px;
          background: rgba(59,130,246,.06);
          border: 1px solid rgba(59,130,246,.11);
        }

        .security-box svg {
          flex: 0 0 auto;
          color: #60a5fa;
        }

        .security-box strong {
          display: block;
          font-size: 13px;
          margin-bottom: 4px;
        }

        .security-box span {
          color: #8498b0;
          font-size: 12px;
          line-height: 1.5;
        }

        .refresh-button {
          width: 34px;
          height: 34px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(148,163,184,.13);
          border-radius: 10px;
          background: rgba(255,255,255,.035);
          color: #9fb0c5;
          cursor: pointer;
        }

        @media (max-width: 850px) {
          .attendance-grid {
            grid-template-columns: 1fr;
          }

          .attendance-header {
            flex-direction: column;
          }
        }

        @media (max-width: 560px) {
          .employee-attendance-page {
            padding: 16px;
          }

          .main-card {
            padding: 20px;
          }

          .action-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="attendance-shell">
        <header className="attendance-header">
          <div>
            <div className="eyebrow">
              <Activity size={14} />
              Workforce Attendance
            </div>

            <h1>My Attendance</h1>

            <p>
              Check in from your assigned workplace and keep your live
              location synchronized while you are on duty.
            </p>
          </div>

          <div
            className={`connection-pill ${
              tracking ? "live" : ""
            }`}
          >
            <span className="connection-dot" />
            {tracking ? "GPS LIVE" : "GPS STANDBY"}
          </div>
        </header>

        <div className="attendance-grid">
          <section className="card main-card">
            <div className="status-top">
              <div className="status-title">
                <div className="status-title-icon">
                  <Clock3 size={22} />
                </div>

                <div>
                  <h2>Today's Attendance</h2>
                  <span>Real-time attendance session</span>
                </div>
              </div>

              <div
                className={`status-badge ${
                  attendance.checked_in
                    ? "present"
                    : attendance.check_out
                    ? "out"
                    : ""
                }`}
              >
                <CheckCircle2 size={14} />
                {attendance.checked_in
                  ? "PRESENT"
                  : attendance.check_out
                  ? "CHECKED OUT"
                  : "NOT CHECKED IN"}
              </div>
            </div>

            <div className="time-panel">
              <div className="time-label">
                {attendance.checked_in
                  ? "Checked in at"
                  : attendance.check_out
                  ? "Checked out at"
                  : "Current status"}
              </div>

              <div className="time-value">
                {attendance.checked_in
                  ? formatTime(attendance.check_in)
                  : attendance.check_out
                  ? formatTime(attendance.check_out)
                  : "--:--"}
              </div>
            </div>

            <div className="action-row">
              <button
                className="action-button check-in-button"
                onClick={handleCheckIn}
                disabled={
                  actionLoading ||
                  loading ||
                  attendance.checked_in
                }
              >
                <LogIn size={19} />

                {actionLoading
                  ? "Processing..."
                  : "Check In"}
              </button>

              <button
                className="action-button check-out-button"
                onClick={handleCheckOut}
                disabled={
                  actionLoading ||
                  loading ||
                  !attendance.checked_in
                }
              >
                <LogOut size={19} />

                {actionLoading
                  ? "Processing..."
                  : "Check Out"}
              </button>
            </div>

            {message && (
              <div className="message">
                {message}
              </div>
            )}

            {error && (
              <div className="error">
                {error}
              </div>
            )}
          </section>

          <div className="side-stack">
            <section className="card info-card">
              <div className="info-card-header">
                <h3>Live GPS Telemetry</h3>

                <button
                  className="refresh-button"
                  onClick={() => void loadAttendanceStatus()}
                  title="Refresh attendance"
                >
                  <RefreshCw size={15} />
                </button>
              </div>

              <div className="metric-list">
                <div className="metric">
                  <span className="metric-label">
                    <Navigation size={14} />
                    Coordinates
                  </span>

                  <span className="metric-value">
                    {formatCoordinates()}
                  </span>
                </div>

                <div className="metric">
                  <span className="metric-label">
                    <Crosshair size={14} />
                    Accuracy
                  </span>

                  <span className="metric-value">
                    {formatAccuracy()}
                  </span>
                </div>

                <div className="metric">
                  <span className="metric-label">
                    <Signal size={14} />
                    Tracking
                  </span>

                  <span
                    className={`metric-value ${
                      tracking
                        ? "gps-live"
                        : "gps-waiting"
                    }`}
                  >
                    {tracking ? "ACTIVE" : "STANDBY"}
                  </span>
                </div>

                <div className="metric">
                  <span className="metric-label">
                    <Clock3 size={14} />
                    Last update
                  </span>

                  <span className="metric-value">
                    {formatTime(gps.updatedAt)}
                  </span>
                </div>
              </div>
            </section>

            <section className="card info-card">
              <div className="security-box">
                <ShieldCheck size={20} />

                <div>
                  <strong>Location Protected</strong>

                  <span>
                    GPS updates are sent only while your attendance
                    session is active. Checking out stops the tracking
                    session.
                  </span>
                </div>
              </div>

              <div style={{ height: 12 }} />

              <div className="security-box">
                {tracking ? (
                  <Wifi size={20} />
                ) : (
                  <WifiOff size={20} />
                )}

                <div>
                  <strong>
                    {tracking
                      ? "Live connection active"
                      : "Waiting for connection"}
                  </strong>

                  <span>
                    Your latest coordinates are synchronized with
                    the workforce live-location system.
                  </span>
                </div>
              </div>

              <div style={{ height: 12 }} />

              <div className="security-box">
                <MapPin size={20} />

                <div>
                  <strong>Workplace verification</strong>

                  <span>
                    Check-in coordinates are verified against your
                    assigned workplace by the backend geofence.
                  </span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}