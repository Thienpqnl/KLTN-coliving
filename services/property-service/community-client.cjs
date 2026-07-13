const { correlationHeaders } = require("../shared/observability.cjs");

function serviceUrl() {
  return String(process.env.COMMUNITY_SERVICE_URL || "").replace(/\/+$/, "");
}

async function getRoomReviewStats(roomId) {
  const baseUrl = serviceUrl();
  if (!baseUrl) throw new Error("COMMUNITY_SERVICE_URL is not configured for Property Service");
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number(process.env.MICROSERVICE_TIMEOUT_MS || 3000),
  );
  try {
    const headers = correlationHeaders({ accept: "application/json" });
    if (process.env.INTERNAL_SERVICE_TOKEN) {
      headers["x-internal-service-token"] = process.env.INTERNAL_SERVICE_TOKEN;
    }
    const response = await fetch(
      `${baseUrl}/v1/internal/rooms/${encodeURIComponent(roomId)}/review-stats`,
      { headers, signal: controller.signal },
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.message || `Community Service returned HTTP ${response.status}`);
    }
    return payload;
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { getRoomReviewStats };
