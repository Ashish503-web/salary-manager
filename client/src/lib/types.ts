// Types matching the backend API contract exactly.

export type Gender = "FEMALE" | "MALE" | "OTHER";
export const GENDERS: Gender[] = ["FEMALE", "MALE", "OTHER"];

export type EmploymentStatus = "ACTIVE" | "TERMINATED";

export type SalaryReason =
  | "HIRE"
  | "PROMOTION"
  | "MERIT_INCREASE"
  | "MARKET_ADJUSTMENT"
  | "DEMOTION";

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface Country {
  code: string;
  name: string;
  currency: string;
}

export interface LookupsResponse {
  countries: Country[];
  departments: string[];
  levels: string[];
  reasons: SalaryReason[];
}

export interface EmployeeListItem {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  gender: Gender;
  country: string;
  department: string;
  jobTitle: string;
  level: string;
  currency: string;
  employmentStatus: EmploymentStatus;
  hireDate: string;
  managerId: string | null;
  currentSalary: number;
  currentSalaryCurrency: string;
}

export interface SalaryRecord {
  id: string;
  amount: number;
  currency: string;
  effectiveDate: string;
  reason: SalaryReason;
  createdAt: string;
}

export interface EmployeeDetail extends EmployeeListItem {
  terminationDate: string | null;
  manager: { id: string; firstName: string; lastName: string } | null;
  salaryRecords: SalaryRecord[];
}

export interface EmployeeListResponse {
  data: EmployeeListItem[];
  total: number;
  page: number;
  pageSize: number;
}

export interface EmployeeListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  department?: string;
  country?: string;
  level?: string;
  status?: EmploymentStatus | string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export interface CreateEmployeeRequest {
  firstName: string;
  lastName: string;
  email: string;
  gender: Gender;
  country: string;
  department: string;
  jobTitle: string;
  level: string;
  managerId?: string;
  hireDate: string;
  startingSalary: number;
}

export interface UpdateEmployeeRequest {
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  level?: string;
  department?: string;
  managerId?: string;
  employmentStatus?: EmploymentStatus;
  terminationDate?: string;
}

export interface AddSalaryRecordRequest {
  amount: number;
  effectiveDate: string;
  reason: Exclude<SalaryReason, "HIRE">;
}

export interface AnalyticsOverview {
  headcount: number;
  activeHeadcount: number;
  totalAnnualPayrollUsd: number;
  avgSalaryUsd: number;
  medianSalaryUsd: number;
}

export interface AnalyticsGroup {
  key: string;
  headcount: number;
  avgSalaryUsd: number;
  medianSalaryUsd: number;
}

export interface DistributionBucket {
  bucketLabel: string;
  min: number;
  max: number;
  count: number;
}

export interface PayEquityRow {
  department: string;
  gender: Gender;
  avgSalaryUsd: number;
  headcount: number;
}

export interface RecentChange {
  employeeId: string;
  employeeName: string;
  department: string;
  amount: number;
  currency: string;
  previousAmount: number | null;
  reason: SalaryReason;
  effectiveDate: string;
}
