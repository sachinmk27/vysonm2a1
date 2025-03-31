import { eq } from "drizzle-orm";
import db from "../drizzle/index.js";
import { tierTable, userTable } from "../drizzle/schema.js";
import { UnauthorizedError } from "../utils.js";

export default async function verifyApiKey(req, res, next) {
  try {
    if (!req.headers["x-api-key"]) {
      throw new UnauthorizedError("Unauthorized");
    }
    const userRecord = await db
      .select({
        apiKey: userTable.apiKey,
        id: userTable.id,
        tierId: userTable.tierId,
        tierName: tierTable.name,
      })
      .from(userTable)
      .innerJoin(tierTable, eq(userTable.tierId, tierTable.id))
      .where(eq(userTable.apiKey, req.headers["x-api-key"]))
      .get();
    if (!userRecord) {
      throw new UnauthorizedError("Unauthorized");
    }
    req.userRecord = userRecord;
    next();
  } catch (error) {
    next(error);
  }
}
