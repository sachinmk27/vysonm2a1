import request from "supertest";
import app from "../../../index.js";
import db from "../../../drizzle/index.js";
import { urlTable, userTable } from "../../../drizzle/schema.js";
import * as MOCKS from "../../mocks.js";

beforeAll(async () => {
  await db
    .insert(userTable)
    .values(MOCKS.SAMPLE_USER_ENTERPRISE)
    .onConflictDoNothing();
  await db
    .insert(userTable)
    .values(MOCKS.SAMPLE_USER_HOBBY)
    .onConflictDoNothing();
});

afterAll(async () => {
  await db.delete(userTable);
  await db.delete(urlTable);
});

afterEach(async () => {
  await db.delete(urlTable);
});

describe("POST /shorten", () => {
  let shortCode;
  it("should return 200 OK", () => {
    return request(app)
      .post("/shorten")
      .set("X-API-KEY", MOCKS.API_KEY_HOBBY)
      .send({ url: MOCKS.SAMPLE_URL_A })
      .then((res) => {
        shortCode = res.body.shortCode;
        expect(res.status).toBe(200);
      });
  });
  it("should return 200 OK with different short code for duplicate URL", async () => {
    await request(app)
      .post("/shorten")
      .set("X-API-KEY", MOCKS.API_KEY_HOBBY)
      .send({ url: MOCKS.SAMPLE_URL_A });
    const res = await request(app)
      .post("/shorten")
      .set("X-API-KEY", MOCKS.API_KEY_HOBBY)
      .send({ url: MOCKS.SAMPLE_URL_A });
    expect(res.status).toBe(200);
    expect(res.body.shortCode).not.toBe(shortCode);
  });
  it("should return 400 Bad Request for invalid URL format", () => {
    return request(app)
      .post("/shorten")
      .set("X-API-KEY", MOCKS.API_KEY_HOBBY)
      .send({ url: "invalid-url" })
      .then((res) => {
        expect(res.status).toBe(400);
      });
  });
  it("should return 400 Bad Request for missing URL", () => {
    return request(app)
      .post("/shorten")
      .set("X-API-KEY", MOCKS.API_KEY_HOBBY)
      .send({})
      .then((res) => {
        expect(res.status).toBe(400);
      });
  });
  it("should return 400 Bad Request for missing URL", () => {
    return request(app)
      .post("/shorten")
      .set("X-API-KEY", MOCKS.API_KEY_HOBBY)
      .send({ url: MOCKS.SAMPLE_URL_A, code: "" })
      .then((res) => {
        expect(res.status).toBe(400);
      });
  });
  it("should return 401 Unauthorized for missing API key", () => {
    return request(app)
      .post("/shorten")
      .send({ url: MOCKS.SAMPLE_URL_A })
      .then((res) => {
        expect(res.status).toBe(401);
      });
  });
  it("should return 200 OK with expiry date", () => {
    const expiryDate = Date.now() + 1000;
    return request(app)
      .post("/shorten")
      .set("X-API-KEY", MOCKS.API_KEY_HOBBY)
      .send({ url: MOCKS.SAMPLE_URL_A, expiryDate })
      .then((res) => {
        expect(res.status).toBe(200);
        expect(res.body.expiryDate).toBe(expiryDate);
      });
  });
  it("should return 400 with invalid expiry date", () => {
    const expiryDate = "invalid-date";
    return request(app)
      .post("/shorten")
      .set("X-API-KEY", MOCKS.API_KEY_HOBBY)
      .send({ url: MOCKS.SAMPLE_URL_A, expiryDate })
      .then((res) => {
        expect(res.status).toBe(400);
      });
  });
  it("should return 400 with invalid accessPassword", () => {
    return request(app)
      .post("/shorten")
      .set("X-API-KEY", MOCKS.API_KEY_HOBBY)
      .send({ url: MOCKS.SAMPLE_URL_A, accessPassword: "" })
      .then((res) => {
        expect(res.status).toBe(400);
      });
  });
  it("should return 200 OK if custom code is provided", () => {
    return request(app)
      .post("/shorten")
      .set("X-API-KEY", MOCKS.API_KEY_HOBBY)
      .send({ url: MOCKS.SAMPLE_URL_A, code: "custom-code" })
      .then((res) => {
        expect(res.status).toBe(200);
        expect(res.body.shortCode).toBe("custom-code");
      });
  });
  it("should return 200 OK if access password is provided", () => {
    const expiryDate = Date.now() + 60 * 60 * 1000;
    return request(app)
      .post("/shorten")
      .set("X-API-KEY", MOCKS.API_KEY_HOBBY)
      .send({
        url: MOCKS.SAMPLE_URL_A,
        accessPassword: "password",
        expiryDate,
      })
      .then((res) => {
        expect(res.status).toBe(200);
        expect(res.body.expiryDate).toBe(expiryDate);
        return request(app)
          .get("/redirect")
          .query({ code: res.body.shortCode, accessPassword: "password" });
      })
      .then((res) => {
        expect(res.status).toBe(302);
      });
  });
  it("should return 409 Conflict if duplicate custom code is provided", () => {
    return db
      .insert(urlTable)
      .values({
        originalUrl: MOCKS.SAMPLE_URL_A,
        shortCode: "custom-code",
        userId: 1,
      })
      .then(() => {
        return request(app)
          .post("/shorten")
          .set("X-API-KEY", MOCKS.API_KEY_HOBBY)
          .send({ url: MOCKS.SAMPLE_URL_A, code: "custom-code" })
          .then((res) => {
            expect(res.status).toBe(409);
          });
      });
  });
  it("should return 500 if database error occurs", () => {
    const originalInsert = db.insert;
    db.insert = jest.fn().mockImplementation(() => {
      throw new Error("Database error");
    });

    return request(app)
      .post("/shorten")
      .set("X-API-KEY", MOCKS.API_KEY_HOBBY)
      .send({ url: MOCKS.SAMPLE_URL_A })
      .then((res) => {
        expect(res.status).toBe(500);
        db.insert = originalInsert;
      });
  });
});
