import Queue from "./queue.js";
import {
  GENERATE_THUMBNAILS_QUEUE,
  IMAGE_UPLOADED_EVENT,
  generateUserThumbnails,
} from "./generateUserThumbnails.js";
import {
  LOG_ANALYTICS_EVENT,
  updateUrlAnalytics,
} from "./updateUrlAnalytics.js";
import { LOG_UPLOAD_QUEUE, logUpload } from "./logUpload.js";
import { NOTIFY_ADMIN_QUEUE, notifyAdmin } from "./notifyAdmin.js";

Queue.registerQueue(GENERATE_THUMBNAILS_QUEUE, {
  timeInterval: 5000,
  handler: generateUserThumbnails,
  // workers: 2,
});

Queue.registerQueue(LOG_UPLOAD_QUEUE, {
  timeInterval: 5000,
  handler: logUpload,
});

Queue.registerQueue(NOTIFY_ADMIN_QUEUE, {
  timeInterval: 5000,
  handler: notifyAdmin,
});

Queue.registerQueue(LOG_ANALYTICS_EVENT, {
  batchSize: 10,
  handler: updateUrlAnalytics,
});
