import { Router, type IRouter } from "express";
import { db, feedbackTable } from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/feedback", async (req, res): Promise<void> => {
  const { vector, accepted } = req.body;

  if (!Array.isArray(vector) || vector.length === 0) {
    res.status(400).json({ error: "vector must be a non-empty array" });
    return;
  }

  if (!vector.every((v) => typeof v === "number" && isFinite(v))) {
    res.status(400).json({ error: "vector must contain only finite numbers" });
    return;
  }

  if (typeof accepted !== "boolean") {
    res.status(400).json({ error: "accepted must be a boolean" });
    return;
  }

  try {
    await db.insert(feedbackTable).values({ vector, accepted });
    res.json({ status: "learned" });
  } catch (err) {
    logger.error({ err }, "Failed to record feedback");
    res.status(500).json({ error: "Failed to record feedback" });
  }
});

export default router;
