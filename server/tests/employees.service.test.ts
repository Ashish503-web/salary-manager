import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execSync } from "node:child_process";
import { existsSync, unlinkSync } from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { buildEmployeeWhere } from "../src/modules/employees/employees.service.js";

describe("buildEmployeeWhere", () => {
  it("returns an empty where clause when no filters are given", () => {
    expect(buildEmployeeWhere({})).toEqual({});
  });

  it("builds an OR clause across name/email/code fields for search", () => {
    const where = buildEmployeeWhere({ search: "jane" });
    expect(where).toEqual({
      OR: [
        { firstName: { contains: "jane" } },
        { lastName: { contains: "jane" } },
        { email: { contains: "jane" } },
        { employeeCode: { contains: "jane" } },
      ],
    });
  });

  it("combines search with equality filters", () => {
    const where = buildEmployeeWhere({
      search: "smith",
      department: "Engineering",
      country: "US",
      level: "L4",
      status: "ACTIVE",
    });

    expect(where).toEqual({
      OR: [
        { firstName: { contains: "smith" } },
        { lastName: { contains: "smith" } },
        { email: { contains: "smith" } },
        { employeeCode: { contains: "smith" } },
      ],
      department: "Engineering",
      country: "US",
      level: "L4",
      employmentStatus: "ACTIVE",
    });
  });

  it("omits filter keys that are not provided", () => {
    const where = buildEmployeeWhere({ department: "Sales" });
    expect(where).toEqual({ department: "Sales" });
    expect(where.country).toBeUndefined();
    expect(where.OR).toBeUndefined();
  });
});

// --- Integration test ------------------------------------------------------
//
// Spins up a dedicated SQLite file, applies migrations against it, seeds a
// handful of rows, and drives the real Express app through supertest. This
// is a small, self-contained integration test (not the full 10k dataset) so
// it stays fast and deterministic. We use DATABASE_URL env override + a
// fresh PrismaClient/app import (dynamic import, after env is set) rather
// than importing the shared `src/lib/prisma.ts` singleton, since that
// singleton would otherwise bind to whatever DATABASE_URL was already
// loaded from `.env` at process start.

const testDbFile = path.resolve(__dirname, "test-integration.db");
const testDbUrl = `file:${testDbFile}`;

describe("employees integration (supertest)", () => {
  let app: import("express").Express;
  let prisma: import("@prisma/client").PrismaClient;
  let token: string;
  let employeeId: string;

  beforeAll(async () => {
    try {
      if (existsSync(testDbFile)) unlinkSync(testDbFile);
    } catch {
      // ignore stale lock; migrate deploy will recreate/reuse the file
    }

    process.env.DATABASE_URL = testDbUrl;
    process.env.JWT_SECRET = "integration-test-secret";

    execSync("npx prisma migrate deploy", {
      cwd: path.resolve(__dirname, ".."),
      env: { ...process.env, DATABASE_URL: testDbUrl },
      stdio: "pipe",
    });

    const { PrismaClient } = await import("@prisma/client");
    prisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });

    const passwordHash = await bcrypt.hash("TestPassword123!", 10);
    await prisma.user.create({
      data: { email: "hr@test.local", passwordHash, name: "Test HR" },
    });

    const appModule = await import("../src/app.js");
    app = appModule.createApp();
  }, 30000);

  afterAll(async () => {
    await prisma.$disconnect();
    // Best-effort cleanup: on Windows the SQLite file handle can remain
    // briefly locked after disconnect, which would otherwise fail the suite.
    try {
      if (existsSync(testDbFile)) unlinkSync(testDbFile);
      const journal = `${testDbFile}-journal`;
      if (existsSync(journal)) unlinkSync(journal);
    } catch {
      // ignore — stale test db file will just be overwritten next run
    }
  });

  it("logs in with the seeded user", async () => {
    const { default: request } = await import("supertest");
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "hr@test.local", password: "TestPassword123!" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTypeOf("string");
    expect(res.body.user.email).toBe("hr@test.local");
    token = res.body.token;
  });

  it("rejects login with wrong password", async () => {
    const { default: request } = await import("supertest");
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "hr@test.local", password: "wrong" });
    expect(res.status).toBe(401);
  });

  it("creates an employee", async () => {
    const { default: request } = await import("supertest");
    const res = await request(app)
      .post("/api/employees")
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada.lovelace@test.local",
        gender: "FEMALE",
        country: "US",
        department: "Engineering",
        jobTitle: "Software Engineer",
        level: "L3",
        hireDate: "2022-01-15",
        startingSalary: 95000,
      });

    expect(res.status).toBe(201);
    expect(res.body.employeeCode).toMatch(/^EMP-/);
    expect(res.body.currency).toBe("USD");
    employeeId = res.body.id;
  });

  it("lists employees including the newly created one", async () => {
    const { default: request } = await import("supertest");
    const res = await request(app)
      .get("/api/employees")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.data[0].currentSalary).toBe(95000);
    expect(res.body.data[0].currentSalaryCurrency).toBe("USD");
  });

  it("gets the employee by id with salary history", async () => {
    const { default: request } = await import("supertest");
    const res = await request(app)
      .get(`/api/employees/${employeeId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.salaryRecords).toHaveLength(1);
    expect(res.body.salaryRecords[0].reason).toBe("HIRE");
  });

  it("returns 401 without a token", async () => {
    const { default: request } = await import("supertest");
    const res = await request(app).get("/api/employees");
    expect(res.status).toBe(401);
  });

  it("records a salary change and reflects it as currentSalary", async () => {
    const { default: request } = await import("supertest");
    const res = await request(app)
      .post(`/api/employees/${employeeId}/salary`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        amount: 110000,
        effectiveDate: "2024-01-01",
        reason: "MERIT_INCREASE",
      });

    expect(res.status).toBe(201);

    const getRes = await request(app)
      .get(`/api/employees/${employeeId}`)
      .set("Authorization", `Bearer ${token}`);

    const latest = getRes.body.salaryRecords[0];
    expect(latest.amount).toBe(110000);
    expect(latest.reason).toBe("MERIT_INCREASE");

    const listRes = await request(app)
      .get("/api/employees")
      .set("Authorization", `Bearer ${token}`);
    expect(listRes.body.data[0].currentSalary).toBe(110000);
  });
});
