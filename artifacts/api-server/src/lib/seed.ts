import { db, roomsTable, usersTable } from "@workspace/db";
import { sql, eq } from "drizzle-orm";
import { hashPassword } from "./auth";
import { logger } from "./logger";

/**
 * Idempotent schema migrations for staff/branches/payments features.
 * Safe to run on every boot.
 */
export async function ensureExtendedSchema(): Promise<void> {
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS branch_id integer`);
  await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions text`);
  await db.execute(sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS paid_amount numeric(10,2) NOT NULL DEFAULT '0'`);
  await db.execute(sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid'`);
  await db.execute(sql`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS branch_id integer`);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS branches (
      id serial PRIMARY KEY,
      name text NOT NULL,
      name_ar text,
      address text,
      phone text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS payments (
      id serial PRIMARY KEY,
      booking_id integer NOT NULL,
      amount numeric(10,2) NOT NULL,
      method text NOT NULL DEFAULT 'cash',
      branch_id integer,
      branch_name text,
      received_by_id integer,
      received_by_name text,
      note text,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS payments_booking_id_idx ON payments (booking_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS bookings_branch_id_idx ON bookings (branch_id)`);
}

const STUDIO_IMAGES = [
  "/api/images/studio-01.png",
  "/api/images/studio-02.png",
  "/api/images/studio-03.png",
  "/api/images/studio-04.png",
];
const SUITE1_IMAGES = [
  "/api/images/suite1-01.png",
  "/api/images/suite1-02.png",
  "/api/images/suite1-03.png",
  "/api/images/suite1-04.png",
];
const SUITE2_IMAGES = [
  "/api/images/suite2-01.png",
  "/api/images/suite2-02.png",
  "/api/images/suite2-03.png",
  "/api/images/suite2-04.png",
];

const ROOMS_SEED = [
  {
    name: "Standard King",
    nameAr: "غرفة كينج عادية",
    type: "standard",
    description: "Warm and serene retreat with king bed, marble bath, and city light views.",
    descriptionAr: "ملاذ هادئ بسرير كينج، حمام رخامي، وإطلالة على أضواء المدينة.",
    price: "320",
    capacity: 2,
    sizeSqm: 28,
    bedType: "King",
    amenities: ["wifi", "ac", "tv", "minibar", "safe", "room-service"],
  },
  {
    name: "Standard Twin",
    nameAr: "غرفة عادية مزدوجة",
    type: "standard",
    description: "Comfortable twin-bed room finished in cream tones and warm wood paneling.",
    descriptionAr: "غرفة مزدوجة مريحة بدرجات الكريم والخشب الدافئ.",
    price: "300",
    capacity: 2,
    sizeSqm: 26,
    bedType: "Twin",
    amenities: ["wifi", "ac", "tv", "minibar", "safe"],
  },
  {
    name: "Standard Family",
    nameAr: "غرفة عائلية عادية",
    type: "standard",
    description: "Family-friendly room with a queen and a single bed, perfect for short stays.",
    descriptionAr: "غرفة عائلية بسريرين، مثالية للإقامات القصيرة.",
    price: "360",
    capacity: 3,
    sizeSqm: 32,
    bedType: "Queen + Single",
    amenities: ["wifi", "ac", "tv", "minibar", "safe", "room-service"],
  },
  {
    name: "Deluxe King",
    nameAr: "ديلوكس كينج",
    type: "deluxe",
    description: "Spacious deluxe quarters with seating area, premium linens, and rainfall shower.",
    descriptionAr: "غرفة ديلوكس فسيحة بصالة جلوس، أقمشة فاخرة، ودش مطري.",
    price: "520",
    capacity: 2,
    sizeSqm: 42,
    bedType: "King",
    amenities: ["wifi", "ac", "tv", "minibar", "safe", "room-service", "bathtub", "balcony"],
  },
  {
    name: "Deluxe Twin",
    nameAr: "ديلوكس مزدوجة",
    type: "deluxe",
    description: "Refined twin-bed deluxe with workspace, Nespresso bar, and arabesque accents.",
    descriptionAr: "ديلوكس مزدوجة بمكتب عمل، ركن قهوة نسبريسو، ولمسات عربية.",
    price: "490",
    capacity: 2,
    sizeSqm: 40,
    bedType: "Twin",
    amenities: ["wifi", "ac", "tv", "minibar", "safe", "room-service", "workspace"],
  },
  {
    name: "Royal Suite",
    nameAr: "الجناح الملكي",
    type: "suite",
    description: "Two-room suite with private living room, dining nook, and panoramic windows over Riyadh.",
    descriptionAr: "جناح من غرفتين بصالة معيشة خاصة، ركن طعام، ونوافذ بانورامية على الرياض.",
    price: "950",
    capacity: 4,
    sizeSqm: 78,
    bedType: "King + Sofa Bed",
    amenities: ["wifi", "ac", "tv", "minibar", "safe", "room-service", "bathtub", "living-room", "kitchenette", "balcony"],
  },
  {
    name: "Diplomatic Suite",
    nameAr: "الجناح الدبلوماسي",
    type: "suite",
    description: "Our flagship suite — formal majlis, private study, marble bath, and a private entrance.",
    descriptionAr: "جناحنا الأرقى — مجلس رسمي، مكتب خاص، حمام رخامي، ومدخل خاص.",
    price: "1450",
    capacity: 4,
    sizeSqm: 110,
    bedType: "King + Twin",
    amenities: ["wifi", "ac", "tv", "minibar", "safe", "room-service", "bathtub", "living-room", "majlis", "kitchenette", "study"],
  },
];

// Images assigned per room type for seeding and migration
const ROOM_IMAGES_BY_TYPE: Record<string, string[][]> = {
  // index within type → [gallery images]
  standard: [STUDIO_IMAGES, STUDIO_IMAGES, STUDIO_IMAGES],
  deluxe: [SUITE1_IMAGES, SUITE1_IMAGES],
  suite: [SUITE2_IMAGES, SUITE2_IMAGES],
};

export async function seedIfEmpty(): Promise<void> {
  const existing = await db.select().from(roomsTable);
  const adminEmail = "admin@hotel.com";
  const admins = await db.select().from(usersTable);
  if (existing.length === 0) {
    logger.info("Seeding rooms");
    const counters: Record<string, number> = {};
    for (const r of ROOMS_SEED) {
      const idx = counters[r.type] ?? 0;
      counters[r.type] = idx + 1;
      const pool = ROOM_IMAGES_BY_TYPE[r.type] ?? [STUDIO_IMAGES];
      const images = pool[idx % pool.length];
      await db.insert(roomsTable).values({ ...r, images, status: "available" });
    }
  } else {
    // Update existing rooms to use new professional photos if they still have old hotel-N paths
    const counters: Record<string, number> = {};
    for (const room of existing) {
      const oldImages: string[] = Array.isArray(room.images) ? (room.images as string[]) : [];
      const hasOldImages = oldImages.some((img) => typeof img === "string" && img.includes("hotel-"));
      if (hasOldImages) {
        const type = room.type ?? "standard";
        const idx = counters[type] ?? 0;
        counters[type] = idx + 1;
        const pool = ROOM_IMAGES_BY_TYPE[type] ?? [STUDIO_IMAGES];
        const images = pool[idx % pool.length];
        await db.update(roomsTable).set({ images }).where(eq(roomsTable.id, room.id));
      }
    }
  }
  if (!admins.some((u) => u.email === adminEmail)) {
    logger.info("Seeding admin user");
    await db.insert(usersTable).values({
      name: "Hotel Admin",
      email: adminEmail,
      passwordHash: await hashPassword("admin123"),
      phone: "+966500000000",
      role: "admin",
    });
  }
  const receptionEmail = "reception@hotel.com";
  if (!admins.some((u) => u.email === receptionEmail)) {
    logger.info("Seeding reception user");
    await db.insert(usersTable).values({
      name: "موظف الاستقبال",
      email: receptionEmail,
      passwordHash: await hashPassword("reception123"),
      phone: "+966500000001",
      role: "reception",
    });
  }
  const financeEmail = "finance@hotel.com";
  if (!admins.some((u) => u.email === financeEmail)) {
    logger.info("Seeding finance user");
    await db.insert(usersTable).values({
      name: "مسؤول المالية",
      email: financeEmail,
      passwordHash: await hashPassword("finance123"),
      phone: "+966500000002",
      role: "finance",
    });
  }
}
