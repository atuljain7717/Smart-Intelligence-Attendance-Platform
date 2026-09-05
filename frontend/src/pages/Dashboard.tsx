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
  Building2,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock3,
  MapPin,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getDashboardSummary,
  type DashboardSummary,
} from "../services/dashboardService";
/* =========================================================
   DEMO TREND DATA
========================================================= */
const attendanceTrend = [
  { day: "Mon", present: 214, absent: 18, late: 12 },
  { day: "Tue", present: 221, absent: 13, late: 10 },
  { day: "Wed", present: 218, absent: 17, late: 9 },
  { day: "Thu", present: 226, absent: 11, late: 8 },
  { day: "Fri", present: 221, absent: 18, late: 9 },
  { day: "Sat", present: 185, absent: 8, late: 5 },
];
/* =========================================================
   RECENT ATTENDANCE
========================================================= */
const recentAttendance = [
  {
    name: "Aarav Sharma",
    department: "Engineering",
    time: "09:02 AM",
    status: "Present",
  },
  {
    name: "Priya Patil",
    department: "Human Resources",
    time: "09:08 AM",
    status: "Present",
  },
  {
    name: "Rahul Deshmukh",
    department: "Finance",
    time: "09:21 AM",
    status: "Late",
  },
  {
    name: "Sneha Kulkarni",
    department: "Operations",
    time: "09:27 AM",
    status: "Present",
  },
];
/* =========================================================
   DASHBOARD
========================================================= */
export default function Dashboard() {
  const [summary, setSummary] =
    useState<DashboardSummary | null>(null);
  const [dashboardLoading, setDashboardLoading] =
    useState(true);
  const [refreshing, setRefreshing] =
    useState(false);
  const [dashboardError, setDashboardError] =
    useState("");
  /* =======================================================
     LOAD DASHBOARD
  ======================================================= */
  const loadDashboard = useCallback(
    async (refresh = false) => {
      try {
        if (refresh) {
          setRefreshing(true);
        } else {
          setDashboardLoading(true);
        }
        setDashboardError("");
        const data = await getDashboardSummary();
        setSummary(data);
      } catch (error) {
        console.error(
          "Dashboard API error:",
          error
        );
        setDashboardError(
          "Unable to load dashboard data."
        );
      } finally {
        setDashboardLoading(false);
        setRefreshing(false);
      }
    },
    []
  );
  /* =======================================================
     INITIAL LOAD
  ======================================================= */
  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);
  /* =======================================================
     REFRESH
  ======================================================= */
  const handleRefresh = () => {
    if (!refreshing) {
      void loadDashboard(true);
    }
  };
  /* =======================================================
     CALCULATIONS
  ======================================================= */
  const attendancePercentage =
    summary?.attendance_percentage ?? 0;
  const absentToday =
    summary?.absent_today ?? 0;
  const attendanceStatus = useMemo(
    () => [
      {
        name: "Present",
        value: Math.max(
          0,
          Math.min(100, attendancePercentage)
        ),
      },
      {
        name: "Late",
        value: 4,
      },
      {
        name: "Absent",
        value: Math.max(
          0,
          100 - attendancePercentage - 4
        ),
      },
    ],
    [attendancePercentage]
  );
  return (
    <>
      <style>{`
        /* =====================================================
           SMART ATTENDANCE INTELLIGENCE
           PREMIUM COMMAND CENTER
        ===================================================== */
        .smart-dashboard {
          width: 100%;
          min-width: 0;
          animation: dashboardFadeIn 0.45s ease;
        }
        @keyframes dashboardFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        /* =====================================================
           HEADER
        ===================================================== */
        .smart-dashboard-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 26px;
        }
        .smart-dashboard-heading {
          min-width: 0;
        }
        .smart-dashboard-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 9px;
          color: #818cf8;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.14em;
        }
        .smart-dashboard-eyebrow::before {
          content: "";
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #818cf8;
          box-shadow:
            0 0 0 4px rgba(129, 140, 248, 0.10);
        }
        .smart-dashboard-heading h1 {
          margin: 0;
          color: #f8fafc;
          font-size: clamp(25px, 3vw, 34px);
          line-height: 1.15;
          font-weight: 750;
          letter-spacing: -0.035em;
        }
        .smart-dashboard-heading p {
          margin: 9px 0 0;
          max-width: 650px;
          color: #64748b;
          font-size: 13px;
          line-height: 1.6;
        }
        .smart-dashboard-actions {
          display: flex;
          align-items: center;
          gap: 9px;
          flex-shrink: 0;
        }
        .smart-dashboard-date,
        .smart-dashboard-live {
          height: 40px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 0 13px;
          border: 1px solid rgba(148, 163, 184, 0.15);
          border-radius: 11px;
          background: rgba(15, 23, 42, 0.48);
          color: #94a3b8;
          font-size: 11px;
          font-weight: 600;
        }
        .smart-dashboard-date svg {
          color: #818cf8;
        }
        .smart-dashboard-live {
          color: #a7f3d0;
        }
        .smart-dashboard-live-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow:
            0 0 0 4px rgba(34, 197, 94, 0.09);
          animation: livePulse 2s infinite;
        }
        @keyframes livePulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.45;
          }
        }
        .smart-refresh-button {
          height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 15px;
          border: 1px solid rgba(129, 140, 248, 0.25);
          border-radius: 11px;
          background: rgba(99, 102, 241, 0.10);
          color: #a5b4fc;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          transition:
            transform 0.2s ease,
            background 0.2s ease,
            border-color 0.2s ease;
        }
        .smart-refresh-button:hover:not(:disabled) {
          transform: translateY(-1px);
          background: rgba(99, 102, 241, 0.17);
          border-color: rgba(129, 140, 248, 0.45);
        }
        .smart-refresh-button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
        .smart-refresh-button.is-refreshing svg {
          animation: smartSpin 0.8s linear infinite;
        }
        @keyframes smartSpin {
          to {
            transform: rotate(360deg);
          }
        }
        /* =====================================================
           ERROR
        ===================================================== */
        .smart-dashboard-error {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          padding: 13px 15px;
          border: 1px solid rgba(239, 68, 68, 0.22);
          border-radius: 13px;
          background: rgba(127, 29, 29, 0.13);
          color: #fca5a5;
        }
        .smart-dashboard-error > svg {
          flex-shrink: 0;
        }
        .smart-dashboard-error-content {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
        }
        .smart-dashboard-error-content strong {
          color: #fecaca;
          font-size: 12px;
        }
        .smart-dashboard-error-content span {
          color: #94a3b8;
          font-size: 11px;
        }
        .smart-dashboard-error button {
          height: 32px;
          padding: 0 12px;
          border: 1px solid rgba(239, 68, 68, 0.30);
          border-radius: 8px;
          background: rgba(239, 68, 68, 0.10);
          color: #fca5a5;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }
        /* =====================================================
           STATISTICS
        ===================================================== */
        .smart-stat-grid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 18px;
        }
        .smart-stat-card {
          position: relative;
          min-height: 125px;
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 18px;
          overflow: hidden;
          border: 1px solid rgba(148, 163, 184, 0.13);
          border-radius: 16px;
          background:
            linear-gradient(
              145deg,
              rgba(15, 23, 42, 0.90),
              rgba(15, 23, 42, 0.62)
            );
          box-shadow:
            0 12px 32px rgba(0, 0, 0, 0.09);
          transition:
            transform 0.22s ease,
            border-color 0.22s ease,
            box-shadow 0.22s ease;
        }
        .smart-stat-card::after {
          content: "";
          position: absolute;
          width: 110px;
          height: 110px;
          right: -55px;
          top: -55px;
          border-radius: 50%;
          background: var(--stat-glow);
          opacity: 0.09;
          filter: blur(4px);
        }
        .smart-stat-card:hover {
          transform: translateY(-3px);
          border-color: rgba(148, 163, 184, 0.24);
          box-shadow:
            0 16px 38px rgba(0, 0, 0, 0.14);
        }
        .smart-stat-card.blue {
          --stat-color: #818cf8;
          --stat-glow: #818cf8;
        }
        .smart-stat-card.green {
          --stat-color: #34d399;
          --stat-glow: #34d399;
        }
        .smart-stat-card.red {
          --stat-color: #fb7185;
          --stat-glow: #fb7185;
        }
        .smart-stat-card.orange {
          --stat-color: #fbbf24;
          --stat-glow: #fbbf24;
        }
        .smart-stat-icon {
          position: relative;
          z-index: 1;
          width: 44px;
          height: 44px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid color-mix(
            in srgb,
            var(--stat-color) 24%,
            transparent
          );
          border-radius: 12px;
          background: color-mix(
            in srgb,
            var(--stat-color) 9%,
            transparent
          );
          color: var(--stat-color);
        }
        .smart-stat-content {
          position: relative;
          z-index: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }
        .smart-stat-content span {
          color: #64748b;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .smart-stat-content strong {
          margin-top: 3px;
          color: #f8fafc;
          font-size: 25px;
          line-height: 1.1;
          font-weight: 750;
          letter-spacing: -0.035em;
        }
        .smart-stat-content small {
          margin-top: 5px;
          color: #475569;
          font-size: 10px;
        }
        /* =====================================================
           GENERIC CARD
        ===================================================== */
        .smart-dashboard-card {
          min-width: 0;
          border: 1px solid rgba(148, 163, 184, 0.13);
          border-radius: 17px;
          background:
            linear-gradient(
              145deg,
              rgba(15, 23, 42, 0.90),
              rgba(15, 23, 42, 0.64)
            );
          box-shadow:
            0 14px 38px rgba(0, 0, 0, 0.08);
          overflow: hidden;
        }
        .smart-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
          padding: 20px 21px 0;
        }
        .smart-card-header h2 {
          margin: 0;
          color: #e2e8f0;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: -0.01em;
        }
        .smart-card-header p {
          margin: 5px 0 0;
          color: #475569;
          font-size: 10px;
          line-height: 1.5;
        }
        /* =====================================================
           MAIN GRID
        ===================================================== */
        .smart-main-grid {
          display: grid;
          grid-template-columns:
            minmax(0, 1.7fr)
            minmax(300px, 0.8fr);
          gap: 18px;
          margin-bottom: 18px;
        }
        .smart-trend-card,
        .smart-status-card {
          min-height: 355px;
        }
        .smart-trend-indicator {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 9px;
          border: 1px solid rgba(52, 211, 153, 0.18);
          border-radius: 9px;
          background: rgba(52, 211, 153, 0.07);
          color: #6ee7b7;
          font-size: 10px;
          font-weight: 700;
        }
        .smart-chart-container {
          height: 270px;
          padding: 16px 16px 8px;
        }
        /* =====================================================
           TOOLTIP
        ===================================================== */
        .smart-tooltip {
          padding: 10px 12px;
          border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 10px;
          background: rgba(15, 23, 42, 0.96);
          box-shadow:
            0 10px 25px rgba(0, 0, 0, 0.18);
        }
        .smart-tooltip-label {
          margin-bottom: 6px;
          color: #94a3b8;
          font-size: 10px;
          font-weight: 700;
        }
        .smart-tooltip-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          color: #cbd5e1;
          font-size: 10px;
        }
        /* =====================================================
           PIE
        ===================================================== */
        .smart-pie-wrapper {
          position: relative;
          height: 205px;
          margin-top: 6px;
        }
        .smart-pie-center {
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .smart-pie-center strong {
          color: #f8fafc;
          font-size: 25px;
          line-height: 1;
          letter-spacing: -0.04em;
        }
        .smart-pie-center span {
          margin-top: 5px;
          color: #64748b;
          font-size: 10px;
        }
        .smart-status-legend {
          display: flex;
          flex-direction: column;
          margin: 0 21px 18px;
          border-top: 1px solid rgba(148, 163, 184, 0.09);
        }
        .smart-status-legend-row {
          display: grid;
          grid-template-columns: 9px 1fr auto;
          align-items: center;
          gap: 8px;
          padding: 9px 0;
          border-bottom: 1px solid rgba(148, 163, 184, 0.06);
          font-size: 10px;
        }
        .smart-status-legend-row > span:nth-child(2) {
          color: #64748b;
        }
        .smart-status-legend-row strong {
          color: #cbd5e1;
          font-size: 10px;
        }
        .smart-legend-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
        }
        .smart-legend-dot.present {
          background: #818cf8;
        }
        .smart-legend-dot.late {
          background: #fb7185;
        }
        .smart-legend-dot.absent {
          background: #334155;
        }
        /* =====================================================
           WORKFORCE
        ===================================================== */
        .smart-workforce-card {
          margin-bottom: 18px;
        }
        .smart-live-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 6px 9px;
          border: 1px solid rgba(34, 197, 94, 0.17);
          border-radius: 8px;
          background: rgba(34, 197, 94, 0.06);
          color: #86efac;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.08em;
        }
        .smart-live-badge span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
        }
        .smart-workforce-grid {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(0, 1fr));
          gap: 10px;
          padding: 18px 20px 20px;
        }
        .smart-operation-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px;
          border: 1px solid rgba(148, 163, 184, 0.09);
          border-radius: 12px;
          background: rgba(2, 6, 23, 0.24);
          transition:
            border-color 0.2s ease,
            background 0.2s ease,
            transform 0.2s ease;
        }
        .smart-operation-card:hover {
          transform: translateY(-2px);
          border-color: rgba(129, 140, 248, 0.20);
          background: rgba(99, 102, 241, 0.045);
        }
        .smart-operation-icon {
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background: rgba(99, 102, 241, 0.08);
          color: #818cf8;
        }
        .smart-operation-content {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }
        .smart-operation-content span {
          color: #64748b;
          font-size: 9px;
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .smart-operation-content strong {
          margin-top: 3px;
          color: #e2e8f0;
          font-size: 20px;
          line-height: 1;
        }
        .smart-operation-content small {
          margin-top: 4px;
          color: #475569;
          font-size: 8px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        /* =====================================================
           BOTTOM GRID
        ===================================================== */
        .smart-bottom-grid {
          display: grid;
          grid-template-columns:
            minmax(0, 1.4fr)
            minmax(300px, 0.8fr);
          gap: 18px;
        }
        /* =====================================================
           VIEW ALL
        ===================================================== */
        .smart-view-all {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 8px;
          border: none;
          border-radius: 7px;
          background: transparent;
          color: #818cf8;
          font-size: 9px;
          font-weight: 700;
          cursor: pointer;
        }
        .smart-view-all:hover {
          background: rgba(99, 102, 241, 0.08);
        }
        /* =====================================================
           ATTENDANCE LIST
        ===================================================== */
        .smart-attendance-list {
          padding: 12px 20px 16px;
        }
        .smart-attendance-row {
          display: grid;
          grid-template-columns:
            34px
            minmax(0, 1fr)
            auto
            auto;
          align-items: center;
          gap: 11px;
          min-height: 56px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.07);
        }
        .smart-attendance-row:last-child {
          border-bottom: none;
        }
        .smart-mini-avatar {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(129, 140, 248, 0.18);
          border-radius: 9px;
          background: rgba(99, 102, 241, 0.09);
          color: #a5b4fc;
          font-size: 10px;
          font-weight: 800;
        }
        .smart-employee-info {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }
        .smart-employee-info strong {
          color: #cbd5e1;
          font-size: 11px;
          font-weight: 650;
        }
        .smart-employee-info span {
          margin-top: 3px;
          color: #475569;
          font-size: 9px;
        }
        .smart-attendance-time {
          color: #94a3b8;
          font-size: 9px;
          font-weight: 600;
        }
        .smart-attendance-status {
          min-width: 58px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 5px 7px;
          border-radius: 7px;
          background: rgba(34, 197, 94, 0.07);
          color: #86efac;
          font-size: 8px;
          font-weight: 750;
        }
        .smart-attendance-status.late {
          background: rgba(251, 191, 36, 0.08);
          color: #fcd34d;
        }
        /* =====================================================
           ALERTS
        ===================================================== */
        .smart-alerts-list {
          padding: 12px 20px 17px;
        }
        .smart-alert {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          padding: 12px 0;
          border-bottom: 1px solid rgba(148, 163, 184, 0.07);
        }
        .smart-alert:last-child {
          border-bottom: none;
        }
        .smart-alert-icon {
          width: 32px;
          height: 32px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
        }
        .smart-alert.warning .smart-alert-icon {
          background: rgba(251, 191, 36, 0.08);
          color: #fbbf24;
        }
        .smart-alert.info .smart-alert-icon {
          background: rgba(99, 102, 241, 0.08);
          color: #818cf8;
        }
        .smart-alert.success .smart-alert-icon {
          background: rgba(34, 197, 94, 0.08);
          color: #4ade80;
        }
        .smart-alert-content {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }
        .smart-alert-content strong {
          color: #cbd5e1;
          font-size: 10px;
          font-weight: 700;
        }
        .smart-alert-content span {
          margin-top: 4px;
          color: #475569;
          font-size: 9px;
          line-height: 1.5;
        }
        /* =====================================================
           RESPONSIVE
        ===================================================== */
        @media (max-width: 1150px) {
          .smart-stat-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }
          .smart-main-grid,
          .smart-bottom-grid {
            grid-template-columns: 1fr;
          }
          .smart-workforce-grid {
            grid-template-columns:
              repeat(2, minmax(0, 1fr));
          }
        }
        @media (max-width: 760px) {
          .smart-dashboard-header {
            align-items: stretch;
            flex-direction: column;
          }
          .smart-dashboard-actions {
            width: 100%;
            display: grid;
            grid-template-columns:
              1fr 1fr;
            gap: 8px;
          }
          .smart-dashboard-date,
          .smart-dashboard-live,
          .smart-refresh-button {
            width: 100%;
            justify-content: center;
          }
          .smart-refresh-button {
            grid-column: 1 / -1;
          }
          .smart-stat-grid {
            grid-template-columns:
              1fr 1fr;
          }
          .smart-workforce-grid {
            grid-template-columns:
              1fr 1fr;
          }
          .smart-attendance-row {
            grid-template-columns:
              34px
              minmax(0, 1fr)
              auto;
          }
          .smart-attendance-status {
            display: none;
          }
        }
        @media (max-width: 500px) {
          .smart-stat-grid,
          .smart-workforce-grid {
            grid-template-columns: 1fr;
          }
          .smart-dashboard-heading h1 {
            font-size: 25px;
          }
          .smart-card-header {
            padding-left: 15px;
            padding-right: 15px;
          }
          .smart-chart-container {
            height: 240px;
            padding-left: 6px;
            padding-right: 6px;
          }
          .smart-attendance-list,
          .smart-alerts-list {
            padding-left: 15px;
            padding-right: 15px;
          }
        }
      `}</style>
      <section className="dashboard-page smart-dashboard">
        {/* ===================================================
            HEADER
        =================================================== */}
        <header className="smart-dashboard-header">
          <div className="smart-dashboard-heading">
            <span className="smart-dashboard-eyebrow">
              SMART ATTENDANCE INTELLIGENCE
            </span>
            <h1>
              Workforce Command Center
            </h1>
            <p>
              Real-time attendance, workforce,
              geofence and recognition intelligence
              from your organization.
            </p>
          </div>
          <div className="smart-dashboard-actions">
            <div className="smart-dashboard-date">
              <CalendarDays size={14} />
              <span>Today</span>
            </div>
            <div className="smart-dashboard-live">
              <span className="smart-dashboard-live-dot" />
              <span>Live monitoring</span>
            </div>
            <button
              type="button"
              className={
                refreshing
                  ? "smart-refresh-button is-refreshing"
                  : "smart-refresh-button"
              }
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw size={14} />
              <span>
                {refreshing
                  ? "Refreshing..."
                  : "Refresh"}
              </span>
            </button>
          </div>
        </header>
        {/* ===================================================
            ERROR
        =================================================== */}
        {dashboardError && (
          <div className="smart-dashboard-error">
            <AlertTriangle size={17} />
            <div className="smart-dashboard-error-content">
              <strong>
                Dashboard data unavailable
              </strong>
              <span>
                {dashboardError}
              </span>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              Retry
            </button>
          </div>
        )}
        {/* ===================================================
            STATISTICS
        =================================================== */}
        <div className="smart-stat-grid">
          <SmartStatCard
            title="Total Employees"
            value={
              dashboardLoading
                ? "..."
                : String(
                    summary?.total_employees ?? 0
                  )
            }
            description="PostgreSQL workforce"
            icon={<Users size={20} />}
            className="blue"
          />
          <SmartStatCard
            title="Present Today"
            value={
              dashboardLoading
                ? "..."
                : String(
                    summary?.present_today ?? 0
                  )
            }
            description={
              dashboardLoading
                ? "Loading..."
                : `${attendancePercentage}% attendance`
            }
            icon={<UserCheck size={20} />}
            className="green"
          />
          <SmartStatCard
            title="Absent Today"
            value={
              dashboardLoading
                ? "..."
                : String(absentToday)
            }
            description="Calculated attendance"
            icon={<UserX size={20} />}
            className="red"
          />
          <SmartStatCard
            title="Currently Checked In"
            value={
              dashboardLoading
                ? "..."
                : String(
                    summary?.currently_checked_in ?? 0
                  )
            }
            description="Active check-ins"
            icon={<Clock3 size={20} />}
            className="orange"
          />
        </div>
        {/* ===================================================
            CHARTS
        =================================================== */}
        <div className="smart-main-grid">
          {/* ATTENDANCE TREND */}
          <div className="smart-dashboard-card smart-trend-card">
            <div className="smart-card-header">
              <div>
                <h2>
                  Attendance Trend
                </h2>
                <p>
                  Workforce attendance activity
                  across the current week
                </p>
              </div>
              <div className="smart-trend-indicator">
                <TrendingUp size={12} />
                <span>+6.4%</span>
              </div>
            </div>
            <div className="smart-chart-container">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <AreaChart
                  data={attendanceTrend}
                  margin={{
                    top: 10,
                    right: 8,
                    left: -20,
                    bottom: 0,
                  }}
                >
                  <defs>
                    <linearGradient
                      id="smartPresentGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#818cf8"
                        stopOpacity={0.25}
                      />
                      <stop
                        offset="100%"
                        stopColor="#818cf8"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 5"
                    vertical={false}
                    stroke="rgba(148,163,184,0.08)"
                  />
                  <XAxis
                    dataKey="day"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#475569",
                      fontSize: 10,
                    }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#475569",
                      fontSize: 10,
                    }}
                  />
                  <Tooltip
                    content={<SmartChartTooltip />}
                  />
                  <Area
                    type="monotone"
                    dataKey="present"
                    stroke="#818cf8"
                    strokeWidth={2.5}
                    fill="url(#smartPresentGradient)"
                    activeDot={{
                      r: 4,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="late"
                    stroke="#fb7185"
                    strokeWidth={1.8}
                    fill="none"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
          {/* ATTENDANCE STATUS */}
          <div className="smart-dashboard-card smart-status-card">
            <div className="smart-card-header">
              <div>
                <h2>
                  Attendance Status
                </h2>
                <p>
                  Today's workforce distribution
                </p>
              </div>
              <Activity
                size={17}
                color="#818cf8"
              />
            </div>
            <div className="smart-pie-wrapper">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <PieChart>
                  <Pie
                    data={attendanceStatus}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={61}
                    outerRadius={82}
                    paddingAngle={4}
                    stroke="none"
                  >
                    <Cell fill="#818cf8" />
                    <Cell fill="#fb7185" />
                    <Cell fill="#334155" />
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="smart-pie-center">
                <strong>
                  {dashboardLoading
                    ? "..."
                    : `${attendancePercentage}%`}
                </strong>
                <span>
                  Present
                </span>
              </div>
            </div>
            <div className="smart-status-legend">
              <StatusLegend
                className="present"
                label="Present"
                value={
                  dashboardLoading
                    ? "..."
                    : `${attendancePercentage}%`
                }
              />
              <StatusLegend
                className="late"
                label="Late"
                value="4%"
              />
              <StatusLegend
                className="absent"
                label="Absent"
                value={
                  dashboardLoading
                    ? "..."
                    : String(absentToday)
                }
              />
            </div>
          </div>
        </div>
        {/* ===================================================
            LIVE WORKFORCE
        =================================================== */}
        <div className="smart-dashboard-card smart-workforce-card">
          <div className="smart-card-header">
            <div>
              <h2>
                Live Workforce Operations
              </h2>
              <p>
                Current workforce and location
                monitoring
              </p>
            </div>
            <div className="smart-live-badge">
              <span />
              LIVE
            </div>
          </div>
          <div className="smart-workforce-grid">
            <OperationCard
              icon={<MapPin size={18} />}
              title="Employees Online"
              value="42"
              subtitle="Sharing location"
            />
            <OperationCard
              icon={<Building2 size={18} />}
              title="In Office"
              value="198"
              subtitle="Inside assigned locations"
            />
            <OperationCard
              icon={<MapPin size={18} />}
              title="Outside Office"
              value="8"
              subtitle="Geofence alerts"
            />
            <OperationCard
              icon={<Camera size={18} />}
              title="Face Recognition"
              value="96.8%"
              subtitle="Recognition confidence"
            />
          </div>
        </div>
        {/* ===================================================
            BOTTOM GRID
        =================================================== */}
        <div className="smart-bottom-grid">
          {/* RECENT ATTENDANCE */}
          <div className="smart-dashboard-card">
            <div className="smart-card-header">
              <div>
                <h2>
                  Recent Attendance
                </h2>
                <p>
                  Latest employee check-ins
                </p>
              </div>
              <button
                type="button"
                className="smart-view-all"
              >
                View all
                <ChevronRight size={13} />
              </button>
            </div>
            <div className="smart-attendance-list">
              {recentAttendance.map(
                (employee) => (
                  <div
                    className="smart-attendance-row"
                    key={employee.name}
                  >
                    <div className="smart-mini-avatar">
                      {employee.name
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <div className="smart-employee-info">
                      <strong>
                        {employee.name}
                      </strong>
                      <span>
                        {employee.department}
                      </span>
                    </div>
                    <span className="smart-attendance-time">
                      {employee.time}
                    </span>
                    <span
                      className={
                        employee.status === "Late"
                          ? "smart-attendance-status late"
                          : "smart-attendance-status"
                      }
                    >
                      {employee.status}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
          {/* SECURITY */}
          <div className="smart-dashboard-card">
            <div className="smart-card-header">
              <div>
                <h2>
                  Security & Alerts
                </h2>
                <p>
                  Important system events
                </p>
              </div>
              <ShieldCheck
                size={17}
                color="#818cf8"
              />
            </div>
            <div className="smart-alerts-list">
              <AlertItem
                type="warning"
                icon={<MapPin size={16} />}
                title="Geofence Alert"
                description="3 employees outside assigned locations"
              />
              <AlertItem
                type="info"
                icon={<Camera size={16} />}
                title="Recognition Activity"
                description="42 successful face verifications today"
              />
              <AlertItem
                type="success"
                icon={<CheckCircle2 size={16} />}
                title="Attendance Sync"
                description="All attendance records synchronized"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
/* =========================================================
   SMART STAT CARD
========================================================= */
function SmartStatCard({
  title,
  value,
  description,
  icon,
  className,
}: {
  title: string;
  value: string;
  description: string;
  icon: ReactNode;
  className: string;
}) {
  return (
    <div
      className={`smart-stat-card ${className}`}
    >
      <div className="smart-stat-icon">
        {icon}
      </div>
      <div className="smart-stat-content">
        <span>
          {title}
        </span>
        <strong>
          {value}
        </strong>
        <small>
          {description}
        </small>
      </div>
    </div>
  );
}
/* =========================================================
   OPERATION CARD
========================================================= */
function OperationCard({
  icon,
  title,
  value,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="smart-operation-card">
      <div className="smart-operation-icon">
        {icon}
      </div>
      <div className="smart-operation-content">
        <span>
          {title}
        </span>
        <strong>
          {value}
        </strong>
        <small>
          {subtitle}
        </small>
      </div>
    </div>
  );
}
/* =========================================================
   STATUS LEGEND
========================================================= */
function StatusLegend({
  className,
  label,
  value,
}: {
  className: string;
  label: string;
  value: string;
}) {
  return (
    <div className="smart-status-legend-row">
      <span
        className={`smart-legend-dot ${className}`}
      />
      <span>
        {label}
      </span>
      <strong>
        {value}
      </strong>
    </div>
  );
}
/* =========================================================
   ALERT ITEM
========================================================= */
function AlertItem({
  type,
  icon,
  title,
  description,
}: {
  type: "warning" | "info" | "success";
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className={`smart-alert ${type}`}>
      <div className="smart-alert-icon">
        {icon}
      </div>
      <div className="smart-alert-content">
        <strong>
          {title}
        </strong>
        <span>
          {description}
        </span>
      </div>
    </div>
  );
}
/* =========================================================
   CHART TOOLTIP
========================================================= */
function SmartChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    name?: string;
    value?: number | string;
  }>;
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }
  return (
    <div className="smart-tooltip">
      <div className="smart-tooltip-label">
        {label}
      </div>
      {payload.map((item, index) => (
        <div
          className="smart-tooltip-row"
          key={`${item.name ?? "value"}-${index}`}
        >
          <span>
            {item.name}
          </span>
          <strong>
            {item.value}
          </strong>
        </div>
      ))}
    </div>
  );
}