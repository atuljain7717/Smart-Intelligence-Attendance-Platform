export interface PlatformSettings {
  id?: number;
  organization_name: string;
  default_location: string;
  timezone: string;
  notifications_enabled: boolean;
  location_tracking_enabled: boolean;
  face_recognition_enabled: boolean;
  updated_by?: number | null;
  updated_at?: string | null;
}

interface SettingsResponse {
  success: boolean;
  settings: PlatformSettings;
  message?: string;
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";

function getToken(): string {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("access_token");

  if (!token) {
    throw new Error(
      "Authentication token not found. Please log in again."
    );
  }

  return token;
}

export async function getSettings(): Promise<PlatformSettings> {
  const token = getToken();

  const response = await fetch(
    `${API_BASE_URL}/api/settings`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.detail ||
        "Unable to load platform settings."
    );
  }

  return (data as SettingsResponse).settings;
}

export async function updateSettings(
  settings: PlatformSettings
): Promise<PlatformSettings> {
  const token = getToken();

  const response = await fetch(
    `${API_BASE_URL}/api/settings`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        organization_name: settings.organization_name,
        default_location: settings.default_location,
        timezone: settings.timezone,
        notifications_enabled:
          settings.notifications_enabled,
        location_tracking_enabled:
          settings.location_tracking_enabled,
        face_recognition_enabled:
          settings.face_recognition_enabled,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data?.detail ||
        "Unable to save platform settings."
    );
  }

  return (data as SettingsResponse).settings;
}
