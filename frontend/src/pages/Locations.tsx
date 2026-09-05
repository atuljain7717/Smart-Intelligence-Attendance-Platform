
import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  AlertTriangle,
  Circle,
  MapPin,
  Navigation,
  Pencil,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  X,
  LocateFixed,
} from "lucide-react";

import api from "../services/api";

interface Location {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  radius_meters: number;
  is_active: boolean;
  created_at: string | null;
}

interface LocationForm {
  name: string;
  latitude: string;
  longitude: string;
  radius_meters: string;
}

const EMPTY_FORM: LocationForm = {
  name: "",
  latitude: "",
  longitude: "",
  radius_meters: "100",
};

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (
      error as {
        response?: {
          data?: {
            detail?: unknown;
            message?: unknown;
          };
        };
      }
    ).response;

    const detail = response?.data?.detail;
    const message = response?.data?.message;

    if (typeof detail === "string") {
      return detail;
    }

    if (typeof message === "string") {
      return message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export default function Locations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] =
    useState<Location | null>(null);

  const [form, setForm] = useState<LocationForm>(EMPTY_FORM);

  const loadLocations = useCallback(async (refresh = false) => {
    try {
      setError("");

      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await api.get<Location[]>(
        "/api/locations/"
      );

      setLocations(
        Array.isArray(response.data)
          ? response.data
          : []
      );
    } catch (err: unknown) {
      console.error("Locations API error:", err);

      setError(
        getErrorMessage(
          err,
          "Unable to load locations."
        )
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadLocations();
  }, [loadLocations]);

  const openCreateModal = () => {
    setEditingLocation(null);
    setForm({ ...EMPTY_FORM });
    setShowModal(true);
  };

  const openEditModal = (location: Location) => {
    setEditingLocation(location);

    setForm({
      name: location.name,
      latitude: String(location.latitude),
      longitude: String(location.longitude),
      radius_meters: String(
        location.radius_meters
      ),
    });

    setShowModal(true);
  };

  const closeModal = () => {
    if (saving || gettingLocation) return;

    setShowModal(false);
    setEditingLocation(null);
    setForm({ ...EMPTY_FORM });
  };

  const updateForm = (
    field: keyof LocationForm,
    value: string
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  // ============================================================
  // USE CURRENT GPS LOCATION
  // ============================================================

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      window.alert(
        "Geolocation is not supported by this browser."
      );
      return;
    }

    setGettingLocation(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude =
          position.coords.latitude;

        const longitude =
          position.coords.longitude;

        setForm((current) => ({
          ...current,
          latitude: latitude.toFixed(7),
          longitude: longitude.toFixed(7),
        }));

        setGettingLocation(false);

        window.alert(
          `Current location detected successfully.\n\nLatitude: ${latitude.toFixed(
            7
          )}\nLongitude: ${longitude.toFixed(
            7
          )}\n\nThese coordinates have been added to the workplace form.`
        );
      },
      (geoError) => {
        console.error(
          "Geolocation error:",
          geoError
        );

        let message =
          "Unable to get your current location.";

        switch (geoError.code) {
          case geoError.PERMISSION_DENIED:
            message =
              "Location permission was denied. Please allow location access in your browser and try again.";
            break;

          case geoError.POSITION_UNAVAILABLE:
            message =
              "Your current location could not be determined. Check your GPS/location settings and try again.";
            break;

          case geoError.TIMEOUT:
            message =
              "Location request timed out. Please try again.";
            break;
        }

        setGettingLocation(false);
        window.alert(message);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  // ============================================================
  // SAVE LOCATION
  // ============================================================

  const saveLocation = async () => {
    const name = form.name.trim();
    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    const radius = Number(form.radius_meters);

    if (!name) {
      window.alert(
        "Location name is required."
      );
      return;
    }

    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90
    ) {
      window.alert(
        "Latitude must be between -90 and 90."
      );
      return;
    }

    if (
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      window.alert(
        "Longitude must be between -180 and 180."
      );
      return;
    }

    if (
      !Number.isFinite(radius) ||
      radius <= 0
    ) {
      window.alert(
        "Geofence radius must be greater than 0."
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name,
        latitude,
        longitude,
        radius_meters: radius,
      };

      if (editingLocation) {
        await api.put(
          `/api/locations/${editingLocation.id}`,
          payload
        );
      } else {
        await api.post(
          "/api/locations/",
          payload
        );
      }

      setShowModal(false);
      setEditingLocation(null);
      setForm({ ...EMPTY_FORM });

      await loadLocations(true);
    } catch (err: unknown) {
      console.error(
        "Save location error:",
        err
      );

      window.alert(
        getErrorMessage(
          err,
          "Unable to save location."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // DELETE LOCATION
  // ============================================================

  const deleteLocation = async (
    location: Location
  ) => {
    const confirmed = window.confirm(
      `Delete "${location.name}"?\n\nIf attendance records use this location, the backend may prevent deletion.`
    );

    if (!confirmed) return;

    try {
      setError("");

      await api.delete(
        `/api/locations/${location.id}`
      );

      await loadLocations(true);
    } catch (err: unknown) {
      console.error(
        "Delete location error:",
        err
      );

      window.alert(
        getErrorMessage(
          err,
          "Unable to delete location."
        )
      );
    }
  };

  // ============================================================
  // ACTIVATE / DEACTIVATE LOCATION
  // ============================================================

  const toggleLocation = async (
    location: Location
  ) => {
    try {
      setError("");

      const endpoint = location.is_active
        ? `/api/locations/${location.id}/deactivate`
        : `/api/locations/${location.id}/activate`;

      await api.patch(endpoint);

      await loadLocations(true);
    } catch (err: unknown) {
      console.error(
        "Location status error:",
        err
      );

      window.alert(
        getErrorMessage(
          err,
          "Unable to change location status."
        )
      );
    }
  };

  const activeCount = locations.filter(
    (location) => location.is_active
  ).length;

  const inactiveCount =
    locations.length - activeCount;

  return (
    <>
      <style>{`
        .locations-page {
          width: 100%;
        }

        .locations-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .locations-add-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          min-height: 42px;
          padding: 0 16px 0 10px;
          border: 1px solid rgba(99, 102, 241, 0.32);
          border-radius: 11px;
          background: linear-gradient(
            135deg,
            rgba(99, 102, 241, 0.18),
            rgba(59, 130, 246, 0.1)
          );
          color: #e8edff;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .locations-add-button:hover {
          transform: translateY(-2px);
          border-color: rgba(129, 140, 248, 0.65);
          box-shadow: 0 8px 24px rgba(30, 64, 175, 0.2);
        }

        .locations-add-button:active {
          transform: translateY(0);
        }

        .locations-add-icon {
          width: 27px;
          height: 27px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: rgba(99, 102, 241, 0.2);
        }

        .locations-card {
          overflow: hidden;
        }

        .locations-table-wrapper {
          width: 100%;
          overflow-x: auto;
        }

        .locations-table {
          width: 100%;
          min-width: 900px;
          border-collapse: collapse;
        }

        .locations-table th {
          padding: 14px 20px;
          text-align: left;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #64748b;
          background: rgba(15, 23, 42, 0.45);
          border-bottom: 1px solid var(--border);
        }

        .locations-table td {
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
          vertical-align: middle;
        }

        .locations-table tbody tr {
          transition: background 0.18s ease;
        }

        .locations-table tbody tr:hover {
          background: rgba(99, 102, 241, 0.035);
        }

        .location-name-cell {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 190px;
        }

        .location-icon {
          width: 36px;
          height: 36px;
          flex: 0 0 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          color: #a5b4fc;
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.15);
        }

        .location-name-cell > div:last-child {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .location-name-cell strong {
          color: var(--text);
          font-size: 13px;
        }

        .location-name-cell span {
          color: #64748b;
          font-size: 10px;
        }

        .coordinates-cell {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }

        .coordinates-cell span {
          color: #94a3b8;
          font-size: 11px;
        }

        .geofence-cell {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #a5b4fc;
        }

        .geofence-cell strong {
          color: var(--text);
          font-size: 12px;
        }

        .location-status {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 72px;
          min-height: 28px;
          padding: 0 10px;
          border-radius: 999px;
          border: 1px solid transparent;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.18s ease;
        }

        .location-status.active {
          color: #86efac;
          background: rgba(34, 197, 94, 0.1);
          border-color: rgba(34, 197, 94, 0.18);
        }

        .location-status.active:hover {
          background: rgba(34, 197, 94, 0.16);
        }

        .location-status.inactive {
          color: #fca5a5;
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.18);
        }

        .location-status.inactive:hover {
          background: rgba(239, 68, 68, 0.16);
        }

        .location-created {
          color: #94a3b8;
          font-size: 11px;
          white-space: nowrap;
        }

        .location-actions {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .location-actions button {
          width: 34px;
          height: 34px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border);
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.025);
          color: #94a3b8;
          cursor: pointer;
          transition: 0.18s ease;
        }

        .location-actions button:hover {
          color: #c7d2fe;
          border-color: rgba(99, 102, 241, 0.35);
          background: rgba(99, 102, 241, 0.08);
        }

        .location-actions button.danger:hover {
          color: #fca5a5;
          border-color: rgba(239, 68, 68, 0.35);
          background: rgba(239, 68, 68, 0.08);
        }

        .locations-empty {
          min-height: 260px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 9px;
          padding: 35px 20px;
          color: #64748b;
          text-align: center;
        }

        .locations-empty strong {
          color: var(--text);
          font-size: 14px;
        }

        .locations-empty span {
          max-width: 420px;
          font-size: 12px;
          line-height: 1.6;
        }

        .locations-empty .locations-add-button {
          margin-top: 8px;
        }

        .locations-info-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-top: 16px;
        }

        .locations-info-card {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 17px;
          border: 1px solid var(--border);
          border-radius: 14px;
          background: var(--surface);
        }

        .locations-info-card > svg {
          flex: 0 0 auto;
          color: #818cf8;
        }

        .locations-info-card > div {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .locations-info-card strong {
          color: var(--text);
          font-size: 12px;
        }

        .locations-info-card span {
          color: #64748b;
          font-size: 11px;
          line-height: 1.5;
        }

        .location-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(2, 6, 23, 0.75);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }

        .location-modal {
          width: min(620px, 100%);
          max-height: calc(100vh - 40px);
          overflow-y: auto;
          border: 1px solid rgba(148, 163, 184, 0.16);
          border-radius: 19px;
          background: #0f172a;
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.5);
        }

        .location-modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding: 22px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.1);
        }

        .location-modal-title {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .location-modal-icon {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          color: #a5b4fc;
          background: rgba(99, 102, 241, 0.13);
          border: 1px solid rgba(99, 102, 241, 0.2);
        }

        .location-modal-title h2 {
          margin: 4px 0;
          color: #f8fafc;
          font-size: 21px;
        }

        .location-modal-title p {
          margin: 0;
          color: #64748b;
          font-size: 11px;
          line-height: 1.5;
        }

        .location-modal-close {
          width: 34px;
          height: 34px;
          flex: 0 0 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          border: 1px solid rgba(148, 163, 184, 0.14);
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.035);
          color: #94a3b8;
          cursor: pointer;
        }

        .location-modal-close:hover {
          color: #fca5a5;
          background: rgba(239, 68, 68, 0.1);
        }

        .location-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
          padding: 22px;
        }

        .location-form-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .location-field-label {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #cbd5e1;
          font-size: 12px;
          font-weight: 700;
        }

        .location-field-label svg {
          color: #818cf8;
        }

        .location-form-field input {
          width: 100%;
          height: 44px;
          box-sizing: border-box;
          padding: 0 12px;
          outline: none;
          border: 1px solid rgba(148, 163, 184, 0.16);
          border-radius: 9px;
          background: rgba(2, 6, 23, 0.55);
          color: #f8fafc;
          font-size: 13px;
        }

        .location-form-field input:focus {
          border-color: rgba(99, 102, 241, 0.7);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .location-form-field input::placeholder {
          color: #475569;
        }

        .location-form-field small {
          margin-top: -3px;
          color: #64748b;
          font-size: 10px;
        }

        .location-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }

        .location-radius-input {
          position: relative;
        }

        .location-radius-input input {
          padding-right: 75px;
        }

        .location-radius-input span {
          position: absolute;
          top: 50%;
          right: 12px;
          transform: translateY(-50%);
          color: #818cf8;
          font-size: 10px;
          font-weight: 800;
          pointer-events: none;
        }

        /* CURRENT LOCATION BUTTON */

        .current-location-button {
          width: 100%;
          min-height: 43px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 14px;
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 10px;
          background: rgba(37, 99, 235, 0.1);
          color: #93c5fd;
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .current-location-button:hover:not(:disabled) {
          border-color: rgba(59, 130, 246, 0.6);
          background: rgba(37, 99, 235, 0.18);
          transform: translateY(-1px);
        }

        .current-location-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .current-location-hint {
          margin-top: -10px;
          color: #64748b;
          font-size: 10px;
          line-height: 1.5;
        }

        .location-form-help {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin: 0 22px 20px;
          padding: 13px;
          border: 1px solid rgba(99, 102, 241, 0.14);
          border-radius: 10px;
          background: rgba(99, 102, 241, 0.06);
        }

        .location-help-icon {
          width: 30px;
          height: 30px;
          flex: 0 0 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          color: #818cf8;
          background: rgba(99, 102, 241, 0.1);
        }

        .location-form-help > div:last-child {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .location-form-help strong {
          color: #c7d2fe;
          font-size: 12px;
        }

        .location-form-help span {
          color: #64748b;
          font-size: 11px;
          line-height: 1.5;
        }

        .location-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 9px;
          padding: 15px 22px 21px;
          border-top: 1px solid rgba(148, 163, 184, 0.1);
        }

        .location-modal-actions button {
          min-height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 0 15px;
          border-radius: 9px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }

        .location-modal-actions button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .location-cancel-button {
          border: 1px solid rgba(148, 163, 184, 0.16);
          background: rgba(255, 255, 255, 0.035);
          color: #94a3b8;
        }

        .location-cancel-button:hover:not(:disabled) {
          color: #f8fafc;
          background: rgba(255, 255, 255, 0.07);
        }

        .location-create-button {
          border: 1px solid rgba(99, 102, 241, 0.4);
          background: linear-gradient(135deg, #4f46e5, #2563eb);
          color: white;
          box-shadow: 0 7px 18px rgba(37, 99, 235, 0.18);
        }

        .location-create-button:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 10px 25px rgba(37, 99, 235, 0.28);
        }

        @media (max-width: 800px) {
          .locations-info-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .locations-header-actions {
            width: 100%;
          }

          .locations-header-actions button {
            flex: 1;
          }

          .location-form-grid {
            grid-template-columns: 1fr;
          }

          .location-modal-overlay {
            padding: 10px;
          }

          .location-modal {
            max-height: calc(100vh - 20px);
            border-radius: 15px;
          }

          .location-modal-header,
          .location-form {
            padding: 18px;
          }

          .location-form-help {
            margin: 0 18px 18px;
          }

          .location-modal-actions {
            padding: 14px 18px 18px;
          }

          .location-modal-actions button {
            flex: 1;
          }
        }
      `}</style>

      <section className="page locations-page">
        <div className="page-header">
          <div>
            <span className="eyebrow">
              MANAGEMENT
            </span>

            <h1>Locations & Geofences</h1>

            <p>
              Manage offices, coordinates and
              attendance boundaries.
            </p>
          </div>

          <div className="locations-header-actions">
            <button
              type="button"
              className="dashboard-refresh-button"
              onClick={() =>
                void loadLocations(true)
              }
              disabled={refreshing}
            >
              <RefreshCw
                size={16}
                className={
                  refreshing
                    ? "refresh-spinner"
                    : undefined
                }
              />

              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>

            <button
              type="button"
              className="locations-add-button"
              onClick={openCreateModal}
            >
              <span className="locations-add-icon">
                <Plus size={17} />
              </span>

              Add Location
            </button>
          </div>
        </div>

        {error && (
          <div className="dashboard-error">
            <AlertTriangle size={18} />

            <div>
              <strong>
                Location data unavailable
              </strong>

              <span>{error}</span>
            </div>

            <button
              type="button"
              onClick={() =>
                void loadLocations(true)
              }
            >
              Retry
            </button>
          </div>
        )}

        <div className="dashboard-stat-grid">
          <LocationStat
            title="Total Locations"
            value={
              loading
                ? "..."
                : locations.length
            }
            icon={<MapPin size={21} />}
            className="blue"
          />

          <LocationStat
            title="Active Locations"
            value={
              loading
                ? "..."
                : activeCount
            }
            icon={
              <ShieldCheck size={21} />
            }
            className="green"
          />

          <LocationStat
            title="Inactive Locations"
            value={
              loading
                ? "..."
                : inactiveCount
            }
            icon={
              <Navigation size={21} />
            }
            className="red"
          />

          <LocationStat
            title="Geofences"
            value={
              loading
                ? "..."
                : locations.length
            }
            icon={<Circle size={21} />}
            className="orange"
          />
        </div>

        <div className="dashboard-card locations-card">
          <div className="card-header">
            <div>
              <h2>Location Directory</h2>

              <p>
                Office and attendance geofence
                configuration.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="locations-empty">
              <RefreshCw
                size={25}
                className="refresh-spinner"
              />

              <strong>
                Loading locations...
              </strong>

              <span>
                Reading location data from
                PostgreSQL.
              </span>
            </div>
          ) : locations.length === 0 ? (
            <div className="locations-empty">
              <MapPin size={34} />

              <strong>
                No locations configured
              </strong>

              <span>
                Add your first office or
                attendance location.
              </span>

              <button
                type="button"
                className="locations-add-button"
                onClick={openCreateModal}
              >
                <span className="locations-add-icon">
                  <Plus size={16} />
                </span>

                Add Location
              </button>
            </div>
          ) : (
            <div className="locations-table-wrapper">
              <table className="locations-table">
                <thead>
                  <tr>
                    <th>Location</th>
                    <th>Coordinates</th>
                    <th>Geofence</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {locations.map(
                    (location) => (
                      <tr key={location.id}>
                        <td>
                          <div className="location-name-cell">
                            <div className="location-icon">
                              <MapPin size={17} />
                            </div>

                            <div>
                              <strong>
                                {location.name}
                              </strong>

                              <span>
                                Location #
                                {location.id}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="coordinates-cell">
                            <span>
                              Lat:{" "}
                              {Number(
                                location.latitude
                              ).toFixed(6)}
                            </span>

                            <span>
                              Lng:{" "}
                              {Number(
                                location.longitude
                              ).toFixed(6)}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="geofence-cell">
                            <Circle size={16} />

                            <strong>
                              {
                                location.radius_meters
                              }{" "}
                              m
                            </strong>
                          </div>
                        </td>

                        <td>
                          <button
                            type="button"
                            className={`location-status ${
                              location.is_active
                                ? "active"
                                : "inactive"
                            }`}
                            onClick={() =>
                              void toggleLocation(
                                location
                              )
                            }
                          >
                            {location.is_active
                              ? "Active"
                              : "Inactive"}
                          </button>
                        </td>

                        <td>
                          <span className="location-created">
                            {formatDate(
                              location.created_at
                            )}
                          </span>
                        </td>

                        <td>
                          <div className="location-actions">
                            <button
                              type="button"
                              title="Edit location"
                              aria-label="Edit location"
                              onClick={() =>
                                openEditModal(
                                  location
                                )
                              }
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              type="button"
                              title="Delete location"
                              aria-label="Delete location"
                              className="danger"
                              onClick={() =>
                                void deleteLocation(
                                  location
                                )
                              }
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="locations-info-grid">
          <div className="locations-info-card">
            <Circle size={20} />

            <div>
              <strong>
                Geofence Boundary
              </strong>

              <span>
                Defines the allowed attendance
                area around the location.
              </span>
            </div>
          </div>

          <div className="locations-info-card">
            <Navigation size={20} />

            <div>
              <strong>
                GPS Coordinates
              </strong>

              <span>
                Used to calculate employee
                distance from the location.
              </span>
            </div>
          </div>

          <div className="locations-info-card">
            <ShieldCheck size={20} />

            <div>
              <strong>
                Attendance Boundary
              </strong>

              <span>
                Active locations can be used
                for attendance verification.
              </span>
            </div>
          </div>
        </div>

        {showModal && (
          <div
            className="location-modal-overlay"
            onMouseDown={closeModal}
          >
            <div
              className="location-modal"
              onMouseDown={(event) =>
                event.stopPropagation()
              }
            >
              <div className="location-modal-header">
                <div className="location-modal-title">
                  <div className="location-modal-icon">
                    <MapPin size={21} />
                  </div>

                  <div>
                    <span className="eyebrow">
                      LOCATION MANAGEMENT
                    </span>

                    <h2>
                      {editingLocation
                        ? "Edit Location"
                        : "Add Location"}
                    </h2>

                    <p>
                      Configure the attendance
                      location and geofence
                      boundary.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="location-modal-close"
                  onClick={closeModal}
                  disabled={
                    saving ||
                    gettingLocation
                  }
                  aria-label="Close modal"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="location-form">
                <label className="location-form-field">
                  <span className="location-field-label">
                    <MapPin size={15} />
                    Location Name
                  </span>

                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) =>
                      updateForm(
                        "name",
                        event.target.value
                      )
                    }
                    placeholder="e.g. Head Office"
                    autoFocus
                  />
                </label>

                <div className="location-form-grid">
                  <label className="location-form-field">
                    <span className="location-field-label">
                      <Navigation size={15} />
                      Latitude
                    </span>

                    <input
                      type="number"
                      step="any"
                      value={form.latitude}
                      onChange={(event) =>
                        updateForm(
                          "latitude",
                          event.target.value
                        )
                      }
                      placeholder="20.5937"
                    />

                    <small>
                      Range: -90 to 90
                    </small>
                  </label>

                  <label className="location-form-field">
                    <span className="location-field-label">
                      <Navigation size={15} />
                      Longitude
                    </span>

                    <input
                      type="number"
                      step="any"
                      value={form.longitude}
                      onChange={(event) =>
                        updateForm(
                          "longitude",
                          event.target.value
                        )
                      }
                      placeholder="78.9629"
                    />

                    <small>
                      Range: -180 to 180
                    </small>
                  </label>
                </div>

                {/* CURRENT LOCATION */}

                <button
                  type="button"
                  className="current-location-button"
                  onClick={
                    useCurrentLocation
                  }
                  disabled={
                    gettingLocation ||
                    saving
                  }
                >
                  {gettingLocation ? (
                    <>
                      <RefreshCw
                        size={17}
                        className="refresh-spinner"
                      />

                      Detecting current
                      location...
                    </>
                  ) : (
                    <>
                      <LocateFixed size={17} />

                      Use My Current Location
                    </>
                  )}
                </button>

                <span className="current-location-hint">
                  Click this button while you
                  are physically at your
                  workplace. Your browser will
                  request GPS/location permission.
                </span>

                <label className="location-form-field">
                  <span className="location-field-label">
                    <Circle size={15} />
                    Geofence Radius
                  </span>

                  <div className="location-radius-input">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={
                        form.radius_meters
                      }
                      onChange={(event) =>
                        updateForm(
                          "radius_meters",
                          event.target.value
                        )
                      }
                      placeholder="100"
                    />

                    <span>
                      meters
                    </span>
                  </div>

                  <small>
                    Recommended: 100–500 meters
                    depending on workplace size.
                  </small>
                </label>
              </div>

              <div className="location-form-help">
                <div className="location-help-icon">
                  <ShieldCheck size={17} />
                </div>

                <div>
                  <strong>
                    Attendance Geofence
                  </strong>

                  <span>
                    Employees inside this radius
                    can satisfy the attendance
                    location boundary.
                  </span>
                </div>
              </div>

              <div className="location-modal-actions">
                <button
                  type="button"
                  className="location-cancel-button"
                  onClick={closeModal}
                  disabled={
                    saving ||
                    gettingLocation
                  }
                >
                  <X size={16} />
                  Cancel
                </button>

                <button
                  type="button"
                  className="location-create-button"
                  onClick={() =>
                    void saveLocation()
                  }
                  disabled={
                    saving ||
                    gettingLocation
                  }
                >
                  {saving ? (
                    <>
                      <RefreshCw
                        size={16}
                        className="refresh-spinner"
                      />

                      Saving...
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={16} />

                      {editingLocation
                        ? "Save Changes"
                        : "Create Location"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

function LocationStat({
  title,
  value,
  icon,
  className,
}: {
  title: string;
  value: number | string;
  icon: ReactNode;
  className: string;
}) {
  return (
    <div
      className={`dashboard-stat-card ${className}`}
    >
      <div className="stat-icon-large">
        {icon}
      </div>

      <div className="stat-content">
        <span>{title}</span>

        <strong>{value}</strong>

        <small>
          PostgreSQL location data
        </small>
      </div>
    </div>
  );
}

