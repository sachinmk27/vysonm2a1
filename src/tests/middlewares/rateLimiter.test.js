import redisClient from "../../redis.js";
import rateLimiter from "../../middlewares/rateLimiter.js";
import { RateLimitError } from "../../utils.js";

describe("rateLimitByIP middleware", () => {
  let req;
  let res;
  let next;
  beforeEach(() => {
    req = {
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    next = jest.fn((value) => console.log(value));

    redisClient.incr = jest.fn();
    redisClient.expire = jest.fn();
    jest.clearAllMocks();
  });

  it("should respond with 429 for rate limited IP", async () => {
    req.ip = "1.1.1.1";
    jest.spyOn(redisClient, "incr").mockResolvedValue(2);
    const middleware = rateLimiter({
      requestLimit: 1,
      timeWindowInSeconds: 60,
      getRedisKey: (req) => req.ip,
    });
    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      new RateLimitError("Rate limit exceeded")
    );
  });

  it("should call next() for non-rate limited IP", async () => {
    req.ip = "2.2.2.2";
    jest.spyOn(redisClient, "incr").mockResolvedValue(1);
    const rateLimitConfig = {
      requestLimit: 100,
      timeWindowInSeconds: 60,
      redisKeyPrefix: "rate-limit:ip",
      getRedisKey: (req) => req.ip,
    };
    const middleware = rateLimiter(rateLimitConfig);

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
    expect(redisClient.incr).toHaveBeenCalledWith(
      `${rateLimitConfig.redisKeyPrefix}:${req.ip}`
    );
    expect(redisClient.expire).toHaveBeenCalledWith(
      `${rateLimitConfig.redisKeyPrefix}:${req.ip}`,
      rateLimitConfig.timeWindowInSeconds
    );
  });
});
