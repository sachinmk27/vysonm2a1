import { faker } from "@faker-js/faker";
import { eq, sql } from "drizzle-orm";
import db from "./drizzle/index.js";
import { urlShortener } from "./drizzle/schema.js";
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
    const urlRecord = await db.transaction(async (trx) => {
      const urlRecord = await trx
        .select({
          originalUrl: urlShortener.originalUrl,
          visitCount: urlShortener.visitCount,
        })
        .from(urlShortener)
        .where(eq(urlShortener.shortCode, code))
        .get();
      if (!urlRecord) {
        return null;
      }
      await trx
        .update(urlShortener)
        .set({
          visitCount: urlRecord.visitCount + 1,
          lastAccessedAt: sql`CURRENT_TIMESTAMP`,
        })
        .where(eq(urlShortener.shortCode, code));
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
