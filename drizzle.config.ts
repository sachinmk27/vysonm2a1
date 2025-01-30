import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./src/drizzle/migrations",
  schema: "./src/drizzle/schema.js",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,

  // Overrides for production configuration
  ...(process.env.NODE_ENV === "production"
    ? {
        dialect: "turso",
        dbCredentials: {
          url: process.env.DATABASE_URL!,
          authToken: process.env.TURSO_AUTH_TOKEN,
        },
      }
    : {}),
});
