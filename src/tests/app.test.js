import request from "supertest";
import app from "../index.js";

describe("GET /ping", () => {
  it("should return 200 OK", () => {
    return request(app)
      .get("/ping")
      .then((res) => {
        expect(res.status).toBe(200);
      });
  });
});
