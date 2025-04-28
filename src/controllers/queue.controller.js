import {
  GENERATE_THUMBNAILS_QUEUE,
  IMAGE_UPLOADED_EVENT,
} from "../backgroundTasks/generateUserThumbnails.js";
import { LOG_UPLOAD_QUEUE } from "../backgroundTasks/logUpload.js";
import { NOTIFY_ADMIN_QUEUE } from "../backgroundTasks/notifyAdmin.js";
import Queue from "../backgroundTasks/queue.js";
import { LOG_ANALYTICS_EVENT } from "../backgroundTasks/updateUrlAnalytics.js";
import { BadRequestError } from "../utils.js";

export const addTaskToQueue = (req, res, next) => {
  const { params, task } = req.body;
  if (!task || !params) {
    throw new BadRequestError("Task and params are required");
  }
  try {
    if (task === IMAGE_UPLOADED_EVENT) {
      Queue.enqueue(GENERATE_THUMBNAILS_QUEUE, { params });
      Queue.enqueue(LOG_UPLOAD_QUEUE, { params });
      Queue.enqueue(NOTIFY_ADMIN_QUEUE, { params });
    } else if (task === LOG_ANALYTICS_EVENT) {
      Queue.enqueue(LOG_ANALYTICS_EVENT, { params });
    }
    return res.status(200).send("Task added to queue successfully");
  } catch (error) {
    next(error);
  }
};
