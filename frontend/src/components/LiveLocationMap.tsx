import {
  Circle,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import { useEffect, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import type { EmployeeLocation } from "../types/location";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

/* =========================================================
   LEAFLET DEFAULT MARKER FIX
========================================================= */

delete (
  L.Icon.Default.prototype as L.Icon.Default & {
    _getIconUrl?: unknown;
  }
)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/* =========================================================
   PROPS
========================================================= */

interface LiveLocationMapProps {
  employees: EmployeeLocation[];
}

/* =========================================================
   GPS VALIDATION
========================================================= */

function hasValidCoordinates(
  employee: EmployeeLocation
): boolean {
  const latitude = Number(employee.latitude);
  const longitude = Number(employee.longitude);

  return (
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

/* =========================================================
   MAP AUTO CENTER
========================================================= */

function MapAutoCenter({
  employees,
}: LiveLocationMapProps) {
  const map = useMap();

  const validEmployees = useMemo(
    () =>
      employees.filter(hasValidCoordinates),
    [employees]
  );

  useEffect(() => {
    if (validEmployees.length === 0) {
      return;
    }

    /* ---------------------------------------------
       ONE EMPLOYEE
    --------------------------------------------- */

    if (validEmployees.length === 1) {
      const employee = validEmployees[0];

      map.setView(
        [
          Number(employee.latitude),
          Number(employee.longitude),
        ],
        15,
        {
          animate: true,
        }
      );

      return;
    }

    /* ---------------------------------------------
       MULTIPLE EMPLOYEES
    --------------------------------------------- */

    const bounds = L.latLngBounds(
      validEmployees.map((employee) => [
        Number(employee.latitude),
        Number(employee.longitude),
      ])
    );

    if (!bounds.isValid()) {
      return;
    }

    map.fitBounds(bounds, {
      padding: [50, 50],
      maxZoom: 15,
      animate: true,
    });
  }, [map, validEmployees]);

  return null;
}

/* =========================================================
   FORMAT LAST UPDATE
========================================================= */

function formatLastUpdate(
  secondsSinceUpdate: number
): string {
  if (
    !Number.isFinite(secondsSinceUpdate) ||
    secondsSinceUpdate < 0
  ) {
    return "Unknown";
  }

  if (secondsSinceUpdate < 60) {
    return `${Math.round(secondsSinceUpdate)} sec ago`;
  }

  if (secondsSinceUpdate < 3600) {
    return `${Math.round(
      secondsSinceUpdate / 60
    )} min ago`;
  }

  return `${Math.round(
    secondsSinceUpdate / 3600
  )} hr ago`;
}

/* =========================================================
   EMPLOYEE POPUP
========================================================= */

function EmployeePopup({
  employee,
}: {
  employee: EmployeeLocation;
}) {
  const name =
    employee.name?.trim() ||
    `Employee ${employee.user_id}`;

  const email =
    employee.email?.trim() ||
    "No email available";

  const latitude = Number(employee.latitude);
  const longitude = Number(employee.longitude);

  const accuracy =
    employee.accuracy_meters !== null &&
    employee.accuracy_meters !== undefined
      ? Number(employee.accuracy_meters)
      : NaN;

  const secondsSinceUpdate =
    Number(employee.seconds_since_update);

  const isLive =
    employee.is_live === true;

  const hasAccuracy =
    Number.isFinite(accuracy) &&
    accuracy >= 0;

  return (
    <div className="live-location-popup">
      {/* =================================================
          EMPLOYEE
      ================================================= */}

      <div className="popup-employee-header">
        <div className="popup-avatar">
          {name.charAt(0).toUpperCase()}
        </div>

        <div>
          <strong>{name}</strong>

          <span>{email}</span>
        </div>
      </div>

      {/* =================================================
          GPS STATUS
      ================================================= */}

      <div className="popup-status-row">
        <span
          className={
            isLive
              ? "popup-live-status live"
              : "popup-live-status stale"
          }
        >
          <span />

          {isLive
            ? "GPS Live"
            : "GPS Stale"}
        </span>
      </div>

      {/* =================================================
          GPS DETAILS
      ================================================= */}

      <div className="popup-details">
        <div>
          <span>Last GPS update</span>

          <strong>
            {formatLastUpdate(
              secondsSinceUpdate
            )}
          </strong>
        </div>

        {hasAccuracy && (
          <div>
            <span>GPS accuracy</span>

            <strong>
              {accuracy.toFixed(1)} m
            </strong>
          </div>
        )}

        <div>
          <span>Latitude</span>

          <strong>
            {latitude.toFixed(6)}
          </strong>
        </div>

        <div>
          <span>Longitude</span>

          <strong>
            {longitude.toFixed(6)}
          </strong>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   LIVE LOCATION MAP
========================================================= */

export default function LiveLocationMap({
  employees,
}: LiveLocationMapProps) {
  /* =======================================================
     DEFAULT CENTER
     
     Nagpur fallback location.
  ======================================================= */

  const defaultCenter: [
    number,
    number
  ] = [21.1458, 79.0882];

  /* =======================================================
     ONLY EMPLOYEES WITH REAL GPS DATA
  ======================================================= */

  const validEmployees = useMemo(() => {
    return employees.filter(
      hasValidCoordinates
    );
  }, [employees]);

  /* =======================================================
     LIVE / STALE COUNTS
  ======================================================= */

  const liveCount = useMemo(() => {
    return validEmployees.filter(
      (employee) =>
        employee.is_live === true
    ).length;
  }, [validEmployees]);

  const staleCount =
    validEmployees.length - liveCount;

  /* =======================================================
     MAP
  ======================================================= */

  return (
    <div className="live-map-wrapper">

      <MapContainer
        center={defaultCenter}
        zoom={13}
        scrollWheelZoom={true}
        className="live-map"
      >

        {/* =================================================
            OPENSTREETMAP
        ================================================= */}

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* =================================================
            AUTO CENTER
        ================================================= */}

        <MapAutoCenter
          employees={validEmployees}
        />

        {/* =================================================
            EMPLOYEE GPS MARKERS
        ================================================= */}

        {validEmployees.map(
          (employee) => {
            const latitude =
              Number(employee.latitude);

            const longitude =
              Number(employee.longitude);

            const position: [
              number,
              number
            ] = [
              latitude,
              longitude,
            ];

            const accuracy =
              employee.accuracy_meters !==
                null &&
              employee.accuracy_meters !==
                undefined
                ? Number(
                    employee.accuracy_meters
                  )
                : NaN;

            const hasAccuracy =
              Number.isFinite(
                accuracy
              ) &&
              accuracy > 0;

            const markerKey =
              employee.id ??
              employee.user_id;

            return (
              <div key={markerKey}>

                {/* =========================================
                    EMPLOYEE MARKER
                ========================================= */}

                <Marker
                  position={position}
                >
                  <Popup>
                    <EmployeePopup
                      employee={employee}
                    />
                  </Popup>
                </Marker>

                {/* =========================================
                    GPS ACCURACY CIRCLE
                ========================================= */}

                {hasAccuracy && (
                  <Circle
                    center={position}
                    radius={accuracy}
                    pathOptions={{
                      color:
                        employee.is_live
                          ? "#2563eb"
                          : "#64748b",

                      fillColor:
                        employee.is_live
                          ? "#2563eb"
                          : "#64748b",

                      fillOpacity: 0.1,

                      weight: 1,
                    }}
                  />
                )}
              </div>
            );
          }
        )}

      </MapContainer>

      {/* =====================================================
          EMPTY GPS STATE
      ===================================================== */}

      {validEmployees.length === 0 && (
        <div className="live-map-empty">

          <MapPinIcon />

          <strong>
            No GPS locations available
          </strong>

          <span>
            Employee locations will appear
            here when their device sends GPS
            coordinates.
          </span>

        </div>
      )}

      {/* =====================================================
          MAP INFORMATION
      ===================================================== */}

      {validEmployees.length > 0 && (
        <div className="live-map-legend">

          <div>
            <span className="legend-live-dot" />

            GPS Live
            {" "}
            ({liveCount})
          </div>

          <div>
            <span className="legend-offline-dot" />

            GPS Stale
            {" "}
            ({staleCount})
          </div>

          <div>
            <span className="legend-radius" />

            GPS Accuracy
          </div>

        </div>
      )}

    </div>
  );
}

/* =========================================================
   EMPTY STATE ICON
========================================================= */

function MapPinIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />

      <circle
        cx="12"
        cy="10"
        r="2.5"
      />
    </svg>
  );
}