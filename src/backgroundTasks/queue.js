import logger from "../logger.js";
import taskMapper from "./index.js";

const queue = [];
let processingIntervalId = null;

const enqueue = (item) => {
  logger.info("Adding item to background task queue...");
  queue.push(item);
};

const dequeue = () => {
  if (queue.length === 0) {
    return null;
  }
  return queue.shift();
};

const processQueue = async () => {
  logger.info("Processing background task queue...");
  while (queue.length > 0) {
    const { task, params } = dequeue();
    if (task) {
      try {
        await taskMapper[task](params);
        logger.info(`Task ${task} processed successfully with params:`, params);
      } catch (error) {
        logger.error("Error processing task in queue:", error);
      }
    }
  }
};

const startProcessing = () => {
  logger.info("Starting background task processing...");
  if (!processingIntervalId) {
    processingIntervalId = setInterval(() => {
      processQueue();
    }, 5000);
  }
};

const stopProcessing = () => {
  logger.info("Stopping background task processing...");
  if (processingIntervalId) {
    clearInterval(processingIntervalId);
    processingIntervalId = null;
  }
};

startProcessing();

export { queue, enqueue, stopProcessing, dequeue };
