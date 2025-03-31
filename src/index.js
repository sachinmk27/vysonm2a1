import express from "express";
import cors from "cors";
import * as Sentry from "@sentry/node";
import db from "./drizzle/index.js";
import controllers from "./controllers/index.js";
import verifyApiKey from "./middlewares/verifyApiKey.js";
import configureVerifyTier from "./middlewares/verifyTier.js";
import { tierTable } from "./drizzle/schema.js";
import { insertUser } from "./drizzle/utils.js";
import logger from "./middlewares/logger.js";
import responseTime from "./middlewares/responseTime.js";
import timingLogWrapper from "./middlewares/timingLogWrapper.js";
import errorHandler from "./middlewares/errorHandler.js";
import rateLimiter from "./middlewares/rateLimiter.js";
import winstonLogger from "./logger.js";
import { TIERS } from "./constants.js";
import rateLimiterByTier from "./middlewares/rateLimiterByTier.js";

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
if (process.env.NODE_ENV !== "test") {
  app.use(
    timingLogWrapper(
      rateLimiter({
        requestLimit: 100,
        timeWindowInSeconds: 60,
        redisKeyPrefix: `rateLimit:ip`,
        getRedisKey: (req) => req.ip,
      })
    )
  );
  app.use(
    timingLogWrapper(
      rateLimiterByTier({
        tier: TIERS.FREE,
        requestLimit: 5,
        timeWindowInSeconds: 60,
        redisKeyPrefix: `rateLimit:tier`,
        getRedisKey: (req) => req.headers["x-api-key"],
      })
    )
  );
}
app.get("/ping", async (_, res) => {
  try {
    await db.select(1);
    return res.send("pong");
  } catch (error) {
    winstonLogger.error("Database connection failed:", error);
    return res.sendStatus(500);
  }
});

if (process.env.NODE_ENV !== "test") {
  app.use(
    "/redirect",
    timingLogWrapper(
      rateLimiter({
        requestLimit: 50,
        timeWindowInSeconds: 1,
        redisKeyPrefix: `rateLimit:apiKey:redirect`,
        getRedisKey: (req) => req.headers["x-api-key"],
      })
    )
  );
}
app.get("/redirect", controllers.redirect);

app.use(timingLogWrapper(verifyApiKey));

if (process.env.NODE_ENV !== "test") {
  app.use(
    "/shorten",
    timingLogWrapper(
      rateLimiter({
        requestLimit: 10,
        timeWindowInSeconds: 1,
        redisKeyPrefix: `rateLimit:apiKey:shorten`,
        getRedisKey: (req) => req.headers["x-api-key"],
      })
    )
  );
}
app.post("/shorten", controllers.shorten);
app.delete("/shorten/:code?", controllers.deleteCode);
app.patch("/shorten/:code?", controllers.editCode);

app.use(timingLogWrapper(configureVerifyTier(TIERS.ENTERPRISE)));
app.post("/batch-shorten", controllers.batchShorten);
app.get("/shorten", controllers.getCodes);

app.get("/debug-sentry", function mainHandler(req, res) {
  throw new Error("My first Sentry error!");
});

Sentry.setupExpressErrorHandler(app);
app.use(errorHandler);

export async function initializeDatabase() {
  const tiers = await db
    .insert(tierTable)
    .values([
      { name: TIERS.HOBBY },
      { name: TIERS.ENTERPRISE },
      { name: TIERS.FREE },
    ])
    .onConflictDoNothing()
    .returning({ id: tierTable.id, name: tierTable.name });
  const tiersMap = tiers.reduce((acc, tier) => {
    acc[tier.name] = tier.id;
    return acc;
  }, {});
  await insertUser("abc@example.com", tiersMap[TIERS.HOBBY]);
  await insertUser("xyz@example.com", tiersMap[TIERS.ENTERPRISE]);
  await insertUser("pqr@example.com", tiersMap[TIERS.FREE]);
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
