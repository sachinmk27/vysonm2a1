import request from "supertest";
import { eq } from "drizzle-orm";
import app from "../../index.js";
import db from "../../drizzle/index.js";
import { urlTable, userTable } from "../../drizzle/schema.js";
import * as MOCKS from "../mocks.js";
import Queue from "../../backgroundTasks/queue.js";
import { LOG_ANALYTICS_EVENT } from "../../backgroundTasks/updateUrlAnalytics.js";

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

describe("GET /redirect", () => {
  let shortCode;

  beforeEach(() => {
    return request(app)
      .post("/shorten")
      .set("X-API-KEY", MOCKS.API_KEY_HOBBY)
      .send({ url: MOCKS.SAMPLE_URL_A })
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
        expect(redirectUrl).toBe(MOCKS.SAMPLE_URL_A);
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
  it("should add a task to the updateUrlAnalytics queue", async () => {
    jest.spyOn(Date, "now").mockReturnValue(1000);
    jest.mock("node-fetch");
    fetch = jest.fn(() => {});
    const urlRecord = await db
      .select()
      .from(urlTable)
      .where(eq(urlTable.shortCode, shortCode))
      .get();
    const res = await request(app).get("/redirect").query({ code: shortCode });
    expect(fetch).toHaveBeenCalledWith("http://localhost:3000/enqueue", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        task: LOG_ANALYTICS_EVENT,
        params: {
          urlId: urlRecord.id,
          lastAccessed: 1000,
        },
      }),
    });
  });
  it("should return 404 if the URL has expired", () => {
    return request(app)
      .post("/shorten")
      .set("X-API-KEY", MOCKS.API_KEY_HOBBY)
      .send({ url: MOCKS.SAMPLE_URL_A, expiryDate: Date.now() - 100000 })
      .then((res) => {
        const shortCode = res.body.shortCode;
        expect(res.status).toBe(200);
        return request(app)
          .get("/redirect")
          .query({ code: shortCode })
          .then((res) => {
            expect(res.status).toBe(404);
          });
      });
  });
  it("should return 302 if the URL has not expired", () => {
    return request(app)
      .post("/shorten")
      .set("X-API-KEY", MOCKS.API_KEY_HOBBY)
      .send({
        url: MOCKS.SAMPLE_URL_A,
        expiryDate: Date.now() + 60 * 60 * 1000,
      })
      .then((res) => {
        const shortCode = res.body.shortCode;
        expect(res.status).toBe(200);
        return request(app)
          .get("/redirect")
          .query({ code: shortCode })
          .then((res) => {
            expect(res.status).toBe(302);
          });
      });
  });
  it("should return 500 if there is a database error", () => {
    jest.spyOn(db, "select").mockImplementation(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => ({
          get: jest.fn(() => {
            throw new Error("Database error");
          }),
        })),
      })),
    }));

    return request(app)
      .get("/redirect")
      .query({ code: shortCode })
      .then((res) => {
        expect(res.status).toBe(500);
        jest.restoreAllMocks();
      });
  });
  it("should return 302 Found if correct access password is provided", async () => {
    const accessPassword = "password";
    const res = await request(app)
      .post("/shorten")
      .set("X-API-KEY", MOCKS.API_KEY_HOBBY)
      .send({ url: MOCKS.SAMPLE_URL_A, accessPassword });
    const shortCode = res.body.shortCode;
    expect(res.status).toBe(200);

    return request(app)
      .get("/redirect")
      .query({ code: shortCode, accessPassword })
      .then((res) => {
        const redirectUrl = res.headers.location;
        expect(res.status).toBe(302);
        expect(redirectUrl).toBe(MOCKS.SAMPLE_URL_A);
      });
  });
  it("should return 400 for passing password when not set", async () => {
    const res = await request(app)
      .post("/shorten")
      .set("X-API-KEY", MOCKS.API_KEY_HOBBY)
      .send({ url: MOCKS.SAMPLE_URL_A });
    const shortCode = res.body.shortCode;
    expect(res.status).toBe(200);

    const resEmptyPassword = await request(app)
      .get("/redirect")
      .query({ code: shortCode, accessPassword: "password" });
    expect(resEmptyPassword.status).toBe(400);
  });

  it("should return 401 for invalid password", async () => {
    const accessPassword = "password";
    const res = await request(app)
      .post("/shorten")
      .set("X-API-KEY", MOCKS.API_KEY_HOBBY)
      .send({ url: MOCKS.SAMPLE_URL_A, accessPassword: accessPassword });
    const shortCode = res.body.shortCode;
    expect(res.status).toBe(200);

    const resEmptyPassword = await request(app)
      .get("/redirect")
      .query({ code: shortCode, accessPassword: "invalid_password" });
    expect(resEmptyPassword.status).toBe(401);
  });

  it("should not do a db call if the code is in the cache", async () => {
    const res = await request(app)
      .post("/shorten")
      .set("X-API-KEY", MOCKS.API_KEY_HOBBY)
      .send({ url: MOCKS.SAMPLE_URL_A });
    const shortCode = res.body.shortCode;
    expect(res.status).toBe(200);

    const resRedirect = await request(app)
      .get("/redirect")
      .query({ code: shortCode });
    expect(resRedirect.status).toBe(302);

    const transactionSpy = jest.spyOn(db, "select");

    const resRedirectCache = await request(app)
      .get("/redirect")
      .query({ code: shortCode });
    expect(resRedirectCache.status).toBe(302);
    expect(transactionSpy).not.toHaveBeenCalled();

    transactionSpy.mockRestore();
  });
});
