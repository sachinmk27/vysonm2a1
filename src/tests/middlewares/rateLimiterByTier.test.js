import redisClient from "../../redis.js";
import rateLimiter from "../../middlewares/rateLimiterByTier.js";
import { RateLimitError } from "../../utils.js";
import { TIERS } from "../../constants.js";

describe("rateLimitByIP middleware", () => {
  let req;
  let res;
  let next;
  beforeEach(() => {
    req = {
      headers: {
        "x-api-key": "test-api-key",
      },
      userRecord: {
        tierName: TIERS.FREE,
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    next = jest.fn();

    redisClient.incr = jest.fn();
    redisClient.expire = jest.fn();
    jest.clearAllMocks();
  });

  it("should respond with 429 for rate limited API key", async () => {
    jest.spyOn(redisClient, "incr").mockResolvedValue(2);
    const rateLimitConfig = {
      tier: TIERS.FREE,
      requestLimit: 1,
      timeWindowInSeconds: 60,
      redisKeyPrefix: `rate-limit:tier`,
      getRedisKey: (req) => req.headers["x-api-key"],
    };
    const middleware = rateLimiter(rateLimitConfig);
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(redisClient.expire).not.toHaveBeenCalled();
    expect(redisClient.incr).toHaveBeenCalledWith(
      `${rateLimitConfig.redisKeyPrefix}:${rateLimitConfig.tier}:apiKey:${req.headers["x-api-key"]}`
    );
    expect(next).toHaveBeenCalledWith(
      new RateLimitError("Rate limit exceeded")
    );
  });
  it("should call next middleware for non rate limited API key", async () => {
    jest.spyOn(redisClient, "incr").mockResolvedValue(1);
    const rateLimitConfig = {
      tier: TIERS.FREE,
      requestLimit: 1,
      timeWindowInSeconds: 60,
      redisKeyPrefix: `rate-limit:tier`,
      getRedisKey: (req) => req.headers["x-api-key"],
    };
    const middleware = rateLimiter(rateLimitConfig);
    await middleware(req, res, next);

    expect(redisClient.expire).toHaveBeenCalled();
    expect(redisClient.incr).toHaveBeenCalledWith(
      `${rateLimitConfig.redisKeyPrefix}:${rateLimitConfig.tier}:apiKey:${req.headers["x-api-key"]}`
    );
    expect(next).toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
  });

  it("should call next() for other tiers", async () => {
    req.userRecord.tierName = TIERS.ENTERPRISE;
    jest.spyOn(redisClient, "incr").mockResolvedValue(1);
    const rateLimitConfig = {
      tier: TIERS.FREE,
      requestLimit: 1,
      timeWindowInSeconds: 60,
      redisKeyPrefix: `rate-limit:tier`,
      getRedisKey: (req) => req.headers["x-api-key"],
    };
    const middleware = rateLimiter(rateLimitConfig);

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
  });
});
