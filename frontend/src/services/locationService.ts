import api from "./api";
import type {
  LiveLocation,
  EmployeeLiveLocationsResponse,
} from "../types/location";

/**
 * Update the current user's live GPS location.
 *
 * Authentication is handled automatically by api.ts
 * using the access_token stored in localStorage.
 */
export async function updateLiveLocation(
  latitude: number,
  longitude: number,
  accuracy_meters: number = 10
): Promise<LiveLocation> {
  const response = await api.post<{
    message: string;
    location: LiveLocation;
  }>("/api/live-location/update", {
    latitude,
    longitude,
    accuracy_meters,
  });

  return response.data.location;
}

/**
 * Get the current user's live GPS location.
 */
export async function getMyLiveLocation(): Promise<LiveLocation | null> {
  const response = await api.get<{
    message?: string;
    location: LiveLocation | null;
  }>("/api/live-location/me");

  return response.data.location;
}

/**
 * Get all active employees' live GPS locations.
 *
 * Admin only.
 */
export async function getEmployeeLiveLocations(): Promise<EmployeeLiveLocationsResponse> {
  const response = await api.get<EmployeeLiveLocationsResponse>(
    "/api/live-location/employees"
  );

  return response.data;
}