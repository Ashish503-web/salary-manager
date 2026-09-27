import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { COUNTRIES, DEPARTMENTS, LEVELS } from "../../config/orgData.js";

export const lookupsRouter = Router();

const REASONS = ["HIRE", "PROMOTION", "MERIT_INCREASE", "MARKET_ADJUSTMENT", "DEMOTION"];

lookupsRouter.get("/", requireAuth, (_req, res) => {
  res.json({
    countries: COUNTRIES,
    departments: DEPARTMENTS,
    levels: LEVELS,
    reasons: REASONS,
  });
});
