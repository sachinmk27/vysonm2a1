import { faker } from "@faker-js/faker";
import { and, asc, eq } from "drizzle-orm";
import bcrypt from "bcrypt";
import db from "../drizzle/index.js";
import { urlTable, userTable } from "../drizzle/schema.js";
import {
  BadRequestError,
  ConflictError,
  InternalServerError,
  isURLValid,
  NotFoundError,
} from "../utils.js";

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
    if (code === "") {
      throw new BadRequestError("Invalid code");
    }
    const shortCode = code || faker.string.alpha(10);
    const accessPassword = password
      ? await bcrypt.hash(password, 10)
      : undefined;
    const urlRecord = await db
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
    return urlRecord[0];
  } catch (err) {
    if (err instanceof BadRequestError || err instanceof ConflictError) {
      throw err;
    }
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      throw new ConflictError("Code already exists");
    }
    throw new InternalServerError("Internal Error");
  }
}

export const shorten = async (req, res) => {
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
    res.status(err.status).send(err.message);
  }
};

export const deleteCode = async (req, res) => {
  try {
    const { code } = req.params;
    const { userRecord } = req;
    const urlRecord = await getUrlRecordByUserId(code, userRecord.id);
    if (!urlRecord) {
      throw new NotFoundError("Not Found");
    }
    await db
      .update(urlTable)
      .set({ isDeleted: 1 })
      .where(eq(urlTable.id, urlRecord.id));
    res.status(204).send();
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof BadRequestError) {
      return res.status(err.status).send(err.message);
    }
    res.status(500).send("Internal Server Error");
  }
};

export const batchShorten = async (req, res) => {
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
    if (err instanceof BadRequestError) {
      return res.status(err.status).send(err.message);
    }
    res.status(500).send("Internal Server Error");
  }
};

async function getUrlRecordByUserId(code, userId) {
  if (!code) {
    throw new BadRequestError("Invalid code");
  }
  const urlRecord = await db
    .select({
      id: urlTable.id,
      isDeleted: urlTable.isDeleted,
    })
    .from(urlTable)
    .innerJoin(userTable, eq(urlTable.userId, userTable.id))
    .where(and(eq(urlTable.shortCode, code), eq(urlTable.userId, userId)))
    .get();
  return urlRecord;
}

export const editCode = async (req, res) => {
  try {
    const { code } = req.params;
    const { expiryDate, accessPassword } = req.body;
    const { userRecord } = req;
    if (
      (!expiryDate && !accessPassword) ||
      (expiryDate && typeof expiryDate !== "number")
    ) {
      throw new BadRequestError("Invalid request");
    }
    const urlRecord = await getUrlRecordByUserId(code, userRecord.id);
    if (!urlRecord) {
      throw new NotFoundError("Not Found");
    }
    if (urlRecord.isDeleted) {
      throw new NotFoundError("Not Found");
    }
    const hashedPassword = accessPassword
      ? await bcrypt.hash(accessPassword, 10)
      : undefined;
    const updatedExpiryDate = expiryDate ? expiryDate : urlRecord.expiryDate;
    const updatedUrlRecord = await db
      .update(urlTable)
      .set({
        expiryDate: updatedExpiryDate,
        accessPassword: hashedPassword,
      })
      .where(eq(urlTable.id, urlRecord.id))
      .returning({
        expiryDate: urlTable.expiryDate,
        id: urlTable.id,
        accessPassword: urlTable.accessPassword,
      });
    return res.json(updatedUrlRecord[0]);
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof BadRequestError) {
      return res.status(err.status).send(err.message);
    }
    res.status(500).send("Internal Server Error");
  }
};

export const getCodes = async (req, res) => {
  try {
    const { userRecord } = req;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const offset = (page - 1) * pageSize;
    const urlRecords = await db
      .select({
        shortCode: urlTable.shortCode,
        originalUrl: urlTable.originalUrl,
        expiryDate: urlTable.expiryDate,
      })
      .from(urlTable)
      .where(eq(urlTable.userId, userRecord.id))
      .orderBy(asc(urlTable.id))
      .offset(offset)
      .limit(pageSize);
    res.json(urlRecords);
  } catch (err) {
    res.status(500).send("Internal Server Error");
  }
};
