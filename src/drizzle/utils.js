import crypto from "crypto";
import db from "./index.js";
import { userTable } from "./schema.js";
import logger from "../logger.js";

export async function insertUser(email, tierId) {
  try {
    const apiKey = crypto.randomBytes(32).toString("hex");
    await db
      .insert(userTable)
      .values({ email, apiKey, tierId })
      .onConflictDoNothing();
  } catch (err) {
    logger.error("Error inserting user:", err);
  }
}
