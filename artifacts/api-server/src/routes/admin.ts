import { Router, type IRouter, type Request } from "express";
import { db, bookingsTable, roomsTable, usersTable } from "@workspace/db";
import { and, desc, eq, gte, ne, sql } from "drizzle-orm";
import { requireAdmin, requireStaff, getBranchFilter } from "../lib/auth";

type AuthedRequest = Request & { user: typeof usersTable.$inferSelect };

const router: IRouter = Router();

// Reception (staff) needs operational endpoints (calendar, recent-bookings, guests).
// Finance / hotel-wide analytics (stats, timeseries) are admin-only and gated per-route.
router.use("/admin", requireStaff());

router.get("/admin/stats", requireAdmin(), async (_req, res): Promise<void> => {
  const allBookings = await db.select().from(bookingsTable);
  const rooms = await db.select().from(roomsTable);
  const guests = await db.select().from(usersTable).where(eq(usersTable.role, "guest"));
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const monthRevenue = allBookings
    .filter((b) => b.createdAt >= monthStart && b.status !== "cancelled")
    .reduce((sum, b) => sum + Number(b.totalPrice), 0);
  const occupiedIds = new Set(
    allBookings.filter((b) => b.status === "checked_in").map((b) => b.roomId),
  );
  const availableRooms = rooms.filter((r) => r.status === "available" && !occupiedIds.has(r.id)).length;
  const occupiedRooms = rooms.length - availableRooms;
  res.json({
    totalBookings: allBookings.length,
    monthRevenue,
    availableRooms,
    occupiedRooms,
    pendingBookings: allBookings.filter((b) => b.status === "pending").length,
    totalGuests: guests.length,
  });
});

router.get("/admin/bookings-timeseries", requireAdmin(), async (_req, res): Promise<void> => {
  const days = 30;
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const rows = await db
    .select()
    .from(bookingsTable)
    .where(gte(bookingsTable.createdAt, start));
  const buckets = new Map<string, { count: number; revenue: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    buckets.set(d.toISOString().slice(0, 10), { count: 0, revenue: 0 });
  }
  for (const b of rows) {
    const key = b.createdAt.toISOString().slice(0, 10);
    const cur = buckets.get(key);
    if (cur) {
      cur.count++;
      if (b.status !== "cancelled") cur.revenue += Number(b.totalPrice);
    }
  }
  res.json(
    Array.from(buckets.entries()).map(([date, v]) => ({
      date,
      count: v.count,
      revenue: v.revenue,
    })),
  );
});

router.get("/admin/recent-bookings", async (req, res): Promise<void> => {
  const me = (req as AuthedRequest).user;
  const branchId = getBranchFilter(me);
  const query = db.select().from(bookingsTable);
  if (branchId != null) {
    query.where(eq(bookingsTable.branchId, branchId));
  }
  const rows = await query.orderBy(desc(bookingsTable.createdAt)).limit(10);
  const result = await Promise.all(
    rows.map(async (b) => {
      const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, b.roomId));
      return {
        id: b.id,
        reference: b.reference,
        roomId: b.roomId,
        roomName: room?.name ?? `Room #${b.roomId}`,
        checkIn: String(b.checkIn).slice(0, 10),
        checkOut: String(b.checkOut).slice(0, 10),
        nights: Math.max(
          1,
          Math.round(
            (new Date(String(b.checkOut)).getTime() -
              new Date(String(b.checkIn)).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        ),
        guests: b.guests,
        guestName: b.guestName,
        guestEmail: b.guestEmail,
        guestPhone: b.guestPhone,
        notes: b.notes ?? undefined,
        totalPrice: Number(b.totalPrice),
        status: b.status,
        createdAt: b.createdAt.toISOString(),
      };
    }),
  );
  res.json(result);
});

router.get("/admin/guests", async (req, res): Promise<void> => {
  const me = (req as AuthedRequest).user;
  const branchId = getBranchFilter(me);
  const users = await db.select().from(usersTable).where(eq(usersTable.role, "guest"));
  const result = await Promise.all(
    users.map(async (u) => {
      const bookings = await db.select().from(bookingsTable).where(eq(bookingsTable.userId, u.id));
      // For branch-scoped staff: only include guests who have a booking at their branch.
      const branchBookings = branchId != null
        ? bookings.filter((b) => b.branchId === branchId)
        : bookings;
      const totalSpent = branchBookings
        .filter((b) => b.status !== "cancelled")
        .reduce((sum, b) => sum + Number(b.totalPrice), 0);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone ?? undefined,
        bookingsCount: branchBookings.length,
        totalSpent,
        blocked: u.blocked,
        _hasBranchBooking: branchId == null || branchBookings.length > 0,
      };
    }),
  );
  const filtered = branchId != null ? result.filter((u) => u._hasBranchBooking) : result;
  res.json(filtered.map(({ _hasBranchBooking: _, ...u }) => u));
});

router.get("/admin/calendar", async (req, res): Promise<void> => {
  const month = String(req.query.month ?? "");
  if (!/^\d{4}-\d{2}$/.test(month)) {
    res.status(400).json({ error: "month must be YYYY-MM" });
    return;
  }
  const [yStr, mStr] = month.split("-");
  const year = Number(yStr);
  const m = Number(mStr);
  const daysInMonth = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const rooms = await db.select().from(roomsTable);
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-${String(daysInMonth).padStart(2, "0")}`;
  const bookings = await db
    .select()
    .from(bookingsTable)
    .where(and(ne(bookingsTable.status, "cancelled")));
  const result: Array<{
    roomId: number;
    roomName: string;
    date: string;
    status: "available" | "booked" | "maintenance";
  }> = [];
  for (const room of rooms) {
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${month}-${String(d).padStart(2, "0")}`;
      let status: "available" | "booked" | "maintenance" = "available";
      if (room.status === "maintenance") status = "maintenance";
      else {
        const booked = bookings.some(
          (b) =>
            b.roomId === room.id &&
            String(b.checkIn) <= date &&
            String(b.checkOut) > date,
        );
        if (booked) status = "booked";
      }
      result.push({ roomId: room.id, roomName: room.name, date, status });
    }
  }
  // Reference monthStart/monthEnd to keep linter quiet & for future use
  void monthStart;
  void monthEnd;
  void sql;
  res.json(result);
});

export default router;
