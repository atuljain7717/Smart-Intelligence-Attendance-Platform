import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  Activity,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  FileText,
  Fingerprint,
  Globe2,
  KeyRound,
  Laptop,
  LockKeyhole,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  User,
  UserCheck,
  UserX,
  X,
} from "lucide-react";

import {
  getAuditLogs,
  getAuditLog,
  type AuditLog,
} from "../services/auditLogService";

/* =========================================================
   CONFIG
   ========================================================= */

const PAGE_SIZE = 20;

/* =========================================================
   HELPERS
   ========================================================= */

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

function formatTime(value: string | null) {
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

function getActionClass(action: string) {
  const value = action.toLowerCase();

  if (
    value.includes("delete") ||
    value.includes("remove") ||
    value.includes("deactivate") ||
    value.includes("reject") ||
    value.includes("failed") ||
    value.includes("denied")
  ) {
    return "danger";
  }

  if (
    value.includes("create") ||
    value.includes("login") ||
    value.includes("activate") ||
    value.includes("success") ||
    value.includes("check-in") ||
    value.includes("check in")
  ) {
    return "success";
  }

  if (
    value.includes("update") ||
    value.includes("edit") ||
    value.includes("change")
  ) {
    return "warning";
  }

  return "info";
}

function getActionIcon(action: string) {
  const value = action.toLowerCase();

  if (
    value.includes("delete") ||
    value.includes("remove")
  ) {
    return <Trash2 size={14} />;
  }

  if (
    value.includes("login") ||
    value.includes("logout")
  ) {
    return <KeyRound size={14} />;
  }

  if (
    value.includes("create") ||
    value.includes("add")
  ) {
    return <Plus size={14} />;
  }

  if (value.includes("activate")) {
    return <UserCheck size={14} />;
  }

  if (value.includes("deactivate")) {
    return <UserX size={14} />;
  }

  if (
    value.includes("reject") ||
    value.includes("failed") ||
    value.includes("denied")
  ) {
    return <ShieldAlert size={14} />;
  }

  if (
    value.includes("check-in") ||
    value.includes("check in") ||
    value.includes("attendance")
  ) {
    return <Fingerprint size={14} />;
  }

  if (
    value.includes("update") ||
    value.includes("edit")
  ) {
    return <FileText size={14} />;
  }

  return <Activity size={14} />;
}

function getResourceLabel(
  resource?: string | null
) {
  if (!resource) return "System";

  return resource
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
}

function getResourceIcon(
  resource?: string | null
) {
  const value = resource?.toLowerCase() || "";

  if (
    value.includes("attendance") ||
    value.includes("face") ||
    value.includes("biometric")
  ) {
    return <Fingerprint size={16} />;
  }

  if (
    value.includes("location") ||
    value.includes("gps")
  ) {
    return <MapPin size={16} />;
  }

  if (
    value.includes("user") ||
    value.includes("employee")
  ) {
    return <User size={16} />;
  }

  if (
    value.includes("login") ||
    value.includes("auth")
  ) {
    return <LockKeyhole size={16} />;
  }

  return <FileText size={16} />;
}

function getInitials(
  name?: string | null
) {
  if (!name) return "SY";

  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
}

function getEventTone(action: string) {
  return getActionClass(action);
}

/* =========================================================
   MAIN COMPONENT
   ========================================================= */

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);

  const [action, setAction] = useState("");
  const [searchTerm, setSearchTerm] =
    useState("");

  const [selectedLog, setSelectedLog] =
    useState<AuditLog | null>(null);

  const [detailsLoading, setDetailsLoading] =
    useState(false);

  /* =======================================================
     LOAD LOGS
     ======================================================= */

  const loadLogs = useCallback(
    async (refresh = false) => {
      try {
        setError("");

        if (refresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const response = await getAuditLogs({
          page,
          limit: PAGE_SIZE,
          action: action || undefined,
        });

        setLogs(response.logs || []);
        setTotal(response.total || 0);
        setPages(response.pages || 0);
      } catch (err: unknown) {
        console.error(
          "Audit logs API error:",
          err
        );

        const message =
          err instanceof Error
            ? err.message
            : "Unable to load audit logs.";

        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, action]
  );

  useEffect(() => {
    void loadLogs();
  }, [loadLogs]);

  /* =======================================================
     SEARCH
     ======================================================= */

  const filteredLogs = useMemo(() => {
    if (!searchTerm.trim()) {
      return logs;
    }

    const query =
      searchTerm.trim().toLowerCase();

    return logs.filter((log) => {
      return (
        log.user_name
          ?.toLowerCase()
          .includes(query) ||
        log.user_email
          ?.toLowerCase()
          .includes(query) ||
        log.action
          ?.toLowerCase()
          .includes(query) ||
        log.resource_type
          ?.toLowerCase()
          .includes(query) ||
        log.description
          ?.toLowerCase()
          .includes(query) ||
        log.ip_address
          ?.toLowerCase()
          .includes(query)
      );
    });
  }, [logs, searchTerm]);

  /* =======================================================
     EVENTS
     ======================================================= */

  const handleActionChange = (
    value: string
  ) => {
    setAction(value);
    setPage(1);
  };

  const handlePrevious = () => {
    if (page > 1) {
      setPage((current) => current - 1);
    }
  };

  const handleNext = () => {
    if (page < pages) {
      setPage((current) => current + 1);
    }
  };

  const openDetails = async (
    log: AuditLog
  ) => {
    try {
      setDetailsLoading(true);

      const response =
        await getAuditLog(log.id);

      setSelectedLog(response.log);
    } catch (err) {
      console.error(
        "Audit log details error:",
        err
      );

      setSelectedLog(log);
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetails = () => {
    if (!detailsLoading) {
      setSelectedLog(null);
    }
  };

  /* =======================================================
     STATISTICS
     ======================================================= */

  const successfulEvents = logs.filter(
    (log) =>
      getActionClass(log.action) ===
      "success"
  ).length;

  const warningEvents = logs.filter(
    (log) =>
      getActionClass(log.action) ===
      "warning"
  ).length;

  const securityEvents = logs.filter(
    (log) =>
      getActionClass(log.action) ===
        "danger" ||
      log.action
        .toLowerCase()
        .includes("security")
  ).length;

  const startRecord =
    total === 0
      ? 0
      : (page - 1) * PAGE_SIZE + 1;

  const endRecord = Math.min(
    page * PAGE_SIZE,
    total
  );

  /* =======================================================
     UI
     ======================================================= */

  return (
    <>
      <style>{`
        /* =====================================================
           SMART ATTENDANCE INTELLIGENCE
           SECURITY COMMAND CENTER
           ===================================================== */

        .audit-page {
          width: 100%;
          min-height: 100%;
          padding: 28px;
          color: var(--text, #111827);
          box-sizing: border-box;
        }

        .audit-page *,
        .audit-page *::before,
        .audit-page *::after {
          box-sizing: border-box;
        }

        /* =====================================================
           HEADER
           ===================================================== */

        .audit-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 24px;
          margin-bottom: 22px;
        }

        .audit-kicker {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 9px;
          color: #2563eb;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .audit-heading {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .audit-heading-icon {
          position: relative;
          width: 50px;
          height: 50px;
          flex: 0 0 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(37, 99, 235, 0.18);
          border-radius: 15px;
          background:
            linear-gradient(
              145deg,
              rgba(37, 99, 235, 0.13),
              rgba(37, 99, 235, 0.035)
            );
          color: #2563eb;
          box-shadow:
            0 8px 25px rgba(37, 99, 235, 0.08);
        }

        .audit-heading-icon::after {
          content: "";
          position: absolute;
          inset: -5px;
          border: 1px solid rgba(37, 99, 235, 0.07);
          border-radius: 18px;
        }

        .audit-heading h1 {
          margin: 0;
          font-size: 28px;
          line-height: 1.1;
          font-weight: 780;
          letter-spacing: -0.045em;
        }

        .audit-heading p {
          margin: 6px 0 0;
          color: var(--muted, #64748b);
          font-size: 11px;
          line-height: 1.55;
        }

        .audit-refresh {
          height: 39px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0 14px;
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 9px;
          background: var(--surface, #ffffff);
          color: var(--text, #111827);
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.18s ease;
        }

        .audit-refresh:hover:not(:disabled) {
          border-color: #2563eb;
          color: #2563eb;
          transform: translateY(-1px);
        }

        .audit-refresh:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        /* =====================================================
           SYSTEM STATUS
           ===================================================== */

        .audit-status-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 18px;
          padding: 12px 15px;
          border: 1px solid rgba(37, 99, 235, 0.12);
          border-radius: 11px;
          background:
            linear-gradient(
              90deg,
              rgba(37, 99, 235, 0.055),
              rgba(16, 185, 129, 0.025)
            );
        }

        .audit-status-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .audit-status-shield {
          width: 33px;
          height: 33px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          background: rgba(16, 185, 129, 0.1);
          color: #059669;
        }

        .audit-status-copy strong {
          display: block;
          font-size: 11px;
          font-weight: 750;
        }

        .audit-status-copy span {
          display: block;
          margin-top: 2px;
          color: var(--muted, #64748b);
          font-size: 9px;
        }

        .audit-status-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .audit-live {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          color: #059669;
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .audit-live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #10b981;
          box-shadow:
            0 0 0 4px rgba(16, 185, 129, 0.11);
        }

        .audit-status-divider {
          width: 1px;
          height: 22px;
          background: var(--border, #e2e8f0);
        }

        .audit-secure-label {
          display: flex;
          align-items: center;
          gap: 5px;
          color: var(--muted, #64748b);
          font-size: 9px;
        }

        /* =====================================================
           KPI
           ===================================================== */

        .audit-kpis {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 19px;
        }

        .audit-kpi {
          position: relative;
          overflow: hidden;
          min-height: 108px;
          padding: 14px;
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 12px;
          background: var(--surface, #ffffff);
          transition:
            transform 0.18s ease,
            box-shadow 0.18s ease;
        }

        .audit-kpi:hover {
          transform: translateY(-2px);
          box-shadow:
            0 10px 28px rgba(15, 23, 42, 0.055);
        }

        .audit-kpi::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
        }

        .audit-kpi.blue::before {
          background: #2563eb;
        }

        .audit-kpi.green::before {
          background: #10b981;
        }

        .audit-kpi.orange::before {
          background: #f59e0b;
        }

        .audit-kpi.red::before {
          background: #ef4444;
        }

        .audit-kpi-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .audit-kpi-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
        }

        .audit-kpi.blue .audit-kpi-icon {
          color: #2563eb;
          background: rgba(37, 99, 235, 0.09);
        }

        .audit-kpi.green .audit-kpi-icon {
          color: #059669;
          background: rgba(16, 185, 129, 0.09);
        }

        .audit-kpi.orange .audit-kpi-icon {
          color: #d97706;
          background: rgba(245, 158, 11, 0.1);
        }

        .audit-kpi.red .audit-kpi-icon {
          color: #dc2626;
          background: rgba(239, 68, 68, 0.09);
        }

        .audit-kpi-live {
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--muted, #64748b);
          font-size: 8px;
          font-weight: 650;
        }

        .audit-kpi-live i {
          width: 5px;
          height: 5px;
          display: block;
          border-radius: 50%;
          background: #10b981;
        }

        .audit-kpi-body {
          margin-top: 10px;
        }

        .audit-kpi-body span {
          display: block;
          color: var(--muted, #64748b);
          font-size: 9px;
          font-weight: 650;
        }

        .audit-kpi-body strong {
          display: block;
          margin-top: 1px;
          font-size: 23px;
          line-height: 1.2;
          font-weight: 780;
          letter-spacing: -0.04em;
        }

        .audit-kpi-body small {
          display: block;
          margin-top: 2px;
          color: var(--muted, #64748b);
          font-size: 8px;
        }

        /* =====================================================
           MAIN CONSOLE
           ===================================================== */

        .audit-console {
          overflow: hidden;
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 14px;
          background: var(--surface, #ffffff);
          box-shadow:
            0 7px 28px rgba(15, 23, 42, 0.035);
        }

        .audit-console-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 17px 18px;
          border-bottom: 1px solid var(--border, #e2e8f0);
        }

        .audit-console-title {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .audit-console-title-icon {
          width: 31px;
          height: 31px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: rgba(37, 99, 235, 0.08);
          color: #2563eb;
        }

        .audit-console-title h2 {
          margin: 0;
          font-size: 13px;
          font-weight: 750;
        }

        .audit-console-title p {
          margin: 3px 0 0;
          color: var(--muted, #64748b);
          font-size: 8px;
        }

        .audit-toolbar {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .audit-search {
          width: 235px;
          height: 35px;
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 0 10px;
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 8px;
          background: var(--background, #f8fafc);
          color: var(--muted, #64748b);
          transition: 0.18s ease;
        }

        .audit-search:focus-within {
          border-color: #2563eb;
          box-shadow:
            0 0 0 3px rgba(37, 99, 235, 0.06);
        }

        .audit-search input {
          width: 100%;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--text, #111827);
          font-size: 10px;
        }

        .audit-search input::placeholder {
          color: var(--muted, #64748b);
        }

        .audit-clear {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          border: 0;
          background: transparent;
          color: var(--muted, #64748b);
          cursor: pointer;
        }

        .audit-select-wrap {
          height: 35px;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0 9px;
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 8px;
          background: var(--background, #f8fafc);
          color: var(--muted, #64748b);
        }

        .audit-select-wrap select {
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--text, #111827);
          font-size: 10px;
          cursor: pointer;
        }

        /* =====================================================
           EVENT STREAM
           ===================================================== */

        .audit-stream {
          padding: 4px 0;
        }

        .audit-stream-label {
          display: grid;
          grid-template-columns:
            54px minmax(0, 1fr)
            135px 90px;
          align-items: center;
          gap: 12px;
          padding: 10px 18px;
          border-bottom: 1px solid var(--border, #e2e8f0);
          background:
            rgba(148, 163, 184, 0.025);
          color: var(--muted, #64748b);
          font-size: 7px;
          font-weight: 800;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .audit-event {
          position: relative;
          display: grid;
          grid-template-columns:
            54px minmax(0, 1fr)
            135px 90px;
          align-items: center;
          gap: 12px;
          min-height: 88px;
          padding: 12px 18px;
          border-bottom: 1px solid var(--border, #e2e8f0);
          transition:
            background 0.16s ease,
            padding 0.16s ease;
        }

        .audit-event:last-child {
          border-bottom: 0;
        }

        .audit-event:hover {
          background:
            linear-gradient(
              90deg,
              rgba(37, 99, 235, 0.035),
              transparent
            );
        }

        .audit-event-marker {
          position: relative;
          display: flex;
          justify-content: center;
        }

        .audit-event-marker::before {
          content: "";
          position: absolute;
          top: -25px;
          bottom: -38px;
          left: 50%;
          width: 1px;
          background: var(--border, #e2e8f0);
          transform: translateX(-50%);
          z-index: 0;
        }

        .audit-event:first-child
          .audit-event-marker::before {
          top: 35px;
        }

        .audit-event:last-child
          .audit-event-marker::before {
          bottom: 35px;
        }

        .audit-event-dot {
          position: relative;
          z-index: 1;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid transparent;
          border-radius: 10px;
        }

        .audit-event-dot.success {
          color: #059669;
          background: rgba(16, 185, 129, 0.09);
          border-color: rgba(16, 185, 129, 0.13);
        }

        .audit-event-dot.warning {
          color: #d97706;
          background: rgba(245, 158, 11, 0.1);
          border-color: rgba(245, 158, 11, 0.14);
        }

        .audit-event-dot.danger {
          color: #dc2626;
          background: rgba(239, 68, 68, 0.09);
          border-color: rgba(239, 68, 68, 0.14);
        }

        .audit-event-dot.info {
          color: #2563eb;
          background: rgba(37, 99, 235, 0.09);
          border-color: rgba(37, 99, 235, 0.13);
        }

        .audit-event-main {
          min-width: 0;
        }

        .audit-event-top {
          display: flex;
          align-items: center;
          gap: 7px;
          flex-wrap: wrap;
        }

        .audit-event-action {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 7px;
          border-radius: 6px;
          font-size: 8px;
          font-weight: 780;
          white-space: nowrap;
        }

        .audit-event-action.success {
          color: #047857;
          background: rgba(16, 185, 129, 0.09);
        }

        .audit-event-action.warning {
          color: #b45309;
          background: rgba(245, 158, 11, 0.1);
        }

        .audit-event-action.danger {
          color: #b91c1c;
          background: rgba(239, 68, 68, 0.09);
        }

        .audit-event-action.info {
          color: #1d4ed8;
          background: rgba(37, 99, 235, 0.09);
        }

        .audit-event-id {
          color: var(--muted, #64748b);
          font-family:
            ui-monospace,
            SFMono-Regular,
            Menlo,
            monospace;
          font-size: 8px;
        }

        .audit-event-description {
          max-width: 650px;
          margin-top: 6px;
          overflow: hidden;
          color: var(--muted, #64748b);
          font-size: 9px;
          line-height: 1.45;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .audit-event-user {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 7px;
        }

        .audit-avatar {
          width: 23px;
          height: 23px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 7px;
          background: var(--background, #f8fafc);
          color: #2563eb;
          font-size: 7px;
          font-weight: 800;
        }

        .audit-user-name {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .audit-user-name strong {
          max-width: 240px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 8px;
          font-weight: 700;
        }

        .audit-user-name span {
          max-width: 240px;
          overflow: hidden;
          color: var(--muted, #64748b);
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 7px;
        }

        /* RESOURCE */

        .audit-resource-cell {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .audit-resource-icon {
          width: 29px;
          height: 29px;
          flex: 0 0 29px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 8px;
          background: var(--background, #f8fafc);
          color: var(--muted, #64748b);
        }

        .audit-resource-copy {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .audit-resource-copy strong {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 8px;
          font-weight: 700;
        }

        .audit-resource-copy span {
          color: var(--muted, #64748b);
          font-size: 7px;
        }

        /* TIME */

        .audit-time-cell {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .audit-time {
          display: flex;
          align-items: center;
          gap: 5px;
          color: var(--text, #111827);
          font-size: 8px;
          font-weight: 650;
        }

        .audit-date-small {
          color: var(--muted, #64748b);
          font-size: 7px;
        }

        .audit-view-button {
          height: 29px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 0 8px;
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 7px;
          background: transparent;
          color: var(--muted, #64748b);
          font-size: 8px;
          font-weight: 700;
          cursor: pointer;
          transition: 0.16s ease;
        }

        .audit-view-button:hover {
          border-color: #2563eb;
          background: rgba(37, 99, 235, 0.06);
          color: #2563eb;
        }

        /* =====================================================
           EMPTY / LOADING
           ===================================================== */

        .audit-empty {
          min-height: 320px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 7px;
          padding: 45px 20px;
        }

        .audit-empty-icon {
          width: 55px;
          height: 55px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 5px;
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 15px;
          background: var(--background, #f8fafc);
          color: var(--muted, #64748b);
        }

        .audit-empty strong {
          font-size: 12px;
          font-weight: 750;
        }

        .audit-empty span {
          max-width: 380px;
          color: var(--muted, #64748b);
          font-size: 9px;
          line-height: 1.5;
          text-align: center;
        }

        /* =====================================================
           ERROR
           ===================================================== */

        .audit-error {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 17px;
          padding: 11px 13px;
          border: 1px solid rgba(239, 68, 68, 0.17);
          border-radius: 10px;
          background: rgba(239, 68, 68, 0.04);
        }

        .audit-error-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: rgba(239, 68, 68, 0.09);
          color: #dc2626;
        }

        .audit-error-copy {
          flex: 1;
          min-width: 0;
        }

        .audit-error-copy strong {
          display: block;
          font-size: 10px;
        }

        .audit-error-copy span {
          display: block;
          margin-top: 2px;
          overflow: hidden;
          color: var(--muted, #64748b);
          font-size: 8px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .audit-error button {
          border: 0;
          background: transparent;
          color: #dc2626;
          font-size: 9px;
          font-weight: 750;
          cursor: pointer;
        }

        /* =====================================================
           PAGINATION
           ===================================================== */

        .audit-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 12px 18px;
          border-top: 1px solid var(--border, #e2e8f0);
        }

        .audit-pagination-info {
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--muted, #64748b);
          font-size: 8px;
        }

        .audit-pagination-info strong {
          color: var(--text, #111827);
          font-size: 9px;
        }

        .audit-pagination-controls {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .audit-pagination-controls button {
          height: 29px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 0 8px;
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 7px;
          background: var(--surface, #ffffff);
          color: var(--text, #111827);
          font-size: 8px;
          font-weight: 680;
          cursor: pointer;
        }

        .audit-pagination-controls button:hover:not(:disabled) {
          border-color: #2563eb;
          color: #2563eb;
        }

        .audit-pagination-controls button:disabled {
          opacity: 0.38;
          cursor: not-allowed;
        }

        .audit-page-number {
          min-width: 72px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 4px;
          color: var(--muted, #64748b);
          font-size: 8px;
        }

        .audit-page-number strong {
          color: var(--text, #111827);
        }

        /* =====================================================
           MODAL
           ===================================================== */

        .audit-overlay {
          position: fixed;
          z-index: 9999;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(15, 23, 42, 0.57);
          backdrop-filter: blur(7px);
        }

        .audit-modal {
          width: min(680px, 100%);
          max-height: calc(100vh - 40px);
          overflow-y: auto;
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 17px;
          background: var(--surface, #ffffff);
          box-shadow:
            0 35px 100px rgba(15, 23, 42, 0.24);
          animation:
            auditModalIn 0.18s ease-out;
        }

        @keyframes auditModalIn {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.985);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .audit-modal-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 17px 19px;
          border-bottom: 1px solid var(--border, #e2e8f0);
        }

        .audit-modal-heading {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .audit-modal-shield {
          width: 39px;
          height: 39px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          background: rgba(37, 99, 235, 0.09);
          color: #2563eb;
        }

        .audit-modal-heading small {
          display: block;
          margin-bottom: 3px;
          color: #2563eb;
          font-size: 7px;
          font-weight: 800;
          letter-spacing: 0.13em;
        }

        .audit-modal-heading h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 760;
        }

        .audit-modal-close {
          width: 31px;
          height: 31px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 8px;
          background: transparent;
          color: var(--muted, #64748b);
          cursor: pointer;
        }

        .audit-modal-close:hover {
          color: var(--text, #111827);
          background: var(--background, #f8fafc);
        }

        .audit-modal-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin: 15px 19px 0;
          padding: 11px 12px;
          border: 1px solid rgba(16, 185, 129, 0.14);
          border-radius: 10px;
          background: rgba(16, 185, 129, 0.045);
        }

        .audit-modal-banner-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .audit-verified {
          color: #059669;
          font-size: 9px;
          font-weight: 750;
        }

        .audit-event-ref {
          color: var(--muted, #64748b);
          font-family:
            ui-monospace,
            SFMono-Regular,
            Menlo,
            monospace;
          font-size: 8px;
        }

        .audit-modal-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 8px;
          padding: 15px 19px;
        }

        .audit-detail {
          min-width: 0;
          padding: 11px;
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 9px;
          background: var(--surface, #ffffff);
        }

        .audit-detail-label {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-bottom: 6px;
          color: var(--muted, #64748b);
          font-size: 7px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .audit-detail-value {
          display: block;
          overflow: hidden;
          color: var(--text, #111827);
          font-size: 9px;
          font-weight: 680;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .audit-detail-action {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 4px 7px;
          border-radius: 6px;
          font-size: 8px;
          font-weight: 750;
        }

        .audit-detail-action.success {
          color: #047857;
          background: rgba(16, 185, 129, 0.09);
        }

        .audit-detail-action.warning {
          color: #b45309;
          background: rgba(245, 158, 11, 0.1);
        }

        .audit-detail-action.danger {
          color: #b91c1c;
          background: rgba(239, 68, 68, 0.09);
        }

        .audit-detail-action.info {
          color: #1d4ed8;
          background: rgba(37, 99, 235, 0.09);
        }

        .audit-section {
          padding: 0 19px 15px;
        }

        .audit-section-label {
          display: flex;
          align-items: center;
          gap: 5px;
          margin-bottom: 6px;
          color: var(--muted, #64748b);
          font-size: 8px;
          font-weight: 750;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .audit-description-box {
          padding: 11px;
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 9px;
          background: var(--background, #f8fafc);
          color: var(--text, #111827);
          font-size: 9px;
          line-height: 1.55;
        }

        .audit-metadata {
          max-height: 180px;
          overflow: auto;
          margin: 0;
          padding: 11px;
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 9px;
          background: #0f172a;
          color: #cbd5e1;
          font-family:
            ui-monospace,
            SFMono-Regular,
            Menlo,
            Monaco,
            Consolas,
            monospace;
          font-size: 8px;
          line-height: 1.55;
          white-space: pre-wrap;
          word-break: break-word;
        }

        .audit-modal-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px 19px;
          border-top: 1px solid var(--border, #e2e8f0);
        }

        .audit-modal-footer span {
          color: var(--muted, #64748b);
          font-size: 7px;
        }

        .audit-modal-footer button {
          height: 30px;
          padding: 0 11px;
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 7px;
          background: var(--surface, #ffffff);
          color: var(--text, #111827);
          font-size: 8px;
          font-weight: 680;
          cursor: pointer;
        }

        .audit-modal-footer button:hover {
          border-color: #2563eb;
          color: #2563eb;
        }

        /* =====================================================
           LOADING
           ===================================================== */

        .audit-loading {
          min-height: 300px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 8px;
          color: var(--muted, #64748b);
          font-size: 9px;
        }

        .audit-spin {
          animation:
            auditSpin 0.8s linear infinite;
        }

        @keyframes auditSpin {
          to {
            transform: rotate(360deg);
          }
        }

        /* =====================================================
           RESPONSIVE
           ===================================================== */

        @media (max-width: 1100px) {
          .audit-kpis {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }

          .audit-console-head {
            align-items: stretch;
            flex-direction: column;
          }

          .audit-toolbar {
            width: 100%;
          }

          .audit-search {
            flex: 1;
            width: auto;
          }
        }

        @media (max-width: 850px) {
          .audit-stream-label {
            display: none;
          }

          .audit-event {
            grid-template-columns: 45px minmax(0, 1fr);
            gap: 10px;
            padding: 14px;
          }

          .audit-resource-cell,
          .audit-time-cell,
          .audit-view-button {
            grid-column: 2;
          }

          .audit-resource-cell {
            margin-top: 2px;
          }

          .audit-time-cell {
            flex-direction: row;
            align-items: center;
            gap: 8px;
          }

          .audit-event-marker::before {
            bottom: -70px;
          }

          .audit-event:last-child
            .audit-event-marker::before {
            bottom: 35px;
          }
        }

        @media (max-width: 650px) {
          .audit-page {
            padding: 16px;
          }

          .audit-header {
            align-items: stretch;
            flex-direction: column;
          }

          .audit-refresh {
            width: 100%;
            justify-content: center;
          }

          .audit-status-bar {
            align-items: flex-start;
            flex-direction: column;
          }

          .audit-status-right {
            width: 100%;
            justify-content: space-between;
          }

          .audit-toolbar {
            align-items: stretch;
            flex-direction: column;
          }

          .audit-search {
            width: 100%;
          }

          .audit-select-wrap {
            width: 100%;
          }

          .audit-select-wrap select {
            width: 100%;
          }

          .audit-modal-grid {
            grid-template-columns: 1fr;
          }

          .audit-pagination {
            align-items: flex-start;
            flex-direction: column;
          }

          .audit-pagination-controls {
            width: 100%;
            justify-content: space-between;
          }
        }

        @media (max-width: 480px) {
          .audit-page {
            padding: 12px;
          }

          .audit-heading h1 {
            font-size: 23px;
          }

          .audit-heading-icon {
            width: 43px;
            height: 43px;
            flex-basis: 43px;
          }

          .audit-kpis {
            grid-template-columns: 1fr;
          }

          .audit-kpi {
            min-height: 100px;
          }

          .audit-console-title p {
            display: none;
          }

          .audit-console-head {
            padding: 14px;
          }

          .audit-event {
            grid-template-columns: 38px minmax(0, 1fr);
            padding: 13px;
          }

          .audit-event-dot {
            width: 31px;
            height: 31px;
          }

          .audit-event-description {
            white-space: normal;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          }

          .audit-overlay {
            padding: 9px;
          }

          .audit-modal {
            max-height: calc(100vh - 18px);
            border-radius: 13px;
          }

          .audit-modal-head,
          .audit-modal-footer {
            padding-left: 14px;
            padding-right: 14px;
          }

          .audit-modal-banner {
            margin-left: 14px;
            margin-right: 14px;
          }

          .audit-modal-grid {
            padding-left: 14px;
            padding-right: 14px;
          }

          .audit-section {
            padding-left: 14px;
            padding-right: 14px;
          }
        }
      `}</style>

      <section className="audit-page">

        {/* =================================================
            HEADER
            ================================================= */}

        <header className="audit-header">
          <div>
            <div className="audit-kicker">
              <ShieldCheck size={12} />
              Security intelligence
            </div>

            <div className="audit-heading">
              <div className="audit-heading-icon">
                <Shield size={22} />
              </div>

              <div>
                <h1>Audit Center</h1>

                <p>
                  Centralized security intelligence
                  for attendance, biometric, GPS
                  and administrative activity.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="audit-refresh"
            onClick={() =>
              void loadLogs(true)
            }
            disabled={refreshing}
          >
            <RefreshCw
              size={14}
              className={
                refreshing
                  ? "audit-spin"
                  : undefined
              }
            />

            {refreshing
              ? "Syncing..."
              : "Sync events"}
          </button>
        </header>

        {/* =================================================
            ERROR
            ================================================= */}

        {error && (
          <div className="audit-error">
            <div className="audit-error-icon">
              <AlertTriangle size={16} />
            </div>

            <div className="audit-error-copy">
              <strong>
                Security event stream unavailable
              </strong>

              <span>{error}</span>
            </div>

            <button
              type="button"
              onClick={() =>
                void loadLogs(true)
              }
            >
              Retry
            </button>
          </div>
        )}

        {/* =================================================
            SYSTEM STATUS
            ================================================= */}

        <div className="audit-status-bar">
          <div className="audit-status-left">
            <div className="audit-status-shield">
              <ShieldCheck size={18} />
            </div>

            <div className="audit-status-copy">
              <strong>
                Security monitoring active
              </strong>

              <span>
                Platform activity is being
                recorded in real time.
              </span>
            </div>
          </div>

          <div className="audit-status-right">
            <div className="audit-live">
              <span className="audit-live-dot" />
              Live monitoring
            </div>

            <div className="audit-status-divider" />

            <div className="audit-secure-label">
              <LockKeyhole size={12} />
              PostgreSQL secured
            </div>
          </div>
        </div>

        {/* =================================================
            KPIs
            ================================================= */}

        <div className="audit-kpis">
          <AuditKpi
            title="Total Events"
            value={
              loading ? "..." : total
            }
            description="Platform activity recorded"
            icon={<Activity size={17} />}
            className="blue"
          />

          <AuditKpi
            title="Successful"
            value={
              loading
                ? "..."
                : successfulEvents
            }
            description="Verified system activity"
            icon={
              <CheckCircle2 size={17} />
            }
            className="green"
          />

          <AuditKpi
            title="Record Changes"
            value={
              loading
                ? "..."
                : warningEvents
            }
            description="Updated platform records"
            icon={<FileText size={17} />}
            className="orange"
          />

          <AuditKpi
            title="Security Events"
            value={
              loading
                ? "..."
                : securityEvents
            }
            description="Alerts & restricted actions"
            icon={
              <ShieldAlert size={17} />
            }
            className="red"
          />
        </div>

        {/* =================================================
            EVENT CONSOLE
            ================================================= */}

        <div className="audit-console">

          <div className="audit-console-head">
            <div>
              <div className="audit-console-title">
                <div className="audit-console-title-icon">
                  <Activity size={15} />
                </div>

                <div>
                  <h2>
                    Security Event Stream
                  </h2>

                  <p>
                    Real-time activity across the
                    Smart Attendance Intelligence
                    platform.
                  </p>
                </div>
              </div>
            </div>

            <div className="audit-toolbar">

              {/* SEARCH */}

              <div className="audit-search">
                <Search size={14} />

                <input
                  type="text"
                  placeholder="Search events, users, IP..."
                  value={searchTerm}
                  onChange={(event) =>
                    setSearchTerm(
                      event.target.value
                    )
                  }
                />

                {searchTerm && (
                  <button
                    type="button"
                    className="audit-clear"
                    onClick={() =>
                      setSearchTerm("")
                    }
                    aria-label="Clear search"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* FILTER */}

              <div className="audit-select-wrap">
                <Activity size={12} />

                <select
                  value={action}
                  onChange={(event) =>
                    handleActionChange(
                      event.target.value
                    )
                  }
                >
                  <option value="">
                    All events
                  </option>

                  <option value="login">
                    Login
                  </option>

                  <option value="create">
                    Create
                  </option>

                  <option value="update">
                    Update
                  </option>

                  <option value="delete">
                    Delete
                  </option>

                  <option value="activate">
                    Activate
                  </option>

                  <option value="deactivate">
                    Deactivate
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* =================================================
              LOADING
              ================================================= */}

          {loading ? (
            <div className="audit-empty">
              <div className="audit-empty-icon">
                <RefreshCw
                  size={24}
                  className="audit-spin"
                />
              </div>

              <strong>
                Initializing event stream
              </strong>

              <span>
                Reading security intelligence
                from PostgreSQL...
              </span>
            </div>
          ) : logs.length === 0 ? (
            <div className="audit-empty">
              <div className="audit-empty-icon">
                <Shield size={27} />
              </div>

              <strong>
                No security events yet
              </strong>

              <span>
                Authentication, attendance,
                biometric and administrative
                activity will appear here.
              </span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="audit-empty">
              <div className="audit-empty-icon">
                <Search size={27} />
              </div>

              <strong>
                No matching events
              </strong>

              <span>
                Try a different user, action,
                resource or IP address.
              </span>
            </div>
          ) : (
            <>
              {/* =================================================
                  STREAM HEADER
                  ================================================= */}

              <div className="audit-stream-label">
                <span>Signal</span>
                <span>Event intelligence</span>
                <span>Resource</span>
                <span>Time</span>
              </div>

              {/* =================================================
                  EVENTS
                  ================================================= */}

              <div className="audit-stream">
                {filteredLogs.map(
                  (log) => {
                    const tone =
                      getEventTone(
                        log.action
                      );

                    return (
                      <div
                        className="audit-event"
                        key={log.id}
                      >

                        {/* SIGNAL */}

                        <div className="audit-event-marker">
                          <div
                            className={`audit-event-dot ${tone}`}
                          >
                            {getActionIcon(
                              log.action
                            )}
                          </div>
                        </div>

                        {/* EVENT */}

                        <div className="audit-event-main">

                          <div className="audit-event-top">
                            <span
                              className={`audit-event-action ${tone}`}
                            >
                              {getActionIcon(
                                log.action
                              )}

                              {log.action}
                            </span>

                            <span className="audit-event-id">
                              EVENT #{log.id}
                            </span>
                          </div>

                          <div
                            className="audit-event-description"
                            title={
                              log.description ||
                              undefined
                            }
                          >
                            {log.description ||
                              "No event description provided."}
                          </div>

                          <div className="audit-event-user">
                            <div className="audit-avatar">
                              {getInitials(
                                log.user_name
                              )}
                            </div>

                            <div className="audit-user-name">
                              <strong>
                                {log.user_name ||
                                  "System"}
                              </strong>

                              <span>
                                {log.user_email ||
                                  "Automated system event"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* RESOURCE */}

                        <div className="audit-resource-cell">
                          <div className="audit-resource-icon">
                            {getResourceIcon(
                              log.resource_type
                            )}
                          </div>

                          <div className="audit-resource-copy">
                            <strong>
                              {getResourceLabel(
                                log.resource_type
                              )}
                            </strong>

                            <span>
                              {log.resource_id !==
                                null &&
                              log.resource_id !==
                                undefined
                                ? `ID #${log.resource_id}`
                                : "System resource"}
                            </span>
                          </div>
                        </div>

                        {/* TIME */}

                        <div className="audit-time-cell">
                          <div className="audit-time">
                            <Clock3 size={11} />

                            {formatTime(
                              log.created_at
                            )}
                          </div>

                          <span className="audit-date-small">
                            {formatDate(
                              log.created_at
                            )}
                          </span>

                          <button
                            type="button"
                            className="audit-view-button"
                            onClick={() =>
                              void openDetails(
                                log
                              )
                            }
                          >
                            <Eye size={12} />
                            Inspect
                          </button>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>

              {/* =================================================
                  PAGINATION
                  ================================================= */}

              <div className="audit-pagination">
                <div className="audit-pagination-info">
                  <strong>
                    {startRecord}–{endRecord}
                  </strong>

                  <span>
                    of {total} events
                  </span>
                </div>

                <div className="audit-pagination-controls">
                  <button
                    type="button"
                    onClick={
                      handlePrevious
                    }
                    disabled={page <= 1}
                  >
                    <ChevronLeft size={13} />
                    Previous
                  </button>

                  <div className="audit-page-number">
                    <span>Page</span>

                    <strong>
                      {page}
                    </strong>

                    <span>of</span>

                    <strong>
                      {pages || 1}
                    </strong>
                  </div>

                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={
                      page >= pages
                    }
                  >
                    Next
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* =================================================
            DETAILS MODAL
            ================================================= */}

        {selectedLog && (
          <div
            className="audit-overlay"
            onMouseDown={closeDetails}
          >
            <div
              className="audit-modal"
              onMouseDown={(event) =>
                event.stopPropagation()
              }
            >

              {/* HEADER */}

              <div className="audit-modal-head">
                <div className="audit-modal-heading">
                  <div className="audit-modal-shield">
                    <ShieldCheck size={19} />
                  </div>

                  <div>
                    <small>
                      SECURITY EVENT
                    </small>

                    <h2>
                      Event #{selectedLog.id}
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  className="audit-modal-close"
                  onClick={closeDetails}
                  disabled={
                    detailsLoading
                  }
                  aria-label="Close event details"
                >
                  <X size={16} />
                </button>
              </div>

              {/* STATUS */}

              {detailsLoading ? (
                <div className="audit-loading">
                  <RefreshCw
                    size={22}
                    className="audit-spin"
                  />

                  <span>
                    Inspecting security event...
                  </span>
                </div>
              ) : (
                <>
                  <div className="audit-modal-banner">
                    <div className="audit-modal-banner-left">
                      <CheckCircle2
                        size={14}
                        color="#059669"
                      />

                      <span className="audit-verified">
                        Verified and recorded
                      </span>
                    </div>

                    <span className="audit-event-ref">
                      EVENT #{selectedLog.id}
                    </span>
                  </div>

                  {/* DETAILS */}

                  <div className="audit-modal-grid">

                    <DetailItem
                      icon={
                        <User size={13} />
                      }
                      label="User"
                      value={
                        selectedLog.user_name ||
                        "System"
                      }
                    />

                    <DetailItem
                      icon={
                        <Activity size={13} />
                      }
                      label="Action"
                      value={
                        selectedLog.action
                      }
                      badge
                    />

                    <DetailItem
                      icon={
                        getResourceIcon(
                          selectedLog.resource_type
                        )
                      }
                      label="Resource"
                      value={`${getResourceLabel(
                        selectedLog.resource_type
                      )}${
                        selectedLog.resource_id !==
                          null &&
                        selectedLog.resource_id !==
                          undefined
                          ? ` #${selectedLog.resource_id}`
                          : ""
                      }`}
                    />

                    <DetailItem
                      icon={
                        <Globe2 size={13} />
                      }
                      label="IP Address"
                      value={
                        selectedLog.ip_address ||
                        "—"
                      }
                    />

                    <DetailItem
                      icon={
                        <CalendarClock
                          size={13}
                        />
                      }
                      label="Timestamp"
                      value={formatDate(
                        selectedLog.created_at
                      )}
                    />

                    <DetailItem
                      icon={
                        <Laptop size={13} />
                      }
                      label="Identity"
                      value={
                        selectedLog.user_email ||
                        "System event"
                      }
                    />
                  </div>

                  {/* DESCRIPTION */}

                  <div className="audit-section">
                    <div className="audit-section-label">
                      <FileText size={12} />
                      Event description
                    </div>

                    <div className="audit-description-box">
                      {selectedLog.description ||
                        "No description provided."}
                    </div>
                  </div>

                  {/* METADATA */}

                  {selectedLog.metadata && (
                    <div className="audit-section">
                      <div className="audit-section-label">
                        <Activity size={12} />
                        Event metadata
                      </div>

                      <pre className="audit-metadata">
                        {JSON.stringify(
                          selectedLog.metadata,
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  )}

                  {/* FOOTER */}

                  <div className="audit-modal-footer">
                    <span>
                      Smart Attendance Intelligence
                      • Security Audit
                    </span>

                    <button
                      type="button"
                      onClick={closeDetails}
                    >
                      Close inspection
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </section>
    </>
  );
}

/* =========================================================
   KPI COMPONENT
   ========================================================= */

function AuditKpi({
  title,
  value,
  description,
  icon,
  className,
}: {
  title: string;
  value: number | string;
  description: string;
  icon: ReactNode;
  className: string;
}) {
  return (
    <div
      className={`audit-kpi ${className}`}
    >
      <div className="audit-kpi-top">
        <div className="audit-kpi-icon">
          {icon}
        </div>

        <span className="audit-kpi-live">
          <i />
          Live
        </span>
      </div>

      <div className="audit-kpi-body">
        <span>{title}</span>

        <strong>{value}</strong>

        <small>{description}</small>
      </div>
    </div>
  );
}

/* =========================================================
   DETAIL COMPONENT
   ========================================================= */

function DetailItem({
  icon,
  label,
  value,
  badge = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  badge?: boolean;
}) {
  return (
    <div className="audit-detail">
      <div className="audit-detail-label">
        {icon}
        <span>{label}</span>
      </div>

      {badge ? (
        <span
          className={`audit-detail-action ${getActionClass(
            value
          )}`}
        >
          {getActionIcon(value)}
          {value}
        </span>
      ) : (
        <strong className="audit-detail-value">
          {value}
        </strong>
      )}
    </div>
  );
}