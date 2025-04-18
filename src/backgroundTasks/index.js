import Queue from "./queue.js";
import {
  GENERATE_USER_THUMBNAIL_TASK,
  generateUserThumbnails,
} from "./generateUserThumbnails.js";
import {
  UPDATE_URL_ANALYTICS_TASK,
  updateUrlAnalytics,
} from "./updateUrlAnalytics.js";

Queue.registerQueue(GENERATE_USER_THUMBNAIL_TASK, {
  timeInterval: 1000,
  handler: generateUserThumbnails,
});

Queue.registerQueue(UPDATE_URL_ANALYTICS_TASK, {
  batchSize: 10,
  handler: updateUrlAnalytics,
});
