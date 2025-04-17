import { and, eq, isNotNull, isNull } from "drizzle-orm";
import sharp from "sharp";
import db from "../drizzle/index.js";
import { userTable } from "../drizzle/schema.js";
import logger from "../logger.js";

const getUsersWithoutThumbnails = async () => {
  const users = await db
    .select()
    .from(userTable)
    .where(and(isNull(userTable.thumbnail), isNotNull(userTable.picture)));
  return users;
};

export const generateUserThumbnails = async () => {
  try {
    logger.info("Generating user thumbnails...");
    const users = await getUsersWithoutThumbnails();
    if (users.length === 0) {
      logger.info("No users found without thumbnails.");
      return;
    }
    const thumbnailPromises = users.map((user) => {
      const picturePath = `${import.meta.dirname}/../../${
        process.env.UPLOADS_DIR
      }/${user.picture}`;
      const thumbnailPath = `${import.meta.dirname}/../../${
        process.env.UPLOADS_DIR
      }/thumb-${user.picture}`;
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
