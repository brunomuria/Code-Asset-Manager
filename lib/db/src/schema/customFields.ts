import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const customFieldsTable = pgTable("custom_fields", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  fieldType: text("field_type").notNull().default("text"),
  options: text("options").array(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCustomFieldSchema = createInsertSchema(customFieldsTable).omit({ id: true, createdAt: true });
export type InsertCustomField = z.infer<typeof insertCustomFieldSchema>;
export type CustomField = typeof customFieldsTable.$inferSelect;
