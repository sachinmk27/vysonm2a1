import { eq, sql } from "drizzle-orm";
import db from "../drizzle/index.js";
import { urlTable } from "../drizzle/schema.js";

export const redirect = async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).send("Bad Request");
    }
    const urlRecord = await db.transaction(async (trx) => {
      const urlRecord = await trx
        .select({
          originalUrl: urlTable.originalUrl,
          visitCount: urlTable.visitCount,
          expiryDate: urlTable.expiryDate,
        })
        .from(urlTable)
        .where(eq(urlTable.shortCode, code))
        .get();
      if (
        !urlRecord ||
        (urlRecord.expiryDate && Date.now() > urlRecord.expiryDate)
      ) {
        return null;
      }
      await trx
        .update(urlTable)
        .set({
          visitCount: urlRecord.visitCount + 1,
          lastAccessedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(urlTable.shortCode, code));
      return urlRecord;
    });
    if (!urlRecord) {
      return res.status(404).send("Not Found");
    }
    res.redirect(urlRecord.originalUrl);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};
