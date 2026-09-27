import type { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { HttpError } from "../../lib/http-error.js";
import { currencyForCountry, COUNTRIES, DEPARTMENTS, LEVELS } from "../../config/orgData.js";
import { getCurrentSalary } from "../salary/salary.service.js";

export interface EmployeeFilters {
  search?: string;
  department?: string;
  country?: string;
  level?: string;
  status?: string;
}

/** Builds a Prisma `where` clause for Employee from raw filter values. */
export function buildEmployeeWhere(filters: EmployeeFilters): Prisma.EmployeeWhereInput {
  const where: Prisma.EmployeeWhereInput = {};

  if (filters.search) {
    where.OR = [
      { firstName: { contains: filters.search } },
      { lastName: { contains: filters.search } },
      { email: { contains: filters.search } },
      { employeeCode: { contains: filters.search } },
    ];
  }

  if (filters.department) {
    where.department = filters.department;
  }

  if (filters.country) {
    where.country = filters.country;
  }

  if (filters.level) {
    where.level = filters.level;
  }

  if (filters.status) {
    where.employmentStatus = filters.status;
  }

  return where;
}

export interface ListEmployeesParams extends EmployeeFilters {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

const SORTABLE_FIELDS = new Set([
  "firstName",
  "lastName",
  "department",
  "country",
  "level",
  "hireDate",
  "employmentStatus",
  "employeeCode",
]);

export interface EmployeeListItem {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  gender: string;
  country: string;
  department: string;
  jobTitle: string;
  level: string;
  currency: string;
  employmentStatus: string;
  hireDate: Date;
  terminationDate: Date | null;
  managerId: string | null;
  currentSalary: number | undefined;
  currentSalaryCurrency: string | undefined;
}

export async function listEmployees(
  prisma: PrismaClient,
  params: ListEmployeesParams
): Promise<{ data: EmployeeListItem[]; total: number; page: number; pageSize: number }> {
  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize = params.pageSize && params.pageSize > 0 ? Math.min(params.pageSize, 100) : 25;

  const where = buildEmployeeWhere(params);

  const sortBy = params.sortBy && SORTABLE_FIELDS.has(params.sortBy) ? params.sortBy : "lastName";
  const sortDir: "asc" | "desc" = params.sortDir === "desc" ? "desc" : "asc";

  const [total, employees] = await Promise.all([
    prisma.employee.count({ where }),
    prisma.employee.findMany({
      where,
      orderBy: { [sortBy]: sortDir },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { salaryRecords: true },
    }),
  ]);

  const data: EmployeeListItem[] = employees.map((emp) => {
    const current = getCurrentSalary(emp.salaryRecords);
    return {
      id: emp.id,
      employeeCode: emp.employeeCode,
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      gender: emp.gender,
      country: emp.country,
      department: emp.department,
      jobTitle: emp.jobTitle,
      level: emp.level,
      currency: emp.currency,
      employmentStatus: emp.employmentStatus,
      hireDate: emp.hireDate,
      terminationDate: emp.terminationDate,
      managerId: emp.managerId,
      currentSalary: current?.amount,
      currentSalaryCurrency: current?.currency,
    };
  });

  return { data, total, page, pageSize };
}

export async function getEmployeeById(prisma: PrismaClient, id: string) {
  const employee = await prisma.employee.findUnique({
    where: { id },
    include: {
      manager: { select: { id: true, firstName: true, lastName: true } },
      salaryRecords: { orderBy: { effectiveDate: "desc" } },
    },
  });

  if (!employee) {
    throw new HttpError(404, "Employee not found");
  }

  return employee;
}

const GENDERS = ["FEMALE", "MALE", "OTHER"] as const;
const COUNTRY_CODES = COUNTRIES.map((c) => c.code) as [string, ...string[]];
const DEPARTMENT_NAMES = DEPARTMENTS as unknown as [string, ...string[]];
const LEVEL_NAMES = LEVELS as unknown as [string, ...string[]];

export const createEmployeeSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  gender: z.enum(GENDERS),
  country: z.enum(COUNTRY_CODES),
  department: z.enum(DEPARTMENT_NAMES),
  jobTitle: z.string().min(1),
  level: z.enum(LEVEL_NAMES),
  managerId: z.string().optional(),
  hireDate: z.coerce.date(),
  startingSalary: z.number().positive(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

function randomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let suffix = "";
  for (let i = 0; i < 6; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `EMP-${suffix}`;
}

export async function createEmployee(prisma: PrismaClient, rawInput: unknown) {
  const parsed = createEmployeeSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues.map((i) => i.message).join("; "));
  }
  const input = parsed.data;
  const currency = currencyForCountry(input.country);

  const maxAttempts = 5;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const employeeCode = randomCode();
    try {
      return await prisma.$transaction(async (tx) => {
        const employee = await tx.employee.create({
          data: {
            employeeCode,
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            gender: input.gender,
            country: input.country,
            department: input.department,
            jobTitle: input.jobTitle,
            level: input.level,
            currency,
            employmentStatus: "ACTIVE",
            hireDate: input.hireDate,
            managerId: input.managerId ?? null,
          },
        });

        await tx.salaryRecord.create({
          data: {
            employeeId: employee.id,
            amount: input.startingSalary,
            currency,
            effectiveDate: input.hireDate,
            reason: "HIRE",
          },
        });

        return employee;
      });
    } catch (err: unknown) {
      lastError = err;
      const isUniqueConstraint =
        typeof err === "object" &&
        err !== null &&
        "code" in err &&
        (err as { code?: string }).code === "P2002";
      if (isUniqueConstraint) {
        // Determine whether it's the employeeCode or the email causing the collision.
        const target = (err as { meta?: { target?: string[] | string } }).meta?.target;
        const targetStr = Array.isArray(target) ? target.join(",") : String(target ?? "");
        if (targetStr.includes("email")) {
          throw new HttpError(409, "An employee with this email already exists");
        }
        // employeeCode collision: retry with a new random code.
        continue;
      }
      throw err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Failed to create employee");
}

export const updateEmployeeSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  jobTitle: z.string().min(1).optional(),
  level: z.enum(LEVEL_NAMES).optional(),
  department: z.enum(DEPARTMENT_NAMES).optional(),
  managerId: z.string().nullable().optional(),
  employmentStatus: z.enum(["ACTIVE", "TERMINATED"]).optional(),
  terminationDate: z.coerce.date().optional(),
});

