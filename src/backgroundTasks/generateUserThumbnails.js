import { and, eq, inArray, isNotNull } from "drizzle-orm";
import sharp from "sharp";
import db from "../drizzle/index.js";
import { userTable } from "../drizzle/schema.js";
import logger from "../logger.js";
import { sub } from "../redis.js";

export const generateUserThumbnails = async (batch, workerId) => {
  try {
    logger.info("Generating user thumbnails...", { workerId });
    const basePath = `${import.meta.dirname}/../../${process.env.UPLOADS_DIR}`;
    const userIds = batch.map((task) => task.params.userId);
    const users = await db
      .select()
      .from(userTable)
      .where(and(inArray(userTable.id, userIds), isNotNull(userTable.picture)))
      .all();
    const thumbnailPromises = users.map((user) => {
      const picturePath = `${basePath}/${user.picture}`;
      const thumbnailPath = `${basePath}/thumb-${user.picture}`;
      return sharp(picturePath).resize(300, 300).toFile(thumbnailPath);
    });
    await Promise.all(thumbnailPromises);
    const updatePromises = users.map((user) => {
      return db
        .update(userTable)
        .set({ thumbnail: `thumb-${user.picture}` })
        .where(eq(userTable.id, user.id));
    });
    await Promise.all(updatePromises);
    logger.info("User thumbnails generated successfully.", { workerId });
  } catch (error) {
    logger.error("Error generating user thumbnails:", error);
  }
};

export const IMAGE_UPLOADED_EVENT = "IMAGE_UPLOADED_EVENT";
export const GENERATE_THUMBNAILS_QUEUE = "GENERATE_THUMBNAILS_QUEUE";

async function setup() {
  if (!sub.isOpen) {
    await sub.connect();
  }
  await sub.subscribe(IMAGE_UPLOADED_EVENT, (batch) => {
    generateUserThumbnails(JSON.parse(batch));
  });
  logger.info("Subscribed to Redis channel for generating user thumbnails");
}

setup();
