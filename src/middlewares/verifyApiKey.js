import { eq } from "drizzle-orm";
import db from "../drizzle/index.js";
import { tierTable, userTable } from "../drizzle/schema.js";

export default async function verifyApiKey(req, res, next) {
  if (!req.headers["x-api-key"]) {
    return res.status(401).send("Unauthorized");
  }
  const userRecord = await db
    .select({
      apiKey: userTable.apiKey,
      id: userTable.id,
      tierId: userTable.tierId,
    })
    .from(userTable)
    .innerJoin(tierTable, eq(userTable.tierId, tierTable.id))
    .where(eq(userTable.apiKey, req.headers["x-api-key"]))
    .get();
  if (!userRecord) {
    return res.status(401).send("Unauthorized");
  }
  if (userRecord.apiKey !== req.headers["x-api-key"]) {
    return res.status(403).send("Forbidden");
  }
  req.userRecord = userRecord;
  next();
}
