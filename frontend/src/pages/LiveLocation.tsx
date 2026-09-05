import {
  Activity,
  AlertTriangle,
  Clock3,
  Crosshair,
  LocateFixed,
  MapPin,
  Navigation,
  Radio,
  RefreshCw,
  Search,
  ShieldCheck,
  Signal,
  Target,
  Users,
  Wifi,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";

import api from "../services/api";

type Employee = {
  id: number;
  full_name: string;
  email?: string;
  employee_code?: string;
  department?: string;
  is_active?: boolean;
};

type LiveLocation = {
  id?: number;
  user_id: number;
  latitude: number;
  longitude: number;
  accuracy_meters?: number;
  recorded_at?: string;
  updated_at?: string;
};

type EmployeesResponse = {
  employees?: Employee[];
  data?: Employee[];
};

type LiveLocationsResponse = {
  locations?: LiveLocation[];
  data?: LiveLocation[];
};

const INDIA_CENTER: LatLngExpression = [20.5937, 78.9629];

function MapController({
  position,
  locations,
}: {
  position: LatLngExpression | null;
  locations: LiveLocation[];
}) {
  const map = useMap();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => window.clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (!position) return;

    map.flyTo(position, 16, {
      duration: 0.8,
    });
  }, [map, position]);

  useEffect(() => {
    if (position || locations.length === 0) return;

    if (locations.length === 1) {
      map.flyTo(
        [locations[0].latitude, locations[0].longitude],
        15,
        {
          duration: 0.8,
        }
      );
    }
  }, [map, position, locations]);

  return null;
}

