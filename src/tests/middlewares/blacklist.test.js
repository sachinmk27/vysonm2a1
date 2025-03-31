import fs from "fs/promises";
import blacklist from "../../middlewares/blacklist";
import { ForbiddenError, UnauthorizedError } from "../../utils";

const BLACKLISTED_KEY_1 = "blacklisted-key-1";
const NON_BLACKLISTED_KEY = "non-blacklisted-key";

jest.mock("fs/promises");

describe("blacklist middleware", () => {
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

  it("should respond with 403 for blacklisted api keys", async () => {
    req.headers["x-api-key"] = BLACKLISTED_KEY_1;
    fs.readFile.mockResolvedValue(
      Promise.resolve(JSON.stringify([BLACKLISTED_KEY_1]))
    );

    await blacklist(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      new ForbiddenError("Forbidden: API key is blacklisted")
    );
  });

  it("should respond with 401 for missing api keys", async () => {
    await blacklist(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(new UnauthorizedError("Unauthorized"));
  });

  it("should respond with 500 for fs.readFile errors", async () => {
    req.headers["x-api-key"] = "valid-key";
    fs.readFile.mockRejectedValue(new Error("File not found"));

    await blacklist(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(new Error("File not found"));
  });

  it("should call next() for non-blacklisted api keys", async () => {
    req.headers["x-api-key"] = NON_BLACKLISTED_KEY;
    fs.readFile.mockResolvedValue(
      Promise.resolve(JSON.stringify([BLACKLISTED_KEY_1]))
    );

    await blacklist(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith();
  });
});
