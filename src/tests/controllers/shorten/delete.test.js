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

describe("DELETE /shorten/:code", () => {
  let shortCode;

  beforeEach(() => {
    return request(app)
      .post("/shorten")
      .send({ url: MOCKS.SAMPLE_URL_B })
      .set("X-API-KEY", MOCKS.API_KEY_HOBBY)
      .then((res) => {
        shortCode = res.body.shortCode;
        expect(res.status).toBe(200);
      });
  });

  it("should delete the shortened URL", () => {
    return request(app)
      .delete(`/shorten/${shortCode}`)
      .set("X-API-KEY", MOCKS.API_KEY_HOBBY)
      .then((res) => {
        expect(res.status).toBe(204);
      });
  });

  it("should return 404 if the code does not exist", () => {
    return request(app)
      .delete(`/shorten/code_does_not_exist`)
      .set("X-API-KEY", MOCKS.API_KEY_HOBBY)
      .then((res) => {
        expect(res.status).toBe(404);
      });
  });

  it("should return 400 if no code is provided", () => {
    return request(app)
      .delete("/shorten")
      .set("X-API-KEY", MOCKS.API_KEY_HOBBY)
      .then((res) => {
        expect(res.status).toBe(400);
      });
  });

  it("should not be able to access deleted URL", async () => {
    const deleteRes = await request(app)
      .delete(`/shorten/${shortCode}`)
      .set("X-API-KEY", MOCKS.API_KEY_HOBBY);

    expect(deleteRes.status).toBe(204);
    const redirectRes = await request(app)
      .get("/redirect")
      .query({ code: shortCode });
    expect(redirectRes.status).toBe(404);
  });

  it("should return 401 if no API key is provided", () => {
    return request(app)
      .delete(`/shorten/${shortCode}`)
      .set("X-API-KEY", "")
      .then((res) => {
        expect(res.status).toBe(401);
      });
  });

  it("should return 500 if database error occurs", () => {
    const originalUpdate = db.update;
    // Soft delete
    db.update = jest.fn().mockImplementation(() => {
      throw new Error("Database error");
    });

    return request(app)
      .delete(`/shorten/${shortCode}`)
      .set("X-API-KEY", MOCKS.API_KEY_HOBBY)
      .then((res) => {
        expect(res.status).toBe(500);
        db.update = originalUpdate;
      });
  });
});
