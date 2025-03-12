import { eq } from "drizzle-orm";
import db from "../drizzle/index.js";
import { tierTable } from "../drizzle/schema.js";
import { ForbiddenError, UnauthorizedError } from "../utils.js";

export default function configureVerifyTier(tier) {
  return async function verifyTier(req, res, next) {
    try {
      if (!req.userRecord) {
        throw new UnauthorizedError("Unauthorized");
      }
      const tierRecord = await db
        .select()
        .from(tierTable)
        .where(eq(tierTable.name, tier))
        .get();
      if (req.userRecord.tierId !== tierRecord.id) {
        throw new ForbiddenError(
          "Forbidden. Upgrade your account to access this feature."
        );
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
