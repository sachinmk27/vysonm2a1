import http, { batch } from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

export let errorRate = new Rate("errors");

export let options = {
  stages: [
    { duration: "10s", target: 10 },
    { duration: "10s", target: 10 },
    { duration: "10s", target: 0 },
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
    "http://localhost:3000/shorten",
    JSON.stringify({ url: "https://example.com" }),
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