function formatTime(value?: string) {
  if (!value) return "No signal";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function getLocationTime(location?: LiveLocation) {
  return location?.updated_at ?? location?.recorded_at;
}

function getAccuracy(location?: LiveLocation) {
  if (
    !location ||
    location.accuracy_meters === undefined ||
    location.accuracy_meters === null
  ) {
    return "N/A";
  }

  return `${Math.round(location.accuracy_meters)} m`;
}

function getAccuracyClass(location?: LiveLocation) {
  if (!location?.accuracy_meters) return "unknown";

  if (location.accuracy_meters <= 20) return "excellent";
  if (location.accuracy_meters <= 50) return "good";

  return "weak";
}

export default function LiveLocation() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [locations, setLocations] = useState<LiveLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<number | null>(
    null
  );
  const [trackingEmployee, setTrackingEmployee] = useState<number | null>(
    null
  );
  const [error, setError] = useState("");

  const loadData = useCallback(async (manual = false) => {
    try {
      if (manual) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [employeesResponse, locationsResponse] = await Promise.all([
        api.get<EmployeesResponse>("/api/live-location/employees"),
        api.get<LiveLocationsResponse>("/api/live-location"),
      ]);

      const employeeData =
        employeesResponse.data?.employees ??
        employeesResponse.data?.data ??
        [];

      const locationData =
        locationsResponse.data?.locations ??
        locationsResponse.data?.data ??
        [];

      setEmployees(employeeData);
      setLocations(locationData);
    } catch (err: any) {
      console.error("Live location load error:", err);

      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Unable to load live location data."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const interval = window.setInterval(() => {
      loadData();
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadData]);

  const locationMap = useMemo(() => {
    const map = new Map<number, LiveLocation>();

    locations.forEach((location) => {
      map.set(location.user_id, location);
    });

    return map;
  }, [locations]);

  const activeEmployees = useMemo(
    () => employees.filter((employee) => employee.is_active !== false),
    [employees]
  );

  const liveEmployees = useMemo(
    () =>
      activeEmployees.filter((employee) => locationMap.has(employee.id)),
    [activeEmployees, locationMap]
  );

  const gpsVerified = useMemo(
    () =>
      liveEmployees.filter((employee) => {
        const location = locationMap.get(employee.id);

        return Boolean(
          location &&
            typeof location.latitude === "number" &&
            typeof location.longitude === "number"
        );
      }).length,
    [liveEmployees, locationMap]
  );

  const highAccuracyLocations = useMemo(
    () =>
      locations.filter(
        (location) =>
          location.accuracy_meters !== undefined &&
          location.accuracy_meters <= 50
      ).length,
    [locations]
  );

  const filteredEmployees = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return activeEmployees;
    }

    return activeEmployees.filter((employee) => {
      return (
        employee.full_name.toLowerCase().includes(term) ||
        employee.email?.toLowerCase().includes(term) ||
        employee.employee_code?.toLowerCase().includes(term) ||
        employee.department?.toLowerCase().includes(term)
      );
    });
  }, [activeEmployees, search]);

  const selectedEmployeeData = useMemo(
    () =>
      employees.find((employee) => employee.id === selectedEmployee) ?? null,
    [employees, selectedEmployee]
  );

  const selectedLocation = selectedEmployee
    ? locationMap.get(selectedEmployee)
    : undefined;

  const selectedPosition: LatLngExpression | null = selectedLocation
    ? [selectedLocation.latitude, selectedLocation.longitude]
    : null;

  const mapPosition: LatLngExpression =
    selectedPosition ??
    (locations.length === 1
      ? [locations[0].latitude, locations[0].longitude]
      : INDIA_CENTER);

  const startTracking = async (employee: Employee) => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.");
      return;
    }

    setError("");
    setTrackingEmployee(employee.id);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await api.post("/api/live-location/update", {
            user_id: employee.id,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy_meters: position.coords.accuracy,
          });

          setSelectedEmployee(employee.id);

          await loadData(true);
        } catch (err: any) {
          console.error("Tracking update error:", err);

          setError(
            err?.response?.data?.detail ||
              err?.message ||
              "Unable to update live location."
          );
        } finally {
          setTrackingEmployee(null);
        }
      },
      (geoError) => {
        console.error("Geolocation error:", geoError);

        let message = "Unable to access device location.";

        if (geoError.code === geoError.PERMISSION_DENIED) {
          message = "Location permission was denied.";
        } else if (geoError.code === geoError.POSITION_UNAVAILABLE) {
          message = "Current location is unavailable.";
        } else if (geoError.code === geoError.TIMEOUT) {
          message = "Location request timed out.";
        }

        setError(message);
        setTrackingEmployee(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 5000,
      }
    );
  };

  const stopTracking = async (employee: Employee) => {
    try {
      setError("");
      setTrackingEmployee(employee.id);

      await api.post(`/api/live-location/${employee.id}/stop`);

      await loadData(true);
    } catch (err: any) {
      console.error("Stop tracking error:", err);

      setError(
        err?.response?.data?.detail ||
          err?.message ||
          "Unable to stop tracking."
      );
    } finally {
      setTrackingEmployee(null);
    }
  };

  return (
    <div className="live-location-page">
      <style>{styles}</style>

      {/* HEADER */}
      <header className="intel-header">
        <div className="intel-heading">
          <div className="intel-logo">
            <LocateFixed size={23} />
            <span />
          </div>

          <div>
            <div className="system-label">
              <span className="live-indicator" />
              SMART ATTENDANCE INTELLIGENCE
            </div>

            <h1>Geospatial Command Center</h1>

            <p>
              Real-time workforce positioning, GPS telemetry and attendance
              location intelligence.
            </p>
          </div>
        </div>

        <div className="header-right">
          <div className="live-engine">
            <div className="engine-icon">
              <Radio size={16} />
            </div>

            <div>
              <strong>LOCATION ENGINE</strong>
              <span>ONLINE · 5s STREAM</span>
            </div>
          </div>

          <button
            className="refresh-btn"
            onClick={() => loadData(true)}
            disabled={refreshing}
          >
            <RefreshCw
              size={16}
              className={refreshing ? "spin" : ""}
            />
            Sync
          </button>
        </div>
      </header>

      {/* ERROR */}
      {error && (
        <div className="alert-bar">
          <div className="alert-symbol">
            <AlertTriangle size={16} />
          </div>

          <div className="alert-text">
            <strong>TELEMETRY ALERT</strong>
            <span>{error}</span>
          </div>

          <button onClick={() => setError("")}>
            <X size={16} />
          </button>
        </div>
      )}

      {/* SYSTEM STATUS */}
      <section className="system-command-bar">
        <div className="command-item">
          <div className="command-icon green">
            <Activity size={15} />
          </div>

          <div>
            <span>SYSTEM STATUS</span>
            <strong>
              <i className="status-dot green-dot" />
              Operational
            </strong>
          </div>
        </div>

        <div className="command-divider" />

        <div className="command-item">
          <div className="command-icon blue">
            <Radio size={15} />
          </div>

          <div>
            <span>GPS STREAM</span>
            <strong>{locations.length} active feeds</strong>
          </div>
        </div>

        <div className="command-divider" />

        <div className="command-item">
          <div className="command-icon purple">
            <ShieldCheck size={15} />
          </div>

          <div>
            <span>LOCATION INTEGRITY</span>
            <strong>{gpsVerified} verified</strong>
          </div>
        </div>

        <div className="command-divider" />

        <div className="command-item">
          <div className="command-icon cyan">
            <Target size={15} />
          </div>

          <div>
            <span>GPS ACCURACY</span>
            <strong>{highAccuracyLocations} high precision</strong>
          </div>
        </div>

        <div className="command-spacer" />

        <div className="secure-stream">
          <Wifi size={13} />
          ENCRYPTED TELEMETRY
        </div>
      </section>

      {/* METRICS */}
      <section className="metrics">
        <div className="metric-card blue-card">
          <div className="metric-header">
            <span>LIVE WORKFORCE</span>

            <div className="metric-symbol">
              <Users size={17} />
            </div>
          </div>

          <div className="metric-number">
            {loading ? "—" : liveEmployees.length}
          </div>

          <div className="metric-description">
            <span className="tiny-live" />
            Employees transmitting GPS
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>LOCATION FEEDS</span>

            <div className="metric-symbol">
              <MapPin size={17} />
            </div>
          </div>

          <div className="metric-number">
            {loading ? "—" : locations.length}
          </div>

          <div className="metric-description">
            <Activity size={12} />
            Coordinate streams received
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>GPS VERIFIED</span>

            <div className="metric-symbol verified">
              <ShieldCheck size={17} />
            </div>
          </div>

          <div className="metric-number">
            {loading ? "—" : gpsVerified}
          </div>

          <div className="metric-description">
            <span className="tiny-live" />
            Valid coordinate telemetry
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span>NETWORK</span>

            <div className="metric-symbol">
              <Signal size={17} />
            </div>
          </div>

          <div className="metric-number online-text">ONLINE</div>

          <div className="metric-description">
            <Wifi size={12} />
            Secure channel stable
          </div>
        </div>
      </section>

      {/* MAIN COMMAND CENTER */}
      <section className="command-center">
        {/* EMPLOYEES */}
        <aside className="workforce-panel">
          <div className="panel-top">
            <div>
              <div className="mini-label">WORKFORCE INTELLIGENCE</div>
              <h2>Live Personnel</h2>
            </div>

            <div className="person-count">
              {activeEmployees.length}
            </div>
          </div>

          <div className="search-container">
            <Search size={15} />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search personnel..."
            />

            {search && (
              <button onClick={() => setSearch("")}>
                <X size={13} />
              </button>
            )}
          </div>

          <div className="list-heading">
            <span>PERSONNEL SIGNALS</span>
            <span>{filteredEmployees.length}</span>
          </div>

          <div className="personnel-list">
            {loading ? (
              Array.from({ length: 7 }).map((_, index) => (
                <div className="person-skeleton" key={index}>
                  <div className="skeleton-avatar" />

                  <div className="skeleton-content">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              ))
            ) : filteredEmployees.length === 0 ? (
              <div className="no-personnel">
                <Users size={27} />
                <strong>No personnel found</strong>
                <span>
                  No employees match the current search.
                </span>
              </div>
            ) : (
              filteredEmployees.map((employee) => {
                const location = locationMap.get(employee.id);
                const isLive = Boolean(location);
                const isSelected =
                  selectedEmployee === employee.id;
                const isTracking =
                  trackingEmployee === employee.id;

                return (
                  <button
                    key={employee.id}
                    className={`person-row ${
                      isSelected ? "selected-person" : ""
                    }`}
                    onClick={() =>
                      setSelectedEmployee(employee.id)
                    }
                  >
                    <div className="person-avatar">
                      {getInitials(employee.full_name)}

                      <span
                        className={`presence-dot ${
                          isLive ? "presence-live" : "presence-offline"
                        }`}
                      />
                    </div>

                    <div className="person-details">
                      <strong>{employee.full_name}</strong>

                      <span>
                        {employee.employee_code ||
                          employee.department ||
                          "EMPLOYEE"}
                      </span>

                      <small>
                        {isLive
                          ? `GPS ${formatTime(
                              getLocationTime(location)
                            )}`
                          : "GPS SIGNAL OFFLINE"}
                      </small>
                    </div>

                    <div
                      className={`signal-status ${
                        isLive ? "signal-live" : ""
                      }`}
                    >
                      {isTracking ? (
                        <RefreshCw
                          size={14}
                          className="spin"
                        />
                      ) : isLive ? (
                        <Wifi size={14} />
                      ) : (
                        <WifiOff size={14} />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* MAP */}
        <main className="geo-panel">
          <div className="geo-header">
            <div className="geo-heading">
              <div className="geo-icon">
                <Navigation size={18} />
              </div>

              <div>
                <div className="mini-label">
                  GEOSPATIAL INTELLIGENCE
                </div>

                <h2>Workforce Positioning Matrix</h2>
              </div>
            </div>

            <div className="geo-actions">
              <div className="matrix-status">
                <span />
                LIVE MATRIX
              </div>

              {selectedEmployee && (
                <button
                  className="clear-btn"
                  onClick={() => setSelectedEmployee(null)}
                >
                  Clear Focus
                </button>
              )}
            </div>
          </div>

          <div className="map-wrapper">
            <MapContainer
              center={mapPosition}
              zoom={locations.length > 0 ? 12 : 5}
              scrollWheelZoom
              className="intelligence-map"
            >
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              <MapController
                position={selectedPosition}
                locations={locations}
              />

              {locations.map((location) => {
                const employee = employees.find(
                  (item) => item.id === location.user_id
                );

                if (!employee) return null;

                const isSelected =
                  selectedEmployee === employee.id;

                return (
                  <CircleMarker
                    key={`${location.user_id}-${location.id ?? "live"}`}
                    center={[
                      location.latitude,
                      location.longitude,
                    ]}
                    radius={isSelected ? 12 : 8}
                    pathOptions={{
                      color: isSelected
                        ? "#38bdf8"
                        : "#22c55e",
                      fillColor: isSelected
                        ? "#0284c7"
                        : "#16a34a",
                      fillOpacity: 0.88,
                      weight: 3,
                    }}
                    eventHandlers={{
                      click: () =>
                        setSelectedEmployee(employee.id),
                    }}
                  >
                    <Popup>
                      <div className="custom-popup">
                        <div className="popup-heading">
                          <div className="popup-avatar">
                            {getInitials(
                              employee.full_name
                            )}
                          </div>

                          <div>
                            <strong>
                              {employee.full_name}
                            </strong>

                            <span>
                              {employee.employee_code ||
                                employee.department ||
                                "Employee"}
                            </span>
                          </div>
                        </div>

                        <div className="popup-line">
                          <MapPin size={12} />
                          {location.latitude.toFixed(6)},{" "}
                          {location.longitude.toFixed(6)}
                        </div>

                        <div className="popup-line">
                          <Signal size={12} />
                          Accuracy {getAccuracy(location)}
                        </div>

                        <div className="popup-line">
                          <Clock3 size={12} />
                          {formatTime(
                            getLocationTime(location)
                          )}
                        </div>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>

            {/* MAP HUD */}
            <div className="map-hud hud-top-left">
              <div className="hud-live">
                <span />
                GPS TELEMETRY ACTIVE
              </div>

              <div className="hud-subtitle">
                {locations.length} coordinate streams
              </div>
            </div>

            <div className="map-hud hud-top-right">
              <div>
                <span>COORDINATE SYSTEM</span>
                <strong>WGS84</strong>
              </div>

              <Crosshair size={17} />
            </div>

            <div className="map-hud hud-bottom-left">
              <div className="legend">
                <span className="legend-live" />
                LIVE PERSONNEL
              </div>

              <div className="legend">
                <span className="legend-selected" />
                ACTIVE FOCUS
              </div>
            </div>

            <div className="map-hud hud-bottom-right">
              <Wifi size={13} />
              SECURE STREAM
            </div>
          </div>
        </main>
      </section>

      {/* SELECTED EMPLOYEE */}
      {selectedEmployeeData && (
        <section className="subject-panel">
          <div className="subject-header">
            <div className="subject-identity">
              <div className="subject-avatar">
                {getInitials(
                  selectedEmployeeData.full_name
                )}

                <span
                  className={
                    selectedLocation
                      ? "subject-live"
                      : "subject-offline"
                  }
                />
              </div>

              <div>
                <div className="mini-label">
                  ACTIVE SUBJECT / GPS PROFILE
                </div>

                <h2>
                  {selectedEmployeeData.full_name}
                </h2>

                <p>
                  {selectedEmployeeData.employee_code ||
                    "Employee ID"}{" "}
                  <span>•</span>{" "}
                  {selectedEmployeeData.department ||
                    "Operations"}
                </p>
              </div>
            </div>

            <div className="subject-actions">
              {selectedLocation ? (
                <button
                  className="stop-track"
                  onClick={() =>
                    stopTracking(selectedEmployeeData)
                  }
                  disabled={
                    trackingEmployee ===
                    selectedEmployeeData.id
                  }
                >
                  <WifiOff size={15} />
                  Stop Tracking
                </button>
              ) : (
                <button
                  className="start-track"
                  onClick={() =>
                    startTracking(selectedEmployeeData)
                  }
                  disabled={
                    trackingEmployee ===
                    selectedEmployeeData.id
                  }
                >
                  {trackingEmployee ===
                  selectedEmployeeData.id ? (
                    <RefreshCw
                      size={15}
                      className="spin"
                    />
                  ) : (
                    <Radio size={15} />
                  )}

                  Start Tracking
                </button>
              )}
            </div>
          </div>

          <div className="subject-metrics">
            <div className="subject-metric">
              <div className="subject-metric-icon">
                <Crosshair size={16} />
              </div>

              <div>
                <span>LATITUDE</span>
                <strong>
                  {selectedLocation
                    ? selectedLocation.latitude.toFixed(6)
                    : "—"}
                </strong>
              </div>
            </div>

            <div className="subject-metric">
              <div className="subject-metric-icon">
                <Navigation size={16} />
              </div>

              <div>
                <span>LONGITUDE</span>
                <strong>
                  {selectedLocation
                    ? selectedLocation.longitude.toFixed(6)
                    : "—"}
                </strong>
              </div>
            </div>

            <div className="subject-metric">
              <div
                className={`subject-metric-icon ${getAccuracyClass(
                  selectedLocation
                )}`}
              >
                <Target size={16} />
              </div>

              <div>
                <span>GPS ACCURACY</span>
                <strong>
                  {selectedLocation
                    ? getAccuracy(selectedLocation)
                    : "NO SIGNAL"}
                </strong>
              </div>
            </div>

            <div className="subject-metric">
              <div className="subject-metric-icon">
                <Clock3 size={16} />
              </div>

              <div>
                <span>LAST TELEMETRY</span>
                <strong>
                  {selectedLocation
                    ? formatTime(
                        getLocationTime(
                          selectedLocation
                        )
                      )
                    : "NO SIGNAL"}
                </strong>
              </div>
            </div>
          </div>

          <div className="subject-footer">
            <div
              className={
                selectedLocation
                  ? "connection-online"
                  : "connection-offline"
              }
            >
              {selectedLocation ? (
                <>
                  <Zap size={13} />
                  GPS telemetry connection established
                </>
              ) : (
                <>
                  <WifiOff size={13} />
                  No active telemetry from this subject
                </>
              )}
            </div>

            <div className="subject-security">
              <ShieldCheck size={12} />
              LOCATION DATA VERIFIED
            </div>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="intel-footer">
        <div className="footer-brand">
          <span />
          SMART ATTENDANCE INTELLIGENCE
        </div>

        <div>
          GEOLOCATION INTELLIGENCE
          <b>•</b>
          GPS TELEMETRY
          <b>•</b>
          REAL-TIME OPERATIONS
        </div>
      </footer>
    </div>
  );
}

const styles = `
  * {
    box-sizing: border-box;
  }

  .live-location-page {
    min-height: 100vh;
    padding: 26px;
    background:
      radial-gradient(
        circle at 10% 0%,
        rgba(37, 99, 235, 0.08),
        transparent 28%
      ),
      radial-gradient(
        circle at 90% 10%,
        rgba(14, 165, 233, 0.06),
        transparent 25%
      ),
      var(--background, #f5f7fb);
    color: var(--text, #0f172a);
  }

  /* HEADER */

  .intel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 25px;
    margin-bottom: 20px;
  }

  .intel-heading {
    display: flex;
    align-items: center;
    gap: 15px;
  }

  .intel-logo {
    position: relative;
    width: 50px;
    height: 50px;
    display: grid;
    place-items: center;
    border-radius: 15px;
    background:
      linear-gradient(
        135deg,
        #0f172a,
        #1e3a8a
      );
    color: #38bdf8;
    box-shadow:
      0 10px 30px rgba(15, 23, 42, 0.2);
  }

  .intel-logo span {
    position: absolute;
    right: 8px;
    bottom: 8px;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #22c55e;
    box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.16);
  }

  .system-label,
  .mini-label {
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 0.14em;
    color: #64748b;
  }

  .system-label {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 4px;
  }

  .live-indicator {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #22c55e;
    box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.1);
  }

  .intel-header h1 {
    margin: 0;
    font-size: 28px;
    line-height: 1.1;
    letter-spacing: -0.04em;
    font-weight: 850;
  }

  .intel-header p {
    margin: 6px 0 0;
    color: #64748b;
    font-size: 12px;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .live-engine {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 9px 13px;
    border: 1px solid #dbe3ef;
    border-radius: 12px;
    background: rgba(255,255,255,0.8);
  }

  .engine-icon {
    width: 31px;
    height: 31px;
    display: grid;
    place-items: center;
    border-radius: 9px;
    color: #2563eb;
    background: #eff6ff;
  }

  .live-engine strong,
  .live-engine span {
    display: block;
  }

  .live-engine strong {
    font-size: 9px;
    letter-spacing: 0.08em;
  }

  .live-engine span {
    margin-top: 3px;
    font-size: 8px;
    color: #16a34a;
    font-weight: 800;
  }

  .refresh-btn {
    height: 48px;
    padding: 0 15px;
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid #dbe3ef;
    border-radius: 12px;
    background: #fff;
    color: #0f172a;
    cursor: pointer;
    font-size: 11px;
    font-weight: 800;
    transition: .2s ease;
  }

  .refresh-btn:hover {
    border-color: #2563eb;
    color: #2563eb;
    transform: translateY(-1px);
  }

  .refresh-btn:disabled {
    opacity: .55;
    cursor: not-allowed;
  }

  /* ALERT */

  .alert-bar {
    display: flex;
    align-items: center;
    gap: 11px;
    margin-bottom: 16px;
    padding: 11px 13px;
    border: 1px solid #fecaca;
    border-radius: 12px;
    background: #fff7f7;
  }

  .alert-symbol {
    width: 31px;
    height: 31px;
    display: grid;
    place-items: center;
    border-radius: 9px;
    background: #fee2e2;
    color: #dc2626;
  }

  .alert-text {
    flex: 1;
  }

  .alert-text strong,
  .alert-text span {
    display: block;
  }

  .alert-text strong {
    font-size: 9px;
    color: #991b1b;
    letter-spacing: .1em;
  }

  .alert-text span {
    margin-top: 2px;
    color: #b91c1c;
    font-size: 11px;
  }

  .alert-bar button {
    border: 0;
    background: transparent;
    color: #991b1b;
    cursor: pointer;
  }

  /* COMMAND BAR */

  .system-command-bar {
    display: flex;
    align-items: center;
    gap: 18px;
    min-height: 68px;
    margin-bottom: 15px;
    padding: 10px 15px;
    border: 1px solid #dce4ef;
    border-radius: 15px;
    background: rgba(255,255,255,.82);
    backdrop-filter: blur(12px);
  }

  .command-item {
    display: flex;
    align-items: center;
    gap: 9px;
  }

  .command-icon {
    width: 31px;
    height: 31px;
    display: grid;
    place-items: center;
    border-radius: 9px;
  }

  .command-icon.green {
    background: #f0fdf4;
    color: #16a34a;
  }

  .command-icon.blue {
    background: #eff6ff;
    color: #2563eb;
  }

  .command-icon.purple {
    background: #f5f3ff;
    color: #7c3aed;
  }

  .command-icon.cyan {
    background: #ecfeff;
    color: #0891b2;
  }

  .command-item span,
  .command-item strong {
    display: block;
  }

  .command-item span {
    font-size: 8px;
    color: #64748b;
    font-weight: 900;
    letter-spacing: .1em;
  }

  .command-item strong {
    margin-top: 3px;
    font-size: 11px;
  }

  .command-item strong {
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .status-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
  }

  .green-dot {
    background: #22c55e;
  }

  .command-divider {
    width: 1px;
    height: 29px;
    background: #e2e8f0;
  }

  .command-spacer {
    flex: 1;
  }

  .secure-stream {
    display: flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
    color: #64748b;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: .08em;
  }

  /* METRICS */

  .metrics {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 13px;
    margin-bottom: 15px;
  }

  .metric-card {
    position: relative;
    overflow: hidden;
    padding: 16px;
    min-height: 126px;
    border: 1px solid #dce4ef;
    border-radius: 15px;
    background: rgba(255,255,255,.88);
    box-shadow: 0 7px 22px rgba(15,23,42,.035);
  }

  .metric-card::after {
    content: "";
    position: absolute;
    width: 80px;
    height: 80px;
    right: -30px;
    bottom: -35px;
    border-radius: 50%;
    background: rgba(37,99,235,.045);
  }

  .metric-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .metric-header > span {
    font-size: 9px;
    font-weight: 900;
    letter-spacing: .1em;
    color: #64748b;
  }

  .metric-symbol {
    width: 33px;
    height: 33px;
    display: grid;
    place-items: center;
    border-radius: 9px;
    background: #eff6ff;
    color: #2563eb;
  }

  .metric-symbol.verified {
    background: #f0fdf4;
    color: #16a34a;
  }

  .metric-number {
    margin-top: 10px;
    font-size: 28px;
    line-height: 1;
    font-weight: 900;
    letter-spacing: -.05em;
  }

  .online-text {
    color: #16a34a;
    font-size: 22px;
    letter-spacing: -.02em;
  }

  .metric-description {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    color: #64748b;
    font-size: 9px;
  }

  .tiny-live {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #22c55e;
  }

  /* COMMAND CENTER */

  .command-center {
    display: grid;
    grid-template-columns: 340px minmax(0, 1fr);
    gap: 15px;
  }

  .workforce-panel,
  .geo-panel,
  .subject-panel {
    border: 1px solid #dce4ef;
    border-radius: 17px;
    background: rgba(255,255,255,.9);
    box-shadow: 0 8px 28px rgba(15,23,42,.035);
    overflow: hidden;
  }

  .workforce-panel {
    min-height: 610px;
    max-height: 610px;
    display: flex;
    flex-direction: column;
  }

  .panel-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 17px;
    border-bottom: 1px solid #e7edf5;
  }

  .panel-top h2,
  .geo-heading h2,
  .subject-identity h2 {
    margin: 4px 0 0;
    font-size: 15px;
    letter-spacing: -.02em;
  }

  .person-count {
    min-width: 31px;
    height: 31px;
    display: grid;
    place-items: center;
    border-radius: 9px;
    background: #0f172a;
    color: #fff;
    font-size: 11px;
    font-weight: 900;
  }

  .search-container {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 13px;
    padding: 10px;
    border: 1px solid #dce4ef;
    border-radius: 10px;
    background: #f8fafc;
    color: #64748b;
  }

  .search-container:focus-within {
    border-color: #38bdf8;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(56,189,248,.08);
  }

  .search-container input {
    width: 100%;
    border: 0;
    outline: 0;
    background: transparent;
    color: #0f172a;
    font-size: 11px;
  }

  .search-container input::placeholder {
    color: #94a3b8;
  }

  .search-container button {
    display: grid;
    place-items: center;
    border: 0;
    background: transparent;
    color: #64748b;
    cursor: pointer;
  }

  .list-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 14px 9px;
    color: #94a3b8;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: .1em;
  }

  .personnel-list {
    flex: 1;
    overflow-y: auto;
    padding: 0 7px 10px;
  }

  .person-row {
    position: relative;
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 9px;
    margin-bottom: 3px;
    border: 1px solid transparent;
    border-radius: 12px;
    background: transparent;
    color: #0f172a;
    text-align: left;
    cursor: pointer;
    transition: .18s ease;
  }

  .person-row:hover {
    background: #f8fafc;
    border-color: #e7edf5;
  }

  .selected-person {
    background:
      linear-gradient(
        90deg,
        rgba(14,165,233,.09),
        rgba(37,99,235,.035)
      );
    border-color: rgba(14,165,233,.18);
  }

  .selected-person::before {
    content: "";
    position: absolute;
    left: 0;
    top: 8px;
    bottom: 8px;
    width: 3px;
    border-radius: 4px;
    background: #0ea5e9;
  }

  .person-avatar {
    position: relative;
    width: 39px;
    height: 39px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    border-radius: 11px;
    background:
      linear-gradient(
        135deg,
        #0f172a,
        #1d4ed8
      );
    color: #fff;
    font-size: 10px;
    font-weight: 900;
  }

  .presence-dot {
    position: absolute;
    right: -1px;
    bottom: -1px;
    width: 9px;
    height: 9px;
    border: 2px solid #fff;
    border-radius: 50%;
  }

  .presence-live {
    background: #22c55e;
  }

  .presence-offline {
    background: #94a3b8;
  }

  .person-details {
    min-width: 0;
    flex: 1;
  }

  .person-details strong,
  .person-details span,
  .person-details small {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .person-details strong {
    font-size: 11px;
  }

  .person-details span {
    margin-top: 2px;
    color: #2563eb;
    font-size: 8px;
    font-weight: 800;
  }

  .person-details small {
    margin-top: 2px;
    color: #94a3b8;
    font-size: 8px;
    letter-spacing: .02em;
  }

  .signal-status {
    color: #94a3b8;
  }

  .signal-live {
    color: #16a34a;
  }

  /* MAP */

  .geo-panel {
    min-width: 0;
    min-height: 610px;
  }

  .geo-header {
    height: 68px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    padding: 0 17px;
    border-bottom: 1px solid #e7edf5;
  }

  .geo-heading {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .geo-icon {
    width: 35px;
    height: 35px;
    display: grid;
    place-items: center;
    border-radius: 10px;
    background: #eff6ff;
    color: #2563eb;
  }

  .geo-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .matrix-status {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 9px;
    border-radius: 8px;
    background: #f0fdf4;
    color: #15803d;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: .08em;
  }

  .matrix-status span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #22c55e;
    box-shadow: 0 0 0 3px rgba(34,197,94,.1);
  }

  .clear-btn {
    padding: 6px 9px;
    border: 1px solid #dce4ef;
    border-radius: 8px;
    background: #fff;
    color: #64748b;
    font-size: 9px;
    font-weight: 800;
    cursor: pointer;
  }

  .clear-btn:hover {
    border-color: #2563eb;
    color: #2563eb;
  }

  .map-wrapper {
    position: relative;
    height: 542px;
    overflow: hidden;
    background: #dbe4eb;
  }

  .intelligence-map {
    width: 100%;
    height: 542px !important;
  }

  .leaflet-container {
    width: 100%;
    height: 100%;
    font-family: inherit;
  }

  .map-hud {
    position: absolute;
    z-index: 500;
    border: 1px solid rgba(255,255,255,.75);
    border-radius: 10px;
    background: rgba(255,255,255,.91);
    backdrop-filter: blur(12px);
    box-shadow: 0 8px 24px rgba(15,23,42,.13);
  }

  .hud-top-left {
    top: 14px;
    left: 14px;
    padding: 10px 12px;
  }

  .hud-live {
    display: flex;
    align-items: center;
    gap: 7px;
    color: #0f172a;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: .08em;
  }

  .hud-live span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #22c55e;
  }

  .hud-subtitle {
    margin-top: 5px;
    color: #64748b;
    font-size: 8px;
  }

  .hud-top-right {
    top: 14px;
    right: 14px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
  }

  .hud-top-right span,
  .hud-top-right strong {
    display: block;
  }

  .hud-top-right span {
    color: #94a3b8;
    font-size: 7px;
    font-weight: 900;
    letter-spacing: .08em;
  }

  .hud-top-right strong {
    margin-top: 2px;
    font-size: 10px;
  }

  .hud-bottom-left {
    left: 14px;
    bottom: 14px;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 10px;
  }

  .legend {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #475569;
    font-size: 8px;
    font-weight: 800;
  }

  .legend-live,
  .legend-selected {
    width: 7px;
    height: 7px;
    border-radius: 50%;
  }

  .legend-live {
    background: #16a34a;
  }

  .legend-selected {
    background: #0284c7;
  }

  .hud-bottom-right {
    right: 14px;
    bottom: 14px;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    color: #475569;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: .06em;
  }

  /* POPUP */

  .custom-popup {
    min-width: 190px;
  }

  .popup-heading {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e2e8f0;
  }

  .popup-avatar {
    width: 31px;
    height: 31px;
    display: grid;
    place-items: center;
    border-radius: 9px;
    background: #0f172a;
    color: #fff;
    font-size: 9px;
    font-weight: 900;
  }

  .popup-heading strong,
  .popup-heading span {
    display: block;
  }

  .popup-heading strong {
    font-size: 11px;
  }

  .popup-heading span {
    margin-top: 2px;
    color: #64748b;
    font-size: 8px;
  }

  .popup-line {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    color: #475569;
    font-size: 9px;
  }

  /* SUBJECT */

  .subject-panel {
    margin-top: 15px;
    padding: 17px;
  }

  .subject-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    padding-bottom: 15px;
    border-bottom: 1px solid #e7edf5;
  }

  .subject-identity {
    display: flex;
    align-items: center;
    gap: 11px;
  }

  .subject-avatar {
    position: relative;
    width: 47px;
    height: 47px;
    display: grid;
    place-items: center;
    border-radius: 13px;
    background:
      linear-gradient(
        135deg,
        #0f172a,
        #2563eb
      );
    color: #fff;
    font-size: 12px;
    font-weight: 900;
  }

  .subject-avatar > span {
    position: absolute;
    right: -1px;
    bottom: -1px;
    width: 10px;
    height: 10px;
    border: 2px solid #fff;
    border-radius: 50%;
  }

  .subject-live {
    background: #22c55e;
  }

  .subject-offline {
    background: #94a3b8;
  }

  .subject-identity p {
    margin: 3px 0 0;
    color: #64748b;
    font-size: 9px;
  }

  .subject-identity p span {
    padding: 0 3px;
  }

  .subject-actions {
    display: flex;
    align-items: center;
  }

  .start-track,
  .stop-track {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    padding: 10px 14px;
    border: 0;
    border-radius: 10px;
    color: #fff;
    font-size: 10px;
    font-weight: 800;
    cursor: pointer;
  }

  .start-track {
    background: #2563eb;
  }

  .stop-track {
    background: #dc2626;
  }

  .start-track:disabled,
  .stop-track:disabled {
    opacity: .55;
    cursor: not-allowed;
  }

  .subject-metrics {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    margin-top: 14px;
  }

  .subject-metric {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 12px;
    border: 1px solid #e1e8f0;
    border-radius: 11px;
    background: #f8fafc;
  }

  .subject-metric-icon {
    width: 31px;
    height: 31px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    border-radius: 8px;
    background: #fff;
    color: #2563eb;
  }

  .subject-metric-icon.excellent {
    color: #16a34a;
    background: #f0fdf4;
  }

  .subject-metric-icon.good {
    color: #0891b2;
    background: #ecfeff;
  }

  .subject-metric-icon.weak {
    color: #dc2626;
    background: #fef2f2;
  }

  .subject-metric span,
  .subject-metric strong {
    display: block;
  }

  .subject-metric span {
    font-size: 7px;
    color: #94a3b8;
    font-weight: 900;
    letter-spacing: .09em;
  }

  .subject-metric strong {
    margin-top: 3px;
    font-size: 10px;
  }

  .subject-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 12px;
    font-size: 8px;
  }

  .connection-online,
  .connection-offline,
  .subject-security {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .connection-online {
    color: #15803d;
  }

  .connection-offline {
    color: #64748b;
  }

  .subject-security {
    color: #64748b;
    font-weight: 800;
    letter-spacing: .05em;
  }

  /* SKELETON */

  .person-skeleton {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px 9px;
  }

  .skeleton-avatar,
  .skeleton-content span {
    background: #edf2f7;
    animation: pulseSkeleton 1.2s ease-in-out infinite;
  }

  .skeleton-avatar {
    width: 39px;
    height: 39px;
    border-radius: 11px;
  }

  .skeleton-content {
    flex: 1;
  }

  .skeleton-content span {
    display: block;
    width: 72%;
    height: 7px;
    margin-bottom: 6px;
    border-radius: 5px;
  }

  .skeleton-content span:nth-child(2) {
    width: 43%;
  }

  .skeleton-content span:nth-child(3) {
    width: 55%;
  }

  @keyframes pulseSkeleton {
    0%, 100% {
      opacity: .45;
    }

    50% {
      opacity: 1;
    }
  }

  .no-personnel {
    min-height: 240px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 25px;
    text-align: center;
    color: #94a3b8;
  }

  .no-personnel strong {
    color: #0f172a;
    font-size: 12px;
  }

  .no-personnel span {
    font-size: 9px;
    line-height: 1.5;
  }

  /* FOOTER */

  .intel-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    margin-top: 16px;
    padding: 4px 2px;
    color: #94a3b8;
    font-size: 8px;
    font-weight: 700;
    letter-spacing: .04em;
  }

  .intel-footer > div {
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .footer-brand {
    color: #64748b;
  }

  .footer-brand span {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #22c55e;
  }

  .intel-footer b {
    color: #cbd5e1;
  }

  .spin {
    animation: rotateSpin .8s linear infinite;
  }

  @keyframes rotateSpin {
    from {
      transform: rotate(0deg);
    }

    to {
      transform: rotate(360deg);
    }
  }

  /* RESPONSIVE */

  @media (max-width: 1150px) {
    .command-center {
      grid-template-columns: 290px minmax(0, 1fr);
    }

    .metrics {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .subject-metrics {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .secure-stream {
      display: none;
    }
  }

  @media (max-width: 900px) {
    .live-location-page {
      padding: 18px;
    }

    .intel-header {
      align-items: flex-start;
      flex-direction: column;
    }

    .header-right {
      width: 100%;
    }

    .live-engine {
      flex: 1;
    }

    .command-center {
      grid-template-columns: 1fr;
    }

    .workforce-panel {
      min-height: 390px;
      max-height: 430px;
    }

    .geo-panel {
      min-height: 560px;
    }

    .map-wrapper,
    .intelligence-map {
      height: 490px !important;
    }

    .system-command-bar {
      flex-wrap: wrap;
    }

    .command-divider {
      display: none;
    }

    .command-spacer {
      display: none;
    }
  }

  @media (max-width: 620px) {
    .intel-header h1 {
      font-size: 23px;
    }

    .intel-header p {
      font-size: 10px;
    }

    .header-right {
      flex-direction: column;
      align-items: stretch;
    }

    .refresh-btn {
      justify-content: center;
    }

    .system-command-bar {
      align-items: flex-start;
    }

    .command-item {
      width: calc(50% - 10px);
    }

    .metrics {
      grid-template-columns: 1fr;
    }

    .subject-metrics {
      grid-template-columns: 1fr;
    }

    .geo-header {
      height: auto;
      min-height: 68px;
      padding: 12px;
    }

    .geo-actions {
      flex-direction: column;
      align-items: flex-end;
    }

    .subject-header {
      align-items: flex-start;
      flex-direction: column;
    }

    .subject-actions,
    .start-track,
    .stop-track {
      width: 100%;
    }

    .subject-footer,
    .intel-footer {
      align-items: flex-start;
      flex-direction: column;
    }

    .hud-top-right {
      display: none;
    }
  }
`;