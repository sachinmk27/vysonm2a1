import multer from "multer";
import db from "../drizzle/index.js";
import { BadRequestError } from "../utils.js";
import { userTable } from "../drizzle/schema.js";
import { eq } from "drizzle-orm";
import fs from "fs";
import { IMAGE_UPLOADED_EVENT } from "../backgroundTasks/generateUserThumbnails.js";
import { ps } from "../backgroundTasks/index.js";
import redisClient from "../redis.js";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB

let storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync(process.env.UPLOADS_DIR)) {
      fs.mkdirSync(process.env.UPLOADS_DIR);
    }
    cb(null, process.env.UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const uniquePrefix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniquePrefix + "-" + file.originalname);
  },
});

const addThumbnailTaskToQueue = async (userId) => {
  fetch("http://localhost:3000/enqueue", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      task: IMAGE_UPLOADED_EVENT,
      params: {
        userId: userId,
      },
    }),
  });
};

const publishImageUploadedEvent = async (userId) => {
  ps.publish(IMAGE_UPLOADED_EVENT, [
    {
      params: {
        userId: userId,
      },
    },
  ]);
};

const publishImageUploadedEventToRedis = async (userId) => {
  return redisClient.publish(
    IMAGE_UPLOADED_EVENT,
    JSON.stringify([
      {
        params: {
          userId: userId,
        },
      },
    ])
  );
};

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
});

export const uploadProfilePicture = [
  upload.single("profilePicture"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        throw new BadRequestError("No file uploaded");
      }
      const { userRecord } = req;
      await db
        .update(userTable)
        .set({ picture: req.file.filename, thumbnail: null })
        .where(eq(userTable.id, userRecord.id));
      // addThumbnailTaskToQueue(userRecord.id);
      // publishImageUploadedEvent(userRecord.id);
      await publishImageUploadedEventToRedis(userRecord.id);
      return res.status(200).send("File uploaded successfully");
    } catch (error) {
      next(error);
    }
  },
];
