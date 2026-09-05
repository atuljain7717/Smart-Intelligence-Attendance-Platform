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
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FileBarChart,
  FileText,
  MapPin,
  Printer,
  RefreshCw,
  Search,
  Timer,
  TrendingUp,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";

import {
  getAttendanceReport,
  type AttendanceReportRecord,
} from "../services/reportService";

export default function Reports() {
  const [records, setRecords] = useState<
    AttendanceReportRecord[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [selectedDate, setSelectedDate] =
    useState(() => getTodayDate());

  const [statusFilter, setStatusFilter] =
    useState("");

  const [search, setSearch] = useState("");

  const [locationFilter, setLocationFilter] =
    useState("");

  /* =========================================================
     LOAD REPORT
     ========================================================= */

  const loadReport = useCallback(
    async (refresh = false) => {
      try {
        setError("");

        if (refresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const response =
          await getAttendanceReport({
            report_date: selectedDate,
            status:
              statusFilter || undefined,
          });

        setRecords(
          Array.isArray(response.records)
            ? response.records
            : []
        );
      } catch (err: unknown) {
        console.error(
          "Reports API error:",
          err
        );

        setRecords([]);

        setError(
          getErrorMessage(
            err,
            "Unable to load attendance report."
          )
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedDate, statusFilter]
  );

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  /* =========================================================
     LOCATIONS
     ========================================================= */

  const locations = useMemo(() => {
    const values = records
      .map((record) =>
        String(
          record.location_name ?? ""
        ).trim()
      )
      .filter(Boolean);

    return Array.from(
      new Set(values)
    ).sort();
  }, [records]);

  /* =========================================================
     FILTERED RECORDS
     ========================================================= */

  const filteredRecords = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return records.filter((record) => {
      const userName = String(
        record.user_name ?? ""
      ).toLowerCase();

      const email = String(
        record.email ?? ""
      ).toLowerCase();

      const userId = String(
        record.user_id ?? ""
      );

      const location = String(
        record.location_name ?? ""
      ).trim();

      const matchesSearch =
        !query ||
        userName.includes(query) ||
        email.includes(query) ||
        userId.includes(query);

      const matchesLocation =
        !locationFilter ||
        location === locationFilter;

      return (
        matchesSearch &&
        matchesLocation
      );
    });
  }, [
    records,
    search,
    locationFilter,
  ]);

  /* =========================================================
     KPI DATA
     ========================================================= */

  const totalRecords =
    filteredRecords.length;

  const presentCount =
    filteredRecords.filter(
      (record) =>
        String(
          record.status ?? ""
        ).toLowerCase() === "present"
    ).length;

  const lateCount =
    filteredRecords.filter(
      (record) =>
        String(
          record.status ?? ""
        ).toLowerCase() === "late"
    ).length;

  const absentCount =
    filteredRecords.filter(
      (record) =>
        String(
          record.status ?? ""
        ).toLowerCase() === "absent"
    ).length;

  const checkedOutCount =
    filteredRecords.filter(
      (record) =>
        record.check_out !== null &&
        record.check_out !== undefined &&
        String(record.check_out).trim() !== ""
    ).length;

  const totalWorkingHours =
    filteredRecords.reduce(
      (total, record) => {
        const hours = Number(
          record.working_hours ?? 0
        );

        return (
          total +
          (Number.isFinite(hours)
            ? hours
            : 0)
        );
      },
      0
    );

  const averageWorkingHours =
    totalRecords > 0
      ? totalWorkingHours / totalRecords
      : 0;

  const attendanceRate =
    totalRecords > 0
      ? ((presentCount + lateCount) /
          totalRecords) *
        100
      : 0;

  const uniqueEmployees = useMemo(() => {
    return new Set(
      filteredRecords.map((record) =>
        String(record.user_id)
      )
    ).size;
  }, [filteredRecords]);

  /* =========================================================
     EMPLOYEE SUMMARY
     ========================================================= */

  const employeeSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        email: string;
        records: number;
        present: number;
        late: number;
        totalHours: number;
      }
    >();

    filteredRecords.forEach((record) => {
      const id = String(
        record.user_id
      );

      const status = String(
        record.status ?? ""
      ).toLowerCase();

      const hours = Number(
        record.working_hours ?? 0
      );

      const existing = map.get(id);

      if (existing) {
        existing.records += 1;

        if (status === "present") {
          existing.present += 1;
        }

        if (status === "late") {
          existing.late += 1;
        }

        if (Number.isFinite(hours)) {
          existing.totalHours += hours;
        }

        return;
      }

      map.set(id, {
        id,
        name: String(
          record.user_name ??
            "Unknown Employee"
        ),
        email: String(
          record.email ?? "No email"
        ),
        records: 1,
        present:
          status === "present"
            ? 1
            : 0,
        late:
          status === "late"
            ? 1
            : 0,
        totalHours:
          Number.isFinite(hours)
            ? hours
            : 0,
      });
    });

    return Array.from(map.values())
      .map((employee) => ({
        ...employee,

        attendanceRate:
          employee.records > 0
            ? ((employee.present +
                employee.late) /
                employee.records) *
              100
            : 0,

        averageHours:
          employee.records > 0
            ? employee.totalHours /
              employee.records
            : 0,
      }))
      .sort(
        (a, b) =>
          b.attendanceRate -
          a.attendanceRate
      );
  }, [filteredRecords]);

  /* =========================================================
     LOCATION SUMMARY
     ========================================================= */

  const locationSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        count: number;
        present: number;
        late: number;
      }
    >();

    filteredRecords.forEach((record) => {
      const location =
        String(
          record.location_name ?? ""
        ).trim() || "Unassigned";

      const status = String(
        record.status ?? ""
      ).toLowerCase();

      const existing =
        map.get(location);

      if (existing) {
        existing.count += 1;

        if (status === "present") {
          existing.present += 1;
        }

        if (status === "late") {
          existing.late += 1;
        }

        return;
      }

      map.set(location, {
        name: location,
        count: 1,
        present:
          status === "present"
            ? 1
            : 0,
        late:
          status === "late"
            ? 1
            : 0,
      });
    });

    return Array.from(map.values()).sort(
      (a, b) => b.count - a.count
    );
  }, [filteredRecords]);

  /* =========================================================
     EXPORT CSV
     ========================================================= */

  const exportCSV = () => {
    if (
      filteredRecords.length === 0
    ) {
      return;
    }

    const headers = [
      "Employee ID",
      "Employee Name",
      "Email",
      "Date",
      "Check In",
      "Check Out",
      "Status",
      "Location",
      "Working Hours",
    ];

    const rows =
      filteredRecords.map(
        (record) => [
          record.user_id,
          record.user_name,
          record.email,
          record.attendance_data,
          record.check_in ?? "",
          record.check_out ?? "",
          record.status ?? "",
          record.location_name ?? "",
          record.working_hours ?? "",
        ]
      );

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(
                value ?? ""
              ).replace(
                /"/g,
                '""'
              )}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob(
      [csv],
      {
        type: "text/csv;charset=utf-8;",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const link =
      document.createElement("a");

    link.href = url;

    link.download =
      `smart-attendance-report-${selectedDate}.csv`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  /* =========================================================
     PRINT
     ========================================================= */

  const printReport = () => {
    window.print();
  };

  /* =========================================================
     PAGE
     ========================================================= */

  return (
    <section className="page reports-page">
      <style>{`

        /* =====================================================
           SMART ATTENDANCE INTELLIGENCE
           REPORTS & ANALYTICS
           ===================================================== */

        .reports-page {
          width: 100%;
          padding-bottom: 40px;
        }

        /* HEADER */

        .reports-page .reports-header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 24px;
        }

        .reports-page .reports-heading {
          min-width: 0;
        }

        .reports-page .reports-heading .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 7px;
        }

        .reports-page .reports-heading h1 {
          margin: 0;
          font-size: clamp(
            28px,
            3vw,
            38px
          );
          font-weight: 800;
          letter-spacing: -0.04em;
        }

        .reports-page .reports-heading p {
          margin: 8px 0 0;
          color: #64748b;
          font-size: 13px;
        }

        .reports-page .reports-actions {
          display: flex;
          align-items: center;
          gap: 9px;
          flex-wrap: wrap;
        }

        .reports-page .report-action {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 0 14px;
          border-radius: 11px;
          border: 1px solid
            rgba(
              148,
              163,
              184,
              0.16
            );
          background:
            rgba(
              15,
              23,
              42,
              0.72
            );
          color: #cbd5e1;
          font-family: inherit;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition:
            transform 0.18s ease,
            border-color 0.18s ease,
            background 0.18s ease;
        }

        .reports-page
          .report-action:hover:not(:disabled) {
          transform:
            translateY(-1px);
          border-color:
            rgba(
              99,
              102,
              241,
              0.42
            );
          background:
            rgba(
              30,
              41,
              59,
              0.95
            );
          color: #ffffff;
        }

        .reports-page
          .report-action.primary {
          border-color:
            rgba(
              99,
              102,
              241,
              0.45
            );
          background:
            linear-gradient(
              135deg,
              #6366f1,
              #4f46e5
            );
          color: white;
          box-shadow:
            0 8px 22px
              rgba(
                79,
                70,
                229,
                0.2
              );
        }

        .reports-page
          .report-action:disabled {
          opacity: 0.45;
          cursor: not-allowed;
        }

        /* ERROR */

        .reports-page .reports-error {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          margin-bottom: 20px;
          border:
            1px solid
            rgba(
              239,
              68,
              68,
              0.18
            );
          border-radius: 14px;
          background:
            rgba(
              127,
              29,
              29,
              0.12
            );
          color: #fca5a5;
        }

        .reports-page
          .reports-error-content {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .reports-page
          .reports-error-content
          strong {
          color: #fecaca;
          font-size: 12px;
        }

        .reports-page
          .reports-error-content
          span {
          color: #f87171;
          font-size: 11px;
        }

        .reports-page
          .reports-error button {
          border: 0;
          background: transparent;
          color: #fca5a5;
          font-family: inherit;
          font-weight: 700;
          cursor: pointer;
        }

        /* FILTER BAR */

        .reports-page
          .smart-filter-bar {
          display: grid;
          grid-template-columns:
            minmax(170px, 0.7fr)
            minmax(160px, 0.65fr)
            minmax(160px, 0.65fr)
            minmax(230px, 1fr);
          gap: 12px;
          padding: 14px;
          margin-bottom: 20px;
          border:
            1px solid
            rgba(
              148,
              163,
              184,
              0.13
            );
          border-radius: 16px;
          background:
            linear-gradient(
              145deg,
              rgba(
                30,
                41,
                59,
                0.66
              ),
              rgba(
                15,
                23,
                42,
                0.58
              )
            );
          box-shadow:
            0 16px 40px
              rgba(
                0,
                0,
                0,
                0.12
              );
        }

        .reports-page .filter-item {
          min-width: 0;
        }

        .reports-page
          .filter-item label {
          display: flex;
          align-items: center;
          gap: 6px;
          margin:
            0 0 6px 2px;
          color: #64748b;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .reports-page
          .filter-item label svg {
          color: #818cf8;
        }

        .reports-page
          .filter-item input,
        .reports-page
          .filter-item select {
          width: 100%;
          height: 43px;
          box-sizing: border-box;
          padding: 0 12px;
          border:
            1px solid
            rgba(
              148,
              163,
              184,
              0.15
            );
          border-radius: 10px;
          outline: none;
          background:
            rgba(
              2,
              6,
              23,
              0.48
            );
          color: #e2e8f0;
          font-family: inherit;
          font-size: 12px;
          transition:
            border-color 0.18s ease,
            box-shadow 0.18s ease;
        }

        .reports-page
          .filter-item
          input::placeholder {
          color: #475569;
        }

        .reports-page
          .filter-item
          input:focus,
        .reports-page
          .filter-item
          select:focus {
          border-color:
            rgba(
              99,
              102,
              241,
              0.65
            );
          box-shadow:
            0 0 0 3px
              rgba(
                99,
                102,
                241,
                0.08
              );
        }

        .reports-page
          .filter-item
          input[type="date"] {
          color-scheme: dark;
          cursor: pointer;
        }

        .reports-page
          .filter-item
          select {
          color-scheme: dark;
          cursor: pointer;
        }

        .reports-page
          .filter-item
          option {
          background: #0f172a;
          color: #e2e8f0;
        }

        /* SUMMARY */

        .reports-page
          .intelligence-summary {
          display: grid;
          grid-template-columns:
            minmax(0, 1.25fr)
            minmax(0, 0.75fr);
          gap: 16px;
          margin-bottom: 18px;
        }

        .reports-page .summary-main {
          position: relative;
          overflow: hidden;
          min-height: 178px;
          padding: 22px;
          border:
            1px solid
            rgba(
              99,
              102,
              241,
              0.18
            );
          border-radius: 18px;
          background:
            radial-gradient(
              circle at 85% 15%,
              rgba(
                99,
                102,
                241,
                0.18
              ),
              transparent 35%
            ),
            linear-gradient(
              135deg,
              rgba(
                30,
                41,
                59,
                0.82
              ),
              rgba(
                15,
                23,
                42,
                0.72
              )
            );
          box-shadow:
            0 20px 50px
              rgba(
                0,
                0,
                0,
                0.16
              );
        }

        .reports-page
          .summary-label {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #818cf8;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .reports-page
          .summary-main h2 {
          margin:
            12px 0 5px;
          color: #f8fafc;
          font-size: 28px;
          letter-spacing: -0.035em;
        }

        .reports-page
          .summary-main p {
          margin: 0;
          max-width: 600px;
          color: #64748b;
          font-size: 11px;
          line-height: 1.6;
        }

        .reports-page
          .summary-metrics {
          display: flex;
          align-items: center;
          gap: 22px;
          margin-top: 19px;
        }

        .reports-page
          .summary-metric {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .reports-page
          .summary-metric span {
          color: #64748b;
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          font-weight: 700;
        }

        .reports-page
          .summary-metric strong {
          color: #f1f5f9;
          font-size: 16px;
        }

        .reports-page .summary-health {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 20px;
          border:
            1px solid
            rgba(
              148,
              163,
              184,
              0.13
            );
          border-radius: 18px;
          background:
            linear-gradient(
              145deg,
              rgba(
                255,
                255,
                255,
                0.035
              ),
              rgba(
                255,
                255,
                255,
                0.01
              )
            );
        }

        .reports-page .health-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .reports-page .health-title {
          color: #94a3b8;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.09em;
          text-transform: uppercase;
        }

        .reports-page .health-icon {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          background:
            rgba(
              34,
              197,
              94,
              0.1
            );
          color: #4ade80;
        }

        .reports-page
          .health-value {
          margin-top: 8px;
          color: #f8fafc;
          font-size: 31px;
          font-weight: 800;
          letter-spacing: -0.04em;
        }

        .reports-page
          .health-track {
          width: 100%;
          height: 6px;
          overflow: hidden;
          margin-top: 11px;
          border-radius: 20px;
          background:
            rgba(
              148,
              163,
              184,
              0.09
            );
        }

        .reports-page
          .health-fill {
          height: 100%;
          border-radius: inherit;
          background:
            linear-gradient(
              90deg,
              #4ade80,
              #22c55e
            );
          transition:
            width 0.4s ease;
        }

        .reports-page
          .health-description {
          margin-top: 8px;
          color: #64748b;
          font-size: 10px;
        }

        /* KPI */

        .reports-page .report-kpis {
          display: grid;
          grid-template-columns:
            repeat(
              5,
              minmax(0, 1fr)
            );
          gap: 12px;
          margin-bottom: 18px;
        }

        .reports-page .report-kpi {
          min-width: 0;
          padding: 17px;
          border:
            1px solid
            rgba(
              148,
              163,
              184,
              0.12
            );
          border-radius: 15px;
          background:
            linear-gradient(
              145deg,
              rgba(
                30,
                41,
                59,
                0.65
              ),
              rgba(
                15,
                23,
                42,
                0.58
              )
            );
          transition:
            transform 0.18s ease,
            border-color 0.18s ease;
        }

        .reports-page
          .report-kpi:hover {
          transform:
            translateY(-2px);
          border-color:
            rgba(
              148,
              163,
              184,
              0.22
            );
        }

        .reports-page .kpi-top {
          display: flex;
          justify-content: space-between;
        }

        .reports-page .kpi-icon {
          width: 31px;
          height: 31px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
        }

        .reports-page
          .kpi-icon.indigo {
          background:
            rgba(
              99,
              102,
              241,
              0.12
            );
          color: #818cf8;
        }

        .reports-page
          .kpi-icon.green {
          background:
            rgba(
              34,
              197,
              94,
              0.1
            );
          color: #4ade80;
        }

        .reports-page
          .kpi-icon.orange {
          background:
            rgba(
              245,
              158,
              11,
              0.1
            );
          color: #fbbf24;
        }

        .reports-page
          .kpi-icon.red {
          background:
            rgba(
              239,
              68,
              68,
              0.1
            );
          color: #f87171;
        }

        .reports-page
          .kpi-icon.blue {
          background:
            rgba(
              59,
              130,
              246,
              0.1
            );
          color: #60a5fa;
        }

        .reports-page .kpi-label {
          margin-top: 13px;
          color: #64748b;
          font-size: 10px;
          font-weight: 700;
        }

        .reports-page .kpi-value {
          margin-top: 3px;
          color: #f8fafc;
          font-size: 22px;
          font-weight: 800;
        }

        .reports-page .kpi-sub {
          margin-top: 4px;
          color: #475569;
          font-size: 9px;
        }

        /* ANALYTICS */

        .reports-page
          .analytics-grid {
          display: grid;
          grid-template-columns:
            minmax(0, 1.4fr)
            minmax(300px, 0.6fr);
          gap: 16px;
          margin-bottom: 18px;
        }

        .reports-page
          .analytics-card {
          min-width: 0;
          overflow: hidden;
          border:
            1px solid
            rgba(
              148,
              163,
              184,
              0.12
            );
          border-radius: 17px;
          background:
            linear-gradient(
              145deg,
              rgba(
                30,
                41,
                59,
                0.58
              ),
              rgba(
                15,
                23,
                42,
                0.55
              )
            );
        }

        .reports-page
          .analytics-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 17px 18px;
          border-bottom:
            1px solid
            rgba(
              148,
              163,
              184,
              0.08
            );
        }

        .reports-page
          .analytics-card-title {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .reports-page
          .analytics-card-title-icon {
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background:
            rgba(
              99,
              102,
              241,
              0.1
            );
          color: #818cf8;
        }

        .reports-page
          .analytics-card-title h3 {
          margin: 0;
          color: #e2e8f0;
          font-size: 12px;
        }

        .reports-page
          .analytics-card-title p {
          margin:
            3px 0 0;
          color: #475569;
          font-size: 9px;
        }

        /* STATUS */

        .reports-page
          .status-visual {
          padding: 21px;
        }

        .reports-page
          .status-row {
          display: grid;
          grid-template-columns:
            75px 1fr 50px;
          align-items: center;
          gap: 10px;
          margin-bottom: 15px;
        }

        .reports-page
          .status-row:last-child {
          margin-bottom: 0;
        }

        .reports-page
          .status-name {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #94a3b8;
          font-size: 10px;
          font-weight: 650;
        }

        .reports-page
          .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }

        .reports-page
          .status-dot.present {
          background: #4ade80;
        }

        .reports-page
          .status-dot.late {
          background: #fbbf24;
        }

        .reports-page
          .status-dot.absent {
          background: #f87171;
        }

        .reports-page
          .status-track {
          height: 7px;
          overflow: hidden;
          border-radius: 10px;
          background:
            rgba(
              148,
              163,
              184,
              0.08
            );
        }

        .reports-page
          .status-fill {
          height: 100%;
          min-width: 2px;
          border-radius: inherit;
        }

        .reports-page
          .status-fill.present {
          background: #4ade80;
        }

        .reports-page
          .status-fill.late {
          background: #fbbf24;
        }

        .reports-page
          .status-fill.absent {
          background: #f87171;
        }

        .reports-page
          .status-number {
          color: #cbd5e1;
          font-size: 10px;
          font-weight: 800;
          text-align: right;
        }

        /* LOCATIONS */

        .reports-page
          .location-list {
          padding:
            8px 18px 17px;
        }

        .reports-page
          .location-item {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            auto;
          gap: 12px;
          align-items: center;
          padding: 11px 0;
          border-bottom:
            1px solid
            rgba(
              148,
              163,
              184,
              0.07
            );
        }

        .reports-page
          .location-item:last-child {
          border-bottom: 0;
        }

        .reports-page
          .location-name {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .reports-page
          .location-pin {
          width: 27px;
          height: 27px;
          flex: 0 0 27px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background:
            rgba(
              59,
              130,
              246,
              0.1
            );
          color: #60a5fa;
        }

        .reports-page
          .location-name strong {
          overflow: hidden;
          color: #cbd5e1;
          font-size: 10px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .reports-page
          .location-name span {
          display: block;
          margin-top: 2px;
          color: #475569;
          font-size: 8px;
        }

        .reports-page
          .location-count {
          color: #f1f5f9;
          font-size: 11px;
          font-weight: 800;
        }

        /* SECTION */

        .reports-page
          .employee-card,
        .reports-page
          .attendance-card {
          overflow: hidden;
          margin-bottom: 18px;
          border:
            1px solid
            rgba(
              148,
              163,
              184,
              0.12
            );
          border-radius: 17px;
          background:
            linear-gradient(
              145deg,
              rgba(
                30,
                41,
                59,
                0.58
              ),
              rgba(
                15,
                23,
                42,
                0.55
              )
            );
        }

        .reports-page
          .attendance-card {
          margin-bottom: 0;
        }

        .reports-page
          .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          padding: 17px 18px;
          border-bottom:
            1px solid
            rgba(
              148,
              163,
              184,
              0.08
            );
        }

        .reports-page
          .section-header-left {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .reports-page
          .section-header-icon {
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background:
            rgba(
              99,
              102,
              241,
              0.1
            );
          color: #818cf8;
        }

        .reports-page
          .section-header h2 {
          margin: 0;
          color: #e2e8f0;
          font-size: 12px;
        }

        .reports-page
          .section-header p {
          margin:
            3px 0 0;
          color: #475569;
          font-size: 9px;
        }

        .reports-page
          .section-badge {
          padding: 5px 8px;
          border:
            1px solid
            rgba(
              99,
              102,
              241,
              0.15
            );
          border-radius: 7px;
          background:
            rgba(
              99,
              102,
              241,
              0.07
            );
          color: #818cf8;
          font-size: 9px;
          font-weight: 750;
          white-space: nowrap;
        }

        /* EMPLOYEE TABLE */

        .reports-page
          .employee-table-wrap,
        .reports-page
          .attendance-table-wrap {
          width: 100%;
          overflow-x: auto;
        }

        .reports-page
          .employee-table {
          width: 100%;
          min-width: 780px;
          border-collapse: collapse;
        }

        .reports-page
          .employee-table th,
        .reports-page
          .attendance-table th {
          padding: 11px 17px;
          background:
            rgba(
              2,
              6,
              23,
              0.25
            );
          color: #475569;
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-align: left;
          text-transform: uppercase;
        }

        .reports-page
          .employee-table td,
        .reports-page
          .attendance-table td {
          padding: 13px 17px;
          border-top:
            1px solid
            rgba(
              148,
              163,
              184,
              0.06
            );
          color: #94a3b8;
          font-size: 10px;
        }

        .reports-page
          .employee-table tbody tr:hover,
        .reports-page
          .attendance-table tbody tr:hover {
          background:
            rgba(
              99,
              102,
              241,
              0.035
            );
        }

        .reports-page
          .employee-cell {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .reports-page
          .employee-avatar {
          width: 32px;
          height: 32px;
          flex: 0 0 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 9px;
          background:
            linear-gradient(
              135deg,
              #6366f1,
              #2563eb
            );
          color: white;
          font-size: 10px;
          font-weight: 800;
        }

        .reports-page
          .employee-details {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .reports-page
          .employee-details strong {
          overflow: hidden;
          max-width: 210px;
          color: #e2e8f0;
          font-size: 10px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .reports-page
          .employee-details span {
          overflow: hidden;
          max-width: 210px;
          color: #475569;
          font-size: 8px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* PROGRESS */

        .reports-page
          .progress-cell {
          min-width: 120px;
        }

        .reports-page
          .progress-top {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
        }

        .reports-page
          .progress-top span {
          color: #cbd5e1;
          font-size: 9px;
          font-weight: 750;
        }

        .reports-page
          .progress-bar {
          width: 100%;
          height: 5px;
          overflow: hidden;
          border-radius: 20px;
          background:
            rgba(
              148,
              163,
              184,
              0.08
            );
        }

        .reports-page
          .progress-bar div {
          height: 100%;
          border-radius: inherit;
          background:
            linear-gradient(
              90deg,
              #6366f1,
              #818cf8
            );
        }

        /* STATUS BADGES */

        .reports-page
          .mini-status,
        .reports-page
          .status-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 7px;
          font-weight: 800;
        }

        .reports-page
          .mini-status {
          min-width: 44px;
          padding: 4px 7px;
          font-size: 8px;
        }

        .reports-page
          .mini-status.good {
          background:
            rgba(
              34,
              197,
              94,
              0.09
            );
          color: #86efac;
        }

        .reports-page
          .mini-status.warning {
          background:
            rgba(
              245,
              158,
              11,
              0.09
            );
          color: #fcd34d;
        }

        .reports-page
          .status-badge {
          min-width: 58px;
          padding: 5px 8px;
          font-size: 8px;
        }

        .reports-page
          .status-badge.present {
          border:
            1px solid
            rgba(
              34,
              197,
              94,
              0.16
            );
          background:
            rgba(
              34,
              197,
              94,
              0.08
            );
          color: #86efac;
        }

        .reports-page
          .status-badge.late {
          border:
            1px solid
            rgba(
              245,
              158,
              11,
              0.16
            );
          background:
            rgba(
              245,
              158,
              11,
              0.08
            );
          color: #fcd34d;
        }

        .reports-page
          .status-badge.absent {
          border:
            1px solid
            rgba(
              239,
              68,
              68,
              0.16
            );
          background:
            rgba(
              239,
              68,
              68,
              0.08
            );
          color: #fca5a5;
        }

        /* EMPTY */

        .reports-page
          .empty-state {
          min-height: 220px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 30px;
          text-align: center;
          color: #475569;
        }

        .reports-page
          .empty-state svg {
          color: #334155;
        }

        .reports-page
          .empty-state strong {
          color: #94a3b8;
          font-size: 12px;
        }

        .reports-page
          .empty-state span {
          color: #475569;
          font-size: 9px;
        }

        /* SPINNER */

        .reports-page .spin {
          animation:
            reportsSpin
            0.9s
            linear
            infinite;
        }

        @keyframes reportsSpin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        /* PRINT */

        @media print {
          body {
            background: white !important;
          }

          .reports-page {
            color: #111827 !important;
          }

          .reports-page
            .reports-actions,
          .reports-page
            .smart-filter-bar,
          .reports-page
            .reports-error {
            display: none !important;
          }

          .reports-page
            .summary-main,
          .reports-page
            .summary-health,
          .reports-page
            .report-kpi,
          .reports-page
            .analytics-card,
          .reports-page
            .employee-card,
          .reports-page
            .attendance-card {
            background: white !important;
            box-shadow: none !important;
            border-color: #d1d5db !important;
          }

          .reports-page * {
            color: #111827 !important;
          }
        }

        /* RESPONSIVE */

        @media (max-width: 1200px) {
          .reports-page
            .report-kpis {
            grid-template-columns:
              repeat(
                3,
                minmax(0, 1fr)
              );
          }

          .reports-page
            .smart-filter-bar {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );
          }
        }

        @media (max-width: 900px) {
          .reports-page
            .reports-header {
            align-items: flex-start;
            flex-direction: column;
          }

          .reports-page
            .intelligence-summary,
          .reports-page
            .analytics-grid {
            grid-template-columns: 1fr;
          }

          .reports-page
            .report-kpis {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              );
          }
        }

        @media (max-width: 600px) {
          .reports-page
            .smart-filter-bar {
            grid-template-columns: 1fr;
          }

          .reports-page
            .reports-actions {
            width: 100%;
          }

          .reports-page
            .report-action {
            flex: 1;
          }

          .reports-page
            .report-kpis {
            grid-template-columns:
              1fr 1fr;
            gap: 9px;
          }

          .reports-page
            .report-kpi {
            padding: 13px;
          }

          .reports-page
            .summary-main,
          .reports-page
            .summary-health {
            padding: 17px;
          }
        }

        @media (max-width: 420px) {
          .reports-page
            .report-kpis {
            grid-template-columns: 1fr;
          }

          .reports-page
            .reports-actions {
            flex-direction: column;
          }

          .reports-page
            .report-action {
            width: 100%;
          }
        }
      `}</style>

      {/* =====================================================
          HEADER
          ===================================================== */}

      <div className="reports-header">
        <div className="reports-heading">
          <span className="eyebrow">
            <Activity size={13} />
            ATTENDANCE INTELLIGENCE
          </span>

          <h1>
            Reports & Analytics
          </h1>

          <p>
            Workforce attendance
            intelligence, performance
            metrics and operational
            insights.
          </p>
        </div>

        <div className="reports-actions">
          <button
            type="button"
            className="report-action"
            onClick={() =>
              void loadReport(true)
            }
            disabled={refreshing}
          >
            <RefreshCw
              size={15}
              className={
                refreshing
                  ? "spin"
                  : undefined
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>

          <button
            type="button"
            className="report-action"
            onClick={printReport}
            disabled={loading}
          >
            <Printer size={15} />
            Print
          </button>

          <button
            type="button"
            className="report-action primary"
            onClick={exportCSV}
            disabled={
              loading ||
              filteredRecords.length ===
                0
            }
          >
            <Download size={15} />
            Export CSV
          </button>
        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div className="reports-error">
          <AlertTriangle size={18} />

          <div className="reports-error-content">
            <strong>
              Report data unavailable
            </strong>

            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={() =>
              void loadReport(true)
            }
          >
            Retry
          </button>
        </div>
      )}

      {/* FILTER BAR */}

      <div className="smart-filter-bar">
        <div className="filter-item">
          <label>
            <CalendarDays size={12} />
            Report Date
          </label>

          <input
            type="date"
            value={selectedDate}
            onChange={(event) =>
              setSelectedDate(
                event.target.value
              )
            }
          />
        </div>

        <div className="filter-item">
          <label>
            <CheckCircle2 size={12} />
            Status
          </label>

          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value
              )
            }
          >
            <option value="">
              All statuses
            </option>

            <option value="Present">
              Present
            </option>

            <option value="Late">
              Late
            </option>

            <option value="Absent">
              Absent
            </option>
          </select>
        </div>

        <div className="filter-item">
          <label>
            <MapPin size={12} />
            Location
          </label>

          <select
            value={locationFilter}
            onChange={(event) =>
              setLocationFilter(
                event.target.value
              )
            }
          >
            <option value="">
              All locations
            </option>

            {locations.map(
              (location) => (
                <option
                  key={location}
                  value={location}
                >
                  {location}
                </option>
              )
            )}
          </select>
        </div>

        <div className="filter-item">
          <label>
            <Search size={12} />
            Employee Search
          </label>

          <input
            type="search"
            value={search}
            placeholder="Search name, email or employee ID..."
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />
        </div>
      </div>

      {/* INTELLIGENCE SUMMARY */}

      <div className="intelligence-summary">
        <div className="summary-main">
          <div className="summary-label">
            <FileBarChart size={13} />
            Daily Intelligence Report
          </div>

          <h2>
            {formatReadableDate(
              selectedDate
            )}
          </h2>

          <p>
            Attendance activity and
            workforce performance
            captured by the Smart
            Attendance Intelligence
            Platform.
          </p>

          <div className="summary-metrics">
            <div className="summary-metric">
              <span>
                Employees
              </span>

              <strong>
                {loading
                  ? "..."
                  : uniqueEmployees}
              </strong>
            </div>

            <div className="summary-metric">
              <span>
                Checked Out
              </span>

              <strong>
                {loading
                  ? "..."
                  : checkedOutCount}
              </strong>
            </div>

            <div className="summary-metric">
              <span>
                Avg. Hours
              </span>

              <strong>
                {loading
                  ? "..."
                  : `${averageWorkingHours.toFixed(
                      1
                    )}h`}
              </strong>
            </div>
          </div>
        </div>

        <div className="summary-health">
          <div className="health-top">
            <span className="health-title">
              Attendance Health
            </span>

            <div className="health-icon">
              <TrendingUp size={17} />
            </div>
          </div>

          <div className="health-value">
            {loading
              ? "..."
              : `${attendanceRate.toFixed(
                  1
                )}%`}
          </div>

          <div className="health-track">
            <div
              className="health-fill"
              style={{
                width: `${Math.min(
                  100,
                  Math.max(
                    0,
                    attendanceRate
                  )
                )}%`,
              }}
            />
          </div>

          <div className="health-description">
            Present + late attendance
            activity for the selected
            report.
          </div>
        </div>
      </div>

      {/* KPI CARDS */}

      <div className="report-kpis">
        <ReportKpi
          icon={
            <FileText size={16} />
          }
          iconClass="indigo"
          label="Attendance Records"
          value={
            loading
              ? "..."
              : String(totalRecords)
          }
          sub="Records captured"
        />

        <ReportKpi
          icon={
            <UserCheck size={16} />
          }
          iconClass="green"
          label="Present"
          value={
            loading
              ? "..."
              : String(presentCount)
          }
          sub="On-time attendance"
        />

        <ReportKpi
          icon={
            <Clock3 size={16} />
          }
          iconClass="orange"
          label="Late"
          value={
            loading
              ? "..."
              : String(lateCount)
          }
          sub="Late arrivals"
        />

        <ReportKpi
          icon={
            <XCircle size={16} />
          }
          iconClass="red"
          label="Absent"
          value={
            loading
              ? "..."
              : String(absentCount)
          }
          sub="Absent records"
        />

        <ReportKpi
          icon={
            <Timer size={16} />
          }
          iconClass="blue"
          label="Avg. Working Hours"
          value={
            loading
              ? "..."
              : `${averageWorkingHours.toFixed(
                  1
                )}h`
          }
          sub="Average recorded"
        />
      </div>

      {/* ANALYTICS */}

      <div className="analytics-grid">
        <div className="analytics-card">
          <div className="analytics-card-header">
            <div className="analytics-card-title">
              <div className="analytics-card-title-icon">
                <BarChart3 size={15} />
              </div>

              <div>
                <h3>
                  Attendance Distribution
                </h3>

                <p>
                  Operational status
                  breakdown
                </p>
              </div>
            </div>
          </div>

          <div className="status-visual">
            <StatusRow
              label="Present"
              value={presentCount}
              total={totalRecords}
              type="present"
            />

            <StatusRow
              label="Late"
              value={lateCount}
              total={totalRecords}
              type="late"
            />

            <StatusRow
              label="Absent"
              value={absentCount}
              total={totalRecords}
              type="absent"
            />
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-card-header">
            <div className="analytics-card-title">
              <div className="analytics-card-title-icon">
                <MapPin size={15} />
              </div>

              <div>
                <h3>
                  Location Activity
                </h3>

                <p>
                  Attendance by location
                </p>
              </div>
            </div>
          </div>

          {locationSummary.length ===
          0 ? (
            <EmptyState
              icon={
                <MapPin size={25} />
              }
              title="No location activity"
              description="Location data will appear here."
            />
          ) : (
            <div className="location-list">
              {locationSummary
                .slice(0, 5)
                .map(
                  (location) => (
                    <div
                      className="location-item"
                      key={
                        location.name
                      }
                    >
                      <div className="location-name">
                        <div className="location-pin">
                          <MapPin
                            size={13}
                          />
                        </div>

                        <div>
                          <strong>
                            {
                              location.name
                            }
                          </strong>

                          <span>
                            {
                              location.present
                            }{" "}
                            present ·{" "}
                            {
                              location.late
                            }{" "}
                            late
                          </span>
                        </div>
                      </div>

                      <div className="location-count">
                        {
                          location.count
                        }
                      </div>
                    </div>
                  )
                )}
            </div>
          )}
        </div>
      </div>

      {/* EMPLOYEE PERFORMANCE */}

      <div className="employee-card">
        <div className="section-header">
          <div className="section-header-left">
            <div className="section-header-icon">
              <Users size={15} />
            </div>

            <div>
              <h2>
                Employee Performance
              </h2>

              <p>
                Workforce-level
                attendance
                intelligence.
              </p>
            </div>
          </div>

          <span className="section-badge">
            {employeeSummary.length}{" "}
            employees
          </span>
        </div>

        {loading ? (
          <LoadingState />
        ) : employeeSummary.length ===
          0 ? (
          <EmptyState
            icon={
              <Users size={28} />
            }
            title="No employee activity"
            description="No employee attendance records match the selected filters."
          />
        ) : (
          <div className="employee-table-wrap">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>
                    Employee
                  </th>

                  <th>
                    Attendance
                  </th>

                  <th>
                    Present
                  </th>

                  <th>
                    Late
                  </th>

                  <th>
                    Avg. Hours
                  </th>

                  <th>
                    Performance
                  </th>
                </tr>
              </thead>

              <tbody>
                {employeeSummary
                  .slice(0, 10)
                  .map(
                    (employee) => (
                      <tr
                        key={
                          employee.id
                        }
                      >
                        <td>
                          <div className="employee-cell">
                            <div className="employee-avatar">
                              {getInitials(
                                employee.name
                              )}
                            </div>

                            <div className="employee-details">
                              <strong>
                                {
                                  employee.name
                                }
                              </strong>

                              <span>
                                {
                                  employee.email
                                }
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <div className="progress-cell">
                            <div className="progress-top">
                              <span>
                                {employee.attendanceRate.toFixed(
                                  0
                                )}
                                %
                              </span>
                            </div>

                            <div className="progress-bar">
                              <div
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.max(
                                      0,
                                      employee.attendanceRate
                                    )
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="mini-status good">
                            {
                              employee.present
                            }
                          </span>
                        </td>

                        <td>
                          <span className="mini-status warning">
                            {
                              employee.late
                            }
                          </span>
                        </td>

                        <td>
                          {employee.averageHours.toFixed(
                            1
                          )}
                          h
                        </td>

                        <td>
                          {employee.attendanceRate >=
                          90 ? (
                            <span className="mini-status good">
                              Excellent
                            </span>
                          ) : (
                            <span className="mini-status warning">
                              Monitor
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
      </div>

      {/* ATTENDANCE RECORDS */}

      <div className="attendance-card">
        <div className="section-header">
          <div className="section-header-left">
            <div className="section-header-icon">
              <FileText size={15} />
            </div>

            <div>
              <h2>
                Attendance Records
              </h2>

              <p>
                Detailed attendance
                activity for{" "}
                {formatReadableDate(
                  selectedDate
                )}
                .
              </p>
            </div>
          </div>

          <span className="section-badge">
            {filteredRecords.length}{" "}
            records
          </span>
        </div>

        {loading ? (
          <LoadingState />
        ) : filteredRecords.length ===
          0 ? (
          <EmptyState
            icon={
              <FileText size={30} />
            }
            title="No attendance records"
            description="No records match the selected date or filters."
          />
        ) : (
          <div className="attendance-table-wrap">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>
                    Employee
                  </th>

                  <th>
                    Check In
                  </th>

                  <th>
                    Check Out
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Location
                  </th>

                  <th>
                    Working Hours
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredRecords.map(
                  (record) => {
                    const name =
                      String(
                        record.user_name ??
                          "Unknown Employee"
                      );

                    return (
                      <tr
                        key={
                          record.attendance_id
                        }
                      >
                        <td>
                          <div className="employee-cell">
                            <div className="employee-avatar">
                              {getInitials(
                                name
                              )}
                            </div>

                            <div className="employee-details">
                              <strong>
                                {name}
                              </strong>

                              <span>
                                {record.email ||
                                  `Employee #${record.user_id}`}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td>
                          {formatTime(
                            record.check_in
                          )}
                        </td>

                        <td>
                          {formatTime(
                            record.check_out
                          )}
                        </td>

                        <td>
                          <span
                            className={`status-badge ${getStatusClass(
                              record.status
                            )}`}
                          >
                            {record.status ||
                              "Unknown"}
                          </span>
                        </td>

                        <td>
                          {record.location_name ||
                            "Unassigned"}
                        </td>

                        <td>
                          {record.working_hours !==
                            null &&
                          record.working_hours !==
                            undefined
                            ? `${Number(
                                record.working_hours
                              ).toFixed(
                                2
                              )}h`
                            : "—"}
                        </td>
                      </tr>
                    );
                  }
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

/* =========================================================
   KPI
   ========================================================= */

function ReportKpi({
  icon,
  iconClass,
  label,
  value,
  sub,
}: {
  icon: ReactNode;
  iconClass: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="report-kpi">
      <div className="kpi-top">
        <div
          className={`kpi-icon ${iconClass}`}
        >
          {icon}
        </div>
      </div>

      <div className="kpi-label">
        {label}
      </div>

      <div className="kpi-value">
        {value}
      </div>

      <div className="kpi-sub">
        {sub}
      </div>
    </div>
  );
}

/* =========================================================
   STATUS ROW
   ========================================================= */

function StatusRow({
  label,
  value,
  total,
  type,
}: {
  label: string;
  value: number;
  total: number;
  type:
    | "present"
    | "late"
    | "absent";
}) {
  const percentage =
    total > 0
      ? (value / total) * 100
      : 0;

  return (
    <div className="status-row">
      <div className="status-name">
        <span
          className={`status-dot ${type}`}
        />

        {label}
      </div>

      <div className="status-track">
        <div
          className={`status-fill ${type}`}
          style={{
            width: `${Math.min(
              100,
              Math.max(
                0,
                percentage
              )
            )}%`,
          }}
        />
      </div>

      <div className="status-number">
        {value}
      </div>
    </div>
  );
}

/* =========================================================
   LOADING
   ========================================================= */

function LoadingState() {
  return (
    <div className="empty-state">
      <RefreshCw
        size={25}
        className="spin"
      />

      <strong>
        Loading attendance
        intelligence...
      </strong>

      <span>
        Reading report data from
        PostgreSQL.
      </span>
    </div>
  );
}

/* =========================================================
   EMPTY
   ========================================================= */

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="empty-state">
      {icon}

      <strong>{title}</strong>

      <span>
        {description}
      </span>
    </div>
  );
}

/* =========================================================
   HELPERS
   ========================================================= */

function getTodayDate(): string {
  const date = new Date();

  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatReadableDate(
  value: string
): string {
  if (!value) {
    return "Selected Date";
  }

  const date = new Date(
    `${value}T00:00:00`
  );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    undefined,
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
}

function formatTime(
  value:
    | string
    | null
    | undefined
): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(value);
  }

  return date.toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
}

function getInitials(
  name: string
): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "U";
  }

  if (words.length === 1) {
    return words[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    words[0].charAt(0) +
    words[
      words.length - 1
    ].charAt(0)
  ).toUpperCase();
}

function getStatusClass(
  status:
    | string
    | null
    | undefined
): string {
  switch (
    String(
      status ?? ""
    ).toLowerCase()
  ) {
    case "present":
      return "present";

    case "late":
      return "late";

    case "absent":
      return "absent";

    default:
      return "";
  }
}

function getErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response =
      (
        error as {
          response?: {
            data?: {
              detail?: unknown;
              message?: unknown;
            };
          };
        }
      ).response;

    const detail =
      response?.data?.detail;

    const message =
      response?.data?.message;

    if (
      typeof detail === "string" &&
      detail.trim()
    ) {
      return detail;
    }

    if (
      typeof message === "string" &&
      message.trim()
    ) {
      return message;
    }
  }

  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  return fallback;
}