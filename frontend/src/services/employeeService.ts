import api from "./api";

export interface Employee {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
}

export interface AttendanceRecord {
  id: number;
  user_id: number;
  attendance_data: string;
  check_in: string | null;
  check_out: string | null;
  status: string | null;
  latitude: number | null;
  longitude: number | null;
  location_id: number | null;
  location_name: string | null;
}

export interface EmployeeAttendance {
  user_id: number;
  count: number;
  records: AttendanceRecord[];
}

export async function getEmployees(): Promise<Employee[]> {
  const response = await api.get<Employee[]>("/api/users/");
  return response.data;
}

export async function getEmployee(userId: number): Promise<Employee> {
  const response = await api.get<Employee>(
    `/api/users/${userId}`
  );

  return response.data;
}

export async function getEmployeeAttendance(
  userId: number
): Promise<EmployeeAttendance> {
  const response = await api.get<EmployeeAttendance>(
    `/api/users/${userId}/attendance`
  );

  return response.data;
}

export async function updateEmployee(
  userId: number,
  data: {
    name: string;
    email: string;
  }
) {
  const response = await api.put(
    `/api/users/${userId}`,
    data
  );

  return response.data;
}

export async function activateEmployee(userId: number) {
  const response = await api.patch(
    `/api/users/${userId}/activate`
  );

  return response.data;
}

export async function deactivateEmployee(userId: number) {
  const response = await api.patch(
    `/api/users/${userId}/deactivate`
  );

  return response.data;
}