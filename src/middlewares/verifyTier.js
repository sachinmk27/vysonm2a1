import { eq } from "drizzle-orm";
import db from "../drizzle/index.js";
import { tierTable } from "../drizzle/schema.js";

export default function verifyTier(tier) {
  return async (req, res, next) => {
    if (!req.userRecord) {
      return res.status(401).send("Unauthorized");
    }
    const tierRecord = await db
      .select()
      .from(tierTable)
      .where(eq(tierTable.name, tier))
      .get();
    if (req.userRecord.tierId !== tierRecord.id) {
      return res
        .status(403)
        .send("Forbidden. Upgrade your account to access this feature.");
    }
    next();
  };
}
