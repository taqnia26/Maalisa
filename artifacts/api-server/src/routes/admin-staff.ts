import { Router, type IRouter, type Request } from "express";
import { randomBytes } from "node:crypto";
import {
  db,
  bookingsTable,
  roomsTable,
  usersTable,
  branchesTable,
  paymentsTable,
} from "@workspace/db";
import { and, asc, desc, eq, gt, lt, ne, sql } from "drizzle-orm";
import { hashPassword, requireAdmin, requireStaff } from "../lib/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// All endpoints below require staff (admin or reception). Some are further
// restricted to admin via inline middleware.
router.use("/admin", requireStaff());

type AuthedRequest = Request & {
  user: typeof usersTable.$inferSelect;
};

/* -------------------------------------------------------------------------- */
/*                                  Branches                                  */
/* -------------------------------------------------------------------------- */

router.get("/admin/branches", async (_req, res): Promise<void> => {
  const rows = await db.select().from(branchesTable).orderBy(asc(branchesTable.id));
  res.json(rows);
});

router.post("/admin/branches", requireAdmin(), async (req, res): Promise<void> => {
  const name = String(req.body?.name ?? "").trim();
  if (!name) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const [created] = await db
    .insert(branchesTable)
    .values({
      name,
      nameAr: req.body?.nameAr ? String(req.body.nameAr) : null,
      address: req.body?.address ? String(req.body.address) : null,
      phone: req.body?.phone ? String(req.body.phone) : null,
    })
    .returning();
  res.status(201).json(created);
});

router.patch("/admin/branches/:id", requireAdmin(), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (req.body?.name !== undefined) updates["name"] = String(req.body.name);
  if (req.body?.nameAr !== undefined) updates["nameAr"] = req.body.nameAr ? String(req.body.nameAr) : null;
  if (req.body?.address !== undefined) updates["address"] = req.body.address ? String(req.body.address) : null;
  if (req.body?.phone !== undefined) updates["phone"] = req.body.phone ? String(req.body.phone) : null;
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }
  const [updated] = await db
    .update(branchesTable)
    .set(updates as Partial<typeof branchesTable.$inferInsert>)
    .where(eq(branchesTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Branch not found" });
    return;
  }
  res.json(updated);
});

router.delete("/admin/branches/:id", requireAdmin(), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  // Detach any users assigned to this branch.
  await db.update(usersTable).set({ branchId: null }).where(eq(usersTable.branchId, id));
  const [deleted] = await db.delete(branchesTable).where(eq(branchesTable.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Branch not found" });
    return;
  }
  res.json({ ok: true });
});

/* -------------------------------------------------------------------------- */
/*                              Users management                              */
/* -------------------------------------------------------------------------- */

function publicUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone ?? undefined,
    role: u.role,
    blocked: u.blocked,
    branchId: u.branchId ?? null,
  };
}

/** Create a customer (default) or a reception/admin staff member (admin only). */
router.post("/admin/users", async (req, res): Promise<void> => {
  const me = (req as AuthedRequest).user;
  const { name, email, password, phone, role, branchId } = req.body ?? {};
  if (!name || !email) {
    res.status(400).json({ error: "name and email are required" });
    return;
  }
  const wantedRole = String(role ?? "guest");
  if (!["guest", "reception", "admin"].includes(wantedRole)) {
    res.status(400).json({ error: "Invalid role" });
    return;
  }
  if (wantedRole !== "guest" && me.role !== "admin") {
    res.status(403).json({ error: "Only admin can create staff accounts" });
    return;
  }
  const lower = String(email).toLowerCase().trim();
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, lower));
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }
  // Auto-generate a random password if none provided (reception creating walk-in customers).
  const pw = password && String(password).length >= 6 ? String(password) : randomBytes(5).toString("hex");
  const [user] = await db
    .insert(usersTable)
    .values({
      name: String(name),
      email: lower,
      passwordHash: await hashPassword(pw),
      phone: phone ? String(phone) : null,
      role: wantedRole,
      branchId: branchId != null ? Number(branchId) : null,
    })
    .returning();
  res.status(201).json({
    user: publicUser(user),
    // Return the generated password ONLY on creation so reception can hand it to the customer.
    generatedPassword: !password || String(password).length < 6 ? pw : undefined,
  });
});

/** List staff (reception + admin). Admin-only. */
router.get("/admin/users/staff", requireAdmin(), async (_req, res): Promise<void> => {
  const rows = await db.select().from(usersTable);
  res.json(rows.filter((u) => u.role !== "guest").map(publicUser));
});

