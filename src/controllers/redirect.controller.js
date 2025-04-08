import { eq, sql } from "drizzle-orm";
import bcrypt from "bcrypt";
import db from "../drizzle/index.js";
import { urlTable } from "../drizzle/schema.js";
import redisClient from "../redis.js";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  withCircuitBreaker,
} from "../utils.js";

export const redirect = async (req, res, next) => {
  try {
    const { code, accessPassword } = req.query;
    if (!code) {
      throw new BadRequestError("Code is required");
    }
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    const redisKey = `shortCode:${code}`;
    const codeExistsInCache = await redisClient.exists(redisKey);
    let urlRecord;
    if (codeExistsInCache) {
      urlRecord = JSON.parse(await redisClient.get(redisKey));
    } else {
      urlRecord = await withCircuitBreaker(async () => {
        return await db
          .select({
            id: urlTable.id,
            originalUrl: urlTable.originalUrl,
            visitCount: urlTable.visitCount,
            expiryDate: urlTable.expiryDate,
            accessPassword: urlTable.accessPassword,
            isDeleted: urlTable.isDeleted,
          })
          .from(urlTable)
          .where(eq(urlTable.shortCode, code))
          .get();
      });
    }
    if (!urlRecord) {
      throw new NotFoundError("Invalid code");
    }
    await redisClient.set(redisKey, JSON.stringify(urlRecord));
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
    // await db
    //   .update(urlTable)
    //   .set({
    //     visitCount: urlRecord.visitCount + 1,
    //     lastAccessedAt: sql`CURRENT_TIMESTAMP`,
    //   })
    //   .where(eq(urlTable.shortCode, code));

    res
      .append("Cache-Control", "private, max-age=3600")
      .redirect(urlRecord.originalUrl);
  } catch (err) {
    next(err);
  }
};
