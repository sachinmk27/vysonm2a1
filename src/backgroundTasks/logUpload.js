import logger from "../logger.js";
import { sub } from "../redis.js";
import { IMAGE_UPLOADED_EVENT } from "./generateUserThumbnails.js";

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

async function setup() {
  if (!sub.isOpen) {
    await sub.connect();
  }
  await sub.subscribe(IMAGE_UPLOADED_EVENT, (batch) => {
    logUpload(JSON.parse(batch));
  });
  logger.info("Subscribed to Redis channel for log upload");
}

setup();
