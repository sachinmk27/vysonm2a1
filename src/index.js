import express from "express";
import cors from "cors";
import * as Sentry from "@sentry/node";
import db from "./drizzle/index.js";
import controllers from "./controllers/index.js";
import verifyApiKey from "./middlewares/verifyApiKey.js";
import configureVerifyTier from "./middlewares/verifyTier.js";
import blacklist from "./middlewares/blacklist.js";
import { tierTable } from "./drizzle/schema.js";
import { insertUser } from "./drizzle/utils.js";
import logger from "./middlewares/logger.js";
import responseTime from "./middlewares/responseTime.js";
import timingLogWrapper from "./middlewares/timingLogWrapper.js";
import errorHandler from "./middlewares/errorHandler.js";
import winstonLogger from "./logger.js";

const app = express();

const originalSend = app.response.send;
app.response.send = function (body) {
  // startTime is set in the responseTime middleware
  const [seconds, nanoseconds] = process.hrtime(this.startTime);
  const elapsedTimeMs = seconds * 1000 + nanoseconds / 1e6;

  this.setHeader("X-Response-Time", `${elapsedTimeMs.toFixed(2)}ms`);
  return originalSend.call(this, body);
};

app.use(timingLogWrapper(logger));
app.use(timingLogWrapper(express.json()));
app.use(timingLogWrapper(cors()));
app.use(timingLogWrapper(responseTime));

app.get("/ping", async (_, res) => {
  try {
    await db.select(1);
    return res.send("pong");
  } catch (error) {
    winstonLogger.error("Database connection failed:", error);
    return res.sendStatus(500);
  }
});

app.get("/redirect", controllers.redirect);

app.use(timingLogWrapper(blacklist));
app.use(timingLogWrapper(verifyApiKey));

app.post("/shorten", controllers.shorten);
app.delete("/shorten/:code?", controllers.deleteCode);
app.patch("/shorten/:code?", controllers.editCode);

app.use(timingLogWrapper(configureVerifyTier("enterprise")));
app.post("/batch-shorten", controllers.batchShorten);
app.get("/shorten", controllers.getCodes);

app.get("/debug-sentry", function mainHandler(req, res) {
  throw new Error("My first Sentry error!");
});

Sentry.setupExpressErrorHandler(app);
app.use(errorHandler);

export async function initializeDatabase() {
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
    winstonLogger.info(`Server is running on port ${port}`);
  });
}

if (
  process.env.NODE_ENV === "development" ||
  process.env.NODE_ENV === "production"
) {
  startServer();
}

export default app;