/** Patch any user (admin only): role, branchId, blocked, name, phone. */
router.patch("/admin/users/:id", requireAdmin(), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const updates: Record<string, unknown> = {};
  if (req.body?.name !== undefined) updates["name"] = String(req.body.name);
  if (req.body?.phone !== undefined) updates["phone"] = req.body.phone ? String(req.body.phone) : null;
  if (req.body?.role !== undefined) {
    const r = String(req.body.role);
    if (!["guest", "reception", "admin"].includes(r)) {
      res.status(400).json({ error: "Invalid role" });
      return;
    }
    updates["role"] = r;
  }
  if (req.body?.branchId !== undefined) {
    updates["branchId"] = req.body.branchId == null ? null : Number(req.body.branchId);
  }
  if (req.body?.blocked !== undefined) updates["blocked"] = Boolean(req.body.blocked);
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }
  const [updated] = await db
    .update(usersTable)
    .set(updates as Partial<typeof usersTable.$inferInsert>)
    .where(eq(usersTable.id, id))
    .returning();
  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(publicUser(updated));
});

/* -------------------------------------------------------------------------- */
/*                       Bookings: lookup + create + detail                   */
/* -------------------------------------------------------------------------- */

function makeReference(): string {
  return "NM-" + randomBytes(3).toString("hex").toUpperCase();
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn).getTime();
  const b = new Date(checkOut).getTime();
  return Math.max(1, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}

async function serializeBooking(b: typeof bookingsTable.$inferSelect) {
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, b.roomId));
  return {
    id: b.id,
    reference: b.reference,
    roomId: b.roomId,
    roomName: room?.name ?? `Room #${b.roomId}`,
    roomNameAr: room?.nameAr ?? null,
    checkIn: typeof b.checkIn === "string" ? b.checkIn : new Date(b.checkIn).toISOString().slice(0, 10),
    checkOut: typeof b.checkOut === "string" ? b.checkOut : new Date(b.checkOut).toISOString().slice(0, 10),
    nights: nightsBetween(String(b.checkIn), String(b.checkOut)),
    guests: b.guests,
    guestName: b.guestName,
    guestEmail: b.guestEmail,
    guestPhone: b.guestPhone,
    notes: b.notes ?? undefined,
    totalPrice: Number(b.totalPrice),
    paidAmount: Number(b.paidAmount ?? 0),
    paymentStatus: b.paymentStatus ?? "unpaid",
    status: b.status,
    createdAt: b.createdAt.toISOString(),
  };
}

/** Look up a booking by reference number (e.g. NM-AB12CD). Staff. */
router.get("/admin/bookings/by-reference/:ref", async (req, res): Promise<void> => {
  const ref = String(req.params.ref ?? "").trim().toUpperCase();
  if (!ref) {
    res.status(400).json({ error: "reference is required" });
    return;
  }
  const [b] = await db.select().from(bookingsTable).where(eq(bookingsTable.reference, ref));
  if (!b) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  const payments = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.bookingId, b.id))
    .orderBy(desc(paymentsTable.createdAt));
  res.json({
    booking: await serializeBooking(b),
    payments: payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      method: p.method,
      branchId: p.branchId,
      branchName: p.branchName,
      receivedById: p.receivedById,
      receivedByName: p.receivedByName,
      note: p.note,
      createdAt: p.createdAt.toISOString(),
    })),
  });
});

/** Get a booking with its payments by id. Staff. */
router.get("/admin/bookings/:id/full", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [b] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id));
  if (!b) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const payments = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.bookingId, b.id))
    .orderBy(desc(paymentsTable.createdAt));
  res.json({
    booking: await serializeBooking(b),
    payments: payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      method: p.method,
      branchId: p.branchId,
      branchName: p.branchName,
      receivedById: p.receivedById,
      receivedByName: p.receivedByName,
      note: p.note,
      createdAt: p.createdAt.toISOString(),
    })),
  });
});

/** Staff creates a booking on behalf of a customer. */
router.post("/admin/bookings", async (req, res): Promise<void> => {
  const me = (req as AuthedRequest).user;
  const body = req.body ?? {};
  const required = ["roomId", "checkIn", "checkOut", "guests", "guestName", "guestPhone"];
  for (const k of required) {
    if (body[k] === undefined || body[k] === null || body[k] === "") {
      res.status(400).json({ error: `Missing field: ${k}` });
      return;
    }
  }
  const roomId = Number(body.roomId);
  const guests = Number(body.guests);
  const checkIn: string = String(body.checkIn).slice(0, 10);
  const checkOut: string = String(body.checkOut).slice(0, 10);
  if (new Date(checkOut) <= new Date(checkIn)) {
    res.status(400).json({ error: "Check-out must be after check-in" });
    return;
  }
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, roomId));
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }
  const conflicts = await db
    .select()
    .from(bookingsTable)
    .where(
      and(
        eq(bookingsTable.roomId, roomId),
        ne(bookingsTable.status, "cancelled"),
        lt(bookingsTable.checkIn, checkOut),
        gt(bookingsTable.checkOut, checkIn),
      ),
    );
  if (conflicts.length > 0) {
    res.status(409).json({ error: "Room not available for selected dates" });
    return;
  }
  const nights = nightsBetween(checkIn, checkOut);
  const totalPrice =
    body.totalPrice != null && Number.isFinite(Number(body.totalPrice))
      ? Number(body.totalPrice)
      : nights * Number(room.discountPrice ?? room.price);
  const [created] = await db
    .insert(bookingsTable)
    .values({
      reference: makeReference(),
      roomId,
      userId: body.userId != null ? Number(body.userId) : null,
      guestName: String(body.guestName),
      guestEmail: body.guestEmail ? String(body.guestEmail) : "walkin@hotel.local",
      guestPhone: String(body.guestPhone),
      notes: body.notes ? String(body.notes) : `Created by ${me.name} (${me.email})`,
      checkIn,
      checkOut,
      guests,
      totalPrice: String(totalPrice),
      status: "confirmed",
    })
    .returning();
  res.status(201).json(await serializeBooking(created));
});

