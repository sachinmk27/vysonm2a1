import logger from "../logger.js";

export class PubSub {
  constructor() {
    this.subscribers = {};
  }

  subscribe(event, fn) {
    if (!this.subscribers[event]) {
      this.subscribers[event] = [];
    }
    this.subscribers[event].push(fn);
  }

  publish(event, data) {
    if (!this.subscribers[event]) {
      return;
    }
    this.subscribers[event].forEach((fn) => {
      try {
        fn(data);
      } catch (error) {
        logger.error(`Error occurred while publishing event ${event}:`, error);
      }
    });
  }
}
