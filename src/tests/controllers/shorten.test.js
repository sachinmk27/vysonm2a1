import request from "supertest";
import app from "../../index.js";
import db from "../../drizzle/index.js";
import { urlTable, userTable } from "../../drizzle/schema.js";
import { eq } from "drizzle-orm";

const SAMPLE_URL_A = "https://example.com";
const SAMPLE_URL_B = "https://another-example.com";

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

describe("POST /shorten", () => {
  let shortCode;
  it("should return 200 OK", () => {
    return request(app)
      .post("/shorten")
      .set("X-API-KEY", "apiKey")
      .send({ url: SAMPLE_URL_A })
      .then((res) => {
        shortCode = res.body.shortCode;
        expect(res.status).toBe(200);
      });
  });
  it("should return 200 OK with different short code for duplicate URL", () => {
    return request(app)
      .post("/shorten")
      .set("X-API-KEY", "apiKey")
      .send({ url: SAMPLE_URL_A })
      .then((res) => {
        expect(res.status).toBe(200);
        expect(res.body.shortCode).not.toBe(shortCode);
      });
  });
  it("should return 400 Bad Request for invalid URL format", () => {
    return request(app)
      .post("/shorten")
      .set("X-API-KEY", "apiKey")
      .send({ url: "invalid-url" })
      .then((res) => {
        expect(res.status).toBe(400);
      });
  });
  it("should return 400 Bad Request for missing URL", () => {
    return request(app)
      .post("/shorten")
      .set("X-API-KEY", "apiKey")
      .send({})
      .then((res) => {
        expect(res.status).toBe(400);
      });
  });
  it("should return 401 Unauthorized for missing API key", () => {
    return request(app)
      .post("/shorten")
      .send({ url: SAMPLE_URL_A })
      .then((res) => {
        expect(res.status).toBe(401);
      });
  });
  it("should return 200 OK with expiry date", () => {
    const expiryDate = Date.now() + 1000;
    return request(app)
      .post("/shorten")
      .set("X-API-KEY", "apiKey")
      .send({ url: SAMPLE_URL_A, expiryDate })
      .then((res) => {
        expect(res.status).toBe(200);
        expect(res.body.expiryDate).toBe(expiryDate);
      });
  });
  it("should return 200 OK if custom code is provided", () => {
    return request(app)
      .post("/shorten")
      .set("X-API-KEY", "apiKey")
      .send({ url: SAMPLE_URL_A, code: "custom-code" })
      .then((res) => {
        expect(res.status).toBe(200);
        expect(res.body.shortCode).toBe("custom-code");
      });
  });
  it("should return 409 Conflict if duplicate custom code is provided", () => {
    return db
      .insert(urlTable)
      .values({
        originalUrl: SAMPLE_URL_A,
        shortCode: "custom-code",
        userId: 1,
      })
      .onConflictDoNothing()
      .then(() => {
        return request(app)
          .post("/shorten")
          .set("X-API-KEY", "apiKey")
          .send({ url: SAMPLE_URL_A, code: "custom-code" })
          .then((res) => {
            expect(res.status).toBe(409);
          });
      });
  });
});

describe("DELETE /shorten/:code", () => {
  let shortCode;

  beforeEach(() => {
    return request(app)
      .post("/shorten")
      .send({ url: SAMPLE_URL_B })
      .set("X-API-KEY", "apiKey")
      .then((res) => {
        shortCode = res.body.shortCode;
        expect(res.status).toBe(200);
      });
  });

  it("should delete the shortened URL", () => {
    return request(app)
      .delete(`/shorten/${shortCode}`)
      .set("X-API-KEY", "apiKey")
      .then((res) => {
        expect(res.status).toBe(204);
      });
  });

  it("should return 404 if the code does not exist", () => {
    return request(app)
      .delete(`/shorten/code_does_not_exist`)
      .set("X-API-KEY", "apiKey")
      .then((res) => {
        expect(res.status).toBe(404);
      });
  });

  it("should return 400 if no code is provided", () => {
    return request(app)
      .delete("/shorten")
      .set("X-API-KEY", "apiKey")
      .then((res) => {
        expect(res.status).toBe(400);
      });
  });

  it("should not be able to access deleted URL", async () => {
    const deleteRes = await request(app)
      .delete(`/shorten/${shortCode}`)
      .set("X-API-KEY", "apiKey");

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
});
