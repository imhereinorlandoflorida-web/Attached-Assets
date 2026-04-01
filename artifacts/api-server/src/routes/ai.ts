import { Router, type IRouter } from "express";
import { eq, avg, count, desc } from "drizzle-orm";
import { db, sessionsTable, signalsTable, pathsTable, activityTable } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// ── Memory Snapshot ─────────────────────────────────────────────────────────

router.get("/sessions/:id/memory", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, id));
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }

  const signals = await db.select().from(signalsTable).where(eq(signalsTable.sessionId, id));

  const categoryMap: Record<string, number> = {};
  let totalWeight = 0;
  let totalConfidence = 0;
  const allTags: string[] = [];

  for (const s of signals) {
    categoryMap[s.category] = (categoryMap[s.category] ?? 0) + 1;
    totalWeight += s.weight;
    totalConfidence += s.confidence;
    allTags.push(...s.tags);
  }

  const n = signals.length || 1;
  const dominantCategory = Object.entries(categoryMap).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "behavioral";

  const tagFreq: Record<string, number> = {};
  for (const t of allTags) tagFreq[t] = (tagFreq[t] ?? 0) + 1;
  const learnedTags = Object.entries(tagFreq).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t);

  const patterns = signals.slice(-5).map(s => s.input.slice(0, 60));

  res.json({
    sessionId: id,
    signalCount: signals.length,
    dominantCategory,
    avgWeight: Math.round((totalWeight / n) * 1000) / 1000,
    avgConfidence: Math.round((totalConfidence / n) * 1000) / 1000,
    patterns,
    learnedTags,
    adaptationScore: session.adaptationScore,
  });
});

router.delete("/sessions/:id/memory", async (req, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, id));
  if (!session) { res.status(404).json({ error: "Session not found" }); return; }

  await db.delete(signalsTable).where(eq(signalsTable.sessionId, id));
  await db.delete(pathsTable).where(eq(pathsTable.sessionId, id));
  await db.update(sessionsTable).set({ signalCount: 0, pathCount: 0, adaptationScore: 0, updatedAt: new Date() }).where(eq(sessionsTable.id, id));

  await db.insert(activityTable).values({
    type: "session",
    sessionId: id,
    description: `Memory reset for session "${session.name}"`,
  });

  res.json({
    sessionId: id,
    signalCount: 0,
    dominantCategory: "behavioral",
    avgWeight: 0,
    avgConfidence: 0,
    patterns: [],
    learnedTags: [],
    adaptationScore: 0,
  });
});

// ── AI Inference (SSE) ───────────────────────────────────────────────────────

