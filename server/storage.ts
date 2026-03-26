import {
  type Update, type InsertUpdate, updates,
  type UpdateItem, type InsertUpdateItem, updateItems,
  type Feedback, type InsertFeedback, feedback,
} from "@shared/schema";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, desc, and } from "drizzle-orm";

const sqlite = new Database("data.db");
sqlite.pragma("journal_mode = WAL");

// Auto-create tables on startup (Railway has ephemeral storage)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS updates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS update_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    update_id INTEGER NOT NULL,
    section TEXT NOT NULL,
    title TEXT NOT NULL,
    detail TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    update_id INTEGER NOT NULL,
    section TEXT NOT NULL,
    author_name TEXT NOT NULL,
    author_email TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

export const db = drizzle(sqlite);

export interface IStorage {
  // Updates
  getUpdates(): Update[];
  getUpdate(id: number): Update | undefined;
  getUpdateByDate(date: string): Update | undefined;
  createUpdate(data: InsertUpdate): Update;
  publishUpdate(id: number): Update | undefined;

  // Update Items
  getItemsByUpdate(updateId: number): UpdateItem[];
  createItem(data: InsertUpdateItem): UpdateItem;
  updateItem(id: number, data: Partial<InsertUpdateItem>): UpdateItem | undefined;
  deleteItem(id: number): void;

  // Feedback
  getFeedbackByUpdate(updateId: number): Feedback[];
  getFeedbackBySection(updateId: number, section: string): Feedback[];
  createFeedback(data: InsertFeedback): Feedback;
}

export class DatabaseStorage implements IStorage {
  getUpdates(): Update[] {
    return db.select().from(updates).orderBy(desc(updates.date)).all();
  }

  getUpdate(id: number): Update | undefined {
    return db.select().from(updates).where(eq(updates.id, id)).get();
  }

  getUpdateByDate(date: string): Update | undefined {
    return db.select().from(updates).where(eq(updates.date, date)).get();
  }

  createUpdate(data: InsertUpdate): Update {
    return db.insert(updates).values(data).returning().get();
  }

  publishUpdate(id: number): Update | undefined {
    return db.update(updates).set({ status: "published" }).where(eq(updates.id, id)).returning().get();
  }

  getItemsByUpdate(updateId: number): UpdateItem[] {
    return db.select().from(updateItems).where(eq(updateItems.updateId, updateId)).orderBy(updateItems.sortOrder).all();
  }

  createItem(data: InsertUpdateItem): UpdateItem {
    return db.insert(updateItems).values(data).returning().get();
  }

  updateItem(id: number, data: Partial<InsertUpdateItem>): UpdateItem | undefined {
    return db.update(updateItems).set(data).where(eq(updateItems.id, id)).returning().get();
  }

  deleteItem(id: number): void {
    db.delete(updateItems).where(eq(updateItems.id, id)).run();
  }

  getFeedbackByUpdate(updateId: number): Feedback[] {
    return db.select().from(feedback).where(eq(feedback.updateId, updateId)).orderBy(desc(feedback.createdAt)).all();
  }

  getFeedbackBySection(updateId: number, section: string): Feedback[] {
    return db.select().from(feedback)
      .where(and(eq(feedback.updateId, updateId), eq(feedback.section, section)))
      .orderBy(desc(feedback.createdAt))
      .all();
  }

  createFeedback(data: InsertFeedback): Feedback {
    return db.insert(feedback).values(data).returning().get();
  }
}

export const storage = new DatabaseStorage();
