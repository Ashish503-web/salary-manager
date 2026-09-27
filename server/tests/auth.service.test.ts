import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { login } from "../src/modules/auth/auth.service.js";
import { HttpError } from "../src/lib/http-error.js";

const ORIGINAL_JWT_SECRET = process.env.JWT_SECRET;

beforeEach(() => {
  process.env.JWT_SECRET = "test-secret";
});

afterEach(() => {
  process.env.JWT_SECRET = ORIGINAL_JWT_SECRET;
  vi.restoreAllMocks();
});

describe("bcrypt password hashing", () => {
  it("round-trips a password through hash + compare", async () => {
    const hash = await bcrypt.hash("Sup3rSecret!", 10);
    expect(await bcrypt.compare("Sup3rSecret!", hash)).toBe(true);
    expect(await bcrypt.compare("WrongPassword", hash)).toBe(false);
  });
});

describe("jwt sign/verify round-trip", () => {
  it("signs and verifies a token carrying the expected payload", () => {
    const token = jwt.sign({ sub: "user-1", email: "a@b.com" }, "test-secret", {
      expiresIn: "12h",
    });
    const decoded = jwt.verify(token, "test-secret") as { sub: string; email: string };
    expect(decoded.sub).toBe("user-1");
    expect(decoded.email).toBe("a@b.com");
  });

  it("rejects a token signed with a different secret", () => {
    const token = jwt.sign({ sub: "user-1", email: "a@b.com" }, "other-secret");
    expect(() => jwt.verify(token, "test-secret")).toThrow();
  });
});

describe("login (auth.service)", () => {
  function fakePrisma(user: { id: string; email: string; name: string; passwordHash: string } | null) {
    return {
      user: {
        findUnique: vi.fn().mockResolvedValue(user),
      },
    } as unknown as import("@prisma/client").PrismaClient;
  }

  it("returns a token and user info on correct password", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 10);
    const prisma = fakePrisma({
      id: "user-1",
      email: "hr@acme.test",
      name: "HR Manager",
      passwordHash,
    });

    const result = await login(prisma, "hr@acme.test", "correct-password");

    expect(result.user).toEqual({ id: "user-1", email: "hr@acme.test", name: "HR Manager" });
    const decoded = jwt.verify(result.token, "test-secret") as { sub: string; email: string };
    expect(decoded.sub).toBe("user-1");
    expect(decoded.email).toBe("hr@acme.test");
  });

  it("throws HttpError 401 on wrong password", async () => {
    const passwordHash = await bcrypt.hash("correct-password", 10);
    const prisma = fakePrisma({
      id: "user-1",
      email: "hr@acme.test",
      name: "HR Manager",
      passwordHash,
    });

    await expect(login(prisma, "hr@acme.test", "wrong-password")).rejects.toThrow(HttpError);
    await expect(login(prisma, "hr@acme.test", "wrong-password")).rejects.toMatchObject({
      status: 401,
    });
  });

  it("throws HttpError 401 when the user does not exist", async () => {
    const prisma = fakePrisma(null);
    await expect(login(prisma, "nobody@acme.test", "whatever")).rejects.toThrow(HttpError);
  });
});
