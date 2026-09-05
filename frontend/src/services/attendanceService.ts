import api from "./api";

export interface CheckInRequest {
  latitude: number;
  longitude: number;
  location_id: number;
}

export interface CheckInResponse {
  message: string;
  status?: string;
  user_id?: number;
  attendance_id?: number;
  location_id?: number;
  distance?: number;
  [key: string]: unknown;
}

export async function checkIn(
  data: CheckInRequest
): Promise<CheckInResponse> {
  const response = await api.post<CheckInResponse>(
    "/api/attendance/check-in",
    data
  );

  return response.data;
}