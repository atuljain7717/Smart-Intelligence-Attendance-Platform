export interface LiveLocation {
  id?: number;
  user_id: number;
  latitude: number;
  longitude: number;
  accuracy_meters: number | null;
  updated_at: string;
}
export interface EmployeeLocation extends LiveLocation {
  name: string;
  email: string;
  role: string;
  /**
   * Seconds elapsed since the last GPS update.
   */
  seconds_since_update: number;
  /**
   * GPS connection state.
   *
   * true  = GPS updated within the live threshold
   * false = GPS update is stale
   *
   * This does NOT represent attendance status.
   */
  is_live: boolean;
}
export interface EmployeeLiveLocationsResponse {
  /**
   * Total active employees with a GPS record.
   */
  count: number;
  /**
   * Employees whose GPS is currently live.
   */
  live_count: number;
  /**
   * Employees whose GPS update is stale.
   */
  stale_count: number;
  /**
   * Current GPS locations.
   */
  locations: EmployeeLocation[];
}