import request from "supertest";
import { faker } from "@faker-js/faker";
import app from "../../../index.js";
import db from "../../../drizzle";
import { tierTable, urlTable, userTable } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";

const API_KEY_HOBBY = "apiKeyHobby";
const API_KEY_ENTERPRISE = "apiKeyEnterprise";
beforeAll(async () => {
  const urls = new Array(100)
    .fill(0)
    .map((_, i) => ({ url: faker.internet.url() }));
  await db
    .insert(userTable)
    .values({
      email: "enterprise@example.com",
      apiKey: API_KEY_ENTERPRISE,
      tierId: 2,
    })
    .onConflictDoNothing();
  await db
    .insert(userTable)
    .values({
      email: "hobby@example.com",
      apiKey: API_KEY_HOBBY,
      tierId: 1,
    })
    .onConflictDoNothing();
  await request(app)
    .post("/batch-shorten")
    .set("X-API-KEY", API_KEY_ENTERPRISE)
    .send({ urls });
});

afterAll(async () => {
  await db.delete(urlTable);
  await db.delete(userTable);
});

describe("GET /shorten", () => {
  it("should return 401 Unauthorized for missing API key", () => {
    return request(app)
      .get("/shorten")
      .then((res) => {
        expect(res.status).toBe(401);
      });
  });

  it("should return 403 Forbidden for non enterprise API key", () => {
    return request(app)
      .get("/shorten")
      .set("X-API-KEY", API_KEY_HOBBY)
      .then((res) => {
        expect(res.status).toBe(403);
      });
  });

  it("should return a list of 10 shortened URLs", () => {
    return request(app)
      .get("/shorten")
      .set("X-API-KEY", API_KEY_ENTERPRISE)
      .then((res) => {
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(10);
      });
  });

  it("should return a list of 10 shortened URLs from page 2", () => {
    return request(app)
      .get("/shorten?page=2")
      .set("X-API-KEY", API_KEY_ENTERPRISE)
      .then((res) => {
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(10);
      });
  });

  it("should return a list of 100 shortened URLs from page 1", () => {
    return request(app)
      .get("/shorten?pageSize=100")
      .set("X-API-KEY", API_KEY_ENTERPRISE)
      .then((res) => {
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(100);
      });
  });
});
