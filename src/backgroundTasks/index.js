import {
  GENERATE_USER_THUMBNAIL_TASK,
  generateUserThumbnail,
} from "./generateUserThumbnails.js";

export default {
  [GENERATE_USER_THUMBNAIL_TASK]: generateUserThumbnail,
};
