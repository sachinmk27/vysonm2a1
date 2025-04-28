import request from "supertest";
import app from "../../index.js";
import db from "../../drizzle/index.js";
import { userTable } from "../../drizzle/schema.js";
import * as MOCKS from "../mocks.js";
import Queue from "../../backgroundTasks/queue.js";
import {
  GENERATE_THUMBNAILS_QUEUE,
  IMAGE_UPLOADED_EVENT,
} from "../../backgroundTasks/generateUserThumbnails.js";
import { LOG_UPLOAD_QUEUE } from "../../backgroundTasks/logUpload.js";
import { NOTIFY_ADMIN_QUEUE } from "../../backgroundTasks/notifyAdmin.js";

beforeAll(async () => {
  await db
    .insert(userTable)
    .values(MOCKS.SAMPLE_USER_HOBBY)
    .onConflictDoNothing();
});

afterAll(async () => {
  await db.delete(userTable);
});

describe("POST /queue", () => {
  it("should return 200 OK", async () => {
    const item = {
      task: IMAGE_UPLOADED_EVENT,
      params: { userId: 1 },
    };
    const response = await request(app).post("/enqueue").send(item);
    expect(response.status).toBe(200);
    expect(Queue.size(GENERATE_THUMBNAILS_QUEUE)).toBe(1);
    expect(Queue.size(LOG_UPLOAD_QUEUE)).toBe(1);
    expect(Queue.size(NOTIFY_ADMIN_QUEUE)).toBe(1);
    expect(Queue.getQueueData(GENERATE_THUMBNAILS_QUEUE)).toEqual([
      { params: item.params },
    ]);
    expect(Queue.getQueueData(LOG_UPLOAD_QUEUE)).toEqual([
      { params: item.params },
    ]);
    expect(Queue.getQueueData(NOTIFY_ADMIN_QUEUE)).toEqual([
      { params: item.params },
    ]);
  });

  it("should return 400 Bad Request for missing task", async () => {
    const response = await request(app)
      .post("/enqueue")
      .send({
        params: { userId: MOCKS.SAMPLE_USER_HOBBY.id },
      });
    expect(response.status).toBe(400);
  });

  it("should return 400 Bad Request for missing params", async () => {
    const response = await request(app).post("/enqueue").send({
      task: IMAGE_UPLOADED_EVENT,
    });
    expect(response.status).toBe(400);
  });
});
