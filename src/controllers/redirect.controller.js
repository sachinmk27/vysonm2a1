import { eq, sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import db from "../drizzle/index.js";
import { urlTable } from "../drizzle/schema.js";
import { BadRequestError, NotFoundError, UnauthorizedError } from "../utils.js";

export const redirect = async (req, res, next) => {
  try {
    const { code, accessPassword } = req.query;
    if (!code) {
      throw new BadRequestError("Code is required");
    }
    const urlRecord = await db.transaction(async (trx) => {
      const urlRecord = await trx
        .select({
          originalUrl: urlTable.originalUrl,
          visitCount: urlTable.visitCount,
          expiryDate: urlTable.expiryDate,
          accessPassword: urlTable.accessPassword,
          isDeleted: urlTable.isDeleted,
        })
        .from(urlTable)
        .where(eq(urlTable.shortCode, code))
        .get();
      if (!urlRecord) {
        throw new NotFoundError("Invalid code");
      }
      if (urlRecord && urlRecord.isDeleted) {
        throw new NotFoundError("Invalid code");
      }
      if (urlRecord.accessPassword) {
        if (!accessPassword) {
          throw new UnauthorizedError("Password required");
        }
        const isPasswordValid = await bcrypt.compare(
          accessPassword,
          urlRecord.accessPassword
        );
        if (!isPasswordValid) {
          throw new UnauthorizedError("Invalid password");
        }
      }
      if (!urlRecord.accessPassword && accessPassword) {
        throw new BadRequestError("Password not required");
      }
      if (
        urlRecord.expiryDate !== undefined &&
        urlRecord.expiryDate !== null &&
        Date.now() > urlRecord.expiryDate
      ) {
        throw new NotFoundError("Code has expired");
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
    res.redirect(urlRecord.originalUrl);
  } catch (err) {
    next(err);
  }
};
