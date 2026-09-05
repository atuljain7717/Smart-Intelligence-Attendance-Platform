
import api from "./api";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
}

export interface LoginResponse {
  message: string;
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
  development_reset_url?: string;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
}

export interface ResetPasswordResponse {
  message: string;
}


// ============================================================
// API BASE URL
// ============================================================

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000"
).replace(/\/+$/, "");


// ============================================================
// NORMAL LOGIN
// ============================================================

export async function login(
  data: LoginRequest
): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>(
    "/api/auth/login",
    data
  );

  return response.data;
}


// ============================================================
// GOOGLE LOGIN
// ============================================================

export function loginWithGoogle(): void {
  const googleLoginUrl =
    `${API_BASE_URL}/api/auth/google/login`;

  console.log(
    "Starting Google authentication:",
    googleLoginUrl
  );

  window.location.assign(googleLoginUrl);
}


// ============================================================
// FORGOT PASSWORD
// ============================================================

export async function forgotPassword(
  data: ForgotPasswordRequest
): Promise<ForgotPasswordResponse> {
  const response =
    await api.post<ForgotPasswordResponse>(
      "/api/auth/forgot-password",
      data
    );

  return response.data;
}


// ============================================================
// RESET PASSWORD
// ============================================================

export async function resetPassword(
  data: ResetPasswordRequest
): Promise<ResetPasswordResponse> {
  const response =
    await api.post<ResetPasswordResponse>(
      "/api/auth/reset-password",
      data
    );

  return response.data;
}


// ============================================================
// LOGOUT
// ============================================================

export function logout(): void {
  // Current authentication token
  localStorage.removeItem("access_token");

  // Legacy token
  localStorage.removeItem("token");

  // Stored user information
  localStorage.removeItem("user");

  // Other possible authentication leftovers
  localStorage.removeItem("auth_token");
  localStorage.removeItem("authToken");
}


// ============================================================
// GET STORED TOKEN
// ============================================================

export function getToken(): string | null {
  return (
    localStorage.getItem("access_token") ||
    localStorage.getItem("token")
  );
}


// ============================================================
// GET STORED USER
// ============================================================

export function getStoredUser(): AuthUser | null {
  const user = localStorage.getItem("user");

  if (!user) {
    return null;
  }

  try {
    return JSON.parse(user) as AuthUser;
  } catch {
    localStorage.removeItem("user");
    return null;
  }
}
