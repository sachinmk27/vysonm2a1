import request from "supertest";
import app from "../../index.js";
import db from "../../drizzle/index.js";
import { urlTable, userTable } from "../../drizzle/schema.js";

const SAMPLE_URL_A = "https://example.com";
const SAMPLE_URL_B = "https://another-example.com";
const API_KEY_HOBBY = "apiKeyHobby";
const API_KEY_ENTERPRISE = "apiKeyEnterprise";
beforeAll(async () => {
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
      .set("X-API-KEY", API_KEY_HOBBY)
      .send({ url: SAMPLE_URL_A })
      .then((res) => {
        shortCode = res.body.shortCode;
        expect(res.status).toBe(200);
      });
  });
  it("should return 200 OK with different short code for duplicate URL", async () => {
    await request(app)
      .post("/shorten")
      .set("X-API-KEY", API_KEY_HOBBY)
      .send({ url: SAMPLE_URL_A });
    const res = await request(app)
      .post("/shorten")
      .set("X-API-KEY", API_KEY_HOBBY)
      .send({ url: SAMPLE_URL_A });
    expect(res.status).toBe(200);
    expect(res.body.shortCode).not.toBe(shortCode);
  });
  it("should return 400 Bad Request for invalid URL format", () => {
    return request(app)
      .post("/shorten")
      .set("X-API-KEY", API_KEY_HOBBY)
      .send({ url: "invalid-url" })
      .then((res) => {
        expect(res.status).toBe(400);
      });
  });
  it("should return 400 Bad Request for missing URL", () => {
    return request(app)
      .post("/shorten")
      .set("X-API-KEY", API_KEY_HOBBY)
      .send({})
      .then((res) => {
        expect(res.status).toBe(400);
      });
  });
  it("should return 400 Bad Request for missing URL", () => {
    return request(app)
      .post("/shorten")
      .set("X-API-KEY", API_KEY_HOBBY)
      .send({ url: SAMPLE_URL_A, code: "" })
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
      .set("X-API-KEY", API_KEY_HOBBY)
      .send({ url: SAMPLE_URL_A, expiryDate })
      .then((res) => {
        expect(res.status).toBe(200);
        expect(res.body.expiryDate).toBe(expiryDate);
      });
  });
  it("should return 400 with invalid expiry date", () => {
    const expiryDate = "invalid-date";
    return request(app)
      .post("/shorten")
      .set("X-API-KEY", API_KEY_HOBBY)
      .send({ url: SAMPLE_URL_A, expiryDate })
      .then((res) => {
        expect(res.status).toBe(400);
      });
  });
  it("should return 400 with invalid accessPassword", () => {
    return request(app)
      .post("/shorten")
      .set("X-API-KEY", API_KEY_HOBBY)
      .send({ url: SAMPLE_URL_A, accessPassword: "" })
      .then((res) => {
        expect(res.status).toBe(400);
      });
  });
  it("should return 200 OK if custom code is provided", () => {
    return request(app)
      .post("/shorten")
      .set("X-API-KEY", API_KEY_HOBBY)
      .send({ url: SAMPLE_URL_A, code: "custom-code" })
      .then((res) => {
        expect(res.status).toBe(200);
        expect(res.body.shortCode).toBe("custom-code");
      });
  });
  it("should return 200 OK if access password is provided", () => {
    const expiryDate = Date.now() + 60 * 60 * 1000;
    return request(app)
      .post("/shorten")
      .set("X-API-KEY", API_KEY_HOBBY)
      .send({
        url: SAMPLE_URL_A,
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
        originalUrl: SAMPLE_URL_A,
        shortCode: "custom-code",
        userId: 1,
      })
      .then(() => {
        return request(app)
          .post("/shorten")
          .set("X-API-KEY", API_KEY_HOBBY)
          .send({ url: SAMPLE_URL_A, code: "custom-code" })
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
      .set("X-API-KEY", API_KEY_HOBBY)
      .send({ url: SAMPLE_URL_A })
      .then((res) => {
        expect(res.status).toBe(500);
        db.insert = originalInsert;
      });
  });
});

describe("DELETE /shorten/:code", () => {
  let shortCode;

  beforeEach(() => {
    return request(app)
      .post("/shorten")
      .send({ url: SAMPLE_URL_B })
      .set("X-API-KEY", API_KEY_HOBBY)
      .then((res) => {
        shortCode = res.body.shortCode;
        expect(res.status).toBe(200);
      });
  });

  it("should delete the shortened URL", () => {
    return request(app)
      .delete(`/shorten/${shortCode}`)
      .set("X-API-KEY", API_KEY_HOBBY)
      .then((res) => {
        expect(res.status).toBe(204);
      });
  });

  it("should return 404 if the code does not exist", () => {
    return request(app)
      .delete(`/shorten/code_does_not_exist`)
      .set("X-API-KEY", API_KEY_HOBBY)
      .then((res) => {
        expect(res.status).toBe(404);
      });
  });

  it("should return 400 if no code is provided", () => {
    return request(app)
      .delete("/shorten")
      .set("X-API-KEY", API_KEY_HOBBY)
      .then((res) => {
        expect(res.status).toBe(400);
      });
  });

  it("should not be able to access deleted URL", async () => {
    const deleteRes = await request(app)
      .delete(`/shorten/${shortCode}`)
      .set("X-API-KEY", API_KEY_HOBBY);

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
      .set("X-API-KEY", API_KEY_HOBBY)
      .then((res) => {
        expect(res.status).toBe(500);
        db.update = originalUpdate;
      });
  });
});

