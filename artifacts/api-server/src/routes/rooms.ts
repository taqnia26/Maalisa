import { Router, type IRouter } from "express";
import { db, roomsTable, bookingsTable } from "@workspace/db";
import { and, eq, lt, gt, inArray, ne } from "drizzle-orm";

const router: IRouter = Router();

function serializeRoom(r: typeof roomsTable.$inferSelect) {
  return {
    id: r.id,
    name: r.name,
    nameAr: r.nameAr,
    type: r.type,
    description: r.description,
    descriptionAr: r.descriptionAr,
    price: Number(r.price),
    capacity: r.capacity,
    sizeSqm: r.sizeSqm,
    bedType: r.bedType,
    amenities: r.amenities ?? [],
    images: r.images ?? [],
    status: r.status,
    discountPrice: r.discountPrice == null ? null : Number(r.discountPrice),
    discountLabel: r.discountLabel ?? null,
    discountLabelAr: r.discountLabelAr ?? null,
  };
}

router.get("/rooms", async (req, res): Promise<void> => {
  const type = typeof req.query.type === "string" ? req.query.type : undefined;
  const checkIn = typeof req.query.checkIn === "string" ? req.query.checkIn : undefined;
  const checkOut = typeof req.query.checkOut === "string" ? req.query.checkOut : undefined;

  const where = type ? eq(roomsTable.type, type) : undefined;
  const rooms = await db.select().from(roomsTable).where(where ?? undefined);

  let unavailableIds = new Set<number>();
  if (checkIn && checkOut) {
    const conflicts = await db
      .select()
      .from(bookingsTable)
      .where(
        and(
          ne(bookingsTable.status, "cancelled"),
          lt(bookingsTable.checkIn, checkOut),
          gt(bookingsTable.checkOut, checkIn),
        ),
      );
    unavailableIds = new Set(conflicts.map((b) => b.roomId));
  }

  const result = rooms.map((r) => {
    const s = serializeRoom(r);
    if (unavailableIds.has(r.id) && s.status === "available") {
      s.status = "occupied";
    }
    return s;
  });
  res.json(result);
});

router.get("/rooms/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw ?? "", 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const [room] = await db.select().from(roomsTable).where(eq(roomsTable.id, id));
  if (!room) {
    res.status(404).json({ error: "Room not found" });
    return;
  }
  res.json(serializeRoom(room));
});

export { serializeRoom };
export default router;
