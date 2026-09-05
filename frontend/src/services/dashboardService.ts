import api from "./api";

export interface DashboardSummary {
  total_employees: number;
  present_today: number;
  absent_today: number;
  currently_checked_in: number;
  attendance_percentage: number;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const response = await api.get<DashboardSummary>(
    "/api/dashboard/summary"
  );

  return response.data;
}
