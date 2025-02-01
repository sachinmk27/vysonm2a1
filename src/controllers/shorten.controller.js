import { faker } from "@faker-js/faker";
import { and, eq } from "drizzle-orm";
import db from "../drizzle/index.js";
import { urlTable, userTable } from "../drizzle/schema.js";
import { isURLValid } from "../utils.js";

export const shorten = async (req, res) => {
  try {
    const { url } = req.body;
    const { userRecord } = req;
    if (!url || !isURLValid(url)) {
      return res.status(400).send("Bad Request");
    }
    const shortCode = faker.string.alpha(10);
    await db
      .insert(urlTable)
      .values({ originalUrl: url, shortCode, userId: userRecord.id });
    res.json({ shortCode });
  } catch (err) {
    console.error(err);
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
    if (urlRecord.apiKey !== req.headers["x-api-key"]) {
      return res.status(403).send("Forbidden");
    }
    await db.delete(urlTable).where(eq(urlTable.shortCode, code));
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};
