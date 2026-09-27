import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import { authRouter } from "./modules/auth/auth.routes.js";
import { employeesRouter } from "./modules/employees/employees.routes.js";
import { salaryRouter } from "./modules/salary/salary.routes.js";
import { analyticsRouter } from "./modules/analytics/analytics.routes.js";
import { lookupsRouter } from "./modules/lookups/lookups.routes.js";
import { HttpError } from "./lib/http-error.js";

export function createApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use("/api/auth", authRouter);
  app.use("/api/employees", employeesRouter);
  app.use("/api/employees", salaryRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/lookups", lookupsRouter);

  app.use((req: Request, res: Response) => {
    res.status(404).json({ error: "Not found" });
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) {
      res.status(err.status).json({ error: err.message });
      return;
    }

    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
