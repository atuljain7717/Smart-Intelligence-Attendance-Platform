import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CalendarDays,
  Clock3,
  MapPin,
  RefreshCw,
  Search,
  UserCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";

import api from "../services/api";

interface AttendanceRecord {
  id: number;
  user_id: number;
  employee_name: string | null;
  employee_email: string | null;
  attendance_data: string | null;
  check_in: string | null;
  check_out: string | null;
  status: string | null;
  latitude: number | null;
  longitude: number | null;
  location_id: number | null;
  location_name: string | null;
}

interface AttendanceResponse {
  count: number;
  records: AttendanceRecord[];
}

function formatTime(value: string | null): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(value: string | null): string {
  if (!value) return "—";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getWorkingHours(
  checkIn: string | null,
  checkOut: string | null
): string {
  if (!checkIn) return "—";

  const start = new Date(checkIn);

  if (Number.isNaN(start.getTime())) {
    return "—";
  }

  const end = checkOut
    ? new Date(checkOut)
    : new Date();

  if (Number.isNaN(end.getTime())) {
    return "—";
  }

  const seconds = Math.max(
    0,
    Math.floor(
      (end.getTime() - start.getTime()) / 1000
    )
  );

  const hours = Math.floor(seconds / 3600);

  const minutes = Math.floor(
    (seconds % 3600) / 60
  );

  return `${hours}h ${minutes}m`;
}

function getInitials(
  name: string | null
): string {
  if (!name) return "NA";

  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (part) =>
        part.charAt(0).toUpperCase()
    )
    .join("");

  return initials || "NA";
}

function getStatusClass(
  status: string | null
): string {
  if (!status) {
    return "unknown";
  }

  return status
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-");
}

