import { faker } from "@faker-js/faker";
import { and, asc, desc, eq, lt, or } from "drizzle-orm";
import bcrypt from "bcrypt";
import db from "../drizzle/index.js";
import { urlTable, userTable } from "../drizzle/schema.js";
import {
  BadRequestError,
  CiruitBreakerError,
  ConflictError,
  InternalServerError,
  isURLValid,
  NotFoundError,
  withCircuitBreaker,
} from "../utils.js";
import redisClient from "../redis.js";

async function insertUrlRecord({
  url,
  code,
  userId,
  expiryDate = null,
  password,
}) {
  try {
    if (!url || !isURLValid(url)) {
      throw new BadRequestError("Invalid URL");
    }
    if (code === "" || (code && typeof code !== "string")) {
      throw new BadRequestError("Invalid code");
    }
    if (password === "" || (password && typeof password !== "string")) {
      throw new BadRequestError("Invalid password");
    }
    if (isNaN(expiryDate)) {
      throw new BadRequestError("Invalid expiry date");
    }
    const shortCode = code || faker.string.alpha(10);
    const accessPassword = password
      ? await bcrypt.hash(password, 10)
      : undefined;
    const urlRecord = await withCircuitBreaker(() => {
      return db
        .insert(urlTable)
        .values({
          originalUrl: url,
          shortCode,
          userId,
          expiryDate,
          accessPassword,
        })
        .returning({
          shortCode: urlTable.shortCode,
          expiryDate: urlTable.expiryDate,
        });
    });
    return urlRecord[0];
  } catch (err) {
    if (
      err instanceof BadRequestError ||
      err instanceof ConflictError ||
      err instanceof CiruitBreakerError
    ) {
      throw err;
    }
    if (
      err.code === "SQLITE_CONSTRAINT_UNIQUE" ||
      err.code === "SQLITE_CONSTRAINT" // Turso error code
    ) {
      throw new ConflictError("Code already exists");
    }
    throw new InternalServerError("Internal Error");
  }
}

export const shorten = async (req, res, next) => {
  try {
    const { url, expiryDate, code, accessPassword } = req.body;
    const { userRecord } = req;
    const urlRecord = await insertUrlRecord({
      url,
      code,
      userId: userRecord.id,
      expiryDate,
      password: accessPassword,
    });
    res.json(urlRecord);
  } catch (err) {
    next(err);
  }
};

export const deleteCode = async (req, res, next) => {
  try {
    const { code } = req.params;
    const { userRecord } = req;
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
    const redisKey = `shortCode:${code}`;
    const codeExistsInCache = await redisClient.exists(redisKey);
    let urlRecord;
    if (codeExistsInCache) {
      urlRecord = JSON.parse(await redisClient.get(redisKey));
    } else {
      urlRecord = await getUrlRecordByUserId(code, userRecord.id);
    }
    if (!urlRecord) {
      throw new NotFoundError("Not Found");
    }
    await withCircuitBreaker(() =>
      db
        .update(urlTable)
        .set({ isDeleted: 1 })
        .where(eq(urlTable.id, urlRecord.id))
    );
    await redisClient.set(
      redisKey,
      JSON.stringify({ ...urlRecord, isDeleted: 1 })
    );
    await res.status(204).send();
  } catch (err) {
    next(err);
  }
};

export const batchShorten = async (req, res, next) => {
  try {
    const { urls } = req.body;
    const { userRecord } = req;
    if (!urls || !Array.isArray(urls)) {
      throw new BadRequestError("Invalid request");
    }
    const urlRecords = await Promise.allSettled(
      urls.map(({ url, code, expiryDate, accessPassword }) =>
        insertUrlRecord({
          url,
          code,
          userId: userRecord.id,
          expiryDate,
          password: accessPassword,
        })
      )
    );
    res.json(
      urlRecords.map((record) => ({
        status: record.status === "fulfilled" ? "success" : "error",
        value: record.status === "fulfilled" ? record.value : record.reason,
      }))
    );
  } catch (err) {
    next(err);
  }
};

async function getUrlRecordByUserId(code, userId) {
  if (!code) {
    throw new BadRequestError("Invalid code");
  }
  const urlRecord = await withCircuitBreaker(() =>
    db
      .select({
        id: urlTable.id,
        originalUrl: urlTable.originalUrl,
        visitCount: urlTable.visitCount,
        expiryDate: urlTable.expiryDate,
        accessPassword: urlTable.accessPassword,
        isDeleted: urlTable.isDeleted,
      })
      .from(urlTable)
      .innerJoin(userTable, eq(urlTable.userId, userTable.id))
      .where(and(eq(urlTable.shortCode, code), eq(urlTable.userId, userId)))
      .get()
  );
  return urlRecord;
}

