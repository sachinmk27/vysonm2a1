import express from "express";
import db from "./drizzle/index.js";
import controllers from "./controllers/index.js";
import verifyApiKey from "./middlewares/verifyApiKey.js";
import verifyTier from "./middlewares/verifyTier.js";
import { roleTable } from "./drizzle/schema.js";

const app = express();
app.use(express.json());

app.get("/ping", (req, res) => {
  res.status(200).send("pong");
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

async function initializeDatabase() {
  await db
    .insert(roleTable)
    .values([
      { name: "hobby", id: 1 },
      { name: "enterprise", id: 2 },
    ])
    .onConflictDoNothing();
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
