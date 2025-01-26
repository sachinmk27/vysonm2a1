import { faker } from "@faker-js/faker";
import db from "./db.js";
import * as Query from "./queries.js";

export const shorten = async (req, res) => {
  try {
    const { url } = req.body;
    const shortCode = faker.string.alpha(10);
    await db.run(Query.createShortURL, [url, shortCode]);
    res.json({ shortCode });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

export const redirect = async (req, res) => {
  try {
    const { code } = req.query;
    const url = await db.fetchFirst(Query.fetchURLByShortCode, [code]);
    if (!url) {
      return res.status(404).send("Not Found");
    }
    res.redirect(url.original_url);
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};
