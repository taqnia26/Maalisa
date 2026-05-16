import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { db, sessionsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Request, Response, NextFunction } from "express";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

/* -------------------------------------------------------------------------- */
/*                              Permissions                                    */
/* -------------------------------------------------------------------------- */

export const ALL_PERMISSIONS = [
  "bookings_view",
  "bookings_manage",
  "payments_view",
  "payments_record",
  "rooms_view",
  "rooms_manage",
  "reports_view",
  "guests_view",
  "guests_manage",
  "calendar_view",
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

export const ROLE_DEFAULT_PERMISSIONS: Record<string, readonly string[]> = {
  admin: ALL_PERMISSIONS,
  manager: ALL_PERMISSIONS,
  reception: [
    "bookings_view",
    "bookings_manage",
    "payments_view",
    "payments_record",
    "rooms_view",
    "guests_view",
    "guests_manage",
    "calendar_view",
  ],
  finance: [
    "bookings_view",
    "payments_view",
    "reports_view",
    "guests_view",
    "calendar_view",
  ],
  guest: [],
};

export const STAFF_ROLES = ["admin", "manager", "reception", "finance"] as const;

export function getEffectivePermissions(user: typeof usersTable.$inferSelect): string[] {
  if (user.role === "admin") return [...ALL_PERMISSIONS];
  if (user.permissions) {
    try {
      const parsed: unknown = JSON.parse(user.permissions);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed as string[];
    } catch { /* ignore */ }
  }
  return [...(ROLE_DEFAULT_PERMISSIONS[user.role] ?? [])];
}

export function hasPermission(user: typeof usersTable.$inferSelect, perm: string): boolean {
  if (user.role === "admin") return true;
  return getEffectivePermissions(user).includes(perm);
}

/** Returns branchId to filter queries by, or null for "see all". */
export function getBranchFilter(user: typeof usersTable.$inferSelect): number | null {
  if (user.role === "admin") return null;
  return user.branchId ?? null;
}

/* -------------------------------------------------------------------------- */
/*                             Password / Session                              */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*                               Middleware                                    */
/* -------------------------------------------------------------------------- */

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

/** Allow admin, manager, reception, or finance. */
export function requireStaff() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = await getUserFromRequest(req);
    if (!user || !(STAFF_ROLES as readonly string[]).includes(user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    (req as Request & { user: typeof user }).user = user;
    next();
  };
}

/** Require a specific named permission (admin always passes). */
export function requirePermission(perm: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = await getUserFromRequest(req);
    if (!user || !(STAFF_ROLES as readonly string[]).includes(user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (!hasPermission(user, perm)) {
      res.status(403).json({ error: `Missing permission: ${perm}` });
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
