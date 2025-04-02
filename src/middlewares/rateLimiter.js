import redisClient from "../redis.js";
import { RateLimitError } from "../utils.js";

export default function ({
  requestLimit = 5,
  timeWindowInSeconds = 60,
  redisKeyPrefix,
  getRedisKey,
}) {
  return async function rateLimiter(req, res, next) {
    try {
      const redisKey = `${redisKeyPrefix}:${getRedisKey(req)}`;
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }
      const requestsCount = await redisClient.incr(redisKey);
      if (requestsCount === 1) {
        await redisClient.expire(redisKey, timeWindowInSeconds);
      }
      if (requestsCount > requestLimit) {
        throw new RateLimitError("Rate limit exceeded");
      }
      res.set("X-RateLimit-Limit", requestLimit);
      res.set("X-RateLimit-Remaining", requestLimit - requestsCount);
      res.set("X-RateLimit-Reset", Date.now() + timeWindowInSeconds * 1000);
      next();
    } catch (err) {
      next(err);
    }
  };
}

function fixedWindowWithTimestampRateLimiter({
  requestLimit = 5,
  timeWindowInSeconds = 60,
  redisKeyPrefix,
  getRedisKey,
}) {
  return async function rateLimiter(req, res, next) {
    const redisKey = `${redisKeyPrefix}:${Math.floor(
      Date.now() / 1000 / timeWindowInSeconds
    )}:${getRedisKey(req)}`;
    try {
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }
      const requestsCount = await redisClient.incr(redisKey);
      if (requestsCount === 1) {
        await redisClient.expire(redisKey, timeWindowInSeconds);
      }
      if (requestsCount >= requestLimit) {
        throw new RateLimitError("Rate limit exceeded");
      }
      res.set("X-RateLimit-Limit", requestLimit);
      res.set("X-RateLimit-Remaining", requestLimit - requestsCount);
      res.set("X-RateLimit-Reset", Date.now() + timeWindowInSeconds * 1000);
      next();
    } catch (err) {
      next(err);
    }
  };
}
function slidingWindowLogRateLimiter({
  requestLimit = 5,
  timeWindowInSeconds = 60,
  redisKeyPrefix,
  getRedisKey,
}) {
  return async function rateLimiter(req, res, next) {
    try {
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }
      const currentTime = Date.now();
      const windowStartTime = currentTime - timeWindowInSeconds * 1000;
      const redisKey = `${redisKeyPrefix}:${getRedisKey(req)}`;
      await redisClient.zRemRangeByScore(redisKey, 0, windowStartTime);
      const requestsCount = await redisClient.zCard(redisKey);
      if (requestsCount >= requestLimit) {
        throw new RateLimitError("Rate limit exceeded");
      }
      await redisClient.zAdd(redisKey, {
        score: currentTime,
        value: currentTime.toString(),
      });
      await redisClient.expire(redisKey, timeWindowInSeconds);
      next();
    } catch (err) {
      console.log(err);
      next(err);
    }
  };
}

function slidingWindowCounterRateLimiter({
  windowInSeconds = 60,
  requestLimit = 5,
  redisKeyPrefix,
  getRedisKey,
  bucketSizeInSeconds = 1,
}) {
  return async function (req, res, next) {
    const now = Math.floor(Date.now() / 1000);
    const bucketTimestamp =
      Math.floor(now / bucketSizeInSeconds) * bucketSizeInSeconds;
    const redisKey = `${redisKeyPrefix}:${getRedisKey(req)}`;
    try {
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }
      await redisClient.hIncrBy(redisKey, bucketTimestamp.toString(), 1);
      await redisClient.expire(redisKey, windowInSeconds + bucketSizeInSeconds);
      const buckets = await redisClient.hGetAll(redisKey);
      const requestsCount = Object.entries(buckets).reduce(
        (acc, [bucketTs, count]) => {
          if (bucketTs >= now - windowInSeconds) {
            return acc + parseInt(count);
          }
          return acc;
        },
        0
      );
      if (requestsCount > requestLimit) {
        throw new RateLimitError("Rate limit exceeded");
      }
      next();
    } catch (err) {
      console.log(err);
      next(err);
    }
  };
}

function tokenBucketRateLimiter({
  maxBucketSize,
  interval,
  refillRate,
  redisKeyPrefix,
  getRedisKey,
}) {
  return async function (req, res, next) {
    try {
      const redisKey = `${redisKeyPrefix}:${getRedisKey(req)}`;
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }
      const now = Math.floor(Date.now() / 1000);
      const data = await redisClient.hGetAll(redisKey);
      let tokens =
        data.tokens !== undefined ? parseFloat(data.tokens) : maxBucketSize;
      let lastRefillTime = parseInt(data.lastRefillTime) || now;
      const elapsedIntervals = Math.floor((now - lastRefillTime) / interval);
      const tokensToAdd = elapsedIntervals * refillRate;
      if (tokensToAdd > 0) {
        tokens = Math.min(tokens + tokensToAdd, maxBucketSize);
        lastRefillTime = now;
      }
      if (tokens > 0) {
        tokens -= 1;
        await redisClient.hSet(redisKey, {
          tokens: tokens.toString(),
          lastRefillTime: lastRefillTime.toString(),
        });
        next();
      } else {
        throw new RateLimitError("Rate limit exceeded");
      }
    } catch (err) {
      console.log(err);
      next(err);
    }
  };
}

function leakyBucketRateLimiter({
  capacity,
  leakRate,
  redisKeyPrefix,
  getRedisKey,
}) {
  return async function (req, res, next) {
    try {
      const redisKey = `${redisKeyPrefix}:${getRedisKey(req)}`;
      const now = Math.floor(Date.now() / 1000);
      if (!redisClient.isOpen) {
        await redisClient.connect();
      }
      const data = await redisClient.hGetAll(redisKey);
      let currentLevel =
        data.currentLevel !== undefined ? parseFloat(data.currentLevel) : 0;
      let lastLeakTime = parseInt(data.lastLeakTime) || now;
      const elapsedTime = now - lastLeakTime;
      const leakedAmount = Math.floor(elapsedTime * leakRate);
      if (leakedAmount > 0) {
        currentLevel = Math.max(currentLevel - leakedAmount, 0);
        lastLeakTime = now;
      }
      if (currentLevel < capacity) {
        currentLevel += 1;
        await redisClient.hSet(redisKey, {
          currentLevel: currentLevel.toString(),
          lastLeakTime: lastLeakTime.toString(),
        });
        next();
      } else {
        throw new RateLimitError("Rate limit exceeded");
      }
    } catch (err) {
      next(err);
    }
  };
}
