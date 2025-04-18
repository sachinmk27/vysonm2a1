import request from "supertest";
import db from "../../drizzle/index.js";
import { urlTable, userTable } from "../../drizzle/schema";
import * as MOCKS from "../mocks.js";
import { eq } from "drizzle-orm";
import app from "../../index.js";
import { generateUserThumbnails } from "../../backgroundTasks/generateUserThumbnails.js";
import sharp from "sharp";
jest.mock("sharp");

sharp.mockImplementation(() => ({
  resize: jest.fn().mockReturnValue({
    toFile: jest.fn().mockResolvedValue(true),
  }),
}));

describe("generateUserThumbnails", () => {
  let userRecordA;
  let userRecordB;
  beforeEach(async () => {
    userRecordA = await db
      .insert(userTable)
      .values({ ...MOCKS.SAMPLE_USER_HOBBY, picture: "test1.png" })
      .onConflictDoNothing()
      .returning()
      .get();

    userRecordB = await db
      .insert(userTable)
      .values({ ...MOCKS.SAMPLE_USER_ENTERPRISE, picture: "test2.png" })
      .onConflictDoNothing()
      .returning()
      .get();
  });

  afterEach(async () => {
    await db.delete(userTable);
  });

  it("should generate thumbnails for users", async () => {
    const tasks = [
      { params: { userId: userRecordA.id } },
      { params: { userId: userRecordB.id } },
    ];
    await generateUserThumbnails(tasks);
    const updatedUserA = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, userRecordA.id))
      .get();
    const updatedUserB = await db
      .select()
      .from(userTable)
      .where(eq(userTable.id, userRecordB.id))
      .get();
    expect(updatedUserA.thumbnail).toBe("thumb-test1.png");
    expect(updatedUserB.thumbnail).toBe("thumb-test2.png");
  });
});
