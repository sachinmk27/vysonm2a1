import request from "supertest";
import app from "./index.js";

let shortCode;
const SAMPLE_URL_A = "https://example.com";
const SAMPLE_URL_B = "https://another-example.com";

describe("POST /shorten", () => {
  it("should return 200 OK", () => {
    return request(app)
      .post("/shorten")
      .send({ url: SAMPLE_URL_A })
      .then((res) => {
        shortCode = res.body.shortCode;
        expect(res.status).toBe(200);
      });
  });
  it("should return 200 OK for duplicate URL", () => {
    return request(app)
      .post("/shorten")
      .send({ url: SAMPLE_URL_A })
      .then((res) => {
        shortCode = res.body.shortCode;
        expect(res.status).toBe(200);
      });
  });
  it("should return 400 Bad Request for invalid URL format", () => {
    return request(app)
      .post("/shorten")
      .send({ url: "invalid-url" })
      .then((res) => {
        expect(res.status).toBe(400);
      });
  });
  it("should return 400 Bad Request for missing URL", () => {
    return request(app)
      .post("/shorten")
      .send({})
      .then((res) => {
        expect(res.status).toBe(400);
      });
  });
});
describe("GET /redirect", () => {
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
});

describe("DELETE /shorten/:code", () => {
  let shortCode;

  beforeEach(() => {
    return request(app)
      .post("/shorten")
      .send({ url: SAMPLE_URL_B })
      .then((res) => {
        shortCode = res.body.shortCode;
        expect(res.status).toBe(200);
      });
  });

  it("should delete the shortened URL", () => {
    return request(app)
      .delete(`/shorten/${shortCode}`)
      .then((res) => {
        expect(res.status).toBe(204);
      });
  });

  it("should return 404 if the code does not exist", () => {
    return request(app)
      .delete(`/shorten/code_does_not_exist`)
      .then((res) => {
        expect(res.status).toBe(404);
      });
  });

  it("should return 400 if no code is provided", () => {
    return request(app)
      .delete("/shorten")
      .then((res) => {
        expect(res.status).toBe(400);
      });
  });

  it("should not be able to access deleted URL", () => {
    return request(app)
      .delete(`/shorten/${shortCode}`)
      .then((res) => {
        expect(res.status).toBe(204);
        return request(app)
          .get("/redirect")
          .query({ code: shortCode })
          .then((res) => {
            expect(res.status).toBe(404);
          });
      });
  });
});
