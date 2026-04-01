import { Router, type IRouter } from "express";
import { eq, sql, desc } from "drizzle-orm";
import { db, sessionsTable, signalsTable, pathsTable, activityTable } from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetRecentActivityResponse,
  GetSignalWeightsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const [sessionStats] = await db
    .select({
      totalSessions: sql<number>`count(*)::int`,
      activeSessions: sql<number>`count(*) filter (where status = 'active')::int`,
    })
    .from(sessionsTable);

  const [signalStats] = await db
    .select({ totalSignals: sql<number>`count(*)::int` })
    .from(signalsTable);

  const [pathStats] = await db
    .select({ totalPaths: sql<number>`count(*)::int` })
    .from(pathsTable);

  const [scoreStats] = await db
    .select({ avg: sql<number>`coalesce(avg(adaptation_score), 0)` })
    .from(sessionsTable);

  const [topCategoryRow] = await db
    .select({ category: signalsTable.category, count: sql<number>`count(*)::int` })
    .from(signalsTable)
    .groupBy(signalsTable.category)
    .orderBy(desc(sql`count(*)`))
    .limit(1);

  const summary = {
    totalSessions: sessionStats.totalSessions ?? 0,
    activeSessions: sessionStats.activeSessions ?? 0,
    totalSignals: signalStats.totalSignals ?? 0,
    totalPaths: pathStats.totalPaths ?? 0,
    avgAdaptationScore: Number((scoreStats.avg ?? 0).toFixed(3)),
    topCategory: topCategoryRow?.category ?? "behavioral",
  };

  res.json(GetDashboardSummaryResponse.parse(summary));
});

router.get("/dashboard/recent-activity", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: activityTable.id,
      type: activityTable.type,
      sessionId: activityTable.sessionId,
      sessionName: sessionsTable.name,
      description: activityTable.description,
      createdAt: activityTable.createdAt,
    })
    .from(activityTable)
    .leftJoin(sessionsTable, eq(activityTable.sessionId, sessionsTable.id))
    .orderBy(desc(activityTable.createdAt))
    .limit(20);

  const mapped = rows.map((r) => ({
    id: r.id,
    type: r.type,
    sessionId: r.sessionId,
    sessionName: r.sessionName ?? "Unknown Session",
    description: r.description,
    createdAt: r.createdAt,
  }));

  res.json(GetRecentActivityResponse.parse(mapped));
});

router.get("/dashboard/signal-weights", async (_req, res): Promise<void> => {
  const totalRow = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(signalsTable);

  const total = totalRow[0]?.count ?? 1;

  const rows = await db
    .select({
      category: signalsTable.category,
      avgWeight: sql<number>`avg(weight)`,
      count: sql<number>`count(*)::int`,
    })
    .from(signalsTable)
    .groupBy(signalsTable.category)
    .orderBy(desc(sql`count(*)`));

  const stats = rows.map((r) => ({
    category: r.category,
    avgWeight: Number((r.avgWeight ?? 0).toFixed(3)),
    count: r.count,
    percentage: Number(((r.count / total) * 100).toFixed(1)),
  }));

  res.json(GetSignalWeightsResponse.parse(stats));
});

export default router;
