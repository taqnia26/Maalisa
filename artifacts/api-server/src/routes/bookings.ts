import { Router, type IRouter, type Request } from "express";
import { db, bookingsTable, roomsTable } from "@workspace/db";
import { and, desc, eq, gt, lt, ne } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { getUserFromRequest } from "../lib/auth";

const router: IRouter = Router();

function makeReference(): string {
  return "NM-" + randomBytes(3).toString("hex").toUpperCase();
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn).getTime();
  const b = new Date(checkOut).getTime();
  return Math.max(1, Math.round((b - a) / (1000 * 60 * 60 * 24)));
}

async function serialize(b: typeof bookingsTable.$inferSelect) {
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, b.roomId));
  return {
    id: b.id,
    reference: b.reference,
    roomId: b.roomId,
    roomName: room?.name ?? `Room #${b.roomId}`,
    checkIn: typeof b.checkIn === "string" ? b.checkIn : new Date(b.checkIn).toISOString().slice(0, 10),
    checkOut: typeof b.checkOut === "string" ? b.checkOut : new Date(b.checkOut).toISOString().slice(0, 10),
    nights: nightsBetween(String(b.checkIn), String(b.checkOut)),
    guests: b.guests,
    guestName: b.guestName,
    guestEmail: b.guestEmail,
    guestPhone: b.guestPhone,
    notes: b.notes ?? undefined,
    totalPrice: Number(b.totalPrice),
    status: b.status,
    createdAt: b.createdAt.toISOString(),
  };
}

router.get("/bookings", async (req, res): Promise<void> => {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const rows =
    user.role === "admin"
      ? await db.select().from(bookingsTable).orderBy(desc(bookingsTable.createdAt))
      : await db
          .select()
          .from(bookingsTable)
          .where(eq(bookingsTable.userId, user.id))
          .orderBy(desc(bookingsTable.createdAt));
  const result = await Promise.all(rows.map(serialize));
  res.json(result);
});

router.post("/bookings", async (req, res): Promise<void> => {
  const body = req.body ?? {};
  const required = ["roomId", "checkIn", "checkOut", "guests", "guestName", "guestEmail", "guestPhone"];
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
  const totalPrice = nights * Number(room.price);
  const user = await getUserFromRequest(req);
  const [created] = await db
    .insert(bookingsTable)
    .values({
      reference: makeReference(),
      roomId,
      userId: user?.id ?? null,
      guestName: String(body.guestName),
      guestEmail: String(body.guestEmail),
      guestPhone: String(body.guestPhone),
      notes: body.notes ? String(body.notes) : null,
      checkIn,
      checkOut,
      guests,
      totalPrice: String(totalPrice),
      status: "confirmed",
    })
    .returning();
  res.status(201).json(await serialize(created));
});

router.get("/bookings/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw ?? "", 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [b] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id));
  if (!b) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(await serialize(b));
});

router.patch("/bookings/:id", async (req, res): Promise<void> => {
  const user = await getUserFromRequest(req);
  if (!user) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw ?? "", 10);
  const status = String(req.body?.status ?? "");
  const allowed = ["pending", "confirmed", "checked_in", "checked_out", "cancelled"];
  if (!allowed.includes(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }
  const [existing] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (user.role !== "admin" && existing.userId !== user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  if (user.role !== "admin" && status !== "cancelled") {
    res.status(403).json({ error: "Guests may only cancel" });
    return;
  }
  const [updated] = await db
    .update(bookingsTable)
    .set({ status })
    .where(eq(bookingsTable.id, id))
    .returning();
  res.json(await serialize(updated));
});

export default router;
