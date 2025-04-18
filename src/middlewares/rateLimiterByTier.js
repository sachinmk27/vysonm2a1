import redisClient from "../redis.js";
import { RateLimitError } from "../utils.js";

export default function ({
  tier,
  requestLimit = 5,
  timeWindowInSeconds = 60,
  redisKeyPrefix,
  getRedisKey,
}) {
  return async function rateLimiterByTier(req, res, next) {
    try {
      if (req.userRecord.tierName !== tier) {
        return next();
      }
      const redisKey = `${redisKeyPrefix}:${tier}:apiKey:${getRedisKey(req)}`;
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
