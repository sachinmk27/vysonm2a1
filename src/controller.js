import { faker } from "@faker-js/faker";
import db from "./db/index.js";
import * as Query from "./queries.js";
import { urlShortener } from "./db/schema.js";
import { eq } from "drizzle-orm";
import { isURLValid } from "./utils.js";

export const shorten = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || !isURLValid(url)) {
      return res.status(400).send("Bad Request");
    }
    const duplicateURL = await db
      .select({
        originalUrl: urlShortener.originalUrl,
        shortCode: urlShortener.shortCode,
      })
      .from(urlShortener)
      .where(eq(urlShortener.originalUrl, url))
      .get();
    if (duplicateURL) {
      return res.json({ shortCode: duplicateURL.shortCode });
    }
    const shortCode = faker.string.alpha(10);
    await db.insert(urlShortener).values({ originalUrl: url, shortCode });
    res.json({ shortCode });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

export const redirect = async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.status(400).send("Bad Request");
    }
    const urlRecord = await db
      .select({ originalUrl: urlShortener.originalUrl })
      .from(urlShortener)
      .where(eq(urlShortener.shortCode, code))
      .get();
    if (!urlRecord) {
      return res.status(404).send("Not Found");
    }
    res.redirect(urlRecord.originalUrl);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

export const deleteCode = async (req, res) => {
  try {
    const { code } = req.params;
    if (!code) {
      return res.status(400).send("Bad Request");
    }
    const urlRecord = await db
      .delete(urlShortener)
      .where(eq(urlShortener.shortCode, code));
    if (urlRecord.rowsAffected === 0) {
      return res.status(404).send("Not Found");
    }
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};
