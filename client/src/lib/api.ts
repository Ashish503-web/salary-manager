import { getToken } from "./auth-storage";
import type {
  AddSalaryRecordRequest,
  AnalyticsGroup,
  AnalyticsOverview,
  CreateEmployeeRequest,
  DistributionBucket,
  EmployeeDetail,
  EmployeeListQuery,
  EmployeeListResponse,
  LoginResponse,
  LookupsResponse,
  PayEquityRow,
  RecentChange,
  SalaryRecord,
  UpdateEmployeeRequest,
} from "./types";

export const API_BASE_URL: string =
  (import.meta as any).env?.VITE_API_URL ?? "http://localhost:4000/api";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  auth?: boolean; // whether to attach Authorization header (default true)
}

export async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, auth = true, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string> | undefined),
  };

  if (auth) {
    const token = getToken();
    if (token) {
      finalHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let message = res.statusText || "Request failed";
    try {
      const data = await res.json();
      if (data && typeof data.error === "string") {
        message = data.error;
      }
    } catch {
      // ignore JSON parse failure, keep default message
    }
    throw new ApiError(res.status, message);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

function buildQuery(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

// ---- Auth ----
export function login(email: string, password: string): Promise<LoginResponse> {
  return request<LoginResponse>("/auth/login", {
    method: "POST",
    body: { email, password },
    auth: false,
  });
}

// ---- Lookups ----
export function getLookups(): Promise<LookupsResponse> {
  return request<LookupsResponse>("/lookups");
}

// ---- Employees ----
export function listEmployees(
  query: EmployeeListQuery = {}
): Promise<EmployeeListResponse> {
  return request<EmployeeListResponse>(`/employees${buildQuery(query)}`);
}

export function getEmployee(id: string): Promise<EmployeeDetail> {
  return request<EmployeeDetail>(`/employees/${id}`);
}

export function createEmployee(
  payload: CreateEmployeeRequest
): Promise<EmployeeDetail> {
  return request<EmployeeDetail>("/employees", {
    method: "POST",
    body: payload,
  });
}

export function updateEmployee(
  id: string,
  payload: UpdateEmployeeRequest
): Promise<EmployeeDetail> {
  return request<EmployeeDetail>(`/employees/${id}`, {
    method: "PATCH",
    body: payload,
  });
}

export function addSalaryRecord(
  id: string,
  payload: AddSalaryRecordRequest
): Promise<SalaryRecord> {
  return request<SalaryRecord>(`/employees/${id}/salary`, {
    method: "POST",
    body: payload,
  });
}

export async function exportEmployeesCsv(
  query: EmployeeListQuery = {}
): Promise<Blob> {
  const token = getToken();
  const res = await fetch(
    `${API_BASE_URL}/employees/export${buildQuery(query)}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }
  );
  if (!res.ok) {
    let message = res.statusText || "Export failed";
    try {
      const data = await res.json();
      if (data && typeof data.error === "string") message = data.error;
    } catch {
      // ignore
    }
    throw new ApiError(res.status, message);
  }
  return res.blob();
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---- Analytics ----
export function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  return request<AnalyticsOverview>("/analytics/overview");
}

export function getAnalyticsByDepartment(): Promise<AnalyticsGroup[]> {
  return request<AnalyticsGroup[]>("/analytics/by-department");
}

export function getAnalyticsByCountry(): Promise<AnalyticsGroup[]> {
  return request<AnalyticsGroup[]>("/analytics/by-country");
}

export function getAnalyticsByLevel(): Promise<AnalyticsGroup[]> {
  return request<AnalyticsGroup[]>("/analytics/by-level");
}

export function getAnalyticsDistribution(): Promise<DistributionBucket[]> {
  return request<DistributionBucket[]>("/analytics/distribution");
}

export function getAnalyticsPayEquity(): Promise<PayEquityRow[]> {
  return request<PayEquityRow[]>("/analytics/pay-equity");
}

export function getRecentChanges(limit = 20): Promise<RecentChange[]> {
  return request<RecentChange[]>(
    `/analytics/recent-changes${buildQuery({ limit })}`
  );
}
