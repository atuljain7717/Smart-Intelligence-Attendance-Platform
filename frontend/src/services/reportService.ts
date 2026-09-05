import api from "./api";
export interface AttendanceReportRecord {
  attendance_id: number;
  user_id: number;
  user_name: string;
  email: string;
  attendance_data: string;
  check_in: string | null;
  check_out: string | null;
  status: string;
  latitude: number | null;
  longitude: number | null;
  location_id: number | null;
  location_name: string | null;
  working_hours: number | null;
}
export interface AttendanceReportResponse {
  date: string;
  count: number;
  records: AttendanceReportRecord[];
}
export interface AttendanceReportParams {
  report_date?: string;
  user_id?: number;
  status?: string;
}
export async function getAttendanceReport(
  params: AttendanceReportParams = {}
): Promise<AttendanceReportResponse> {
  const response = await api.get<AttendanceReportResponse>(
    "/api/reports/attendance",
    {
      params,
    }
  );
  return response.data;
}
function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  const text = String(value);
  if (
    text.includes(",") ||
    text.includes('"') ||
    text.includes("\n") ||
    text.includes("\r")
  ) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}
export function attendanceRecordsToCsv(
  records: AttendanceReportRecord[]
): string {
  const headers = [
    "Attendance ID",
    "Employee ID",
    "Employee Name",
    "Email",
    "Date",
    "Check In",
    "Check Out",
    "Status",
    "Latitude",
    "Longitude",
    "Location ID",
    "Location",
    "Working Hours",
  ];
  const rows = records.map((record) => [
    record.attendance_id,
    record.user_id,
    record.user_name,
    record.email,
    record.attendance_data,
    record.check_in ?? "",
    record.check_out ?? "",
    record.status,
    record.latitude ?? "",
    record.longitude ?? "",
    record.location_id ?? "",
    record.location_name ?? "",
    record.working_hours ?? "",
  ]);
  return [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) =>
      row.map(escapeCsvValue).join(",")
    ),
  ].join("\r\n");
}
export function downloadCsv(
  csv: string,
  filename: string
): void {
  const blob = new Blob(
    ["\uFEFF" + csv],
    {
      type: "text/csv;charset=utf-8;",
    }
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
export async function exportAttendanceCsv(
  params: AttendanceReportParams = {}
): Promise<void> {
  const report = await getAttendanceReport(params);
  const csv = attendanceRecordsToCsv(
    report.records
  );
  const date =
    report.date ||
    new Date().toISOString().slice(0, 10);
  downloadCsv(
    csv,
    `attendance-report-${date}.csv`
  );
}