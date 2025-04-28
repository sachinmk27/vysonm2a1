import logger from "../logger.js";

export const logUpload = async (batch, workerId) => {
  logger.info("Logging upload...", {
    batch,
    workerId,
  });
  await new Promise((resolve) =>
    setTimeout(() => {
      resolve();
    }, 1000)
  );
  return true;
};

export const LOG_UPLOAD_QUEUE = "LOG_UPLOAD_QUEUE";
