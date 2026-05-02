import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/services/status", async (req, res) => {
  const start = Date.now();

  let dbStatus: "online" | "degraded" | "offline" = "offline";
  let dbLatencyMs = 0;
  try {
    const dbStart = Date.now();
    await db.execute(sql`SELECT 1`);
    dbLatencyMs = Date.now() - dbStart;
    dbStatus = dbLatencyMs < 100 ? "online" : "degraded";
  } catch {
    dbStatus = "offline";
  }

  const storageConfigured = !!(
    process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID &&
    process.env.PUBLIC_OBJECT_SEARCH_PATHS &&
    process.env.PRIVATE_OBJECT_DIR
  );

  const apiLatencyMs = Date.now() - start;

  res.json({
    timestamp: new Date().toISOString(),
    services: [
      {
        id: "api-server",
        name: "API Server",
        description: "Express REST + AI inference engine",
        status: "online",
        latencyMs: apiLatencyMs,
        version: "0.9.4",
        tags: ["core", "express", "inference"],
      },
      {
        id: "database",
        name: "PostgreSQL",
        description: "Persistent session and path storage",
        status: dbStatus,
        latencyMs: dbLatencyMs,
        version: "pg-16",
        tags: ["storage", "postgres"],
      },
      {
        id: "object-storage",
        name: "Object Storage",
        description: "GCS-backed file and asset storage",
        status: storageConfigured ? "online" : "unconfigured",
        latencyMs: 0,
        version: "gcs-v4",
        tags: ["storage", "gcs", "assets"],
        bucketId: process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID ?? null,
      },
      {
        id: "web-client",
        name: "Sentinel Web",
        description: "Vite + React adaptive path intelligence UI",
        status: "online",
        latencyMs: 0,
        version: "vite-7",
        tags: ["frontend", "react", "vite"],
      },
      {
        id: "mobile-client",
        name: "Sentinel Mobile",
        description: "Expo React Native companion app",
        status: "online",
        latencyMs: 0,
        version: "expo-54",
        tags: ["mobile", "expo", "react-native"],
      },
    ],
    meta: {
      nodeVersion: process.version,
      uptime: process.uptime(),
      env: process.env.NODE_ENV ?? "development",
    },
  });
});

export default router;
