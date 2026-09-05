import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Crosshair,
  MapPin,
  Navigation,
  Radio,
  RefreshCw,
  ShieldCheck,
  Signal,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";

import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
} from "react-leaflet";

import L from "leaflet";
import axios from "axios";
import "leaflet/dist/leaflet.css";

import api from "../services/api";
import { useAuth } from "../context/AuthContext";

/* ============================================================
   LEAFLET ICON FIX
============================================================ */

delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",

  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",

  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

/* ============================================================
   TYPES
============================================================ */

interface Operation {
  attendance_id: number;
  user_id: number;

  employee_name: string;
  employee_email: string;
  employee_role: string;

  attendance_date: string | null;

  check_in: string | null;
  check_out: string | null;

  status: string | null;

  location_id: number | null;
  location_name: string | null;

  attendance_latitude: number | null;
  attendance_longitude: number | null;

  live_location_id: number | null;
  latitude: number | null;
  longitude: number | null;

  accuracy_meters: number | null;

  live_location_updated_at: string | null;
  seconds_since_location_update: number | null;

  is_location_live: boolean;
  is_live_operation: boolean;

  working_seconds: number;
  working_hours: string;

  is_checked_in: boolean;
  is_checked_out: boolean;
}

interface LiveOperationsResponse {
  date: string;
  total_records: number;
  active_count: number;
  checked_out_count: number;
  late_count: number;
  live_location_count: number;
  live_operation_count: number;
  operations: Operation[];
}

/* ============================================================
   MAIN COMPONENT
============================================================ */

