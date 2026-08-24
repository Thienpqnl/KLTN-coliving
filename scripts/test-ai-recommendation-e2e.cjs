const { performance } = require("node:perf_hooks");
const jwt = require("jsonwebtoken");
require("dotenv").config({ quiet: true });

const userId = process.argv[2] || process.env.TEST_USER_ID;
const iterations = Number(process.argv[3] || 5);
const baseUrl = process.env.TEST_WEB_URL || "http://127.0.0.1:3000";

if (!userId) {
  throw new Error("Provide a user ID as the first argument or TEST_USER_ID");
}
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not configured");
}

const token = jwt.sign({ userId, role: "TENANT" }, process.env.JWT_SECRET, {
  expiresIn: "10m",
});

async function main() {
  const samples = [];
  for (let index = 0; index < iterations; index += 1) {
    const startedAt = performance.now();
    const response = await fetch(`${baseUrl}/api/recommendations/rooms?top_k=10`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const body = await response.json().catch(() => null);
    samples.push({
      run: index + 1,
      status: response.status,
      durationMs: Number((performance.now() - startedAt).toFixed(1)),
      recommendations: Array.isArray(body) ? body.length : 0,
    });
  }

  const durations = samples.map((sample) => sample.durationMs);
  const passed = samples.filter((sample) => sample.status === 200).length;
  console.log(JSON.stringify({
    endpoint: "/api/recommendations/rooms?top_k=10",
    passed: `${passed}/${iterations}`,
    averageMs: Number((durations.reduce((sum, value) => sum + value, 0) / durations.length).toFixed(1)),
    minMs: Math.min(...durations),
    maxMs: Math.max(...durations),
    samples,
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
