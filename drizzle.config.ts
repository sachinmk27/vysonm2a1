import 'dotenv/config';
import { Config, defineConfig } from 'drizzle-kit';

export default process.env.NODE_ENV !== 'production' ?  defineConfig({
  out: './drizzle',
  schema: './src/db/schema.js',
  dialect: 'sqlite',
  dbCredentials: {
    url: 'file:sample.db',
  },
}) :  {
  schema: "./src/db/schema.js",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
} satisfies Config;
