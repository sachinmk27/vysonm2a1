import Queue from "./queue.js";
import {
  IMAGE_UPLOADED_EVENT,
  generateUserThumbnails,
} from "./generateUserThumbnails.js";
import {
  LOG_ANALYTICS_EVENT,
  updateUrlAnalytics,
} from "./updateUrlAnalytics.js";
import { logUpload } from "./logUpload.js";
import { notifyAdmin } from "./notifyAdmin.js";
import { PubSub } from "./pubsub.js";
import { sub } from "../redis.js";
import logger from "../logger.js";

export const ps = new PubSub();

// ps.subscribe(IMAGE_UPLOADED_EVENT, generateUserThumbnails);
// ps.subscribe(IMAGE_UPLOADED_EVENT, logUpload);
// ps.subscribe(IMAGE_UPLOADED_EVENT, notifyAdmin);

// ps.subscribe(LOG_ANALYTICS_EVENT, updateUrlAnalytics);

async function attachSubscribers() {
  await sub.connect();
  await sub.subscribe(IMAGE_UPLOADED_EVENT, (batch) => {
    generateUserThumbnails(JSON.parse(batch));
  });
  await sub.subscribe(IMAGE_UPLOADED_EVENT, (batch) => {
    logUpload(JSON.parse(batch));
  });
  await sub.subscribe(IMAGE_UPLOADED_EVENT, (batch) => {
    notifyAdmin(JSON.parse(batch));
  });

  await sub.subscribe(LOG_ANALYTICS_EVENT, (batch) => {
    updateUrlAnalytics(JSON.parse(batch));
  });
}

attachSubscribers().then(() => {
  logger.info("Subscribed to Redis channels");
});