router.post("/infer", async (req, res): Promise<void> => {
  const { input, sessionId } = req.body as { input?: string; sessionId?: number | null };

  if (!input || typeof input !== "string") {
    res.status(400).json({ error: "input is required" });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // Load memory context from session
    let memoryContext = "";
    let session = null;
    let priorSignals: typeof signalsTable.$inferSelect[] = [];

    if (sessionId) {
      const rows = await db.select().from(sessionsTable).where(eq(sessionsTable.id, sessionId));
      session = rows[0] ?? null;

      if (session) {
        priorSignals = await db.select().from(signalsTable)
          .where(eq(signalsTable.sessionId, sessionId))
          .orderBy(desc(signalsTable.createdAt))
          .limit(20);

        if (priorSignals.length > 0) {
          const categoryMap: Record<string, number> = {};
          for (const s of priorSignals) categoryMap[s.category] = (categoryMap[s.category] ?? 0) + 1;
          const dominant = Object.entries(categoryMap).sort((a, b) => b[1] - a[1])[0]?.[0];
          const allTags = [...new Set(priorSignals.flatMap(s => s.tags))].slice(0, 10);

          memoryContext = `Session memory context:
- Session name: ${session.name}
- Prior signals (${priorSignals.length}): ${priorSignals.slice(0, 5).map(s => `"${s.input.slice(0, 50)}"`).join(", ")}
- Dominant category: ${dominant}
- Adaptation score: ${session.adaptationScore.toFixed(3)}
- Learned tags: ${allTags.join(", ")}
`;
        }
      }
    }

    send("status", { phase: "analyzing", message: "Analyzing input through semantic engine..." });

    const systemPrompt = `You are Sentinel — an adaptive path intelligence engine. Your job is to score incoming user signals semantically and return structured intelligence.

${memoryContext}

For every input, respond ONLY with a JSON object following this exact schema:
{
  "weight": <number 0.0-1.0, semantic significance>,
  "confidence": <number 0.0-1.0, certainty of classification>,
  "category": <"behavioral" | "semantic" | "temporal" | "contextual">,
  "tags": [<3-5 relevant string tags>],
  "reasoning": <one concise sentence explaining the score>,
  "suggestedPathNodes": [<3-5 string steps describing the adaptive path this signal should follow>],
  "pathLabel": <short label for the suggested path>,
  "adaptationDelta": <number -0.1 to 0.1, how this signal changes the session's adaptation score>
}

Score based on semantic richness, signal specificity, and contextual relevance to prior signals. Higher weight = more semantically meaningful. Higher confidence = clearer classification.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 512,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: input },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let scored: {
      weight: number;
      confidence: number;
      category: string;
      tags: string[];
      reasoning: string;
      suggestedPathNodes: string[];
      pathLabel: string;
      adaptationDelta: number;
    };

    try {
      scored = JSON.parse(raw);
    } catch {
      send("error", { message: "Failed to parse AI response" });
      res.end();
      return;
    }

    // Clamp values
    scored.weight = Math.max(0, Math.min(1, scored.weight ?? 0.5));
    scored.confidence = Math.max(0, Math.min(1, scored.confidence ?? 0.5));
    scored.adaptationDelta = Math.max(-0.1, Math.min(0.1, scored.adaptationDelta ?? 0));
    const validCategories = ["behavioral", "semantic", "temporal", "contextual"];
    if (!validCategories.includes(scored.category)) scored.category = "semantic";

    send("scored", {
      weight: scored.weight,
      confidence: scored.confidence,
      category: scored.category,
      tags: scored.tags ?? [],
      reasoning: scored.reasoning ?? "",
    });

    // Persist signal if session provided
    let persistedSignal = null;
    let persistedPath = null;

    if (session && sessionId) {
      const [newSignal] = await db.insert(signalsTable).values({
        sessionId,
        input,
        category: scored.category,
        weight: scored.weight,
        confidence: scored.confidence,
        tags: scored.tags ?? [],
      }).returning();
      persistedSignal = newSignal;

      const newCount = session.signalCount + 1;
      const newScore = Math.max(0, Math.min(1, session.adaptationScore + scored.adaptationDelta));

      send("status", { phase: "routing", message: "Computing adaptive path..." });

      // Generate a path every 3 signals
      if (newCount % 3 === 0 && scored.suggestedPathNodes?.length) {
        const [newPath] = await db.insert(pathsTable).values({
          sessionId,
          label: scored.pathLabel ?? `Path ${session.pathCount + 1}`,
          description: `AI-derived ${scored.category} path`,
          confidence: scored.confidence,
          feedbackScore: 0,
          nodes: scored.suggestedPathNodes,
          status: "active",
        }).returning();
        persistedPath = newPath;

        await db.update(sessionsTable).set({
          signalCount: newCount,
          pathCount: session.pathCount + 1,
          adaptationScore: newScore,
          updatedAt: new Date(),
        }).where(eq(sessionsTable.id, sessionId));

        await db.insert(activityTable).values({
          type: "path",
          sessionId,
          description: `AI generated path "${newPath.label}" from inference`,
        });
      } else {
        await db.update(sessionsTable).set({
          signalCount: newCount,
          adaptationScore: newScore,
          updatedAt: new Date(),
        }).where(eq(sessionsTable.id, sessionId));
      }

      await db.insert(activityTable).values({
        type: "signal",
        sessionId,
        description: `AI scored: "${input.slice(0, 50)}" → weight ${scored.weight.toFixed(2)}`,
      });
    }

    send("path", {
      label: scored.pathLabel ?? "Unnamed path",
      nodes: scored.suggestedPathNodes ?? [],
      persisted: persistedPath !== null,
    });

    send("done", {
      signal: persistedSignal ? { id: persistedSignal.id } : null,
      path: persistedPath ? { id: persistedPath.id, label: persistedPath.label } : null,
      adaptationDelta: scored.adaptationDelta,
    });

  } catch (err) {
    logger.error({ err }, "AI inference error");
    send("error", { message: "AI engine error" });
  }

  res.end();
});

export default router;
