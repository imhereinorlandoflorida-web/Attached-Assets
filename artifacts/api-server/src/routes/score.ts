import { Router, type IRouter } from "express";

const router: IRouter = Router();

function computeScore(vector: number[]): number {
  const sumOfSquares = vector.reduce((acc, v) => acc + v * v, 0);
  const magnitude = Math.sqrt(sumOfSquares);
  return Math.min(1, magnitude / Math.sqrt(vector.length));
}

router.post("/score", (req, res): void => {
  const { vector } = req.body;

  if (!Array.isArray(vector) || vector.length === 0) {
    res.status(400).json({ error: "vector must be a non-empty array" });
    return;
  }

  if (!vector.every((v) => typeof v === "number" && isFinite(v))) {
    res.status(400).json({ error: "vector must contain only finite numbers" });
    return;
  }

  try {
    const score = computeScore(vector);
    res.json({ score });
  } catch {
    res.status(500).json({ error: "Scoring failed" });
  }
});

export default router;
