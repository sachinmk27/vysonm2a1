import { sqliteTable, integer, text, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const urlShortener = sqliteTable("url_shortener", {
  id: integer().primaryKey({ autoIncrement: true }),
  originalUrl: text("original_url").notNull(),
  shortCode: text("short_code").unique().notNull(),
  visitCount: integer("visit_count").default(0),
  createdAt: text("created_at")
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
});
