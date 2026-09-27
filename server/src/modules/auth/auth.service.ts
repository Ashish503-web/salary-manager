import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { PrismaClient } from "@prisma/client";
import { HttpError } from "../../lib/http-error.js";

export interface LoginResult {
  token: string;
  user: { id: string; email: string; name: string };
}

export async function login(
  prisma: PrismaClient,
  email: string,
  password: string
): Promise<LoginResult> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new HttpError(401, "Invalid email or password");
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    throw new HttpError(401, "Invalid email or password");
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new HttpError(500, "Server misconfiguration");
  }

  const token = jwt.sign({ sub: user.id, email: user.email }, secret, {
    expiresIn: "12h",
  });

  return {
    token,
    user: { id: user.id, email: user.email, name: user.name },
  };
}
