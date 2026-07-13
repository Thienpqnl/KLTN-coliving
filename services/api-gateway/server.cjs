require("dotenv").config();

const express = require("express");
const { requireInternalService } = require("../shared/internal-auth.cjs");
const { createObservability } = require("../shared/observability.cjs");
const { resolveServiceUrl, upstreamPath } = require("./gateway.cjs");

const app = express();
const port = Number(process.env.PORT || 4000);
const observability = createObservability("api-gateway");
const rateWindows = new Map();

app.disable("x-powered-by");
app.use(observability.middleware);
app.get("/health", (_request, response) => response.json({ status: "ok", service: "api-gateway" }));
app.get("/metrics", observability.metrics);

function rateLimit(request, response, next) {
  const now = Date.now();
  const windowMs = Number(process.env.GATEWAY_RATE_LIMIT_WINDOW_MS || 60_000);
  const limit = Number(process.env.GATEWAY_RATE_LIMIT_MAX || 600);
  const key = request.ip || request.socket.remoteAddress || "unknown";
  const current = rateWindows.get(key);
  const entry = !current || now >= current.resetAt
    ? { count: 1, resetAt: now + windowMs }
    : { count: current.count + 1, resetAt: current.resetAt };
  rateWindows.set(key, entry);
  response.setHeader("x-ratelimit-limit", String(limit));
  response.setHeader("x-ratelimit-remaining", String(Math.max(0, limit - entry.count)));
  if (entry.count > limit) {
    return response.status(429).json({ error: "RATE_LIMITED", message: "Too many requests" });
  }
  return next();
}

async function readBody(request) {
  if (request.method === "GET" || request.method === "HEAD") return undefined;
  const maxBytes = Number(process.env.GATEWAY_MAX_BODY_BYTES || 10 * 1024 * 1024);
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) {
      const error = new Error("Request body is too large");
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

app.use("/v1/services/:service", requireInternalService, rateLimit, async (request, response) => {
  const baseUrl = resolveServiceUrl(request.params.service);
  if (!baseUrl) {
    return response.status(404).json({ error: "UNKNOWN_SERVICE", message: "Service is not registered" });
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number(process.env.GATEWAY_TIMEOUT_MS || process.env.MICROSERVICE_TIMEOUT_MS || 5_000),
  );
  try {
    const body = await readBody(request);
    const headers = new Headers();
    for (const name of ["accept", "content-type", "authorization", "x-user-id", "x-user-role", "x-correlation-id"]) {
      const value = request.get(name);
      if (value) headers.set(name, value);
    }
    if (process.env.INTERNAL_SERVICE_TOKEN) {
      headers.set("x-internal-service-token", process.env.INTERNAL_SERVICE_TOKEN);
    }
    const upstream = await fetch(`${baseUrl}${upstreamPath(request)}`, {
      method: request.method,
      headers,
      body,
      redirect: "manual",
      signal: controller.signal,
    });
    const payload = Buffer.from(await upstream.arrayBuffer());
    const contentType = upstream.headers.get("content-type");
    if (contentType) response.setHeader("content-type", contentType);
    const upstreamCorrelationId = upstream.headers.get("x-correlation-id");
    if (upstreamCorrelationId) response.setHeader("x-correlation-id", upstreamCorrelationId);
    return response.status(upstream.status).send(payload);
  } catch (error) {
    if (error.status === 413) {
      return response.status(413).json({ error: "PAYLOAD_TOO_LARGE", message: error.message });
    }
    const timedOut = error.name === "AbortError";
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "error",
      service: "api-gateway",
      correlationId: request.correlationId,
      upstream: request.params.service,
      error: error.message,
    }));
    return response.status(timedOut ? 504 : 502).json({
      error: timedOut ? "GATEWAY_TIMEOUT" : "BAD_GATEWAY",
      message: timedOut ? "Upstream service timed out" : "Cannot reach upstream service",
    });
  } finally {
    clearTimeout(timeout);
  }
});

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`[api-gateway] listening on port ${port}`);
});

function shutdown(signal) {
  console.log(`[api-gateway] received ${signal}, shutting down`);
  server.close(() => process.exit(0));
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
