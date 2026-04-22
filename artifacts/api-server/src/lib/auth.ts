import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { db, sessionsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

export async function createSession(userId: number): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessionsTable).values({ token, userId, expiresAt });
  return token;
}

export async function destroySession(token: string): Promise<void> {
  await db.delete(sessionsTable).where(eq(sessionsTable.token, token));
}

export async function getUserFromRequest(req: Request) {
  const token = req.cookies?.["session"];
  if (!token) return null;
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.token, token));
  if (!session || session.expiresAt < new Date()) return null;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
  return user ?? null;
}

export function requireUser() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    (req as Request & { user: typeof user }).user = user;
    next();
  };
}

export function requireAdmin() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = await getUserFromRequest(req);
    if (!user || user.role !== "admin") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    (req as Request & { user: typeof user }).user = user;
    next();
  };
}

/** Allow both admin and reception staff. */
export function requireStaff() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = await getUserFromRequest(req);
    if (!user || (user.role !== "admin" && user.role !== "reception")) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    (req as Request & { user: typeof user }).user = user;
    next();
  };
}

export function setSessionCookie(res: Response, token: string) {
  res.cookie("session", token, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: SESSION_TTL_MS,
    path: "/",
  });
}

export function clearSessionCookie(res: Response) {
  res.clearCookie("session", { path: "/" });
}
