import request from "supertest";
import { updateUrlAnalytics } from "../../backgroundTasks/updateUrlAnalytics";
import db from "../../drizzle/index.js";
import { urlTable, userTable } from "../../drizzle/schema";
import * as MOCKS from "../mocks.js";
import { eq } from "drizzle-orm";
import app from "../../index.js";

beforeAll(async () => {
  await db
    .insert(userTable)
    .values(MOCKS.SAMPLE_USER_HOBBY)
    .onConflictDoNothing();
});

afterAll(async () => {
  await db.delete(urlTable);
  await db.delete(userTable);
});

describe("updateUrlAnalytics", () => {
  let urlRecordA;
  let urlRecordB;
  beforeEach(async () => {
    await request(app)
      .post("/shorten")
      .set("X-API-KEY", MOCKS.API_KEY_HOBBY)
      .send({ url: MOCKS.SAMPLE_URL_A });
    await request(app)
      .post("/shorten")
      .set("X-API-KEY", MOCKS.API_KEY_HOBBY)
      .send({ url: MOCKS.SAMPLE_URL_B });
    urlRecordA = await db
      .select()
      .from(urlTable)
      .where(eq(urlTable.originalUrl, MOCKS.SAMPLE_URL_A))
      .get();
    urlRecordB = await db
      .select()
      .from(urlTable)
      .where(eq(urlTable.originalUrl, MOCKS.SAMPLE_URL_B))
      .get();
  });
  afterEach(async () => {
    await db.delete(urlTable);
  });

  it("should update the analytics for the given batch of tasks", async () => {
    const tasks = [
      { params: { urlId: urlRecordA.id, lastAccessed: 1000 } },
      { params: { urlId: urlRecordB.id, lastAccessed: 2000 } },
      { params: { urlId: urlRecordB.id, lastAccessed: 3000 } },
    ];
    await updateUrlAnalytics(tasks);
    const updatedUrlA = await db
      .select()
      .from(urlTable)
      .where(eq(urlTable.id, urlRecordA.id))
      .get();
    const updatedUrlB = await db
      .select()
      .from(urlTable)
      .where(eq(urlTable.id, urlRecordB.id))
      .get();
    expect(updatedUrlA.lastAccessedAt).toBe(1000);
    expect(updatedUrlB.lastAccessedAt).toBe(3000);
    expect(updatedUrlA.visitCount).toBe(urlRecordA.visitCount + 1);
    expect(updatedUrlB.visitCount).toBe(urlRecordB.visitCount + 2);
  });
});
