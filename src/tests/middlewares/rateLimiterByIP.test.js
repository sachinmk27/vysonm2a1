import redisClient from "../../redis.js";
import rateLimiterByIP from "../../middlewares/rateLimiterByIP.js";
import { RateLimitError } from "../../utils";

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
    const middleware = rateLimiterByIP({
      requestLimit: 1,
      timeWindowInSeconds: 1,
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
      timeWindowInSeconds: 10,
    };
    const middleware = rateLimiterByIP(rateLimitConfig);

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
    expect(redisClient.incr).toHaveBeenCalledWith(`rate-limit:${req.ip}`);
    expect(redisClient.expire).toHaveBeenCalledWith(
      `rate-limit:${req.ip}`,
      rateLimitConfig.timeWindowInSeconds
    );
  });
});
