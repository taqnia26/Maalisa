import path from "node:path";
import express from "express";
import app from "./app";
import { logger } from "./lib/logger";
import { seedIfEmpty } from "./lib/seed";
import { ensureRoomColumns } from "./routes/admin-rooms";

const rawPort = process.env["PORT"];
if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Serve hotel images at /api/images/* so they survive the reverse proxy.
const imagesDir = path.resolve(process.cwd(), "../../attached_assets");
app.use(
  "/api/images",
  express.static(imagesDir, {
    maxAge: "7d",
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Security-Policy", "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'");
    },
  }),
);

await ensureRoomColumns().catch((err) => {
  logger.error({ err }, "ensureRoomColumns failed");
});
await seedIfEmpty().catch((err) => {
  logger.error({ err }, "Seed failed");
});

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
  // eslint-disable-next-line no-console
  console.log("Admin Dashboard: http://localhost:3000/admin");
});
