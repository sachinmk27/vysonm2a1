import logger from "../logger.js";
import db from "../drizzle/index.js";
import { urlTable } from "../drizzle/schema.js";
import { eq, inArray } from "drizzle-orm";

export const UPDATE_URL_ANALYTICS_TASK = "UPDATE_URL_ANALYTICS_TASK";

export const updateUrlAnalytics = async (batch) => {
  try {
    logger.info("Updating URL analytics...");
    const aggregateAnalytics = batch.reduce((agg, { params }) => {
      const { urlId, lastAccessed } = params;
      if (!agg[urlId]) {
        agg[urlId] = { lastAccessed, viewCount: 1 };
      } else {
        agg[urlId].viewCount += 1;
        agg[urlId].lastAccessed = Math.max(
          agg[urlId].lastAccessed,
          lastAccessed
        );
      }
      return agg;
    }, {});
    const urlRecords = await db
      .select()
      .from(urlTable)
      .where(inArray(urlTable.id, Object.keys(aggregateAnalytics)))
      .all();
    const updatePromises = urlRecords.map(({ id, visitCount }) => {
      const { lastAccessed, viewCount } = aggregateAnalytics[id];
      return db
        .update(urlTable)
        .set({
          lastAccessedAt: lastAccessed,
          visitCount: visitCount + viewCount,
        })
        .where(eq(urlTable.id, id));
    });
    await Promise.all(updatePromises);
    logger.info("URL analytics updated successfully.");
  } catch (error) {
    logger.error("Error updating URL analytics:", error);
  }
};
