import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import app from "./app";
import { logger } from "./lib/logger";
import { seedIfEmpty, ensureExtendedSchema } from "./lib/seed";
import { ensureRoomColumns } from "./routes/admin-rooms";
import { getUploadsFile } from "./lib/gcs";

const __here = path.dirname(fileURLToPath(import.meta.url));
export const ATTACHED_ASSETS_DIR = path.resolve(__here, "..", "..", "..", "attached_assets");

const rawPort = process.env["PORT"];
if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Serve user-uploaded room images from Object Storage (durable across deploys/restarts).
// Mounted BEFORE the static middleware so /api/images/uploads/* is handled here.
app.get("/api/images/uploads/:name", async (req, res) => {
  const name = req.params.name;
  if (!name || !/^[A-Za-z0-9._-]+$/.test(name)) {
    res.status(400).send("Bad name");
    return;
  }
  try {
    const file = getUploadsFile(name);
    const [exists] = await file.exists();
    if (!exists) {
      res.status(404).send("Not found");
      return;
    }
    const [meta] = await file.getMetadata();
    if (meta.contentType) res.setHeader("Content-Type", meta.contentType);
    res.setHeader("Cache-Control", "public, max-age=604800");
    res.setHeader("X-Content-Type-Options", "nosniff");
    file
      .createReadStream()
      .on("error", (err) => {
        logger.error({ err, name }, "GCS stream error");
        if (!res.headersSent) res.status(500).end();
        else res.end();
      })
      .pipe(res);
  } catch (err) {
    logger.error({ err, name }, "Failed to serve uploaded image");
    if (!res.headersSent) res.status(500).send("Error");
  }
});

// Serve hotel images at /api/images/* so they survive the reverse proxy.
const imagesDir = ATTACHED_ASSETS_DIR;
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

// Start listening immediately so the platform health check (/api/healthz) succeeds
// even on slow cold boots. DB migration + seeding run in the background.
app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
  // eslint-disable-next-line no-console
  console.log("Admin Dashboard: http://localhost:3000/admin");

  ensureRoomColumns()
    .catch((err) => logger.error({ err }, "ensureRoomColumns failed"))
    .then(() =>
      ensureExtendedSchema().catch((err) =>
        logger.error({ err }, "ensureExtendedSchema failed"),
      ),
    )
    .then(() =>
      seedIfEmpty().catch((err) => logger.error({ err }, "Seed failed")),
    );
});
