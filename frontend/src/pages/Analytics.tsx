import {
  useCallback,
  useEffect,
  useState,
} from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
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
  getAttendanceStatistics,
  type AttendanceStatistics,
} from "../services/analyticsService";
const PRESENT_COLOR = "#22c55e";
const ABSENT_COLOR = "#ef4444";
export default function Analytics() {
  const [statistics, setStatistics] =
    useState<AttendanceStatistics | null>(null);
  const [loading, setLoading] =
    useState<boolean>(true);
  const [refreshing, setRefreshing] =
    useState<boolean>(false);
  const [error, setError] =
    useState<string>("");
  const loadStatistics = useCallback(
    async (isRefresh = false) => {
      try {
        setError("");
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        const data =
          await getAttendanceStatistics();
        setStatistics(data);
      } catch (err) {
        console.error(
          "Analytics API error:",
          err
        );
        setError(
          "Unable to load analytics data."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );
  useEffect(() => {
    void loadStatistics();
  }, [loadStatistics]);
  const attendancePercentage =
    Number(
      statistics?.attendance_percentage ?? 0
    );
  const safeAttendancePercentage = Math.min(
    100,
    Math.max(0, attendancePercentage)
  );
  const absentPercentage =
    Math.max(
      0,
      100 - safeAttendancePercentage
    );
  const activityData = [
    {
      name: "Attendance",
      value:
        Number(
          statistics?.total_attendance_records ?? 0
        ),
    },
    {
      name: "Check-ins",
      value:
        Number(
          statistics?.total_check_ins ?? 0
        ),
    },
    {
      name: "Check-outs",
      value:
        Number(
          statistics?.completed_check_outs ?? 0
        ),
    },
  ];
  const distributionData = [
    {
      name: "Present",
      value: safeAttendancePercentage,
    },
    {
      name: "Absent",
      value: absentPercentage,
    },
  ];
  const averageWorkingHours =
    Number(
      statistics?.average_working_hours ?? 0
    );
  return (
    <section className="page analytics-page">
      <style>{`
        .analytics-page {
          width: 100%;
        }
        .analytics-page * {
          box-sizing: border-box;
        }
        /* ============================
           HEADER
           ============================ */
        .analytics-page .page-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 24px;
        }
        .analytics-page .page-header h1 {
          margin: 5px 0 7px;
        }
        .analytics-page .page-header p {
          margin: 0;
        }
        .analytics-refresh {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 42px;
          padding: 0 16px;
          border: 1px solid rgba(148, 163, 184, 0.20);
          border-radius: 11px;
          background: rgba(30, 41, 59, 0.72);
          color: #cbd5e1;
          font-family: inherit;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition:
            transform 0.18s ease,
            border-color 0.18s ease,
            background 0.18s ease,
            color 0.18s ease;
        }
        .analytics-refresh:hover:not(:disabled) {
          transform: translateY(-1px);
          border-color: rgba(99, 102, 241, 0.55);
          background: rgba(51, 65, 85, 0.90);
          color: #ffffff;
        }
        .analytics-refresh:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        /* ============================
           ERROR
           ============================ */
        .analytics-error {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 22px;
          padding: 14px 16px;
          border: 1px solid rgba(248, 113, 113, 0.20);
          border-radius: 13px;
          background: rgba(127, 29, 29, 0.14);
          color: #fca5a5;
        }
        .analytics-error-content {
          display: flex;
          flex: 1;
          flex-direction: column;
          gap: 3px;
        }
        .analytics-error-content strong {
          color: #fecaca;
          font-size: 13px;
        }
        .analytics-error-content span {
          color: #94a3b8;
          font-size: 12px;
        }
        .analytics-error button {
          min-height: 34px;
          padding: 0 12px;
          border: 1px solid rgba(248, 113, 113, 0.25);
          border-radius: 8px;
          background: rgba(239, 68, 68, 0.10);
          color: #fca5a5;
          font-family: inherit;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
        }
        .analytics-error button:hover {
          background: rgba(239, 68, 68, 0.18);
          color: #ffffff;
        }
        /* ============================
           STAT GRID
           ============================ */
        .analytics-stat-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 22px;
        }
        .analytics-stat-card {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 13px;
          padding: 18px;
          border: 1px solid rgba(148, 163, 184, 0.14);
          border-radius: 16px;
          background:
            linear-gradient(
              145deg,
              rgba(255, 255, 255, 0.045),
              rgba(255, 255, 255, 0.015)
            );
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.10);
        }
        .analytics-stat-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          border-radius: 11px;
          background: rgba(99, 102, 241, 0.12);
          color: #a5b4fc;
        }
        .analytics-stat-content {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .analytics-stat-content span {
          color: #94a3b8;
          font-size: 11px;
          font-weight: 600;
        }
        .analytics-stat-content strong {
          color: #f8fafc;
          font-size: 22px;
          line-height: 1.15;
          font-weight: 750;
        }
        .analytics-stat-content small {
          color: #64748b;
          font-size: 10px;
        }
        .analytics-stat-card.green
          .analytics-stat-icon {
          color: #86efac;
          background: rgba(34, 197, 94, 0.11);
        }
        .analytics-stat-card.orange
          .analytics-stat-icon {
          color: #fdba74;
          background: rgba(249, 115, 22, 0.11);
        }
        .analytics-stat-card.purple
          .analytics-stat-icon {
          color: #c4b5fd;
          background: rgba(139, 92, 246, 0.11);
        }
        /* ============================
           MAIN GRID
           ============================ */
        .analytics-main-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.65fr) minmax(320px, 1fr);
          gap: 20px;
          margin-bottom: 22px;
        }
        .analytics-card {
          min-width: 0;
          border: 1px solid rgba(148, 163, 184, 0.14);
          border-radius: 17px;
          background:
            linear-gradient(
              145deg,
              rgba(255, 255, 255, 0.040),
              rgba(255, 255, 255, 0.012)
            );
          box-shadow: 0 12px 35px rgba(0, 0, 0, 0.10);
          overflow: hidden;
        }
        .analytics-card-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 15px;
          padding: 20px 20px 10px;
        }
        .analytics-card-header h2 {
          margin: 0 0 5px;
          color: #f8fafc;
          font-size: 15px;
          font-weight: 750;
        }
        .analytics-card-header p {
          margin: 0;
          color: #64748b;
          font-size: 11px;
        }
        .analytics-trend {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 9px;
          border: 1px solid rgba(34, 197, 94, 0.18);
          border-radius: 8px;
          background: rgba(34, 197, 94, 0.08);
          color: #86efac;
          font-size: 11px;
          font-weight: 700;
        }
        /* ============================
           CHART
           ============================ */
        .analytics-chart {
          width: 100%;
          height: 310px;
          padding: 8px 14px 18px 4px;
        }
        .analytics-tooltip {
          border: 1px solid rgba(148, 163, 184, 0.18);
          border-radius: 10px;
          background: rgba(15, 23, 42, 0.96);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
        }
        /* ============================
           PIE
           ============================ */
        .analytics-pie-area {
          position: relative;
          width: 100%;
          height: 270px;
        }
        .analytics-pie-center {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          pointer-events: none;
        }
        .analytics-pie-center strong {
          color: #f8fafc;
          font-size: 25px;
          line-height: 1;
          font-weight: 800;
        }
        .analytics-pie-center span {
          margin-top: 5px;
          color: #64748b;
          font-size: 11px;
        }
        .analytics-legend {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          padding: 0 20px 20px;
        }
        .analytics-legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          padding: 9px 10px;
          border: 1px solid rgba(148, 163, 184, 0.10);
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.025);
        }
        .analytics-legend-dot {
          width: 8px;
          height: 8px;
          flex: 0 0 8px;
          border-radius: 50%;
        }
        .analytics-legend-dot.present {
          background: ${PRESENT_COLOR};
        }
        .analytics-legend-dot.absent {
          background: ${ABSENT_COLOR};
        }
        .analytics-legend-item span:nth-child(2) {
          flex: 1;
          color: #94a3b8;
          font-size: 11px;
        }
        .analytics-legend-item strong {
          color: #f8fafc;
          font-size: 11px;
        }
        /* ============================
           INSIGHTS
           ============================ */
        .analytics-insights {
          margin-bottom: 22px;
        }
        .analytics-live-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 9px;
          border: 1px solid rgba(99, 102, 241, 0.18);
          border-radius: 8px;
          background: rgba(99, 102, 241, 0.08);
          color: #a5b4fc;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.07em;
        }
        .analytics-live-badge span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #818cf8;
          box-shadow: 0 0 0 4px rgba(129, 140, 248, 0.08);
        }
        .analytics-insight-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          padding: 10px 20px 20px;
        }
        .analytics-insight {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          min-width: 0;
          padding: 15px;
          border: 1px solid rgba(148, 163, 184, 0.11);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.025);
          transition:
            transform 0.18s ease,
            border-color 0.18s ease,
            background 0.18s ease;
        }
        .analytics-insight:hover {
          transform: translateY(-2px);
          border-color: rgba(99, 102, 241, 0.22);
          background: rgba(99, 102, 241, 0.035);
        }
        .analytics-insight-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          flex: 0 0 36px;
          border-radius: 9px;
          background: rgba(99, 102, 241, 0.10);
          color: #a5b4fc;
        }
        .analytics-insight-content {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }
        .analytics-insight-content span {
          color: #94a3b8;
          font-size: 10px;
          font-weight: 650;
        }
        .analytics-insight-content strong {
          color: #f8fafc;
          font-size: 18px;
          line-height: 1.2;
        }
        .analytics-insight-content small {
          color: #64748b;
          font-size: 10px;
          line-height: 1.35;
        }
        /* ============================
           EMPTY / LOADING
           ============================ */
        .analytics-loading {
          min-height: 310px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 9px;
          color: #64748b;
          font-size: 12px;
        }
        .analytics-loading strong {
          color: #cbd5e1;
          font-size: 13px;
        }
        /* ============================
           RESPONSIVE
           ============================ */
        @media (max-width: 1100px) {
          .analytics-stat-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .analytics-insight-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .analytics-main-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 700px) {
          .analytics-page .page-header {
            flex-direction: column;
          }
          .analytics-refresh {
            width: 100%;
          }
          .analytics-stat-grid {
            grid-template-columns: 1fr;
          }
          .analytics-insight-grid {
            grid-template-columns: 1fr;
            padding: 8px 14px 14px;
          }
          .analytics-card-header {
            padding: 16px 15px 8px;
          }
          .analytics-chart {
            height: 280px;
            padding-right: 8px;
          }
          .analytics-pie-area {
            height: 245px;
          }
          .analytics-legend {
            padding: 0 14px 14px;
          }
          .analytics-error {
            align-items: flex-start;
          }
          .analytics-error button {
            flex-shrink: 0;
          }
        }
        @media (max-width: 460px) {
          .analytics-stat-card {
            padding: 15px;
          }
          .analytics-legend {
            grid-template-columns: 1fr;
          }
          .analytics-error {
            flex-wrap: wrap;
          }
          .analytics-error-content {
            min-width: 150px;
          }
        }
      `}</style>
      {/* ============================
          HEADER
          ============================ */}
      <div className="page-header">
        <div>
          <span className="eyebrow">
            WORKFORCE INTELLIGENCE
          </span>
          <h1>Analytics</h1>
          <p>
            Explore attendance trends and
            workforce intelligence.
          </p>
        </div>
        <button
          type="button"
          className="analytics-refresh"
          onClick={() =>
            void loadStatistics(true)
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
      </div>
      {/* ============================
          ERROR
          ============================ */}
      {error && (
        <div className="analytics-error">
          <AlertTriangle size={18} />
          <div className="analytics-error-content">
            <strong>
              Analytics unavailable
            </strong>
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() =>
              void loadStatistics(true)
            }
            disabled={refreshing}
          >
            Retry
          </button>
        </div>
      )}
      {/* ============================
          STATISTICS
          ============================ */}
      <div className="analytics-stat-grid">
        <AnalyticsStat
          title="Attendance Records"
          value={
            loading
              ? "..."
              : String(
                  statistics
                    ?.total_attendance_records ?? 0
                )
          }
          icon={<BarChart3 size={20} />}
          className="blue"
        />
        <AnalyticsStat
          title="Present Records"
          value={
            loading
              ? "..."
              : String(
                  statistics?.present_records ?? 0
                )
          }
          icon={<CheckCircle2 size={20} />}
          className="green"
        />
        <AnalyticsStat
          title="Total Check-ins"
          value={
            loading
              ? "..."
              : String(
                  statistics?.total_check_ins ?? 0
                )
          }
          icon={<Users size={20} />}
          className="orange"
        />
        <AnalyticsStat
          title="Avg Working Hours"
          value={
            loading
              ? "..."
              : `${averageWorkingHours.toFixed(
                  2
                )} h`
          }
          icon={<Clock3 size={20} />}
          className="purple"
        />
      </div>
      {/* ============================
          CHARTS
          ============================ */}
      <div className="analytics-main-grid">
        {/* ACTIVITY CHART */}
        <div className="analytics-card">
          <div className="analytics-card-header">
            <div>
              <h2>
                Attendance Activity
              </h2>
              <p>
                Overall attendance activity
              </p>
            </div>
            <div className="analytics-trend">
              <TrendingUp size={14} />
              <span>
                {safeAttendancePercentage.toFixed(
                  1
                )}
                %
              </span>
            </div>
          </div>
          {loading ? (
            <div className="analytics-loading">
              <RefreshCw
                size={22}
                className="refresh-spinner"
              />
              <strong>
                Loading analytics...
              </strong>
              <span>
                Reading attendance statistics.
              </span>
            </div>
          ) : (
            <div className="analytics-chart">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={activityData}
                  margin={{
                    top: 10,
                    right: 10,
                    left: -15,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgba(148, 163, 184, 0.10)"
                  />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill: "#64748b",
                      fontSize: 11,
                    }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                    tick={{
                      fill: "#64748b",
                      fontSize: 11,
                    }}
                  />
                  <Tooltip
                    cursor={{
                      fill: "rgba(99, 102, 241, 0.05)",
                    }}
                    contentStyle={{
                      background:
                        "rgba(15, 23, 42, 0.96)",
                      border:
                        "1px solid rgba(148, 163, 184, 0.18)",
                      borderRadius: "10px",
                      color: "#f8fafc",
                    }}
                  />
                  <Bar
                    dataKey="value"
                    fill="#6366f1"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={55}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        {/* DISTRIBUTION */}
        <div className="analytics-card">
          <div className="analytics-card-header">
            <div>
              <h2>
                Attendance Distribution
              </h2>
              <p>
                Present vs absent records
              </p>
            </div>
          </div>
          <div className="analytics-pie-area">
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <PieChart>
                <Pie
                  data={distributionData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={62}
                  outerRadius={88}
                  paddingAngle={3}
                  stroke="none"
                >
                  <Cell
                    fill={PRESENT_COLOR}
                  />
                  <Cell
                    fill={ABSENT_COLOR}
                  />
                </Pie>
                <Tooltip
                  contentStyle={{
                    background:
                      "rgba(15, 23, 42, 0.96)",
                    border:
                      "1px solid rgba(148, 163, 184, 0.18)",
                    borderRadius: "10px",
                    color: "#f8fafc",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="analytics-pie-center">
              <strong>
                {loading
                  ? "..."
                  : `${safeAttendancePercentage.toFixed(
                      1
                    )}%`}
              </strong>
              <span>
                Present
              </span>
            </div>
          </div>
          <div className="analytics-legend">
            <div className="analytics-legend-item">
              <span className="analytics-legend-dot present" />
              <span>
                Present
              </span>
              <strong>
                {loading
                  ? "..."
                  : `${safeAttendancePercentage.toFixed(
                      1
                    )}%`}
              </strong>
            </div>
            <div className="analytics-legend-item">
              <span className="analytics-legend-dot absent" />
              <span>
                Absent
              </span>
              <strong>
                {loading
                  ? "..."
                  : `${absentPercentage.toFixed(
                      1
                    )}%`}
              </strong>
            </div>
          </div>
        </div>
      </div>
      {/* ============================
          WORKFORCE INSIGHTS
          ============================ */}
      <div className="analytics-card analytics-insights">
        <div className="analytics-card-header">
          <div>
            <h2>
              Workforce Insights
            </h2>
            <p>
              Key performance indicators from
              attendance data
            </p>
          </div>
          <div className="analytics-live-badge">
            <span />
            ANALYTICS
          </div>
        </div>
        <div className="analytics-insight-grid">
          <InsightCard
            icon={<Activity size={18} />}
            title="Attendance Rate"
            value={
              loading
                ? "..."
                : `${safeAttendancePercentage.toFixed(
                    1
                  )}%`
            }
            subtitle="Overall attendance performance"
          />
          <InsightCard
            icon={<CheckCircle2 size={18} />}
            title="Completed Check-outs"
            value={
              loading
                ? "..."
                : String(
                    statistics
                      ?.completed_check_outs ?? 0
                  )
            }
            subtitle="Employees who checked out"
          />
          <InsightCard
            icon={<Users size={18} />}
            title="Check-in Activity"
            value={
              loading
                ? "..."
                : String(
                    statistics?.total_check_ins ?? 0
                  )
            }
            subtitle="Recorded check-ins"
          />
          <InsightCard
            icon={<Clock3 size={18} />}
            title="Working Hours"
            value={
              loading
                ? "..."
                : `${averageWorkingHours.toFixed(
                    2
                  )} h`
            }
            subtitle="Average working duration"
          />
        </div>
      </div>
    </section>
  );
}
/* =========================================================
   STAT CARD
   ========================================================= */
function AnalyticsStat({
  title,
  value,
  icon,
  className,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  className: string;
}) {
  return (
    <div
      className={`analytics-stat-card ${className}`}
    >
      <div className="analytics-stat-icon">
        {icon}
      </div>
      <div className="analytics-stat-content">
        <span>{title}</span>
        <strong>{value}</strong>
        <small>
          PostgreSQL analytics
        </small>
      </div>
    </div>
  );
}
/* =========================================================
   INSIGHT CARD
   ========================================================= */
function InsightCard({
  icon,
  title,
  value,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="analytics-insight">
      <div className="analytics-insight-icon">
        {icon}
      </div>
      <div className="analytics-insight-content">
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{subtitle}</small>
      </div>
    </div>
  );
}