import multer from "multer";
import db from "../drizzle/index.js";
import { BadRequestError } from "../utils.js";
import { userTable } from "../drizzle/schema.js";
import { eq } from "drizzle-orm";
import fs from "fs";

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
      return res.status(200).send("File uploaded successfully");
    } catch (error) {
      next(error);
    }
  },
];
