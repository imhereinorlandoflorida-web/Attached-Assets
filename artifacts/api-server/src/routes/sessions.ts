import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, sessionsTable, signalsTable, pathsTable, activityTable } from "@workspace/db";
import {
  CreateSessionBody,
  UpdateSessionBody,
  UpdateSessionParams,
  GetSessionParams,
  DeleteSessionParams,
  ListSignalsParams,
  CreateSignalParams,
  CreateSignalBody,
  ListPathsParams,
  SubmitPathFeedbackParams,
  SubmitPathFeedbackBody,
  GetSessionResponse,
  ListSessionsResponse,
  UpdateSessionResponse,
  ListSignalsResponse,
  ListPathsResponse,
  SubmitPathFeedbackResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/sessions", async (_req, res): Promise<void> => {
  const sessions = await db.select().from(sessionsTable).orderBy(sessionsTable.createdAt);
  res.json(ListSessionsResponse.parse(sessions));
});

router.post("/sessions", async (req, res): Promise<void> => {
  const parsed = CreateSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [session] = await db
    .insert(sessionsTable)
    .values({ name: parsed.data.name, description: parsed.data.description ?? null })
    .returning();

  await db.insert(activityTable).values({
    type: "session",
    sessionId: session.id,
    description: `New session "${session.name}" created`,
  });

  res.status(201).json(GetSessionResponse.parse(session));
});

router.get("/sessions/:id", async (req, res): Promise<void> => {
  const params = GetSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, params.data.id));
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json(GetSessionResponse.parse(session));
});

router.patch("/sessions/:id", async (req, res): Promise<void> => {
  const params = UpdateSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [session] = await db
    .update(sessionsTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(sessionsTable.id, params.data.id))
    .returning();
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.json(UpdateSessionResponse.parse(session));
});

router.delete("/sessions/:id", async (req, res): Promise<void> => {
  const params = DeleteSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [session] = await db
    .delete(sessionsTable)
    .where(eq(sessionsTable.id, params.data.id))
    .returning();
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/sessions/:id/signals", async (req, res): Promise<void> => {
  const params = ListSignalsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const signals = await db
    .select()
    .from(signalsTable)
    .where(eq(signalsTable.sessionId, params.data.id))
    .orderBy(signalsTable.createdAt);
  res.json(ListSignalsResponse.parse(signals));
});

router.post("/sessions/:id/signals", async (req, res): Promise<void> => {
  const params = CreateSignalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateSignalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [session] = await db.select().from(sessionsTable).where(eq(sessionsTable.id, params.data.id));
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const weight = parsed.data.weight ?? 0.5;
  const confidence = Math.min(1, (session.signalCount + 1) / 10);

  const [signal] = await db
    .insert(signalsTable)
    .values({
      sessionId: params.data.id,
      input: parsed.data.input,
      category: parsed.data.category,
      weight,
      confidence,
      tags: parsed.data.tags ?? [],
    })
    .returning();

  const newCount = session.signalCount + 1;
  const newScore = Math.min(1, session.adaptationScore + weight * 0.05);

  let generatedPath = null;
  if (newCount % 3 === 0) {
    const nodes = [parsed.data.input.slice(0, 30), `${parsed.data.category} filter`, "weight normalization", "path emit"];
    const [path] = await db
      .insert(pathsTable)
      .values({
        sessionId: params.data.id,
        label: `Path ${session.pathCount + 1}`,
        description: `Adaptive path derived from ${parsed.data.category} signal cluster`,
        confidence: Math.min(0.95, confidence + 0.1),
        feedbackScore: 0,
        nodes,
        status: "active",
      })
      .returning();
    generatedPath = path;

    await db
      .update(sessionsTable)
      .set({ signalCount: newCount, pathCount: session.pathCount + 1, adaptationScore: newScore, updatedAt: new Date() })
      .where(eq(sessionsTable.id, params.data.id));

    await db.insert(activityTable).values({
      type: "path",
      sessionId: params.data.id,
      description: `New adaptive path "${path.label}" generated`,
    });
  } else {
    await db
      .update(sessionsTable)
      .set({ signalCount: newCount, adaptationScore: newScore, updatedAt: new Date() })
      .where(eq(sessionsTable.id, params.data.id));
  }

  await db.insert(activityTable).values({
    type: "signal",
    sessionId: params.data.id,
    description: `Signal received: "${parsed.data.input.slice(0, 50)}"`,
  });

  res.status(201).json(signal);
});

router.get("/sessions/:id/paths", async (req, res): Promise<void> => {
  const params = ListPathsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const paths = await db
    .select()
    .from(pathsTable)
    .where(eq(pathsTable.sessionId, params.data.id))
    .orderBy(pathsTable.createdAt);
  res.json(ListPathsResponse.parse(paths));
});

router.post("/sessions/:id/paths/:pathId/feedback", async (req, res): Promise<void> => {
  const params = SubmitPathFeedbackParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = SubmitPathFeedbackBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [path] = await db.select().from(pathsTable).where(eq(pathsTable.id, params.data.pathId));
  if (!path) {
    res.status(404).json({ error: "Path not found" });
    return;
  }

  const newStatus = parsed.data.score >= 0.7 ? "reinforced" : parsed.data.score <= 0.3 ? "deprecated" : "active";

  const [updated] = await db
    .update(pathsTable)
    .set({ feedbackScore: parsed.data.score, status: newStatus })
    .where(eq(pathsTable.id, params.data.pathId))
    .returning();

  await db.insert(activityTable).values({
    type: "feedback",
    sessionId: params.data.id,
    description: `Feedback score ${parsed.data.score.toFixed(2)} submitted for path "${path.label}"`,
  });

  res.json(SubmitPathFeedbackResponse.parse(updated));
});

export default router;