describe("POST /batch-shorten", () => {
  it("should return 200 OK for valid input", () => {
    return request(app)
      .post("/batch-shorten")
      .set("X-API-KEY", API_KEY_ENTERPRISE)
      .send({ urls: [{ url: SAMPLE_URL_A }, { url: SAMPLE_URL_B }] })
      .then((res) => {
        expect(res.status).toBe(200);
        expect(res.body.length).toBe(2);
      });
  });

  it("should return 400 Bad Request for missing URL", () => {
    return request(app)
      .post("/batch-shorten")
      .set("X-API-KEY", API_KEY_ENTERPRISE)
      .send({})
      .then((res) => {
        expect(res.status).toBe(400);
      });
  });

  it("should return 401 Unauthorized for missing API key", () => {
    return request(app)
      .post("/batch-shorten")
      .send({ urls: [{ url: SAMPLE_URL_A }, { url: SAMPLE_URL_B }] })
      .then((res) => {
        expect(res.status).toBe(401);
      });
  });

  it("should partially process if some URLs are invalid and return success/errors accordingly", () => {
    const reqBody = {
      urls: [
        { url: SAMPLE_URL_A, code: "sample_url_a_code" },
        { url: "invalid url" },
        { url: SAMPLE_URL_B, code: "sample_url_b_code" },
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
      .set("X-API-KEY", API_KEY_ENTERPRISE)
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
      .set("X-API-KEY", API_KEY_HOBBY)
      .send({ urls: [{ url: SAMPLE_URL_A }, { url: SAMPLE_URL_B }] })
      .then((res) => {
        expect(res.status).toBe(403);
      });
  });
});

describe("PATCH /shorten/:code", () => {
  let shortCode;
  beforeEach(() => {
    return request(app)
      .post("/shorten")
      .send({ url: SAMPLE_URL_A })
      .set("X-API-KEY", API_KEY_HOBBY)
      .then((res) => {
        shortCode = res.body.shortCode;
        expect(res.status).toBe(200);
      });
  });

  it("should return 200 OK for valid input", () => {
    const expiryDate = Date.now() + 1000;
    return request(app)
      .patch(`/shorten/${shortCode}`)
      .set("X-API-KEY", API_KEY_HOBBY)
      .send({ expiryDate })
      .then((res) => {
        expect(res.status).toBe(200);
        expect(res.body.expiryDate).toBe(expiryDate);
      });
  });

  it("should return 404 Not Found if the code does not exist", () => {
    return request(app)
      .patch("/shorten/code_does_not_exist")
      .set("X-API-KEY", API_KEY_HOBBY)
      .send({ expiryDate: Date.now() + 1000 })
      .then((res) => {
        expect(res.status).toBe(404);
      });
  });

  it("should return 404 Not Found if the code has been deleted", async () => {
    await request(app)
      .delete(`/shorten/${shortCode}`)
      .set("X-API-KEY", API_KEY_HOBBY);
    const res = await request(app)
      .patch(`/shorten/${shortCode}`)
      .set("X-API-KEY", API_KEY_HOBBY)
      .send({ expiryDate: Date.now() + 1000 });
    expect(res.status).toBe(404);
  });

  it("should return 400 Bad Request if input is empty", () => {
    return request(app)
      .patch(`/shorten/${shortCode}`)
      .set("X-API-KEY", API_KEY_HOBBY)
      .send({})
      .then((res) => {
        expect(res.status).toBe(400);
      });
  });

  it("should return 400 Bad Request if invalid expiry date is provided", () => {
    return request(app)
      .patch(`/shorten/${shortCode}`)
      .set("X-API-KEY", API_KEY_HOBBY)
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
      .set("X-API-KEY", API_KEY_HOBBY)
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
      .set("X-API-KEY", API_KEY_HOBBY)
      .send({ accessPassword: "password", expiryDate })
      .then((res) => {
        expect(res.status).toBe(200);
        expect(res.body.expiryDate).toBe(expiryDate);
      });
  });

  it("should return 200 OK for valid input with only access password", () => {
    return request(app)
      .patch(`/shorten/${shortCode}`)
      .set("X-API-KEY", API_KEY_HOBBY)
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
