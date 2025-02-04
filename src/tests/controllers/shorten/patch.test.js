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

describe("PATCH /shorten/:code", () => {
  let shortCode;
  beforeEach(() => {
    return request(app)
      .post("/shorten")
      .send({ url: MOCKS.SAMPLE_URL_A })
      .set("X-API-KEY", MOCKS.API_KEY_HOBBY)
      .then((res) => {
        shortCode = res.body.shortCode;
        expect(res.status).toBe(200);
      });
  });

  it("should return 200 OK for valid input", () => {
    const expiryDate = Date.now() + 1000;
    return request(app)
      .patch(`/shorten/${shortCode}`)
      .set("X-API-KEY", MOCKS.API_KEY_HOBBY)
      .send({ expiryDate })
      .then((res) => {
        expect(res.status).toBe(200);
        expect(res.body.expiryDate).toBe(expiryDate);
      });
  });

  it("should return 404 Not Found if the code does not exist", () => {
    return request(app)
      .patch("/shorten/code_does_not_exist")
      .set("X-API-KEY", MOCKS.API_KEY_HOBBY)
      .send({ expiryDate: Date.now() + 1000 })
      .then((res) => {
        expect(res.status).toBe(404);
      });
  });

  it("should return 404 Not Found if the code has been deleted", async () => {
    await request(app)
      .delete(`/shorten/${shortCode}`)
      .set("X-API-KEY", MOCKS.API_KEY_HOBBY);
    const res = await request(app)
      .patch(`/shorten/${shortCode}`)
      .set("X-API-KEY", MOCKS.API_KEY_HOBBY)
      .send({ expiryDate: Date.now() + 1000 });
    expect(res.status).toBe(404);
  });

  it("should return 400 Bad Request if input is empty", () => {
    return request(app)
      .patch(`/shorten/${shortCode}`)
      .set("X-API-KEY", MOCKS.API_KEY_HOBBY)
      .send({})
      .then((res) => {
        expect(res.status).toBe(400);
      });
  });

  it("should return 400 Bad Request if invalid expiry date is provided", () => {
    return request(app)
      .patch(`/shorten/${shortCode}`)
      .set("X-API-KEY", MOCKS.API_KEY_HOBBY)
      .send({ expiryDate: "abc" })
      .then((res) => {
        expect(res.status).toBe(400);
      });
  });

  it("should return 401 Unauthorized if no API key is provided", () => {
    return request(app)
      .patch(`/shorten/${shortCode}`)
      .send({ expiryDate: Date.now() + 1000 })
      .then((res) => {
        expect(res.status).toBe(401);
      });
  });

  it("should return 500 if database error occurs", () => {
    const originalUpdate = db.update;
    db.update = jest.fn().mockImplementation(() => {
      throw new Error("Database error");
    });

    return request(app)
      .patch(`/shorten/${shortCode}`)
      .set("X-API-KEY", MOCKS.API_KEY_HOBBY)
      .send({ expiryDate: Date.now() + 1000 })
      .then((res) => {
        expect(res.status).toBe(500);
        db.update = originalUpdate;
      });
  });

  it("should return 200 OK for valid input with access password and expiry date", () => {
    const expiryDate = Date.now() + 1000;
    return request(app)
      .patch(`/shorten/${shortCode}`)
      .set("X-API-KEY", MOCKS.API_KEY_HOBBY)
      .send({ accessPassword: "password", expiryDate })
      .then((res) => {
        expect(res.status).toBe(200);
        expect(res.body.expiryDate).toBe(expiryDate);
      });
  });

  it("should return 200 OK for valid input with only access password", () => {
    return request(app)
      .patch(`/shorten/${shortCode}`)
      .set("X-API-KEY", MOCKS.API_KEY_HOBBY)
      .send({ accessPassword: "password" })
      .then((res) => {
        expect(res.status).toBe(200);
        return request(app)
          .get("/redirect")
          .query({ code: shortCode, accessPassword: "password" });
      })
      .then((res) => {
        expect(res.status).toBe(302);
      });
  });
});