export const editCode = async (req, res, next) => {
  try {
    const { code } = req.params;
    const { expiryDate, accessPassword, url } = req.body;
    const { userRecord } = req;
    if (
      (!expiryDate && !accessPassword && !url) ||
      (expiryDate && typeof expiryDate !== "number") ||
      (accessPassword && typeof accessPassword !== "string") ||
      (url && !isURLValid(url))
    ) {
      throw new BadRequestError("Invalid request");
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
      urlRecord = await getUrlRecordByUserId(code, userRecord.id);
    }
    if (!urlRecord) {
      throw new NotFoundError("Not Found");
    }
    if (urlRecord.isDeleted) {
      throw new NotFoundError("Not Found");
    }
    const hashedPassword = accessPassword
      ? await bcrypt.hash(accessPassword, 10)
      : undefined;
    const modifiedFields = {};
    if (expiryDate) modifiedFields.expiryDate = expiryDate;
    if (accessPassword) modifiedFields.accessPassword = hashedPassword;
    if (url) modifiedFields.originalUrl = url;
    const updatedUrlRecord = await withCircuitBreaker(() =>
      db
        .update(urlTable)
        .set(modifiedFields)
        .where(eq(urlTable.id, urlRecord.id))
        .returning({
          id: urlTable.id,
          originalUrl: urlTable.originalUrl,
          visitCount: urlTable.visitCount,
          expiryDate: urlTable.expiryDate,
          accessPassword: urlTable.accessPassword,
          isDeleted: urlTable.isDeleted,
        })
    );
    await redisClient.set(redisKey, JSON.stringify(updatedUrlRecord[0]));
    return res.json(updatedUrlRecord[0]);
  } catch (err) {
    next(err);
  }
};

export const getCodes = async (req, res, next) => {
  process.env.FF_CURSOR_PAGINATION_BULK_GET_SHORTEN_ENDPOINT === "enabled"
    ? cursorBasedPaginationHandler(req, res, next)
    : offsetBasedPaginationHandler(req, res, next);
};

async function cursorBasedPaginationHandler(req, res, next) {
  const { limit, cursor: rawCursor } = req.query;
  const { userRecord } = req;
  const pageSize = parseInt(limit) || 10;
  const cursor = rawCursor ? decodeCursor(rawCursor) : null;
  try {
    let whereClause;
    if (cursor) {
      whereClause = and(
        eq(urlTable.userId, userRecord.id),
        or(
          lt(urlTable.createdAt, cursor.createdAt),
          and(
            eq(urlTable.createdAt, cursor.createdAt),
            lt(urlTable.id, cursor.id)
          )
        )
      );
    } else {
      whereClause = eq(urlTable.userId, userRecord.id);
    }
    const results = await withCircuitBreaker(() =>
      db
        .select({
          shortCode: urlTable.shortCode,
          originalUrl: urlTable.originalUrl,
          expiryDate: urlTable.expiryDate,
          createdAt: urlTable.createdAt,
          id: urlTable.id,
        })
        .from(urlTable)
        .where(whereClause)
        .orderBy(desc(urlTable.createdAt), desc(urlTable.id))
        .limit(pageSize + 1)
    );
    const hasNextPage = results.length > pageSize;
    const nextCursor = hasNextPage
      ? encodeCursor({
          createdAt: results[pageSize - 1].createdAt,
          id: results[pageSize - 1].id,
        })
      : null;
    res.json({
      results: results.slice(0, pageSize),
      nextCursor,
      hasNextPage,
    });
  } catch (err) {
    next(err);
  }
}
function encodeCursor(cursor) {
  return Buffer.from(JSON.stringify(cursor)).toString("base64");
}
function decodeCursor(cursorStr) {
  try {
    return JSON.parse(Buffer.from(cursorStr, "base64").toString());
  } catch (e) {
    return null; // fallback in case of bad input
  }
}

async function offsetBasedPaginationHandler(req, res, next) {
  try {
    const { userRecord } = req;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    const urlRecords = await withCircuitBreaker(() =>
      db
        .select({
          shortCode: urlTable.shortCode,
          originalUrl: urlTable.originalUrl,
          expiryDate: urlTable.expiryDate,
        })
        .from(urlTable)
        .where(eq(urlTable.userId, userRecord.id))
        .orderBy(asc(urlTable.id))
        .offset(offset)
        .limit(pageSize)
    );
    res.json(urlRecords);
  } catch (err) {
    next(err);
  }
}
