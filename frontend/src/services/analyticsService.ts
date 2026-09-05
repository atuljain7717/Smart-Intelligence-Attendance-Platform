import api from "./api";

export interface AttendanceStatistics {
  total_attendance_records: number;
  present_records: number;
  total_check_ins: number;
  completed_check_outs: number;
  average_working_hours: number;
  attendance_percentage: number;
}

export async function getAttendanceStatistics(): Promise<AttendanceStatistics> {
  const response = await api.get<AttendanceStatistics>(
    "/api/dashboard/statistics"
  );

  return response.data;
}