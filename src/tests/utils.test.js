import * as utils from "../utils";

describe("getRandomString", () => {
  it("should return a string of default length of 10", () => {
    const result = utils.getRandomString();
    expect(typeof result).toBe("string");
    expect(result.length).toBe(10);
  });
  it("should return a string of the specified length", () => {
    const result = utils.getRandomString(5);
    expect(result.length).toBe(5);
  });

  it("should return a unique string on consecutive calls", () => {
    const a = utils.getRandomString(10);
    const b = utils.getRandomString(10);
    expect(a).not.toBe(b);
  });
});

describe("isURLValid", () => {
  it("should return true for a valid URL", () => {
    const url = "https://example.com";
    expect(utils.isURLValid(url)).toBe(true);
  });

  it("should return false for an invalid URL", () => {
    const url = "example.com";
    expect(utils.isURLValid(url)).toBe(false);
  });

  it("should return false for an empty URL", () => {
    const url = "";
    expect(utils.isURLValid(url)).toBe(false);
  });
});

describe("generateRandomURL", () => {
  it("should return a URL with a valid protocol", () => {
    const url = utils.generateRandomURL();
    expect(utils.isURLValid(url)).toBe(true);
  });
});
