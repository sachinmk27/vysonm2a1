import logger from "../logger.js";
import { sub } from "../redis.js";
import { IMAGE_UPLOADED_EVENT } from "./generateUserThumbnails.js";

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

async function setup() {
  if (!sub.isOpen) {
    await sub.connect();
  }
  await sub.subscribe(IMAGE_UPLOADED_EVENT, (batch) => {
    notifyAdmin(JSON.parse(batch));
  });
  logger.info("Subscribed to Redis channel for notifying admin");
}

setup();
