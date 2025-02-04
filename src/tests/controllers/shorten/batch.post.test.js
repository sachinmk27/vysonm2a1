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

describe("POST /batch-shorten", () => {
  it("should return 200 OK for valid input", () => {
    return request(app)
      .post("/batch-shorten")
      .set("X-API-KEY", MOCKS.API_KEY_ENTERPRISE)
      .send({
        urls: [{ url: MOCKS.SAMPLE_URL_A }, { url: MOCKS.SAMPLE_URL_B }],
      })
      .then((res) => {
        expect(res.status).toBe(200);
        expect(res.body.length).toBe(2);
      });
  });

  it("should return 400 Bad Request for missing URL", () => {
    return request(app)
      .post("/batch-shorten")
      .set("X-API-KEY", MOCKS.API_KEY_ENTERPRISE)
      .send({})
      .then((res) => {
        expect(res.status).toBe(400);
      });
  });

  it("should return 401 Unauthorized for missing API key", () => {
    return request(app)
      .post("/batch-shorten")
      .send({
        urls: [{ url: MOCKS.SAMPLE_URL_A }, { url: MOCKS.SAMPLE_URL_B }],
      })
      .then((res) => {
        expect(res.status).toBe(401);
      });
  });

  it("should partially process if some URLs are invalid and return success/errors accordingly", () => {
    const reqBody = {
      urls: [
        { url: MOCKS.SAMPLE_URL_A, code: "sample_url_a_code" },
        { url: "invalid url" },
        { url: MOCKS.SAMPLE_URL_B, code: "sample_url_b_code" },
      ],
    };
    const responses = [
      {
        status: "success",
        value: {
          shortCode: "sample_url_a_code",
          expiryDate: null,
        },
      },
      { status: "error", value: { name: "BadRequestError", status: 400 } },
      {
        status: "success",
        value: {
          shortCode: "sample_url_b_code",
          expiryDate: null,
        },
      },
    ];
    return request(app)
      .post("/batch-shorten")
      .set("X-API-KEY", MOCKS.API_KEY_ENTERPRISE)
      .send(reqBody)
      .then((res) => {
        expect(res.status).toBe(200);
        expect(res.body.length).toBe(3);
        expect(res.body).toEqual(responses);
      });
  });

  it("should return 403 if tier is not enterprise", async () => {
    return request(app)
      .post("/batch-shorten")
      .set("X-API-KEY", MOCKS.API_KEY_HOBBY)
      .send({
        urls: [{ url: MOCKS.SAMPLE_URL_A }, { url: MOCKS.SAMPLE_URL_B }],
      })
      .then((res) => {
        expect(res.status).toBe(403);
      });
  });
});
