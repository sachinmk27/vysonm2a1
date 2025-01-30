import {
  sqliteTable,
  integer,
  text,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const urlShortener = sqliteTable(
  "url_shortener",
  {
    id: integer().primaryKey(),
    originalUrl: text("original_url").notNull(),
    shortCode: text("short_code").notNull(),
    visitCount: integer("visit_count").default(0),
    createdAt: integer("created_at")
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    lastAccessedAt: integer("last_accessed_at"),
  },
  (table) => {
    return [
      uniqueIndex("idx_url_shortener_short_code_original_url").on(
        table.shortCode,
        table.originalUrl
      ),
      index("idx_url_shortener_original_url_short_code").on(
        table.originalUrl,
        table.shortCode
      ),
    ];
  }
);
