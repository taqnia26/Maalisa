import path from "node:path";
import fs from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { Router, type IRouter, type Request } from "express";
import multer from "multer";
import { db, roomsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";
import { serializeRoom } from "./rooms";
import { logger } from "../lib/logger";

const router: IRouter = Router();
router.use("/admin", requireAdmin());

const UPLOAD_DIR = path.resolve(process.cwd(), "../../attached_assets/uploads");
await fs.mkdir(UPLOAD_DIR, { recursive: true }).catch(() => {});

/** Detect actual image type by magic bytes; returns extension or null. */
function detectImageExt(buf: Buffer): "jpg" | "png" | "webp" | "gif" | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "png";
  if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38) return "gif";
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return "webp";
  return null;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|jpg|png|webp|gif)$/i.test(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPG/PNG/WebP/GIF images are allowed."));
  },
});

router.post(
  "/admin/upload",
  (req, res, next) => {
    upload.array("files", 10)(req, res, (err: unknown) => {
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next();
    });
  },
  async (req, res): Promise<void> => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    const urls: string[] = [];
    try {
      for (const f of files) {
        const ext = detectImageExt(f.buffer);
        if (!ext) {
          res.status(400).json({ error: "Uploaded file is not a valid JPG/PNG/WebP/GIF image." });
          return;
        }
        const name = `room-${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
        await fs.writeFile(path.join(UPLOAD_DIR, name), f.buffer);
        urls.push(`/api/images/uploads/${name}`);
      }
      res.json({ urls });
    } catch (err) {
      logger.error({ err }, "Upload failed");
      res.status(500).json({ error: "Upload failed" });
    }
  },
);

const ALLOWED_TYPES = new Set(["standard", "deluxe", "suite"]);
const ALLOWED_STATUSES = new Set(["available", "occupied", "maintenance"]);

function validateNumeric(values: Record<string, unknown>): string | null {
  if ("price" in values) {
    const n = Number(values["price"]);
    if (!Number.isFinite(n) || n < 0 || n > 1_000_000) return "price must be between 0 and 1,000,000";
  }
  if ("discountPrice" in values && values["discountPrice"] != null) {
    const n = Number(values["discountPrice"]);
    if (!Number.isFinite(n) || n < 0 || n > 1_000_000) return "discountPrice must be between 0 and 1,000,000";
    if ("price" in values && Number(values["discountPrice"]) >= Number(values["price"])) {
      return "discountPrice must be lower than price";
    }
  }
  for (const k of ["capacity", "sizeSqm"]) {
    if (k in values) {
      const n = Number(values[k]);
      if (!Number.isInteger(n) || n < 1 || n > 1000) return `${k} must be an integer between 1 and 1000`;
    }
  }
  if ("type" in values && !ALLOWED_TYPES.has(String(values["type"]))) return `type must be one of ${[...ALLOWED_TYPES].join(", ")}`;
  if ("status" in values && !ALLOWED_STATUSES.has(String(values["status"]))) return `status must be one of ${[...ALLOWED_STATUSES].join(", ")}`;
  return null;
}

interface RoomBody {
  name?: string;
  nameAr?: string;
  type?: string;
  description?: string;
  descriptionAr?: string;
  price?: number | string;
  capacity?: number;
  sizeSqm?: number;
  bedType?: string;
  amenities?: string[];
  images?: string[];
  status?: string;
  discountPrice?: number | string | null;
  discountLabel?: string | null;
  discountLabelAr?: string | null;
}

function clean(b: RoomBody, isCreate: boolean) {
  const out: Record<string, unknown> = {};
  const setIf = (k: keyof RoomBody, v: unknown) => {
    if (v !== undefined) out[k] = v;
  };
  setIf("name", b.name);
  setIf("nameAr", b.nameAr);
  setIf("type", b.type);
  setIf("description", b.description);
  setIf("descriptionAr", b.descriptionAr);
  if (b.price !== undefined && b.price !== null && b.price !== "") {
    out["price"] = String(b.price);
  }
  setIf("capacity", b.capacity != null ? Number(b.capacity) : undefined);
  setIf("sizeSqm", b.sizeSqm != null ? Number(b.sizeSqm) : undefined);
  setIf("bedType", b.bedType);
  if (Array.isArray(b.amenities)) out["amenities"] = b.amenities;
  if (Array.isArray(b.images)) out["images"] = b.images;
  setIf("status", b.status);
  if (b.discountPrice === null || b.discountPrice === "") {
    out["discountPrice"] = null;
  } else if (b.discountPrice !== undefined) {
    out["discountPrice"] = String(b.discountPrice);
  }
  if (b.discountLabel === null || b.discountLabel === "") out["discountLabel"] = null;
  else if (b.discountLabel !== undefined) out["discountLabel"] = b.discountLabel;
  if (b.discountLabelAr === null || b.discountLabelAr === "") out["discountLabelAr"] = null;
  else if (b.discountLabelAr !== undefined) out["discountLabelAr"] = b.discountLabelAr;
  if (isCreate) {
    const required = ["name", "nameAr", "type", "description", "descriptionAr", "price", "capacity", "sizeSqm", "bedType"] as const;
    for (const k of required) {
      if (out[k] === undefined || out[k] === null || out[k] === "") {
        return { error: `Field "${k}" is required.` };
      }
    }
  }
  const numErr = validateNumeric(out);
  if (numErr) return { error: numErr };
  return { values: out };
}

router.post("/admin/rooms", async (req: Request, res): Promise<void> => {
  const parsed = clean(req.body as RoomBody, true);
  if ("error" in parsed) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  try {
    const [created] = await db.insert(roomsTable).values(parsed.values as typeof roomsTable.$inferInsert).returning();
    if (!created) {
      res.status(500).json({ error: "Failed to create room" });
      return;
    }
    res.status(201).json(serializeRoom(created));
  } catch (err) {
    logger.error({ err }, "Create room failed");
    res.status(500).json({ error: "Failed to create room" });
  }
});

router.patch("/admin/rooms/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const parsed = clean(req.body as RoomBody, false);
  if ("error" in parsed) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  if (Object.keys(parsed.values).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }
  try {
    const [updated] = await db
      .update(roomsTable)
      .set(parsed.values as Partial<typeof roomsTable.$inferInsert>)
      .where(eq(roomsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Room not found" });
      return;
    }
    res.json(serializeRoom(updated));
  } catch (err) {
    logger.error({ err }, "Update room failed");
    res.status(500).json({ error: "Failed to update room" });
  }
});

router.delete("/admin/rooms/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    const [deleted] = await db.delete(roomsTable).where(eq(roomsTable.id, id)).returning();
    if (!deleted) {
      res.status(404).json({ error: "Room not found" });
      return;
    }
    res.json({ ok: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    if (/foreign key|violates/i.test(msg)) {
      res.status(409).json({ error: "Cannot delete room with existing bookings." });
      return;
    }
    logger.error({ err }, "Delete room failed");
    res.status(500).json({ error: "Failed to delete room" });
  }
});

export async function ensureRoomColumns(): Promise<void> {
  await db.execute(sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS discount_price numeric(10,2)`);
  await db.execute(sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS discount_label text`);
  await db.execute(sql`ALTER TABLE rooms ADD COLUMN IF NOT EXISTS discount_label_ar text`);
}

export default router;
