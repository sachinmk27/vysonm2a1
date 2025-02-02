import { relations } from "drizzle-orm/relations";
import { urlTable, userTable } from "./schema.js";

export const urlRelations = relations(urlTable, ({ one }) => {
  return {
    user: one(userTable, {
      fields: [urlTable.userId],
      references: [userTable.id],
    }),
  };
});

export const userRelations = relations(userTable, ({ many }) => {
  return {
    urls: many(urlTable),
    role: one(tierTable, {
      fields: [userTable.tierId],
      references: [tierTable.id],
    }),
  };
});

export const roleRelations = relations(tierTable, ({ many }) => {
  return {
    users: many(userTable),
  };
});
