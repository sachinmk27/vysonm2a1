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

export class CiruitBreakerError extends Error {
  constructor(message) {
    super(message);
    this.name = "CircuitBreakerError";
    this.status = 503;
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

const SQLITE_RECOVERABLE_ERRORS = new Set([
  "SQLITE_BUSY",
  "SQLITE_LOCKED",
  "SQLITE_PROTOCOL",
  "SQLITE_IOERR",
  "SQLITE_CANTOPEN",
]);

export async function withRetry(fn, maxRetries = 3, baseDelay = 1000) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isRecoverable = SQLITE_RECOVERABLE_ERRORS.has(error.code);
      if (!isRecoverable || attempt === maxRetries) {
        throw error;
      }
      const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
      const jitter = Math.random() * 250;
      console.log(
        `Attempt ${attempt + 1} failed: ${error.message}. Retrying in ${
          delay + jitter
        } ms`
      );
      await wait(delay + jitter);
    }
  }
}

const circuit = {
  failures: 0,
  state: "CLOSED",
  nextTry: Date.now(),
};

export async function withCircuitBreaker(fn, maxFailures = 3, timeout = 10000) {
  if (circuit.state === "OPEN") {
    if (Date.now() > circuit.nextTry) {
      circuit.state = "HALF_OPEN";
    } else {
      throw new CiruitBreakerError("Service not available");
    }
  }
  try {
    const result = await withRetry(fn);
    if (circuit.state === "HALF_OPEN") {
      circuit.state = "CLOSED";
      circuit.failures = 0;
    }
    return result;
  } catch (error) {
    const isRecoverable = SQLITE_RECOVERABLE_ERRORS.has(error.code);
    if (isRecoverable) {
      circuit.failures += 1;
      if (circuit.failures >= maxFailures) {
        circuit.state = "OPEN";
        circuit.nextTry = Date.now() + timeout;
        console.log("Circuit opened due to repeated failures.");
      }
    }
    throw error;
  }
}
