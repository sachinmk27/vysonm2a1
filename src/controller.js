import { faker } from "@faker-js/faker";
import db from "./db/index.js";
import * as Query from "./queries.js";
import { urlShortener } from "./db/schema.js";
import { eq } from "drizzle-orm";

export const shorten = async (req, res) => {
  try {
    const { url } = req.body;
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
    const { url } = await db
      .select({ url: urlShortener.originalUrl })
      .from(urlShortener)
      .where(eq(urlShortener.shortCode, code))
      .get();
    if (!url) {
      return res.status(404).send("Not Found");
    }
    res.redirect(url);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};