export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

export async function updateEmployee(prisma: PrismaClient, id: string, rawInput: unknown) {
  const parsed = updateEmployeeSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues.map((i) => i.message).join("; "));
  }
  const input = parsed.data;

  const existing = await prisma.employee.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "Employee not found");
  }

  const data: Prisma.EmployeeUpdateInput = { ...input };

  if (input.employmentStatus === "TERMINATED" && !input.terminationDate) {
    data.terminationDate = new Date();
  }

  return prisma.employee.update({ where: { id }, data });
}

function csvEscape(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function exportEmployeesCsv(
  prisma: PrismaClient,
  filters: EmployeeFilters
): Promise<string> {
  const where = buildEmployeeWhere(filters);
  const employees = await prisma.employee.findMany({
    where,
    include: { salaryRecords: true },
    orderBy: { lastName: "asc" },
  });

  const header = [
    "employeeCode",
    "firstName",
    "lastName",
    "email",
    "department",
    "country",
    "level",
    "jobTitle",
    "employmentStatus",
    "hireDate",
    "currentSalary",
    "currency",
  ].join(",");

  const rows = employees.map((emp) => {
    const current = getCurrentSalary(emp.salaryRecords);
    return [
      csvEscape(emp.employeeCode),
      csvEscape(emp.firstName),
      csvEscape(emp.lastName),
      csvEscape(emp.email),
      csvEscape(emp.department),
      csvEscape(emp.country),
      csvEscape(emp.level),
      csvEscape(emp.jobTitle),
      csvEscape(emp.employmentStatus),
      csvEscape(emp.hireDate.toISOString().slice(0, 10)),
      csvEscape(current?.amount),
      csvEscape(current?.currency),
    ].join(",");
  });

  return [header, ...rows].join("\n") + "\n";
}
