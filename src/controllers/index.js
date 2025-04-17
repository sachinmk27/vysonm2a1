import {
  shorten,
  deleteCode,
  batchShorten,
  editCode,
  getCodes,
} from "./shorten.controller.js";
import { redirect } from "./redirect.controller.js";
import { uploadProfilePicture } from "./user.controller.js";
import { addTaskToQueue } from "./queue.controller.js";

export default {
  shorten,
  deleteCode,
  editCode,
  batchShorten,
  redirect,
  getCodes,
  uploadProfilePicture,
  addTaskToQueue,
};
