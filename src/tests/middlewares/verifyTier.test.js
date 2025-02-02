import verifyTier from "../../middlewares/verifyTier.js";
import db from "../../drizzle/index.js";

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
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith("Unauthorized");
    expect(next).not.toHaveBeenCalled();
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
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith(
      "Forbidden. Upgrade your account to access this feature."
    );
    expect(next).not.toHaveBeenCalled();
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
    expect(res.status).not.toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
  });
});
