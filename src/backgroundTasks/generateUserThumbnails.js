import { eq } from "drizzle-orm";
import sharp from "sharp";
import db from "../drizzle/index.js";
import { userTable } from "../drizzle/schema.js";
import logger from "../logger.js";

const generateThumbnail = async (picturePath, thumbnailPath) => {
  return sharp(picturePath).resize(300, 300).toFile(thumbnailPath);
};

export const generateUserThumbnail = async ({ userId }) => {
  try {
    logger.info(`Generating user thumbnail for ${userId}...`);
    const user = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, userId))
      .get();
    if (!user) {
      logger.info(`No users found with ID ${userId}.`);
      return;
    }
    const basePath = `${import.meta.dirname}/../../${process.env.UPLOADS_DIR}`;
    const picturePath = `${basePath}/${user.picture}`;
    const thumbnailPath = `${basePath}/thumb-${user.picture}`;
    await generateThumbnail(picturePath, thumbnailPath);
    await db
      .update(userTable)
      .set({ thumbnail: `thumb-${user.picture}` })
      .where(eq(userTable.id, user.id));
    logger.info("User thumbnail generated successfully.");
  } catch (error) {
    logger.error("Error generating user thumbnails:", error);
  }
};

export const GENERATE_USER_THUMBNAIL_TASK = "GENERATE_USER_THUMBNAIL_TASK";
