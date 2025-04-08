import logger from "./logger.js";

export const isURLValid = (url) => {
  try {
    const newUrl = new URL(url);
    return newUrl.protocol === "http:" || newUrl.protocol === "https:";
  } catch (err) {
    return false;
  }
};

export const getRandomString = (length = 10) => {
  let result = "";
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const charLength = chars.length;
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * charLength)];
  }
  return result;
};

export const generateRandomURL = () => {
  const protocols = ["http", "https"];
  const domains = ["com", "org", "net", "io", "dev"];

  const protocol = protocols[Math.floor(Math.random() * 2)];
  const subdomain = getRandomString(Math.floor(Math.random() * 8) + 3);
  const domain = getRandomString(Math.floor(Math.random() * 8) + 3);
  const domainExtension = domains[Math.floor(Math.random() * domains.length)];

  return `${protocol}://${subdomain}.${domain}.${domainExtension}`;
};

export class BadRequestError extends Error {
  constructor(message) {
    super(message);
    this.name = "BadRequestError";
    this.status = 400;
  }
}

export class UnauthorizedError extends Error {
  constructor(message) {
    super(message);
    this.name = "UnauthorizedError";
    this.status = 401;
  }
}

export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = "NotFoundError";
    this.status = 404;
  }
}

export class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConflictError";
    this.status = 409;
  }
}

export class InternalServerError extends Error {
  constructor(message) {
    super(message);
    this.name = "InternalServerError";
    this.status = 500;
  }
}

export class ForbiddenError extends Error {
  constructor(message) {
    super(message);
    this.name = "ForbiddenError";
    this.status = 403;
  }
}

export class MaxRetiresReachedError extends Error {
  constructor(message) {
    super(message);
    this.name = "MaxRetiresReachedError";
    this.status = 500;
  }
}

export class RateLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = "RateLimitError";
    this.status = 429;
  }
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export async function withRetry(fn, maxRetries = 3, baseDelay = 1000) {
  const SQLITE_RECOVERABLE_ERRORS = new Set([
    "SQLITE_BUSY",
    "SQLITE_LOCKED",
    "SQLITE_PROTOCOL",
    "SQLITE_IOERR",
    "SQLITE_CANTOPEN",
  ]);
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isRecoverable = SQLITE_RECOVERABLE_ERRORS.has(error.code);
      if (!isRecoverable) {
        throw error;
      }
      if (attempt === maxRetries) {
        throw new MaxRetiresReachedError(
          `Max retries reached: ${error.message}`
        );
      }
      const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
      const jitter = Math.random() * 250;
      logger.warn(
        `Attempt ${attempt + 1} failed: ${error.message}. Retrying in ${
          delay + jitter
        } ms`
      );
      await wait(delay + jitter);
    }
  }
}
