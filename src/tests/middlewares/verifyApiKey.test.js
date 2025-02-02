import verifyApiKey from "../../middlewares/verifyApiKey.js";
import db from "../../drizzle/index.js";
import { userTable } from "../../drizzle/schema.js";

jest.mock("../../drizzle/index.js");

describe("verifyApiKey middleware", () => {
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
    next = jest.fn();
    jest.clearAllMocks();
  });

  it("should return 401 if x-api-key header is missing", async () => {
    await verifyApiKey(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith("Unauthorized");
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 if user not found", async () => {
    req.headers["x-api-key"] = "invalid-key";
    db.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        innerJoin: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(null),
          }),
        }),
      }),
    });

    await verifyApiKey(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith("Unauthorized");
    expect(next).not.toHaveBeenCalled();
  });

  it("should call next() and set userRecord if api key is valid", async () => {
    const validApiKey = "valid-key";
    const userRecord = { apiKey: validApiKey, id: 1 };
    req.headers["x-api-key"] = validApiKey;

    db.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        innerJoin: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            get: jest.fn().mockResolvedValue(userRecord),
          }),
        }),
      }),
    });

    await verifyApiKey(req, res, next);
    expect(req.userRecord).toEqual(userRecord);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
  });
});