export default function LiveOperations() {
  const { user } = useAuth();

  const isAdmin =
    user?.role?.toLowerCase() === "admin";

  const [data, setData] =
    useState<LiveOperationsResponse | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null);

  const defaultCenter: [number, number] = [
    20.5937,
    78.9629,
  ];

  /* ==========================================================
     ERROR MESSAGE
  ========================================================== */

  const getErrorMessage = (
    err: unknown
  ): string => {
    if (axios.isAxiosError(err)) {
      const status =
        err.response?.status;

      const detail =
        err.response?.data?.detail ||
        err.response?.data?.message;

      if (detail) {
        return String(detail);
      }

      if (status === 401) {
        return (
          "Your session has expired. " +
          "Please sign in again."
        );
      }

      if (status === 403) {
        return (
          "You do not have permission " +
          "to view live operations."
        );
      }

      if (status === 404) {
        return (
          "Live Operations API endpoint " +
          "was not found."
        );
      }

      /*
       * IMPORTANT:
       *
       * status is number | undefined.
       * Check that it exists before comparing.
       */
      if (
        typeof status === "number" &&
        status >= 500
      ) {
        return (
          "FastAPI server error. " +
          "Please check the backend terminal."
        );
      }

      if (
        err.code === "ERR_NETWORK" ||
        err.message === "Network Error"
      ) {
        return (
          "Unable to connect to the FastAPI backend. " +
          "Make sure the backend is running on " +
          "http://127.0.0.1:8000."
        );
      }

      if (typeof status === "number") {
        return `Server returned HTTP ${status}.`;
      }

      return (
        err.message ||
        "Unable to load live operations."
      );
    }

    if (err instanceof Error) {
      return err.message;
    }

    return "Unable to load live operations.";
  };

  /* ==========================================================
     LOAD LIVE OPERATIONS
  ========================================================== */

  const loadLiveOperations =
    useCallback(
      async (manual = false) => {
        if (!isAdmin) {
          return;
        }

        try {
          if (manual) {
            setRefreshing(true);
          }

          setError("");

          const response =
            await api.get<LiveOperationsResponse>(
              "/api/attendance/live-operations"
            );

          const result =
            response.data;

          if (!result) {
            throw new Error(
              "The backend returned an empty response."
            );
          }

          setData(result);

          setLastUpdated(
            new Date()
          );
        } catch (err: unknown) {
          console.error(
            "Live Operations Error:",
            err
          );

          setError(
            getErrorMessage(err)
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [isAdmin]
    );

  /* ==========================================================
     INITIAL LOAD + AUTO REFRESH
  ========================================================== */

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      setRefreshing(false);
      setError("");
      return;
    }

    void loadLiveOperations();

    const interval =
      window.setInterval(() => {
        void loadLiveOperations();
      }, 10000);

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [
    isAdmin,
    loadLiveOperations,
  ]);

  /* ==========================================================
     FORMAT TIME
  ========================================================== */

  const formatTime = (
    value: string | null
  ) => {
    if (!value) {
      return "—";
    }

    try {
      const date =
        new Date(value);

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return value;
      }

      return date.toLocaleTimeString(
        [],
        {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }
      );
    } catch {
      return value;
    }
  };

  /* ==========================================================
     GPS STATE
  ========================================================== */

  const getGpsState = (
    employee: Operation
  ) => {
    if (
      !employee.is_location_live
    ) {
      return {
        label: "Offline",
        className: "offline",
      };
    }

    const seconds =
      employee.seconds_since_location_update;

    if (
      seconds !== null &&
      seconds !== undefined &&
      seconds > 60
    ) {
      return {
        label: "Stale",
        className: "stale",
      };
    }

    return {
      label: "Live",
      className: "live",
    };
  };

  /* ==========================================================
     MAP EMPLOYEES
  ========================================================== */

  const mapEmployees =
    useMemo(
      () =>
        data?.operations.filter(
          (operation) =>
            typeof operation.latitude ===
              "number" &&
            typeof operation.longitude ===
              "number" &&
            Number.isFinite(
              operation.latitude
            ) &&
            Number.isFinite(
              operation.longitude
            )
        ) || [],
      [data]
    );

  /* ==========================================================
     MAP CENTER
  ========================================================== */

  const firstEmployee =
    mapEmployees[0];

  const mapCenter: [
    number,
    number
  ] =
    firstEmployee &&
    firstEmployee.latitude !==
      null &&
    firstEmployee.longitude !==
      null
      ? [
          firstEmployee.latitude,
          firstEmployee.longitude,
        ]
      : defaultCenter;

  /* ==========================================================
     DERIVED DATA
  ========================================================== */

  const liveEmployees =
    useMemo(
      () =>
        data?.operations.filter(
          (employee) =>
            employee.is_live_operation
        ) || [],
      [data]
    );

  const staleEmployees =
    useMemo(
      () =>
        data?.operations.filter(
          (employee) => {
            const seconds =
              employee.seconds_since_location_update;

            return (
              employee.is_location_live &&
              seconds !== null &&
              seconds !== undefined &&
              seconds > 60
            );
          }
        ) || [],
      [data]
    );

  const gpsCoverage =
    data &&
    data.active_count > 0
      ? Math.min(
          100,
          Math.round(
            (data.live_location_count /
              data.active_count) *
              100
          )
        )
      : 0;

  /* ==========================================================
     INITIAL LOADING
  ========================================================== */

  if (
    loading &&
    !data &&
    !error
  ) {
    return (
      <section className="page live-operations-page">
        <style>{styles}</style>

        <div className="live-loading-full">
          <div className="live-loading-icon">
            <RefreshCw
              size={24}
              className="spin"
            />
          </div>

          <strong>
            Connecting to Live Operations
          </strong>

          <span>
            Loading employee GPS and
            attendance intelligence...
          </span>
        </div>
      </section>
    );
  }

  /* ==========================================================
     RENDER
  ========================================================== */

  if (!isAdmin) {
    return (
      <>
        <style>{styles}</style>

        <section className="live-operations-page">
          <div className="live-access-card">
            <div className="live-access-icon">
              <ShieldCheck size={28} />
            </div>

            <div className="live-access-content">
              <span className="live-access-eyebrow">
                RESTRICTED OPERATIONS
              </span>

              <h1>Administrator Access Required</h1>

              <p>
                Live Operations is an administrator-only workspace.
                Your employee account is authenticated successfully,
                but it does not have permission to view workforce
                telemetry, GPS locations, and live attendance operations.
              </p>

              <div className="live-access-role">
                <span>Signed in as</span>
                <strong>{user?.name || user?.email || "Employee"}</strong>
              </div>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <section className="page live-operations-page">
      <style>{styles}</style>

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="live-command-header">
        <div className="live-header-main">
          <span className="live-eyebrow">
            <span className="live-eyebrow-dot" />

            REAL-TIME WORKFORCE
            INTELLIGENCE
          </span>

          <h1>
            Live Operations
          </h1>

          <p>
            Monitor biometric attendance,
            employee presence and live GPS
            intelligence from a single
            operational command center.
          </p>
        </div>

        <div className="live-header-actions">
          <div className="live-sync-status">
            <span
              className={
                error
                  ? "live-sync-dot error"
                  : "live-sync-dot"
              }
            />

            <span>
              {lastUpdated
                ? `Synced ${formatTime(
                    lastUpdated.toISOString()
                  )}`
                : error
                ? "Connection failed"
                : "Connecting..."}
            </span>
          </div>

          <button
            type="button"
            className="live-refresh"
            onClick={() => {
              void loadLiveOperations(
                true
              );
            }}
            disabled={
              loading ||
              refreshing
            }
          >
            <RefreshCw
              size={14}
              className={
                refreshing
                  ? "spin"
                  : ""
              }
            />

            {refreshing
              ? "Syncing..."
              : "Refresh"}
          </button>
        </div>
      </div>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (
        <div className="live-error">
          <div className="live-error-icon">
            <AlertTriangle
              size={17}
            />
          </div>

          <div className="live-error-content">
            <strong>
              Live Operations Connection
              Error
            </strong>

            <span>
              {error}
            </span>

            <small>
              API:
              {" "}
              /api/attendance/live-operations
            </small>
          </div>

          <button
            type="button"
            className="error-retry"
            onClick={() => {
              void loadLiveOperations(
                true
              );
            }}
          >
            <RefreshCw
              size={12}
            />

            Retry
          </button>
        </div>
      )}

      {/* ======================================================
          COMMAND STATUS
      ====================================================== */}

      <div className="command-status">
        <div className="command-status-main">
          <div className="command-status-icon">
            <Radio size={17} />
          </div>

          <div>
            <strong>
              Operations monitoring
              {error
                ? " interrupted"
                : " active"}
            </strong>

            <span>
              Attendance and GPS
              intelligence automatically
              refresh every 10 seconds.
            </span>
          </div>
        </div>

        <div className="command-status-metrics">
          <span
            className={
              error
                ? "metric-error"
                : ""
            }
          >
            {error ? (
              <WifiOff size={11} />
            ) : (
              <Wifi size={11} />
            )}

            {error
              ? "API Offline"
              : "API Connected"}
          </span>

          <span>
            <Navigation
              size={11}
            />

            GPS {gpsCoverage}%
          </span>

          <span>
            <Clock3 size={11} />

            10s Refresh
          </span>
        </div>
      </div>

      {/* ======================================================
          KPI GRID
      ====================================================== */}

      <div className="live-kpi-grid">
        <div className="live-kpi kpi-green">
          <div className="live-kpi-top">
            <span className="live-kpi-label">
              <Activity size={13} />

              Active Operations
            </span>

            <div className="live-kpi-icon">
              <Radio size={15} />
            </div>
          </div>

          <strong className="live-kpi-value">
            {data?.active_count ??
              0}
          </strong>

          <span className="live-kpi-meta">
            Employees currently working
          </span>
        </div>

        <div className="live-kpi">
          <div className="live-kpi-top">
            <span className="live-kpi-label">
              <Users size={13} />

              Present Today
            </span>

            <div className="live-kpi-icon">
              <Users size={15} />
            </div>
          </div>

          <strong className="live-kpi-value">
            {data?.active_count ??
              0}
          </strong>

          <span className="live-kpi-meta">
            Currently checked in
          </span>
        </div>

        <div className="live-kpi kpi-purple">
          <div className="live-kpi-top">
            <span className="live-kpi-label">
              <Clock3 size={13} />

              Attendance Events
            </span>

            <div className="live-kpi-icon">
              <Clock3 size={15} />
            </div>
          </div>

          <strong className="live-kpi-value">
            {data?.total_records ??
              0}
          </strong>

          <span className="live-kpi-meta">
            Total records for today
          </span>
        </div>

        <div className="live-kpi kpi-orange">
          <div className="live-kpi-top">
            <span className="live-kpi-label">
              <Navigation
                size={13}
              />

              Live GPS
            </span>

            <div className="live-kpi-icon">
              <Signal size={15} />
            </div>
          </div>

          <strong className="live-kpi-value">
            {data?.live_location_count ??
              0}
          </strong>

          <span className="live-kpi-meta">
            {gpsCoverage}% GPS coverage
          </span>
        </div>
      </div>

      {/* ======================================================
          MAIN GRID
      ====================================================== */}

      <div className="live-main-grid">

        {/* ====================================================
            MAP
        ==================================================== */}

        <div className="live-card">
          <div className="live-card-header">
            <div className="live-card-title">
              <div className="live-card-title-icon">
                <MapPin size={16} />
              </div>

              <div>
                <h2>
                  Employee Live Locations
                </h2>

                <p>
                  Real-time workforce
                  positioning and GPS
                  intelligence.
                </p>
              </div>
            </div>

            <div className="map-live-badge">
              <span className="map-live-badge-dot" />

              {mapEmployees.length}{" "}
              TRACKED
            </div>
          </div>

          <div className="live-map-shell">
            <div className="map-overlay">
              <Crosshair size={12} />

              LIVE GPS TELEMETRY
            </div>

            {mapEmployees.length >
            0 ? (
              <MapContainer
                center={mapCenter}
                zoom={15}
                scrollWheelZoom
                className="live-map"
              >
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {mapEmployees.map(
                  (employee) => {
                    if (
                      employee.latitude ===
                        null ||
                      employee.longitude ===
                        null
                    ) {
                      return null;
                    }

                    const gpsState =
                      getGpsState(
                        employee
                      );

                    return (
                      <div
                        key={
                          employee.attendance_id
                        }
                      >
                        <Marker
                          position={[
                            employee.latitude,
                            employee.longitude,
                          ]}
                        >
                          <Popup>
                            <div className="live-popup">
                              <div className="popup-name">
                                {
                                  employee.employee_name
                                }
                              </div>

                              <div className="popup-role">
                                {
                                  employee.employee_role
                                }
                              </div>

                              <div className="popup-status">
                                <span className="popup-status-dot" />

                                {gpsState.label.toUpperCase()}
                              </div>

                              <div className="popup-grid">
                                <div className="popup-row">
                                  <span>
                                    Location
                                  </span>

                                  <span>
                                    {employee.location_name ||
                                      "Unknown"}
                                  </span>
                                </div>

                                <div className="popup-row">
                                  <span>
                                    Check-in
                                  </span>

                                  <span>
                                    {formatTime(
                                      employee.check_in
                                    )}
                                  </span>
                                </div>

                                <div className="popup-row">
                                  <span>
                                    Working
                                  </span>

                                  <span>
                                    {
                                      employee.working_hours
                                    }
                                  </span>
                                </div>

                                <div className="popup-row">
                                  <span>
                                    Accuracy
                                  </span>

                                  <span>
                                    {employee.accuracy_meters !==
                                    null
                                      ? `${employee.accuracy_meters} m`
                                      : "—"}
                                  </span>
                                </div>

                                <div className="popup-row">
                                  <span>
                                    Last GPS
                                  </span>

                                  <span>
                                    {formatTime(
                                      employee.live_location_updated_at
                                    )}
                                  </span>
                                </div>

                                <div className="popup-row">
                                  <span>
                                    Latitude
                                  </span>

                                  <span>
                                    {employee.latitude.toFixed(
                                      6
                                    )}
                                  </span>
                                </div>

                                <div className="popup-row">
                                  <span>
                                    Longitude
                                  </span>

                                  <span>
                                    {employee.longitude.toFixed(
                                      6
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </Popup>
                        </Marker>

                        {employee.accuracy_meters !==
                          null &&
                          employee.accuracy_meters >
                            0 && (
                            <Circle
                              center={[
                                employee.latitude,
                                employee.longitude,
                              ]}
                              radius={
                                employee.accuracy_meters
                              }
                              pathOptions={{
                                fillOpacity:
                                  0.07,
                                weight: 1,
                              }}
                            />
                          )}
                      </div>
                    );
                  }
                )}
              </MapContainer>
            ) : (
              <div className="map-empty">
                <div>
                  <div className="map-empty-icon">
                    <MapPin size={23} />
                  </div>

                  <strong>
                    No live GPS telemetry
                  </strong>

                  <span>
                    Employees will appear on
                    the map after checking in
                    and sending their live
                    location.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ====================================================
            OPERATIONS INTELLIGENCE
        ==================================================== */}

        <div className="live-card operations-panel">
          <div className="live-card-header">
            <div className="live-card-title">
              <div className="live-card-title-icon">
                <ShieldCheck
                  size={16}
                />
              </div>

              <div>
                <h2>
                  Operations Intelligence
                </h2>

                <p>
                  Current workforce
                  telemetry.
                </p>
              </div>
            </div>
          </div>

          <div className="ops-summary">
            <div className="ops-progress-card">
              <div className="ops-progress-top">
                <span>
                  GPS COVERAGE
                </span>

                <strong>
                  {gpsCoverage}%
                </strong>
              </div>

              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{
                    width: `${gpsCoverage}%`,
                  }}
                />
              </div>
            </div>

            <div className="ops-mini-grid">
              <div className="ops-mini">
                <div className="ops-mini-label">
                  <CheckCircle2
                    size={11}
                  />

                  Checked Out
                </div>

                <strong>
                  {data?.checked_out_count ??
                    0}
                </strong>

                <small>
                  Completed attendance
                </small>
              </div>

              <div className="ops-mini">
                <div className="ops-mini-label">
                  <AlertTriangle
                    size={11}
                  />

                  Late
                </div>

                <strong>
                  {data?.late_count ??
                    0}
                </strong>

                <small>
                  Late arrivals
                </small>
              </div>

              <div className="ops-mini">
                <div className="ops-mini-label">
                  <Radio size={11} />

                  Live
                </div>

                <strong>
                  {data?.live_operation_count ??
                    0}
                </strong>

                <small>
                  Active telemetry
                </small>
              </div>

              <div className="ops-mini">
                <div className="ops-mini-label">
                  <Signal size={11} />

                  Stale
                </div>

                <strong>
                  {staleEmployees.length}
                </strong>

                <small>
                  GPS needs update
                </small>
              </div>
            </div>
          </div>

          <div className="activity-feed">
            <div className="activity-feed-heading">
              <strong>
                LIVE ACTIVITY
              </strong>

              <span>
                {liveEmployees.length}{" "}
                active
              </span>
            </div>

            {liveEmployees.length ===
            0 ? (
              <div className="no-activity">
                No active employee
                operations.
              </div>
            ) : (
              liveEmployees
                .slice(0, 8)
                .map((employee) => {
                  const gpsState =
                    getGpsState(
                      employee
                    );

                  return (
                    <div
                      key={
                        employee.attendance_id
                      }
                      className={`activity-item ${
                        gpsState.className ===
                        "stale"
                          ? "stale"
                          : ""
                      }`}
                    >
                      <div className="activity-marker">
                        {gpsState.className ===
                        "stale" ? (
                          <AlertTriangle
                            size={12}
                          />
                        ) : (
                          <Activity
                            size={12}
                          />
                        )}
                      </div>

                      <div className="activity-content">
                        <strong>
                          {
                            employee.employee_name
                          }
                        </strong>

                        <span>
                          {employee.location_name ||
                            "Location unavailable"}
                        </span>
                      </div>

                      <span className="activity-time">
                        {formatTime(
                          employee.live_location_updated_at
                        )}
                      </span>
                    </div>
                  );
                })
            )}
          </div>
        </div>
      </div>

      {/* ======================================================
          TABLE
      ====================================================== */}

      <div className="live-card live-table-card">
        <div className="live-card-header">
          <div className="live-card-title">
            <div className="live-card-title-icon">
              <Users size={16} />
            </div>

            <div>
              <h2>
                Live Employee Activity
              </h2>

              <p>
                Attendance, biometric
                operation and GPS status
                across today's workforce.
              </p>
            </div>
          </div>

          <div className="map-live-badge">
            <span className="map-live-badge-dot" />

            AUTO REFRESH 10S
          </div>
        </div>

        <div className="live-table-wrapper">
          <table className="live-table">
            <thead>
              <tr>
                <th>
                  Employee
                </th>

                <th>
                  Operation
                </th>

                <th>
                  Location
                </th>

                <th>
                  Check-in
                </th>

                <th>
                  GPS Telemetry
                </th>

                <th>
                  Working
                </th>

                <th>
                  Accuracy
                </th>
              </tr>
            </thead>

            <tbody>
              {data?.operations.map(
                (employee) => {
                  const initials =
                    employee.employee_name
                      .split(" ")
                      .filter(Boolean)
                      .map(
                        (part) =>
                          part[0]
                      )
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();

                  const gpsState =
                    getGpsState(
                      employee
                    );

                  return (
                    <tr
                      key={
                        employee.attendance_id
                      }
                    >
                      <td>
                        <div className="employee-cell">
                          <div className="employee-avatar">
                            {initials}
                          </div>

                          <div>
                            <strong>
                              {
                                employee.employee_name
                              }
                            </strong>

                            <span>
                              {
                                employee.employee_email
                              }
                            </span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`operation-status ${gpsState.className}`}
                        >
                          <span className="status-dot" />

                          {employee.is_live_operation
                            ? "Live Operation"
                            : employee.is_checked_out
                            ? "Checked Out"
                            : "Offline"}
                        </span>
                      </td>

                      <td>
                        <span className="location-cell">
                          <MapPin size={11} />

                          {employee.location_name ||
                            "Unassigned"}
                        </span>
                      </td>

                      <td>
                        {formatTime(
                          employee.check_in
                        )}
                      </td>

                      <td>
                        {employee.latitude !==
                          null &&
                        employee.longitude !==
                          null ? (
                          <div className="gps-cell">
                            <span className="gps-coordinates">
                              {employee.latitude.toFixed(
                                5
                              )}
                              {" / "}
                              {employee.longitude.toFixed(
                                5
                              )}
                            </span>

                            <button
                              type="button"
                              className="mini-map-button"
                              title="Open this location in map"
                              onClick={() => {
                                window.scrollTo(
                                  {
                                    top: 0,
                                    behavior:
                                      "smooth",
                                  }
                                );
                              }}
                            >
                              <Navigation
                                size={10}
                              />
                            </button>
                          </div>
                        ) : (
                          <span className="no-gps">
                            No GPS
                          </span>
                        )}
                      </td>

                      <td>
                        <span className="working-time">
                          {
                            employee.working_hours
                          }
                        </span>
                      </td>

                      <td>
                        {employee.accuracy_meters !==
                        null ? (
                          <span className="gps-quality">
                            <Signal
                              size={11}
                            />

                            {
                              employee.accuracy_meters
                            }{" "}
                            m
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>

          {data &&
            data.operations.length ===
              0 && (
              <div className="empty-table">
                <WifiOff
                  size={22}
                  style={{
                    marginBottom: 8,
                  }}
                />

                <div>
                  No attendance
                  operations available
                  for today.
                </div>
              </div>
            )}

          {!data && error && (
            <div className="empty-table">
              <WifiOff
                size={25}
                style={{
                  marginBottom: 9,
                }}
              />

              <div>
                Live operations data
                could not be loaded.
              </div>

              <button
                type="button"
                className="table-retry"
                onClick={() => {
                  void loadLiveOperations(
                    true
                  );
                }}
              >
                <RefreshCw size={12} />

                Try Again
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   STYLES
============================================================ */

const styles = `
.live-operations-page {
  width: 100%;
  min-width: 0;
  padding-bottom: 30px;
}

.live-operations-page * {
  box-sizing: border-box;
}

.live-command-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 22px;
  margin-bottom: 22px;
}

.live-header-main {
  min-width: 0;
}

.live-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 8px;
  color: var(--primary);
  font-size: 10px;
  font-weight: 850;
  letter-spacing: .17em;
}

.live-eyebrow-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 5px rgba(34,197,94,.08);
  animation: livePulse 1.8s infinite;
}

.live-header-main h1 {
  margin: 0;
  color: var(--text);
  font-size: clamp(27px, 3vw, 38px);
  line-height: 1.05;
  letter-spacing: -.045em;
}

.live-header-main p {
  margin: 9px 0 0;
  max-width: 650px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.65;
}

.live-header-actions {
  display: flex;
  align-items: center;
  gap: 9px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.live-sync-status {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 13px;
  border: 1px solid var(--border);
  border-radius: 11px;
  background: var(--surface);
  color: var(--muted);
  font-size: 10px;
  font-weight: 750;
}

.live-sync-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 0 4px rgba(34,197,94,.08);
}

.live-sync-dot.error {
  background: #ef4444;
  box-shadow: 0 0 0 4px rgba(239,68,68,.08);
}

.live-refresh {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 15px;
  border: 1px solid var(--border);
  border-radius: 11px;
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  font-size: 11px;
  font-weight: 800;
  transition: .2s ease;
}

.live-refresh:hover {
  transform: translateY(-1px);
  border-color: var(--primary);
}

.live-refresh:disabled {
  opacity: .65;
  cursor: not-allowed;
  transform: none;
}

.live-error {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-bottom: 16px;
  padding: 13px 15px;
  border: 1px solid rgba(239,68,68,.18);
  border-radius: 13px;
  background: rgba(239,68,68,.055);
  color: #ef4444;
}

.live-error-icon {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 9px;
  background: rgba(239,68,68,.1);
}

.live-error-content {
  min-width: 0;
  flex: 1;
}

.live-error strong {
  display: block;
  font-size: 11px;
}

.live-error span {
  display: block;
  margin-top: 3px;
  font-size: 10px;
  line-height: 1.5;
}

.live-error small {
  display: block;
  margin-top: 4px;
  opacity: .7;
  font-family: ui-monospace, monospace;
  font-size: 8px;
}

.error-retry {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0 10px;
  border: 1px solid rgba(239,68,68,.18);
  border-radius: 8px;
  background: rgba(239,68,68,.08);
  color: #ef4444;
  cursor: pointer;
  font-size: 9px;
  font-weight: 800;
}

.command-status {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 16px;
  padding: 13px 16px;
  border: 1px solid var(--border);
  border-radius: 15px;
  background:
    linear-gradient(
      135deg,
      rgba(37,99,235,.055),
      transparent 55%
    ),
    var(--surface);
}

.command-status-main {
  display: flex;
  align-items: center;
  gap: 11px;
}

.command-status-icon {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: rgba(34,197,94,.09);
  color: #22c55e;
}

.command-status-main strong {
  display: block;
  color: var(--text);
  font-size: 11px;
}

.command-status-main span {
  display: block;
  margin-top: 3px;
  color: var(--muted);
  font-size: 9px;
}

.command-status-metrics {
  display: flex;
  align-items: center;
  gap: 17px;
  color: var(--muted);
  font-size: 9px;
  font-weight: 700;
}

.command-status-metrics span {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.command-status-metrics .metric-error {
  color: #ef4444;
}

.live-kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 11px;
  margin-bottom: 17px;
}

.live-kpi {
  position: relative;
  overflow: hidden;
  min-height: 126px;
  padding: 17px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--surface);
  transition: .2s ease;
}

.live-kpi:hover {
  transform: translateY(-2px);
  border-color: rgba(37,99,235,.25);
}

.live-kpi-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.live-kpi-label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--muted);
  font-size: 10px;
  font-weight: 750;
}

.live-kpi-icon {
  width: 31px;
  height: 31px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: rgba(37,99,235,.08);
  color: var(--primary);
}

.live-kpi-value {
  display: block;
  margin-top: 12px;
  color: var(--text);
  font-size: 27px;
  line-height: 1;
  font-weight: 850;
  letter-spacing: -.04em;
}

.live-kpi-meta {
  display: block;
  margin-top: 8px;
  color: var(--muted);
  font-size: 9px;
}

.kpi-green .live-kpi-icon {
  color: #22c55e;
  background: rgba(34,197,94,.09);
}

.kpi-purple .live-kpi-icon {
  color: #8b5cf6;
  background: rgba(139,92,246,.09);
}

.kpi-orange .live-kpi-icon {
  color: #f59e0b;
  background: rgba(245,158,11,.09);
}

.live-main-grid {
  display: grid;
  grid-template-columns:
    minmax(0, 1.65fr)
    minmax(280px, .55fr);
  gap: 15px;
  margin-bottom: 15px;
}

.live-card {
  overflow: hidden;
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: 17px;
  background: var(--surface);
}

.live-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  padding: 15px 17px;
  border-bottom: 1px solid var(--border);
}

.live-card-title {
  display: flex;
  align-items: center;
  gap: 9px;
}

.live-card-title-icon {
  width: 31px;
  height: 31px;
  display: grid;
  place-items: center;
  border-radius: 9px;
  background: rgba(37,99,235,.08);
  color: var(--primary);
}

.live-card-title h2 {
  margin: 0;
  color: var(--text);
  font-size: 13px;
  letter-spacing: -.01em;
}

.live-card-title p {
  margin: 3px 0 0;
  color: var(--muted);
  font-size: 9px;
}

.map-live-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 9px;
  border: 1px solid rgba(34,197,94,.13);
  border-radius: 999px;
  background: rgba(34,197,94,.055);
  color: #22c55e;
  font-size: 8px;
  font-weight: 850;
  letter-spacing: .04em;
}

.map-live-badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 0 4px rgba(34,197,94,.08);
}

.live-map-shell {
  position: relative;
  height: 490px;
  overflow: hidden;
  background: #e5e7eb;
}

.live-map {
  width: 100%;
  height: 100%;
}

.map-overlay {
  position: absolute;
  z-index: 500;
  top: 13px;
  left: 13px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid rgba(255,255,255,.55);
  border-radius: 9px;
  background: rgba(2,6,23,.78);
  backdrop-filter: blur(10px);
  color: white;
  font-size: 8px;
  font-weight: 800;
}

.map-overlay svg {
  color: #22c55e;
}

.map-empty {
  position: absolute;
  inset: 0;
  z-index: 400;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 25px;
  background:
    radial-gradient(
      circle at center,
      rgba(37,99,235,.07),
      transparent 45%
    ),
    var(--surface);
}

.map-empty-icon {
  width: 52px;
  height: 52px;
  display: grid;
  place-items: center;
  margin: 0 auto 11px;
  border-radius: 15px;
  background: rgba(37,99,235,.08);
  color: var(--primary);
}

.map-empty strong {
  display: block;
  color: var(--text);
  font-size: 12px;
}

.map-empty span {
  display: block;
  max-width: 300px;
  margin-top: 5px;
  color: var(--muted);
  font-size: 9px;
  line-height: 1.6;
}

.operations-panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.ops-summary {
  padding: 14px;
}

.ops-progress-card {
  padding: 13px;
  border: 1px solid var(--border);
  border-radius: 13px;
  background: rgba(37,99,235,.025);
}

.ops-progress-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.ops-progress-top span {
  color: var(--muted);
  font-size: 9px;
  font-weight: 750;
}

.ops-progress-top strong {
  color: var(--text);
  font-size: 12px;
}

.progress-track {
  height: 6px;
  overflow: hidden;
  margin-top: 10px;
  border-radius: 999px;
  background: var(--border);
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: var(--primary);
  transition: width .4s ease;
}

.ops-mini-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 9px;
}

.ops-mini {
  padding: 11px;
  border: 1px solid var(--border);
  border-radius: 12px;
}

.ops-mini-label {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
  font-size: 8px;
  font-weight: 750;
}

.ops-mini strong {
  display: block;
  margin-top: 7px;
  color: var(--text);
  font-size: 18px;
  line-height: 1;
}

.ops-mini small {
  display: block;
  margin-top: 5px;
  color: var(--muted);
  font-size: 8px;
}

.activity-feed {
  padding: 0 14px 14px;
}

.activity-feed-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 8px 0 9px;
}

.activity-feed-heading strong {
  color: var(--text);
  font-size: 10px;
}

.activity-feed-heading span {
  color: var(--muted);
  font-size: 8px;
}

.activity-item {
  display: flex;
  gap: 9px;
  padding: 9px 0;
  border-bottom: 1px solid var(--border);
}

.activity-item:last-child {
  border-bottom: 0;
}

.activity-marker {
  width: 25px;
  height: 25px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 8px;
  background: rgba(34,197,94,.08);
  color: #22c55e;
}

.activity-item.stale .activity-marker {
  background: rgba(245,158,11,.09);
  color: #f59e0b;
}

.activity-content {
  min-width: 0;
}

.activity-content strong {
  display: block;
  overflow: hidden;
  color: var(--text);
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-content span {
  display: block;
  margin-top: 2px;
  overflow: hidden;
  color: var(--muted);
  font-size: 8px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-time {
  margin-left: auto;
  color: var(--muted);
  font-size: 7px;
  white-space: nowrap;
}

.no-activity {
  padding: 16px 5px;
  text-align: center;
  color: var(--muted);
  font-size: 9px;
}

.live-table-card {
  overflow: hidden;
}

.live-table-wrapper {
  overflow-x: auto;
}

.live-table {
  width: 100%;
  min-width: 850px;
  border-collapse: collapse;
}

.live-table th,
.live-table td {
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
  text-align: left;
  white-space: nowrap;
}

.live-table th {
  background: rgba(148,163,184,.025);
  color: var(--muted);
  font-size: 8px;
  font-weight: 850;
  letter-spacing: .1em;
  text-transform: uppercase;
}

.live-table td {
  color: var(--text);
  font-size: 10px;
}

.live-table tbody tr {
  transition: background .15s ease;
}

.live-table tbody tr:hover {
  background: rgba(37,99,235,.025);
}

.employee-cell {
  display: flex;
  align-items: center;
  gap: 9px;
}

.employee-avatar {
  width: 31px;
  height: 31px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border: 1px solid rgba(37,99,235,.12);
  border-radius: 9px;
  background: rgba(37,99,235,.07);
  color: var(--primary);
  font-size: 9px;
  font-weight: 850;
}

.employee-cell strong {
  display: block;
  color: var(--text);
  font-size: 10px;
}

.employee-cell span {
  display: block;
  margin-top: 2px;
  color: var(--muted);
  font-size: 8px;
}

.operation-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  border-radius: 999px;
  font-size: 8px;
  font-weight: 850;
}

.operation-status.live {
  color: #22c55e;
  background: rgba(34,197,94,.08);
}

.operation-status.offline {
  color: #6b7280;
  background: rgba(107,114,128,.08);
}

.operation-status.stale {
  color: #f59e0b;
  background: rgba(245,158,11,.08);
}

.status-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}

.location-cell {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--text);
}

.location-cell svg {
  color: var(--primary);
}

.gps-cell {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.gps-coordinates {
  color: var(--muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 8px;
}

.mini-map-button {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 6px;
  background: rgba(37,99,235,.08);
  color: var(--primary);
  cursor: pointer;
}

.working-time {
  color: var(--text);
  font-weight: 800;
}

.gps-quality {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.gps-quality svg {
  color: #22c55e;
}

.no-gps {
  color: var(--muted);
}

.empty-table {
  padding: 42px 20px;
  text-align: center;
  color: var(--muted);
  font-size: 10px;
}

.table-retry {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 13px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  cursor: pointer;
  font-size: 9px;
  font-weight: 800;
}

.live-popup {
  min-width: 225px;
  padding: 2px;
}

.popup-name {
  color: #111827;
  font-size: 14px;
  font-weight: 800;
}

.popup-role {
  margin-top: 2px;
  color: #6b7280;
  font-size: 10px;
}

.popup-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin: 10px 0;
  padding: 5px 8px;
  border-radius: 999px;
  background: #ecfdf5;
  color: #16a34a;
  font-size: 9px;
  font-weight: 800;
}

.popup-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.popup-grid {
  display: grid;
  gap: 6px;
  padding-top: 9px;
  border-top: 1px solid #e5e7eb;
}

.popup-row {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  font-size: 9px;
}

.popup-row span:first-child {
  color: #6b7280;
}

.popup-row span:last-child {
  color: #111827;
  font-weight: 700;
  text-align: right;
}

.leaflet-container {
  font-family: inherit;
}

.leaflet-control-zoom {
  border: 0 !important;
  box-shadow: 0 5px 18px rgba(15,23,42,.15) !important;
}

.leaflet-control-zoom a {
  color: #1f2937 !important;
}

.live-loading-full {
  min-height: 520px;
  display: grid;
  place-items: center;
  align-content: center;
  text-align: center;
}

.live-loading-icon {
  width: 54px;
  height: 54px;
  display: grid;
  place-items: center;
  margin: 0 auto 12px;
  border-radius: 15px;
  background: rgba(37,99,235,.08);
  color: var(--primary);
}

.live-loading-full strong {
  display: block;
  color: var(--text);
  font-size: 12px;
}

.live-loading-full span {
  display: block;
  margin-top: 5px;
  color: var(--muted);
  font-size: 9px;
}

.spin {
  animation: liveSpin .8s linear infinite;
}

@keyframes liveSpin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes livePulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }

  50% {
    opacity: .45;
    transform: scale(.78);
  }
}

@media (max-width: 1150px) {
  .live-main-grid {
    grid-template-columns: 1fr;
  }

  .operations-panel {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .activity-feed {
    padding-top: 5px;
  }
}

@media (max-width: 900px) {
  .live-kpi-grid {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
  }

  .live-command-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .live-header-actions {
    justify-content: flex-start;
  }

  .command-status {
    align-items: flex-start;
    flex-direction: column;
  }

  .command-status-metrics {
    flex-wrap: wrap;
  }

  .operations-panel {
    display: block;
  }

  .live-error {
    align-items: flex-start;
  }
}


.live-access-card {
  min-height: 520px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 22px;
  padding: 42px;
  border: 1px solid var(--border);
  border-radius: 20px;
  background:
    radial-gradient(
      circle at 15% 20%,
      rgba(37,99,235,.07),
      transparent 35%
    ),
    var(--surface);
}

.live-access-icon {
  width: 74px;
  height: 74px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border: 1px solid rgba(37,99,235,.14);
  border-radius: 20px;
  background: rgba(37,99,235,.08);
  color: var(--primary);
}

.live-access-content {
  max-width: 620px;
}

.live-access-eyebrow {
  display: inline-block;
  color: var(--primary);
  font-size: 9px;
  font-weight: 850;
  letter-spacing: .16em;
}

.live-access-content h1 {
  margin: 8px 0 0;
  color: var(--text);
  font-size: clamp(24px, 3vw, 34px);
  letter-spacing: -.04em;
}

.live-access-content p {
  margin: 11px 0 0;
  color: var(--muted);
  font-size: 11px;
  line-height: 1.7;
}

.live-access-role {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
  padding: 9px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: rgba(148,163,184,.025);
  font-size: 9px;
}

.live-access-role span {
  color: var(--muted);
}

.live-access-role strong {
  color: var(--text);
}

@media (max-width: 600px) {
  .live-access-card {
    min-height: 430px;
    flex-direction: column;
    text-align: center;
    padding: 28px 20px;
  }

  .live-access-role {
    justify-content: center;
  }

  .live-kpi-grid {
    grid-template-columns: 1fr;
  }

  .live-header-actions {
    width: 100%;
  }

  .live-sync-status,
  .live-refresh {
    flex: 1;
  }

  .live-map-shell {
    height: 400px;
  }

  .live-card-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .map-live-badge {
    align-self: flex-start;
  }

  .command-status-metrics {
    gap: 10px;
  }

  .live-error {
    flex-wrap: wrap;
  }

  .error-retry {
    width: 100%;
    justify-content: center;
  }
}
`;