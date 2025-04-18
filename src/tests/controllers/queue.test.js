import request from "supertest";
import app from "../../index.js";
import db from "../../drizzle/index.js";
import { userTable } from "../../drizzle/schema.js";
import * as MOCKS from "../mocks.js";
import Queue from "../../backgroundTasks/queue.js";
import { GENERATE_USER_THUMBNAIL_TASK } from "../../backgroundTasks/generateUserThumbnails.js";

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
      task: GENERATE_USER_THUMBNAIL_TASK,
      params: { userId: 1 },
    };
    const response = await request(app).post("/enqueue").send(item);
    expect(response.status).toBe(200);
    expect(Queue.size(item.task)).toBe(1);
    expect(Queue.getQueueData(item.task)).toEqual([{ params: item.params }]);
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
      task: GENERATE_USER_THUMBNAIL_TASK,
    });
    expect(response.status).toBe(400);
  });
});
