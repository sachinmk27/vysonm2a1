import redisClient from "../redis.js";
import { RateLimitError } from "../utils.js";

export default function ({ requestLimit, timeWindowInSeconds }) {
  return async function rateLimiterByIP(req, res, next) {
    try {
      const ip = req.ip;
      const redisKey = `rate-limit:${ip}`;
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
      next();
    } catch (err) {
      next(err);
    }
  };
}