export default function Attendance() {
  const [records, setRecords] = useState<
    AttendanceRecord[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const fetchAttendance = useCallback(
    async (isRefresh = false) => {
      try {
        setError("");

        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const response =
          await api.get<AttendanceResponse>(
            "/api/attendance/"
          );

        const nextRecords =
          response.data?.records;

        setRecords(
          Array.isArray(nextRecords)
            ? nextRecords
            : []
        );
      } catch (err: unknown) {
        console.error(
          "Attendance fetch error:",
          err
        );

        const axiosError = err as {
          response?: {
            data?: {
              detail?: string;
            };
          };
        };

        setError(
          axiosError.response?.data?.detail ||
            "Unable to load attendance data."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    void fetchAttendance();
  }, [fetchAttendance]);

  const filteredRecords = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return records.filter((record) => {
      const name =
        record.employee_name
          ?.toLowerCase() || "";

      const email =
        record.employee_email
          ?.toLowerCase() || "";

      const location =
        record.location_name
          ?.toLowerCase() || "";

      const status =
        record.status?.toLowerCase() || "";

      const matchesSearch =
        query.length === 0 ||
        name.includes(query) ||
        email.includes(query) ||
        location.includes(query);

      const matchesStatus =
        statusFilter === "All" ||
        status ===
          statusFilter.toLowerCase();

      return (
        matchesSearch &&
        matchesStatus
      );
    });
  }, [
    records,
    search,
    statusFilter,
  ]);

  const statistics = useMemo(() => {
    const today =
      new Date()
        .toISOString()
        .split("T")[0];

    const todayRecords =
      records.filter(
        (record) =>
          record.attendance_data === today
      );

    const present =
      todayRecords.filter(
        (record) =>
          record.status
            ?.toLowerCase() ===
          "present"
      ).length;

    const checkedOut =
      todayRecords.filter(
        (record) =>
          record.check_out !== null
      ).length;

    const active =
      todayRecords.filter(
        (record) =>
          record.check_in !== null &&
          record.check_out === null
      ).length;

    return {
      today: todayRecords.length,
      present,
      checkedOut,
      active,
    };
  }, [records]);

  return (
    <section className="page attendance-page">

      <style>{`
        .attendance-page {
          --attendance-border:
            rgba(148, 163, 184, 0.16);

          --attendance-muted:
            #64748b;

          --attendance-text:
            #e2e8f0;

          --attendance-accent:
            #818cf8;
        }

        .attendance-page
        .attendance-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .attendance-page
        .attendance-live-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;

          min-height: 38px;
          padding: 0 13px;

          border: 1px solid
            rgba(34, 197, 94, 0.18);

          border-radius: 11px;

          background:
            rgba(34, 197, 94, 0.07);

          color: #86efac;

          font-size: 12px;
          font-weight: 600;
        }

        .attendance-page
        .attendance-live-dot {
          width: 7px;
          height: 7px;

          border-radius: 50%;

          background: #22c55e;

          box-shadow:
            0 0 0 4px
            rgba(34, 197, 94, 0.10);
        }

        .attendance-page
        .attendance-refresh-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;

          min-height: 40px;
          padding: 0 14px;

          border: 1px solid
            rgba(148, 163, 184, 0.18);

          border-radius: 11px;

          background:
            rgba(15, 23, 42, 0.55);

          color: #cbd5e1;

          font-size: 12px;
          font-weight: 600;

          cursor: pointer;

          transition:
            border-color 0.2s ease,
            background 0.2s ease,
            transform 0.2s ease;
        }

        .attendance-page
        .attendance-refresh-button:hover {
          border-color:
            rgba(129, 140, 248, 0.40);

          background:
            rgba(30, 41, 59, 0.72);

          transform: translateY(-1px);
        }

        .attendance-page
        .attendance-refresh-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }

        .attendance-page
        .attendance-spin {
          animation:
            attendanceSpin
            0.9s linear infinite;
        }

        @keyframes attendanceSpin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        .attendance-page
        .attendance-error {
          display: flex;
          align-items: center;
          gap: 10px;

          margin-bottom: 18px;
          padding: 13px 15px;

          border: 1px solid
            rgba(239, 68, 68, 0.18);

          border-radius: 12px;

          background:
            rgba(127, 29, 29, 0.16);

          color: #fca5a5;

          font-size: 13px;
        }

        .attendance-page
        .attendance-error
        svg {
          flex-shrink: 0;
        }

        .attendance-page
        .attendance-error
        span {
          flex: 1;
        }

        .attendance-page
        .attendance-error
        button {
          border: 0;
          background: transparent;

          color: #fca5a5;

          font-size: 12px;
          font-weight: 700;

          cursor: pointer;
        }

        .attendance-page
        .attendance-stats {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));

          gap: 14px;

          margin-bottom: 18px;
        }

        .attendance-page
        .attendance-stat-card {
          position: relative;

          display: flex;
          align-items: center;

          gap: 13px;

          min-height: 88px;
          padding: 16px;

          overflow: hidden;

          border: 1px solid
            var(--attendance-border);

          border-radius: 15px;

          background:
            linear-gradient(
              145deg,
              rgba(15, 23, 42, 0.82),
              rgba(15, 23, 42, 0.54)
            );

          box-shadow:
            0 8px 28px
            rgba(0, 0, 0, 0.10);
        }

        .attendance-page
        .attendance-stat-card::after {
          content: "";

          position: absolute;

          right: -35px;
          bottom: -45px;

          width: 105px;
          height: 105px;

          border-radius: 50%;

          background:
            rgba(99, 102, 241, 0.05);

          pointer-events: none;
        }

        .attendance-page
        .attendance-stat-icon {
          width: 42px;
          height: 42px;

          flex-shrink: 0;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 12px;

          background:
            rgba(99, 102, 241, 0.10);

          color: var(--attendance-accent);
        }

        .attendance-page
        .attendance-stat-card:nth-child(2)
        .attendance-stat-icon {
          background:
            rgba(34, 197, 94, 0.09);

          color: #4ade80;
        }

        .attendance-page
        .attendance-stat-card:nth-child(3)
        .attendance-stat-icon {
          background:
            rgba(56, 189, 248, 0.09);

          color: #38bdf8;
        }

        .attendance-page
        .attendance-stat-card:nth-child(4)
        .attendance-stat-icon {
          background:
            rgba(245, 158, 11, 0.09);

          color: #fbbf24;
        }

        .attendance-page
        .attendance-stat-content {
          min-width: 0;

          display: flex;
          flex-direction: column;

          gap: 3px;
        }

        .attendance-page
        .attendance-stat-content span {
          color: var(--attendance-muted);

          font-size: 11px;
          font-weight: 600;

          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .attendance-page
        .attendance-stat-content strong {
          color: var(--attendance-text);

          font-size: 24px;
          line-height: 1.1;

          font-weight: 700;
        }

        .attendance-page
        .attendance-card {
          overflow: hidden;

          border: 1px solid
            var(--attendance-border);

          border-radius: 17px;

          background:
            rgba(15, 23, 42, 0.56);

          box-shadow:
            0 12px 38px
            rgba(0, 0, 0, 0.12);
        }

        .attendance-page
        .attendance-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;

          gap: 16px;

          padding: 18px 20px;

          border-bottom: 1px solid
            rgba(148, 163, 184, 0.09);
        }

        .attendance-page
        .attendance-card-heading {
          display: flex;
          flex-direction: column;

          gap: 3px;
        }

        .attendance-page
        .attendance-card-heading strong {
          color: #e2e8f0;

          font-size: 15px;
          font-weight: 650;
        }

        .attendance-page
        .attendance-card-heading span {
          color: #64748b;

          font-size: 11px;
        }

        .attendance-page
        .attendance-toolbar {
          display: flex;
          align-items: center;

          gap: 10px;

          padding: 15px 20px;

          border-bottom: 1px solid
            rgba(148, 163, 184, 0.08);
        }

        .attendance-page
        .attendance-search {
          position: relative;

          flex: 1;

          height: 42px;

          display: flex;
          align-items: center;

          gap: 9px;

          padding: 0 11px;

          border: 1px solid
            rgba(148, 163, 184, 0.17);

          border-radius: 11px;

          background:
            rgba(2, 6, 23, 0.34);

          transition:
            border-color 0.2s ease,
            box-shadow 0.2s ease;
        }

        .attendance-page
        .attendance-search:focus-within {
          border-color:
            rgba(99, 102, 241, 0.55);

          box-shadow:
            0 0 0 3px
            rgba(99, 102, 241, 0.08);
        }

        .attendance-page
        .attendance-search-icon {
          width: 27px;
          height: 27px;

          flex-shrink: 0;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 8px;

          background:
            rgba(99, 102, 241, 0.10);

          color: #818cf8;
        }

        .attendance-page
        .attendance-search input {
          width: 100%;
          min-width: 0;
          height: 100%;

          padding: 0;

          border: 0 !important;
          outline: 0 !important;

          background: transparent !important;

          color: #e2e8f0 !important;

          font: inherit;
          font-size: 12px;

          box-shadow: none !important;
        }

        .attendance-page
        .attendance-search input::placeholder {
          color: #64748b;
        }

        .attendance-page
        .attendance-clear {
          width: 27px;
          height: 27px;

          display: flex;
          align-items: center;
          justify-content: center;

          flex-shrink: 0;

          padding: 0;

          border: 0;
          border-radius: 7px;

          background:
            rgba(148, 163, 184, 0.08);

          color: #94a3b8;

          cursor: pointer;
        }

        .attendance-page
        .attendance-clear:hover {
          background:
            rgba(148, 163, 184, 0.16);

          color: #e2e8f0;
        }

        .attendance-page
        .attendance-filter {
          width: 145px;
          height: 42px;

          padding: 0 12px;

          border: 1px solid
            rgba(148, 163, 184, 0.17);

          border-radius: 11px;

          background:
            rgba(2, 6, 23, 0.34);

          color: #cbd5e1;

          font-size: 12px;
          font-weight: 600;

          outline: none;

          cursor: pointer;
        }

        .attendance-page
        .attendance-filter:focus {
          border-color:
            rgba(99, 102, 241, 0.55);
        }

        .attendance-page
        .attendance-filter option {
          background: #0f172a;
          color: #e2e8f0;
        }

        .attendance-page
        .attendance-search-info {
          display: flex;
          align-items: center;

          gap: 8px;

          padding: 9px 20px;

          border-bottom: 1px solid
            rgba(148, 163, 184, 0.07);

          color: #64748b;

          font-size: 11px;
        }

        .attendance-page
        .attendance-search-info-main {
          display: inline-flex;
          align-items: center;

          gap: 5px;
        }

        .attendance-page
        .attendance-search-info strong {
          color: #a5b4fc;
        }

        .attendance-page
        .attendance-search-info small {
          color: #475569;
        }

        .attendance-page
        .attendance-table-wrapper {
          width: 100%;

          overflow-x: auto;
        }

        .attendance-page
        .attendance-table {
          width: 100%;

          border-collapse: collapse;

          min-width: 980px;
        }

        .attendance-page
        .attendance-table th {
          padding: 12px 15px;

          border-bottom: 1px solid
            rgba(148, 163, 184, 0.10);

          background:
            rgba(2, 6, 23, 0.20);

          color: #64748b;

          font-size: 10px;
          font-weight: 700;

          text-align: left;
          text-transform: uppercase;
          letter-spacing: 0.07em;

          white-space: nowrap;
        }

        .attendance-page
        .attendance-table td {
          padding: 14px 15px;

          border-bottom: 1px solid
            rgba(148, 163, 184, 0.07);

          color: #cbd5e1;

          font-size: 12px;

          vertical-align: middle;
        }

        .attendance-page
        .attendance-table tbody tr {
          transition:
            background 0.18s ease;
        }

        .attendance-page
        .attendance-table tbody tr:hover {
          background:
            rgba(99, 102, 241, 0.035);
        }

        .attendance-page
        .attendance-table tbody tr:last-child td {
          border-bottom: 0;
        }

        .attendance-page
        .attendance-employee {
          display: flex;
          align-items: center;

          gap: 10px;

          min-width: 190px;
        }

        .attendance-page
        .attendance-avatar {
          width: 34px;
          height: 34px;

          flex-shrink: 0;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 1px solid
            rgba(129, 140, 248, 0.16);

          border-radius: 10px;

          background:
            rgba(99, 102, 241, 0.10);

          color: #a5b4fc;

          font-size: 10px;
          font-weight: 700;
        }

        .attendance-page
        .attendance-employee-info {
          display: flex;
          flex-direction: column;

          gap: 3px;

          min-width: 0;
        }

        .attendance-page
        .attendance-employee-info strong {
          overflow: hidden;

          color: #e2e8f0;

          font-size: 12px;
          font-weight: 650;

          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .attendance-page
        .attendance-employee-info span {
          overflow: hidden;

          color: #64748b;

          font-size: 10px;

          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .attendance-page
        .attendance-date {
          display: inline-flex;
          align-items: center;

          gap: 6px;

          color: #94a3b8;

          white-space: nowrap;
        }

        .attendance-page
        .attendance-date svg {
          color: #818cf8;
        }

        .attendance-page
        .attendance-time {
          color: #cbd5e1;

          font-variant-numeric:
            tabular-nums;
        }

        .attendance-page
        .attendance-working-hours {
          display: inline-flex;
          align-items: center;

          min-width: 55px;

          color: #a5b4fc;

          font-weight: 600;

          font-variant-numeric:
            tabular-nums;
        }

        .attendance-page
        .attendance-status {
          display: inline-flex;
          align-items: center;
          justify-content: center;

          min-width: 67px;

          padding: 5px 8px;

          border: 1px solid
            rgba(148, 163, 184, 0.12);

          border-radius: 7px;

          background:
            rgba(148, 163, 184, 0.07);

          color: #94a3b8;

          font-size: 10px;
          font-weight: 700;

          text-transform: capitalize;
        }

        .attendance-page
        .attendance-status.present {
          border-color:
            rgba(34, 197, 94, 0.18);

          background:
            rgba(34, 197, 94, 0.08);

          color: #86efac;
        }

        .attendance-page
        .attendance-status.late {
          border-color:
            rgba(245, 158, 11, 0.20);

          background:
            rgba(245, 158, 11, 0.08);

          color: #fbbf24;
        }

        .attendance-page
        .attendance-status.absent {
          border-color:
            rgba(239, 68, 68, 0.18);

          background:
            rgba(239, 68, 68, 0.08);

          color: #fca5a5;
        }

        .attendance-page
        .attendance-location {
          display: flex;
          align-items: center;

          gap: 6px;

          max-width: 180px;

          color: #94a3b8;
        }

        .attendance-page
        .attendance-location svg {
          flex-shrink: 0;

          color: #818cf8;
        }

        .attendance-page
        .attendance-location span {
          overflow: hidden;

          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .attendance-page
        .attendance-gps {
          display: inline-flex;
          align-items: center;

          gap: 4px;

          margin-top: 4px;

          color: #475569;

          font-size: 9px;
        }

        .attendance-page
        .attendance-gps svg {
          color: #6366f1;
        }

        .attendance-page
        .attendance-empty {
          min-height: 260px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          gap: 8px;

          padding: 35px;

          color: #64748b;

          text-align: center;
        }

        .attendance-page
        .attendance-empty svg {
          color: #6366f1;
        }

        .attendance-page
        .attendance-empty h3 {
          margin: 4px 0 0;

          color: #cbd5e1;

          font-size: 14px;
        }

        .attendance-page
        .attendance-empty p {
          margin: 0;

          color: #64748b;

          font-size: 11px;
        }

        .attendance-page
        .attendance-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;

          padding: 11px 20px;

          border-top: 1px solid
            rgba(148, 163, 184, 0.07);

          color: #475569;

          font-size: 10px;
        }

        .attendance-page
        .attendance-footer strong {
          color: #94a3b8;
        }

        @media (max-width: 1050px) {
          .attendance-page
          .attendance-stats {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 700px) {
          .attendance-page
          .attendance-header-actions {
            width: 100%;
          }

          .attendance-page
          .attendance-live-badge {
            flex: 1;
          }

          .attendance-page
          .attendance-refresh-button {
            flex-shrink: 0;
          }

          .attendance-page
          .attendance-stats {
            grid-template-columns: 1fr;
          }

          .attendance-page
          .attendance-card-top {
            align-items: flex-start;
          }

          .attendance-page
          .attendance-toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .attendance-page
          .attendance-filter {
            width: 100%;
          }
        }
      `}</style>

      <div className="page-header">

        <div>
          <span className="eyebrow">
            WORKFORCE INTELLIGENCE
          </span>

          <h1>Attendance</h1>

          <p>
            Track employee presence,
            working hours and
            location-verified activity.
          </p>
        </div>

        <div className="attendance-header-actions">

          <div className="attendance-live-badge">
            <span className="attendance-live-dot" />
            Attendance monitoring
          </div>

          <button
            type="button"
            className="attendance-refresh-button"
            onClick={() =>
              void fetchAttendance(true)
            }
            disabled={refreshing}
          >
            <RefreshCw
              size={15}
              className={
                refreshing
                  ? "attendance-spin"
                  : undefined
              }
            />

            {refreshing
              ? "Refreshing"
              : "Refresh"}
          </button>

        </div>

      </div>

      {error && (
        <div className="attendance-error">

          <XCircle size={17} />

          <span>{error}</span>

          <button
            type="button"
            onClick={() =>
              void fetchAttendance(true)
            }
            disabled={refreshing}
          >
            Retry
          </button>

        </div>
      )}

      <div className="attendance-stats">

        <div className="attendance-stat-card">
          <div className="attendance-stat-icon">
            <CalendarDays size={19} />
          </div>

          <div className="attendance-stat-content">
            <span>Today's Records</span>

            <strong>
              {loading
                ? "..."
                : statistics.today}
            </strong>
          </div>
        </div>

        <div className="attendance-stat-card">
          <div className="attendance-stat-icon">
            <UserCheck size={19} />
          </div>

          <div className="attendance-stat-content">
            <span>Present Today</span>

            <strong>
              {loading
                ? "..."
                : statistics.present}
            </strong>
          </div>
        </div>

        <div className="attendance-stat-card">
          <div className="attendance-stat-icon">
            <Users size={19} />
          </div>

          <div className="attendance-stat-content">
            <span>Checked Out</span>

            <strong>
              {loading
                ? "..."
                : statistics.checkedOut}
            </strong>
          </div>
        </div>

        <div className="attendance-stat-card">
          <div className="attendance-stat-icon">
            <Clock3 size={19} />
          </div>

          <div className="attendance-stat-content">
            <span>Currently Working</span>

            <strong>
              {loading
                ? "..."
                : statistics.active}
            </strong>
          </div>
        </div>

      </div>

      <div className="attendance-card">

        <div className="attendance-card-top">

          <div className="attendance-card-heading">
            <strong>
              Attendance Activity
            </strong>

            <span>
              Location-aware employee
              attendance records
            </span>
          </div>

        </div>

        <div className="attendance-toolbar">

          <div className="attendance-search">

            <div className="attendance-search-icon">
              <Search
                size={15}
                strokeWidth={2.2}
              />
            </div>

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search employee, email or location..."
              aria-label="Search attendance"
            />

            {search && (
              <button
                type="button"
                className="attendance-clear"
                onClick={() =>
                  setSearch("")
                }
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}

          </div>

          <select
            className="attendance-filter"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
            aria-label="Filter attendance status"
          >
            <option value="All">
              All Status
            </option>

            <option value="Present">
              Present
            </option>

            <option value="Absent">
              Absent
            </option>

            <option value="Late">
              Late
            </option>
          </select>

        </div>

        {(search ||
          statusFilter !== "All") &&
          !loading && (
            <div className="attendance-search-info">

              <span className="attendance-search-info-main">
                <Search size={12} />

                {search
                  ? "Results for"
                  : "Filtered by"}

                <strong>
                  {search
                    ? `"${search}"`
                    : statusFilter}
                </strong>
              </span>

              <small>
                {filteredRecords.length}{" "}
                {filteredRecords.length === 1
                  ? "record"
                  : "records"}
              </small>

            </div>
          )}

        {loading ? (
          <div className="attendance-empty">

            <RefreshCw
              size={27}
              className="attendance-spin"
            />

            <p>
              Loading attendance intelligence...
            </p>

          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="attendance-empty">

            <Users size={34} />

            <h3>
              No attendance records
            </h3>

            <p>
              No employee activity matches
              the selected criteria.
            </p>

          </div>
        ) : (
          <div className="attendance-table-wrapper">

            <table className="attendance-table">

              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Date</th>
                  <th>Check In</th>
                  <th>Check Out</th>
                  <th>Working Hours</th>
                  <th>Status</th>
                  <th>Location</th>
                </tr>
              </thead>

              <tbody>
                {filteredRecords.map(
                  (record) => (
                    <tr key={record.id}>

                      <td>
                        <div className="attendance-employee">

                          <div className="attendance-avatar">
                            {getInitials(
                              record.employee_name
                            )}
                          </div>

                          <div className="attendance-employee-info">

                            <strong>
                              {record.employee_name ||
                                "Unknown Employee"}
                            </strong>

                            <span>
                              {record.employee_email ||
                                "No email available"}
                            </span>

                          </div>

                        </div>
                      </td>

                      <td>
                        <div className="attendance-date">

                          <CalendarDays
                            size={14}
                          />

                          {formatDate(
                            record.attendance_data
                          )}

                        </div>
                      </td>

                      <td>
                        <span className="attendance-time">
                          {formatTime(
                            record.check_in
                          )}
                        </span>
                      </td>

                      <td>
                        <span className="attendance-time">
                          {formatTime(
                            record.check_out
                          )}
                        </span>
                      </td>

                      <td>
                        <span className="attendance-working-hours">
                          {getWorkingHours(
                            record.check_in,
                            record.check_out
                          )}
                        </span>
                      </td>

                      <td>
                        <span
                          className={
                            "attendance-status " +
                            getStatusClass(
                              record.status
                            )
                          }
                        >
                          {record.status ||
                            "Unknown"}
                        </span>
                      </td>

                      <td>
                        <div className="attendance-location">

                          <MapPin size={14} />

                          <span>
                            {record.location_name ||
                              "Unknown location"}
                          </span>

                        </div>

                        {record.latitude !== null &&
                          record.longitude !== null && (
                            <span className="attendance-gps">
                              <MapPin size={10} />
                              GPS verified
                            </span>
                          )}

                      </td>

                    </tr>
                  )
                )}
              </tbody>

            </table>

          </div>
        )}

        {!loading && (
          <div className="attendance-footer">

            <span>
              Showing{" "}
              <strong>
                {filteredRecords.length}
              </strong>{" "}
              of{" "}
              <strong>
                {records.length}
              </strong>{" "}
              records
            </span>

            <span>
              Smart Attendance Intelligence
            </span>

          </div>
        )}

      </div>

    </section>
  );
}