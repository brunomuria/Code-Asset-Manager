import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const activityEventsTable = pgTable("activity_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id").notNull(),
  leadName: text("lead_name").notNull(),
  workspaceId: uuid("workspace_id").notNull(),
  eventType: text("event_type").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertActivityEventSchema = createInsertSchema(activityEventsTable).omit({ id: true, createdAt: true });
export type InsertActivityEvent = z.infer<typeof insertActivityEventSchema>;
export type ActivityEvent = typeof activityEventsTable.$inferSelect;
