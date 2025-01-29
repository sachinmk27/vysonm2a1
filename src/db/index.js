import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

const db =
  process.env.NODE_ENV !== "production"
    ? drizzle("file:sample.db", {
        logger: process.env.DATABASE_DEBUG === "enabled",
      })
    : drizzle(
        createClient({
          url: process.env.DATABASE_URL,
          authToken: process.env.TURSO_AUTH_TOKEN,
          logger: process.env.DATABASE_DEBUG === "enabled",
        })
      );

export default db;
