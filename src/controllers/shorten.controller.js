import { faker } from "@faker-js/faker";
import { and, eq } from "drizzle-orm";
import db from "../drizzle/index.js";
import { urlTable, userTable } from "../drizzle/schema.js";
import { isURLValid } from "../utils.js";

export const shorten = async (req, res) => {
  try {
    const { url, expiryDate, code } = req.body;
    const { userRecord } = req;
    if (!url || !isURLValid(url) || code === "") {
      return res.status(400).send("Bad Request");
    }
    const shortCode = code || faker.string.alpha(10);
    const urlRecord = await db
      .insert(urlTable)
      .values({
        originalUrl: url,
        shortCode,
        userId: userRecord.id,
        expiryDate,
      })
      .returning();
    res.json({
      shortCode: urlRecord[0].shortCode,
      expiryDate: urlRecord[0].expiryDate,
    });
  } catch (err) {
    console.log(err);
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).send("Code already exists");
    }
    res.status(500).send("Internal Server Error");
  }
};

export const deleteCode = async (req, res) => {
  try {
    const { code } = req.params;
    const { userRecord } = req;
    if (!code) {
      return res.status(400).send("Bad Request");
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
      return res.status(404).send("Not Found");
    }
    await db.delete(urlTable).where(eq(urlTable.shortCode, code));
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};
