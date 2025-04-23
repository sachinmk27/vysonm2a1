import logger from "../logger.js";
const queues = {};

export class QueueError extends Error {
  constructor(message) {
    super(message);
    this.name = "QueueError";
    this.status = 500;
  }
}
function registerQueue(name, config = {}) {
  if (!name) {
    throw new QueueError(`Queue name is required`);
  }

  if (queues[name]) {
    throw new QueueError(`Queue is already registered`);
  }

  if (!config.handler) {
    throw new QueueError(`Queue ${name} must have a handler function`);
  }

  if (!config.batchSize && !config.timeInterval) {
    throw new QueueError(
      `Queue ${name} must have either batchSize or timeInterval`
    );
  }
  if (config.batchSize && config.timeInterval) {
    throw new QueueError(
      `Queue ${name} cannot have both batchSize and timeInterval`
    );
  }

  queues[name] = {
    data: [],
    config,
    timers: [],
  };

  if (config.timeInterval && typeof config.handler === "function") {
    const workers = config.workers || 1;
    for (let i = 0; i < workers; i++) {
      queues[name].timers.push(
        setInterval(() => {
          logger.info(queues[name].data.length);
          if (queues[name].data.length > 0) {
            const task = dequeue(name);
            logger.info(`Starting worker ${i} for queue ${name}`, task);
            config.handler([task], i);
          }
        }, config.timeInterval)
      );
    }
  }
}

function enqueue(queueName, item) {
  const queue = queues[queueName];
  if (!queue) {
    throw new QueueError(`Queue ${queueName} not found`);
  }

  queue.data.push(item);

  // For count-based batching
  const { data, config } = queue;
  if (config.batchSize && data.length >= config.batchSize) {
    for (let i = 0; i < config.workers; i++) {
      const batch = data.splice(0, config.batchSize);
      logger.info(`Starting worker ${i} for queue ${queueName}`);
      config.handler(batch, i);
    }
  }
}

function dequeue(queueName) {
  const queue = queues[queueName];
  if (!queue) throw new QueueError(`Queue ${queueName} not found`);
  return queue.data.shift();
}

function getQueueData(queueName) {
  return queues[queueName]?.data || [];
}

function stopAll() {
  for (const key in queues) {
    if (queues[key].timers.length) {
      queues[key].timers.forEach((timer) => clearInterval(timer));
    }
    delete queues[key];
  }
}

function size(queueName) {
  const queue = queues[queueName];
  if (!queue) throw new QueueError(`Queue ${queueName} not found`);
  return queue.data.length;
}

export default {
  registerQueue,
  enqueue,
  dequeue,
  getQueueData,
  stopAll,
  size,
};
