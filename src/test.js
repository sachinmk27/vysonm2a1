import request from "supertest";
import app from "./index.js";

let shortCode;

describe("POST /shorten", () => {
  it("should return 200 OK", () => {
    return request(app)
      .post("/shorten")
      .send({ url: "https://example.com" })
      .then((res) => {
        shortCode = res.body.shortCode;
        expect(res.status).toBe(200);
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
        expect(redirectUrl).toBe("https://example.com");
      });
  });
});
