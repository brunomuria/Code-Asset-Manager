import { pgTable, text, timestamp, uuid, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const funnelStagesTable = pgTable("funnel_stages", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  order: integer("order").notNull().default(0),
  color: text("color"),
  requiredFields: text("required_fields").array().notNull().default([]),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFunnelStageSchema = createInsertSchema(funnelStagesTable).omit({ id: true, createdAt: true });
export type InsertFunnelStage = z.infer<typeof insertFunnelStageSchema>;
export type FunnelStage = typeof funnelStagesTable.$inferSelect;
