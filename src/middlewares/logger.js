import winstonLogger from "../logger.js";

export default async function logger(req, res, next) {
  const method = req.method;
  const url = req.url;
  const userAgent = req.headers["user-agent"];
  const ip = req.ip || req.connection.remoteAddress;

  try {
    winstonLogger.info("", { method, url, userAgent, ip });
  } catch (err) {
    winstonLogger.error("Failed to write log:", err);
  }
  next();
}
