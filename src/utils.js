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

export class RateLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = "RateLimitError";
    this.status = 429;
  }
}
