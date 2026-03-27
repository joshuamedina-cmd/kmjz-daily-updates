import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Daily updates — one per day
export const updates = sqliteTable("updates", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // YYYY-MM-DD
  status: text("status").notNull().default("draft"), // draft | published
  createdAt: text("created_at").notNull(),
});

// Individual line items within an update, organized by section
export const updateItems = sqliteTable("update_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  updateId: integer("update_id").notNull(),
  section: text("section").notNull(), // urgent | major | production | strategic
  title: text("title").notNull(), // one-liner summary
  detail: text("detail").notNull(), // expanded explanation
  sortOrder: integer("sort_order").notNull().default(0),
});

// Feedback from partners, tagged to a section
export const feedback = sqliteTable("feedback", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  updateId: integer("update_id").notNull(),
  section: text("section").notNull(), // urgent | major | production | strategic
  authorName: text("author_name").notNull(),
  authorEmail: text("author_email").notNull(),
  message: text("message").notNull(),
  createdAt: text("created_at").notNull(),
});

// Dashboard gauge configuration — single row, key-value store
export const gaugeConfig = sqliteTable("gauge_config", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(), // e.g. "production", "financialHealth", "sales"
  value: text("value").notNull(), // JSON string for flexibility
});

// Insert schemas
export const insertUpdateSchema = createInsertSchema(updates).omit({ id: true });
export const insertUpdateItemSchema = createInsertSchema(updateItems).omit({ id: true });
export const insertFeedbackSchema = createInsertSchema(feedback).omit({ id: true });
export const insertGaugeConfigSchema = createInsertSchema(gaugeConfig).omit({ id: true });

// Types
export type Update = typeof updates.$inferSelect;
export type InsertUpdate = z.infer<typeof insertUpdateSchema>;
export type UpdateItem = typeof updateItems.$inferSelect;
export type InsertUpdateItem = z.infer<typeof insertUpdateItemSchema>;
export type Feedback = typeof feedback.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type GaugeConfig = typeof gaugeConfig.$inferSelect;
export type InsertGaugeConfig = z.infer<typeof insertGaugeConfigSchema>;
