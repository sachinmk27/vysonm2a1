import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import "dotenv/config";

import * as schema from "./schema.js";

const db = drizzle({
  schema: schema,
  client: createClient({
    url: process.env.DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
    logger: process.env.DATABASE_DEBUG === "enabled",
  }),
});

export default db;
