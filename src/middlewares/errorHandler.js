import logger from "../logger.js";

export default function errorHandler(err, req, res, next) {
  const statusCode = err.status || 500;
  const message = err.message || "Internal Server Error";
  logger.error("Error:", err);
  res.status(statusCode).send(message);
}
