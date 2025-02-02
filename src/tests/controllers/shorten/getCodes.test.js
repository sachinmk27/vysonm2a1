import request from "supertest";
import { faker } from "@faker-js/faker";
import app from "../../../index.js";
import db from "../../../drizzle";
import { tierTable, urlTable, userTable } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";

beforeAll(async () => {
  await db
    .insert(tierTable)
    .values([
      { name: "hobby", id: 1 },
      { name: "enterprise", id: 2 },
    ])
    .onConflictDoNothing();
  await db
    .insert(userTable)
    .values({ email: "dummy@example.com", apiKey: "apiKey", id: 1, tierId: 2 })
    .onConflictDoNothing();
});

afterAll(async () => {
  await db.delete(urlTable).where(eq(urlTable.userId, 1));
  await db.delete(userTable).where(eq(userTable.id, 1));
});

describe("GET /shorten", () => {
  const urls = new Array(100)
    .fill(0)
    .map((_, i) => ({ url: faker.internet.url() }));

  beforeAll(async () => {
    await request(app)
      .post("/batch-shorten")
      .set("X-API-KEY", "apiKey")
      .send({ urls });
  });

  it("should return 401 Unauthorized for missing API key", () => {
    return request(app)
      .get("/shorten")
      .then((res) => {
        expect(res.status).toBe(401);
      });
  });

  it("should return 401 Unauthorized for missing API key", () => {
    return request(app)
      .get("/shorten")
      .then((res) => {
        expect(res.status).toBe(401);
      });
  });

  it("should return a list of 10 shortened URLs", () => {
    return request(app)
      .get("/shorten")
      .set("X-API-KEY", "apiKey")
      .then((res) => {
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(10);
      });
  });

  it("should return a list of 10 shortened URLs from page 2", () => {
    return request(app)
      .get("/shorten?page=2")
      .set("X-API-KEY", "apiKey")
      .then((res) => {
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(10);
      });
  });

  it("should return a list of 100 shortened URLs from page 1", () => {
    return request(app)
      .get("/shorten?pageSize=100")
      .set("X-API-KEY", "apiKey")
      .then((res) => {
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(100);
      });
  });
});
