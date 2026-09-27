import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { prisma } from "../../lib/prisma.js";
import { toUsd } from "../../config/orgData.js";
import { getCurrentSalary } from "../salary/salary.service.js";
import {
  computeDistribution,
  computeOverview,
  computePayEquity,
  groupBy,
} from "./analytics.service.js";

export const analyticsRouter = Router();

interface EmployeeForAnalytics {
  status: string;
  department: string;
  country: string;
  level: string;
  gender: string;
  currentSalaryUsd: number | undefined;
}

async function loadEmployeesForAnalytics(): Promise<EmployeeForAnalytics[]> {
  const employees = await prisma.employee.findMany({
    include: { salaryRecords: true },
  });

  return employees.map((emp) => {
    const current = getCurrentSalary(emp.salaryRecords);
    return {
      status: emp.employmentStatus,
      department: emp.department,
      country: emp.country,
      level: emp.level,
      gender: emp.gender,
      currentSalaryUsd: current ? toUsd(current.amount, current.currency) : undefined,
    };
  });
}

analyticsRouter.get("/overview", requireAuth, async (_req, res, next) => {
  try {
    const employees = await loadEmployeesForAnalytics();
    res.json(computeOverview(employees));
  } catch (err) {
    next(err);
  }
});

analyticsRouter.get("/by-department", requireAuth, async (_req, res, next) => {
  try {
    const employees = await loadEmployeesForAnalytics();
    res.json(groupBy(employees, (e) => e.department));
  } catch (err) {
    next(err);
  }
});

analyticsRouter.get("/by-country", requireAuth, async (_req, res, next) => {
  try {
    const employees = await loadEmployeesForAnalytics();
    res.json(groupBy(employees, (e) => e.country));
  } catch (err) {
    next(err);
  }
});

analyticsRouter.get("/by-level", requireAuth, async (_req, res, next) => {
  try {
    const employees = await loadEmployeesForAnalytics();
    res.json(groupBy(employees, (e) => e.level));
  } catch (err) {
    next(err);
  }
});

analyticsRouter.get("/distribution", requireAuth, async (req, res, next) => {
  try {
    const employees = await loadEmployeesForAnalytics();
    const bucketSizeUsd = req.query.bucketSize ? Number(req.query.bucketSize) : 20000;
    const salaries = employees
      .filter((e) => e.status === "ACTIVE")
      .map((e) => e.currentSalaryUsd)
      .filter((s): s is number => typeof s === "number");
    res.json(
      computeDistribution(salaries, Number.isFinite(bucketSizeUsd) ? bucketSizeUsd : 20000)
    );
  } catch (err) {
    next(err);
  }
});

analyticsRouter.get("/pay-equity", requireAuth, async (_req, res, next) => {
  try {
    const employees = await loadEmployeesForAnalytics();
    res.json(computePayEquity(employees));
  } catch (err) {
    next(err);
  }
});

analyticsRouter.get("/recent-changes", requireAuth, async (req, res, next) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const take = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 200) : 20;

    const records = await prisma.salaryRecord.findMany({
      orderBy: { createdAt: "desc" },
      take,
      include: {
        employee: { select: { id: true, firstName: true, lastName: true, department: true } },
      },
    });

    const employeeIds = [...new Set(records.map((r) => r.employeeId))];
    const historyByEmployee = await prisma.salaryRecord.findMany({
      where: { employeeId: { in: employeeIds } },
      orderBy: { effectiveDate: "asc" },
      select: { employeeId: true, effectiveDate: true, amount: true },
    });

    const previousByRecordKey = new Map<string, number>();
    const lastSeen = new Map<string, number>();
    for (const rec of historyByEmployee) {
      const key = `${rec.employeeId}:${rec.effectiveDate.getTime()}`;
      const prev = lastSeen.get(rec.employeeId);
      if (prev !== undefined) previousByRecordKey.set(key, prev);
      lastSeen.set(rec.employeeId, rec.amount);
    }

    const results = records.map((record) => {
      const key = `${record.employeeId}:${record.effectiveDate.getTime()}`;
      return {
        employeeId: record.employee.id,
        employeeName: `${record.employee.firstName} ${record.employee.lastName}`,
        department: record.employee.department,
        amount: record.amount,
        currency: record.currency,
        previousAmount: previousByRecordKey.get(key) ?? null,
        reason: record.reason,
        effectiveDate: record.effectiveDate,
      };
    });

    res.json(results);
  } catch (err) {
    next(err);
  }
});
