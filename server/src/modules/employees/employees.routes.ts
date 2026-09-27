import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { prisma } from "../../lib/prisma.js";
import {
  createEmployee,
  exportEmployeesCsv,
  getEmployeeById,
  listEmployees,
  updateEmployee,
} from "./employees.service.js";

export const employeesRouter = Router();

function parseQueryString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

employeesRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const page = req.query.page ? Number(req.query.page) : undefined;
    const pageSize = req.query.pageSize ? Number(req.query.pageSize) : undefined;

    const result = await listEmployees(prisma, {
      page: page && !Number.isNaN(page) ? page : 1,
      pageSize: pageSize && !Number.isNaN(pageSize) ? pageSize : 25,
      search: parseQueryString(req.query.search),
      department: parseQueryString(req.query.department),
      country: parseQueryString(req.query.country),
      level: parseQueryString(req.query.level),
      status: parseQueryString(req.query.status),
      sortBy: parseQueryString(req.query.sortBy),
      sortDir: req.query.sortDir === "desc" ? "desc" : "asc",
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Must be registered before GET /:id to avoid the "export" path being
// captured as an :id param.
employeesRouter.get("/export", requireAuth, async (req, res, next) => {
  try {
    const csv = await exportEmployeesCsv(prisma, {
      search: parseQueryString(req.query.search),
      department: parseQueryString(req.query.department),
      country: parseQueryString(req.query.country),
      level: parseQueryString(req.query.level),
      status: parseQueryString(req.query.status),
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="employees.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
});

employeesRouter.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const employee = await getEmployeeById(prisma, req.params.id);
    res.json(employee);
  } catch (err) {
    next(err);
  }
});

employeesRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const employee = await createEmployee(prisma, req.body);
    res.status(201).json(employee);
  } catch (err) {
    next(err);
  }
});

employeesRouter.patch("/:id", requireAuth, async (req, res, next) => {
  try {
    const employee = await updateEmployee(prisma, req.params.id, req.body);
    res.json(employee);
  } catch (err) {
    next(err);
  }
});
