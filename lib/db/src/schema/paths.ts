import { pgTable, text, serial, timestamp, real, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sessionsTable } from "./sessions";

export const pathsTable = pgTable("paths", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => sessionsTable.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  designation: text("designation"),
  description: text("description").notNull(),
  confidence: real("confidence").notNull().default(0.5),
  feedbackScore: real("feedback_score").notNull().default(0),
  nodes: text("nodes").array().notNull().default([]),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPathSchema = createInsertSchema(pathsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertPath = z.infer<typeof insertPathSchema>;
export type AdaptivePath = typeof pathsTable.$inferSelect;
