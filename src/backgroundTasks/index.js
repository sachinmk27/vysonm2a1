import "./generateUserThumbnails.js";
import "./updateUrlAnalytics.js";
import "./logUpload.js";
import "./notifyAdmin.js";
import { PubSub } from "./pubsub.js";

export const ps = new PubSub();

// ps.subscribe(IMAGE_UPLOADED_EVENT, generateUserThumbnails);
// ps.subscribe(IMAGE_UPLOADED_EVENT, logUpload);
// ps.subscribe(IMAGE_UPLOADED_EVENT, notifyAdmin);

// ps.subscribe(LOG_ANALYTICS_EVENT, updateUrlAnalytics);
