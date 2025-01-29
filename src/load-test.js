import http, { batch } from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

export let errorRate = new Rate("errors");

export let options = {
  stages: [
    { duration: "10s", target: 200 },
    { duration: "10s", target: 400 },
    { duration: "10s", target: 600 },
    { duration: "10s", target: 800 },
    { duration: "10s", target: 1000 },
    { duration: "10s", target: 2000 },
    { duration: "10s", target: 3000 },
    { duration: "10s", target: 4000 },
    { duration: "10s", target: 5000 },
    { duration: "10s", target: 6000 },
    { duration: "10s", target: 7000 },
    { duration: "10s", target: 8000 },
    { duration: "10s", target: 9000 },
    { duration: "10s", target: 10000 },
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
