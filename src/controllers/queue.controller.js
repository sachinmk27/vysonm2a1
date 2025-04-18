import Queue from "../backgroundTasks/queue.js";
import { BadRequestError } from "../utils.js";

export const addTaskToQueue = (req, res, next) => {
  const { params, task } = req.body;
  if (!task || !params) {
    throw new BadRequestError("Task and params are required");
  }
  try {
    Queue.enqueue(task, { params });
    return res.status(200).send("Task added to queue successfully");
  } catch (error) {
    next(error);
  }
};
