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

Queue.registerQueue(IMAGE_UPLOADED_EVENT, {
  timeInterval: 5000,
  handler: (...args) => {
    generateUserThumbnails(...args);
    logUpload(...args);
    notifyAdmin(...args);
  },
  // workers: 2,
});

Queue.registerQueue(LOG_ANALYTICS_EVENT, {
  batchSize: 10,
  handler: updateUrlAnalytics,
});
