import { drizzle } from "drizzle-orm/libsql";
const db = drizzle(process.env.DB_FILE_NAME, {
  logger: process.env.NODE_ENV === "development",
});

export default db;
