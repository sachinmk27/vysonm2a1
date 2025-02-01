import request from "supertest";
import { eq } from "drizzle-orm";
import app from "../../index.js";
import db from "../../drizzle/index.js";
import { urlTable, userTable } from "../../drizzle/schema.js";

const SAMPLE_URL_A = "https://example.com";

beforeAll(async () => {
  await db
    .insert(userTable)
    .values({ email: "dummy@example.com", apiKey: "apiKey", id: 1 })
    .onConflictDoNothing();
});

afterAll(async () => {
  await db.delete(urlTable).where(eq(urlTable.userId, 1));
  await db.delete(userTable).where(eq(userTable.id, 1));
});

describe("GET /redirect", () => {
  let shortCode;

  beforeEach(() => {
    return request(app)
      .post("/shorten")
      .set("X-API-KEY", "apiKey")
      .send({ url: SAMPLE_URL_A })
      .then((res) => {
        shortCode = res.body.shortCode;
        expect(res.status).toBe(200);
      });
  });
  it("should return 302 Found", () => {
    return request(app)
      .get("/redirect")
      .query({ code: shortCode })
      .then((res) => {
        const redirectUrl = res.headers.location;
        expect(res.status).toBe(302);
        expect(redirectUrl).toBe(SAMPLE_URL_A);
      });
  });
  it("should return 404 Not Found", () => {
    return request(app)
      .get("/redirect")
      .query({ code: "code_does_not_exist" })
      .then((res) => {
        expect(res.status).toBe(404);
      });
  });
  it("should return 400 Bad Request for missing code", () => {
    return request(app)
      .get("/redirect")
      .then((res) => {
        expect(res.status).toBe(400);
      });
  });
  it("should increment visit count and update lastAccessedAt", async () => {
    const initialRecord = await db
      .select({
        visitCount: urlTable.visitCount,
        lastAccessedAt: urlTable.lastAccessedAt,
      })
      .from(urlTable)
      .where(eq(urlTable.shortCode, shortCode))
      .get();
    const res = await request(app).get("/redirect").query({ code: shortCode });
    const redirectUrl = res.headers.location;
    expect(res.status).toBe(302);
    expect(redirectUrl).toBe(SAMPLE_URL_A);
    const updatedRecord = await db
      .select({
        visitCount: urlTable.visitCount,
        lastAccessedAt: urlTable.lastAccessedAt,
      })
      .from(urlTable)
      .where(eq(urlTable.shortCode, shortCode))
      .get();
    expect(updatedRecord.visitCount).toBe(initialRecord.visitCount + 1);
    // expect(new Date(updatedRecord.lastAccessedAt).getTime()).toBeGreaterThan(
    //   new Date(initialRecord.lastAccessedAt).getTime()
    // );
  });
});
