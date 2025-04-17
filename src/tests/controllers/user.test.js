import request from "supertest";
import fs from "fs/promises";
import app from "../../index.js";
import db from "../../drizzle/index.js";
import path from "path";
import { userTable } from "../../drizzle/schema.js";
import * as MOCKS from "../mocks.js";
import * as Queue from "../../backgroundTasks/queue.js";
import { GENERATE_USER_THUMBNAIL_TASK } from "../../backgroundTasks/generateUserThumbnails.js";

describe("POST /user/profile-picture", () => {
  let user;
  beforeAll(async () => {
    user = await db
      .insert(userTable)
      .values(MOCKS.SAMPLE_USER_HOBBY)
      .onConflictDoNothing()
      .returning()
      .get();
  });

  afterAll(async () => {
    await db.delete(userTable);
    await fs.rm(path.join(import.meta.dirname, "../../../uploads"), {
      recursive: true,
      force: true,
    });
  });

  it("should upload a profile picture successfully", async () => {
    jest.mock("node-fetch");
    fetch = jest.fn(() => {});
    const response = await request(app)
      .patch("/user/profile-picture")
      .set("X-API-Key", MOCKS.API_KEY_HOBBY)
      .attach("profilePicture", "./src/tests/test.png");

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith("http://localhost:3000/enqueue", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        task: GENERATE_USER_THUMBNAIL_TASK,
        params: {
          userId: user.id,
        },
      }),
    });
  });

  it("should return 400 if no file is uploaded", async () => {
    const response = await request(app)
      .patch("/user/profile-picture")
      .set("X-API-Key", MOCKS.API_KEY_HOBBY);

    expect(response.status).toBe(400);
  });
});
