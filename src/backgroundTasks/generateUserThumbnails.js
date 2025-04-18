import { and, eq, inArray, isNotNull } from "drizzle-orm";
import sharp from "sharp";
import db from "../drizzle/index.js";
import { userTable } from "../drizzle/schema.js";
import logger from "../logger.js";

export const generateUserThumbnails = async (batch) => {
  try {
    logger.info("Generating user thumbnails...");
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
    logger.info("User thumbnails generated successfully.");
  } catch (error) {
    logger.error("Error generating user thumbnails:", error);
  }
};

export const GENERATE_USER_THUMBNAIL_TASK = "GENERATE_USER_THUMBNAIL_TASK";
