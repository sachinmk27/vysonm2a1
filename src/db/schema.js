import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const urlShortener = sqliteTable("url_shortener", {
  id: integer().primaryKey({ autoIncrement: true }),
  originalUrl: text("original_url"),
  shortCode: text("short_code"),
  visitCount: integer("visit_count").default(0),
  createdAt: text("created_at")
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
});
