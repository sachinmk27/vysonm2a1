import express from "express";
import cors from "cors";
import db from "./drizzle/index.js";
import controllers from "./controllers/index.js";
import verifyApiKey from "./middlewares/verifyApiKey.js";
import verifyTier from "./middlewares/verifyTier.js";
import { tierTable } from "./drizzle/schema.js";
import { insertUser } from "./drizzle/utils.js";

const app = express();
app.use(express.json());
app.use(cors());

app.get("/ping", async (_, res) => {
  try {
    await db.select(1);
    return res.send("pong");
  } catch (error) {
    console.error("Database connection failed:", error);
    return res.sendStatus(500);
  }
});

app.post("/shorten", verifyApiKey, controllers.shorten);
app.post(
  "/batch-shorten",
  verifyApiKey,
  verifyTier("enterprise"),
  controllers.batchShorten
);
app.get("/redirect", controllers.redirect);
app.delete("/shorten/:code?", verifyApiKey, controllers.deleteCode);
app.patch("/shorten/:code?", verifyApiKey, controllers.editCode);
app.get(
  "/shorten",
  verifyApiKey,
  verifyTier("enterprise"),
  controllers.getCodes
);

async function initializeDatabase() {
  await db
    .insert(tierTable)
    .values([
      { name: "hobby", id: 1 },
      { name: "enterprise", id: 2 },
    ])
    .onConflictDoNothing();
  await insertUser("abc@example.com", 1);
  await insertUser("xyz@example.com", 1);
  await insertUser("pqr@example.com", 1);
}

async function startServer() {
  await initializeDatabase();
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

if (
  process.env.NODE_ENV === "development" ||
  process.env.NODE_ENV === "production"
) {
  startServer();
}

export default app;
