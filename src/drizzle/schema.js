import { sqliteTable, integer, text, index } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const urlTable = sqliteTable(
  "url_shortener",
  {
    id: integer().primaryKey(),
    originalUrl: text("original_url").notNull(),
    shortCode: text("short_code").unique().notNull(),
    visitCount: integer("visit_count").default(0),
    createdAt: integer("created_at")
      .default(sql`(CURRENT_TIMESTAMP)`)
      .notNull(),
    lastAccessedAt: integer("last_accessed_at"),
    expiryDate: integer("expiry_date"),
    accessPassword: text("access_password"),
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
  tierId: integer("tier_id")
    .references(() => tierTable.id, {
      onUpdate: "cascade",
      onDelete: "set null",
    })
    .default(1),
});

export const tierTable = sqliteTable("tier", {
  id: integer().primaryKey(),
  name: text("name").unique().notNull(),
});
