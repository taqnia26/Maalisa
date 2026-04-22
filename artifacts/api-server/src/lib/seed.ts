import { db, roomsTable, usersTable } from "@workspace/db";
import { hashPassword } from "./auth";
import { logger } from "./logger";

const HOTEL_IMAGES = [
  "/api/images/hotel-1.jpeg",
  "/api/images/hotel-2.jpeg",
  "/api/images/hotel-3.jpeg",
  "/api/images/hotel-4.jpeg",
  "/api/images/hotel-5.jpeg",
  "/api/images/hotel-6.jpeg",
  "/api/images/hotel-7.jpeg",
  "/api/images/hotel-8.jpeg",
  "/api/images/hotel-9.jpeg",
  "/api/images/hotel-10.jpeg",
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

export async function seedIfEmpty(): Promise<void> {
  const existing = await db.select().from(roomsTable);
  const adminEmail = "admin@hotel.com";
  const admins = await db.select().from(usersTable);
  if (existing.length === 0) {
    logger.info("Seeding rooms");
    for (let i = 0; i < ROOMS_SEED.length; i++) {
      const r = ROOMS_SEED[i];
      const images = [
        HOTEL_IMAGES[i % HOTEL_IMAGES.length],
        HOTEL_IMAGES[(i + 1) % HOTEL_IMAGES.length],
        HOTEL_IMAGES[(i + 2) % HOTEL_IMAGES.length],
      ];
      await db.insert(roomsTable).values({ ...r, images, status: "available" });
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
}
