import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";

export const roomsTable = pgTable("rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameAr: text("name_ar").notNull(),
  type: text("type").notNull(),
  description: text("description").notNull(),
  descriptionAr: text("description_ar").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  capacity: integer("capacity").notNull(),
  sizeSqm: integer("size_sqm").notNull(),
  bedType: text("bed_type").notNull(),
  amenities: text("amenities").array().notNull().default([]),
  images: text("images").array().notNull().default([]),
  status: text("status").notNull().default("available"),
  discountPrice: numeric("discount_price", { precision: 10, scale: 2 }),
  discountLabel: text("discount_label"),
  discountLabelAr: text("discount_label_ar"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Room = typeof roomsTable.$inferSelect;
