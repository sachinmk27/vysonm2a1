import { sqliteTable, integer, text, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const urlTable = sqliteTable(
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
    userId: integer("user_id")
      .references(() => userTable.id, { onDelete: "restrict" })
      .notNull(),
  },
  (table) => {
    return [
      index("idx_url_shortener_short_code_original_url").on(
        table.shortCode,
        table.originalUrl
      ),
      index("idx_url_shortener_original_url").on(table.originalUrl),
    ];
  }
);

export const userTable = sqliteTable("user", {
  id: integer().primaryKey(),
  email: text("email").unique().notNull(),
  name: text("name"),
  apiKey: text("api_key").unique().notNull(),
  createdAt: integer("created_at")
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
});
