import http, { batch } from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

export let errorRate = new Rate("errors");

function generateRandomURL() {
  const protocols = ["http", "https"];
  const domains = ["com", "org", "net", "io", "dev"];
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const charLength = chars.length;

  // Helper function to generate random strings
  function getRandomString(length) {
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * charLength)];
    }
    return result;
  }

  // Generate random protocol, subdomain, domain, and extension
  const protocol = protocols[Math.floor(Math.random() * 2)];
  const subdomain = getRandomString(Math.floor(Math.random() * 8) + 3);
  const domain = getRandomString(Math.floor(Math.random() * 8) + 3);
  const domainExtension = domains[Math.floor(Math.random() * domains.length)];

  return `${protocol}://${subdomain}.${domain}.${domainExtension}`;
}

export let options = {
  stages: [
    { duration: "10s", target: 50 },
    { duration: "5m", target: 50 },
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
