import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const generatedMessagesTable = pgTable("generated_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  leadId: uuid("lead_id").notNull(),
  campaignId: uuid("campaign_id").notNull(),
  content: text("content").notNull(),
  status: text("status").notNull().default("generated"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGeneratedMessageSchema = createInsertSchema(generatedMessagesTable).omit({ id: true, createdAt: true });
export type InsertGeneratedMessage = z.infer<typeof insertGeneratedMessageSchema>;
export type GeneratedMessage = typeof generatedMessagesTable.$inferSelect;
