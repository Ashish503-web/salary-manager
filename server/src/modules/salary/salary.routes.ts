import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { prisma } from "../../lib/prisma.js";
import { addSalaryRecord } from "./salary.service.js";

export const salaryRouter = Router();

// Mounted at /api/employees, so this yields POST /api/employees/:id/salary
salaryRouter.post("/:id/salary", requireAuth, async (req, res, next) => {
  try {
    const record = await addSalaryRecord(prisma, req.params.id, req.body);
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
});
