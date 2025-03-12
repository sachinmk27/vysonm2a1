import fs from "fs/promises";
import path from "path";
import { ForbiddenError, UnauthorizedError } from "../utils.js";

export default async function blacklist(req, res, next) {
  try {
    const apiKey = req.headers["x-api-key"];
    if (!apiKey) {
      throw new UnauthorizedError("Unauthorized");
    }

    const data = await fs.readFile(
      path.join(import.meta.dirname, "../../config/blacklist.json"),
      "utf8"
    );
    const blacklist = JSON.parse(data);
    if (blacklist.includes(apiKey)) {
      throw new ForbiddenError("Forbidden: API key is blacklisted");
    }

    next();
  } catch (error) {
    next(error);
  }
}
