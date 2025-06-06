import { createClient } from "redis";
import logger from "./logger.js";

const client = createClient({ url: process.env.REDIS_URL });
export const sub = client.duplicate();

client.on("error", (err) => logger.error("Redis Client Error", err));

export default client;
