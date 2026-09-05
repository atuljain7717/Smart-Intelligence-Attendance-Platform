import api from "./api";

export interface AuditLog {
  id: number;
  user_id: number | null;
  user_name: string | null;
  user_email: string | null;
  user_role: string | null;
  action: string;
  resource_type: string | null;
  resource_id: number | null;
  description: string | null;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
}

export interface AuditLogsResponse {
  success: boolean;
  page: number;
  limit: number;
  total: number;
  pages: number;
  logs: AuditLog[];
}

export interface AuditLogResponse {
  success: boolean;
  log: AuditLog;
}

export interface GetAuditLogsParams {
  page?: number;
  limit?: number;
  action?: string;
}

export async function getAuditLogs(
  params: GetAuditLogsParams = {}
): Promise<AuditLogsResponse> {
  const response =
    await api.get<AuditLogsResponse>(
      "/api/audit-logs/",
      {
        params: {
          page: params.page ?? 1,
          limit: params.limit ?? 20,
          ...(params.action
            ? { action: params.action }
            : {}),
        },
      }
    );

  return response.data;
}

export async function getAuditLog(
  logId: number
): Promise<AuditLogResponse> {
  const response =
    await api.get<AuditLogResponse>(
      `/api/audit-logs/${logId}`
    );

  return response.data;
}