/* -------------------------------------------------------------------------- */
/*                                  Payments                                  */
/* -------------------------------------------------------------------------- */

/** Record a payment received from a customer at a branch. Staff. */
router.post("/admin/bookings/:id/payments", async (req, res): Promise<void> => {
  const me = (req as AuthedRequest).user;
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    res.status(400).json({ error: "amount must be a positive number" });
    return;
  }
  const [booking] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id));
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  // Branch resolution rules:
  // - reception: payment is ALWAYS attributed to their assigned branch (cannot be overridden);
  //   if reception has no branch assigned, refuse — admin must assign a branch first.
  // - admin: may pick any existing branch via body.branchId, else falls back to me.branchId.
  let branchId: number | null = null;
  if (me.role === "reception") {
    if (me.branchId == null) {
      res.status(400).json({ error: "Your account is not assigned to a branch. Ask an admin to assign you to a branch before recording payments." });
      return;
    }
    branchId = me.branchId;
  } else if (req.body?.branchId != null) {
    branchId = Number(req.body.branchId);
  } else if (me.branchId != null) {
    branchId = me.branchId;
  }
  let branchName: string | null = null;
  if (branchId != null) {
    const [branch] = await db.select().from(branchesTable).where(eq(branchesTable.id, branchId));
    if (!branch) {
      res.status(400).json({ error: "branchId does not exist" });
      return;
    }
    branchName = branch.name;
  }
  const method = String(req.body?.method ?? "cash");
  if (!["cash", "card", "transfer", "other"].includes(method)) {
    res.status(400).json({ error: "Invalid method" });
    return;
  }
  try {
    // Run insert + aggregate update in a single transaction with row-level
    // lock on the booking so concurrent payment writes can't race on the
    // bookings.paidAmount / paymentStatus computation.
    const out = await db.transaction(async (tx) => {
      // SELECT ... FOR UPDATE on the target booking
      const lockedRows = await tx.execute(sql`SELECT total_price FROM bookings WHERE id = ${id} FOR UPDATE`);
      const lockedAny = lockedRows as unknown as { rows?: Array<{ total_price: string | number }> } & Array<{ total_price: string | number }>;
      const row =
        Array.isArray(lockedAny) ? lockedAny[0] : lockedAny.rows?.[0];
      if (!row) throw new Error("Booking vanished during payment write");
      const total = Number(row.total_price);

      const [created] = await tx
        .insert(paymentsTable)
        .values({
          bookingId: id,
          amount: String(amount),
          method,
          branchId,
          branchName,
          receivedById: me.id,
          receivedByName: me.name,
          note: req.body?.note ? String(req.body.note) : null,
        })
        .returning();

      const all = await tx.select().from(paymentsTable).where(eq(paymentsTable.bookingId, id));
      const totalPaid = all.reduce((sum, p) => sum + Number(p.amount), 0);
      const status = totalPaid <= 0 ? "unpaid" : totalPaid + 0.01 < total ? "partial" : "paid";
      await tx
        .update(bookingsTable)
        .set({ paidAmount: String(totalPaid), paymentStatus: status })
        .where(eq(bookingsTable.id, id));
      return { created, totalPaid, status, total };
    });

    res.status(201).json({
      payment: {
        id: out.created.id,
        amount: Number(out.created.amount),
        method: out.created.method,
        branchId: out.created.branchId,
        branchName: out.created.branchName,
        receivedById: out.created.receivedById,
        receivedByName: out.created.receivedByName,
        note: out.created.note,
        createdAt: out.created.createdAt.toISOString(),
      },
      booking: { paidAmount: out.totalPaid, paymentStatus: out.status, totalPrice: out.total },
    });
  } catch (err) {
    logger.error({ err }, "Record payment failed");
    res.status(500).json({ error: "Failed to record payment" });
  }
});

export default router;
