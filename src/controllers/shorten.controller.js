import { faker } from "@faker-js/faker";
import { and, eq } from "drizzle-orm";
import db from "../drizzle/index.js";
import { urlTable, userTable } from "../drizzle/schema.js";
import {
  BadRequestError,
  ConflictError,
  InternalServerError,
  isURLValid,
  NotFoundError,
} from "../utils.js";

async function insertUrlRecord(url, code, userId, expiryDate) {
  try {
    if (!url || !isURLValid(url)) {
      throw new BadRequestError("Invalid URL");
    }
    if (code === "") {
      throw new BadRequestError("Invalid code");
    }
    const shortCode = code || faker.string.alpha(10);
    const urlRecord = await db
      .insert(urlTable)
      .values({
        originalUrl: url,
        shortCode,
        userId,
        expiryDate,
      })
      .returning({
        shortCode: urlTable.shortCode,
        expiryDate: urlTable.expiryDate,
        userId: urlTable.userId,
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
    const { url, expiryDate, code } = req.body;
    const { userRecord } = req;
    const urlRecord = await insertUrlRecord(
      url,
      code,
      userRecord.id,
      expiryDate
    );
    res.json(urlRecord);
  } catch (err) {
    res.status(err.status).send(err.message);
  }
};

export const deleteCode = async (req, res) => {
  try {
    const { code } = req.params;
    const { userRecord } = req;
    if (!code) {
      throw new BadRequestError("Invalid code");
    }
    const urlRecord = await db
      .select({
        apiKey: userTable.apiKey,
      })
      .from(urlTable)
      .innerJoin(userTable, eq(urlTable.userId, userTable.id))
      .where(
        and(eq(urlTable.shortCode, code), eq(urlTable.userId, userRecord.id))
      )
      .get();
    if (!urlRecord) {
      throw new NotFoundError("Not Found");
    }
    await db.delete(urlTable).where(eq(urlTable.shortCode, code));
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
      urls.map(({ url, code, expiryDate }) =>
        insertUrlRecord(url, code, userRecord.id, expiryDate)
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
