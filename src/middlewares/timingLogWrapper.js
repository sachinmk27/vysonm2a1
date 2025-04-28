import logger from "../logger.js";

export default function timingLogWrapper(middleware) {
  return (req, res, next) => {
    const start = process.hrtime();

    const wrappedNext = (err) => {
      const diff = process.hrtime(start);
      const time = diff[0] * 1e3 + diff[1] * 1e-6; // convert to milliseconds
      logger.debug(
        `Middleware ${middleware.name || "anonymous"} took ${time.toFixed(
          2
        )} ms`
      );
      next(err);
    };

    middleware(req, res, wrappedNext);
  };
}
