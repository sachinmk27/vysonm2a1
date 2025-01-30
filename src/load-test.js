import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";
import { generateRandomURL } from "./utils.js";

export let errorRate = new Rate("errors");

export let options = {
  stages: [
    { duration: "10s", target: 50 },
    { duration: "30s", target: 50 },
  ],
  summaryTrendStats: [
    "avg",
    "min",
    "med",
    "max",
    "p(90)",
    "p(95)",
    "p(99)",
    "count",
  ],
};

export default function () {
  let res = http.post(
    "https://vysonm2a1-ugkp.onrender.com/shorten",
    JSON.stringify({ url: generateRandomURL() }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );

  check(res, {
    "is status 200": (r) => r.status === 200,
  });

  errorRate.add(res.status !== 200);

  sleep(1);
}
