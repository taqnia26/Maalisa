import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  getUserFromRequest,
  setSessionCookie,
  clearSessionCookie,
} from "../lib/auth";

const router: IRouter = Router();

function publicUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone ?? undefined,
    role: u.role,
  };
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const { name, email, password, phone } = req.body ?? {};
  if (!name || !email || !password) {
    res.status(400).json({ error: "Missing fields" });
    return;
  }
  if (String(password).length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, String(email)));
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }
  const passwordHash = await hashPassword(String(password));
  const [user] = await db
    .insert(usersTable)
    .values({
      name: String(name),
      email: String(email).toLowerCase(),
      passwordHash,
      phone: phone ? String(phone) : null,
      role: "guest",
    })
    .returning();
  const token = await createSession(user.id);
  setSessionCookie(res, token);
  res.status(201).json({ user: publicUser(user) });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ error: "Missing fields" });
    return;
  }
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, String(email).toLowerCase()));
  if (!user || user.blocked) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const ok = await verifyPassword(String(password), user.passwordHash);
  if (!ok) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const token = await createSession(user.id);
  setSessionCookie(res, token);
  res.json({ user: publicUser(user) });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  const token = req.cookies?.["session"];
  if (token) await destroySession(token);
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json(publicUser(user));
});

export default router;
