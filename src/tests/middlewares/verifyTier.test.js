import verifyTier from "../../middlewares/verifyTier.js";
import db from "../../drizzle/index.js";
import { ForbiddenError, UnauthorizedError } from "../../utils.js";

jest.mock("../../drizzle/index.js");

describe("verifyTier middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      userRecord: { tierId: 1 },
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  it("should return 401 if userRecord is missing", async () => {
    req.userRecord = null;
    await verifyTier("hobby")(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(new UnauthorizedError("Unauthorized"));
  });

  it("should return 403 if tiers don't match", async () => {
    req.userRecord.tierId = 2;
    db.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            tier: "different-tier",
            id: 1,
          }),
        }),
      }),
    });

    await verifyTier("hobby")(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(next).toHaveBeenCalledWith(
      new ForbiddenError(
        "Forbidden. Upgrade your account to access this feature."
      )
    );
  });

  it("should call next if tiers match", async () => {
    req.userRecord.tierId = 1;
    db.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          get: jest.fn().mockResolvedValue({
            tier: "hobby",
            id: 1,
          }),
        }),
      }),
    });

    await verifyTier("hobby")(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});
