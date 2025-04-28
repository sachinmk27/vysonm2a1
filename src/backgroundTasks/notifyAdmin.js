import logger from "../logger.js";

export const notifyAdmin = async (batch, workerId) => {
  logger.info("Notifying admin about the batch upload...", {
    batch,
    workerId,
  });
  await new Promise((resolve) =>
    setTimeout(() => {
      resolve();
    }, 2000)
  );
  return true;
};

export const NOTIFY_ADMIN_QUEUE = "NOTIFY_ADMIN_QUEUE";
