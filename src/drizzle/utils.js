import crypto from "crypto";
import db from "./index.js";
import { userTable } from "./schema.js";

export async function insertUser(email, tierId) {
  try {
    const apiKey = crypto.randomBytes(32).toString("hex");
    await db
      .insert(userTable)
      .values({ email, apiKey, tierId })
      .onConflictDoNothing();
  } catch (err) {
    console.log(err);
  }
}
