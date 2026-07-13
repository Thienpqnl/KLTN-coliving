const assert = require("node:assert/strict");
const test = require("node:test");
const express = require("express");
const { correlationHeaders, createObservability } = require("./observability.cjs");

async function withServer(run) {
  const app = express();
  const observability = createObservability("test-service");
  app.use(observability.middleware);
  app.get("/metrics", observability.metrics);
  app.get("/items/:id", (_request, response) => response.status(201).json({ ok: true }));
  app.get("/context", (_request, response) => response.json(correlationHeaders()));
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("preserves correlation ID and exports HTTP metrics", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/items/123`, {
      headers: { "x-correlation-id": "trace-test-123" },
    });
    assert.equal(response.status, 201);
    assert.equal(response.headers.get("x-correlation-id"), "trace-test-123");

    const metrics = await fetch(`${baseUrl}/metrics`).then((result) => result.text());
    assert.match(metrics, /coliving_service_info\{service="test-service"\} 1/);
    assert.match(metrics, /http_requests_total\{[^\n]*path="\/items\/:id"[^\n]*status="201"[^\n]*\} 1/);
  });
});

test("exposes the active correlation ID to internal service clients", async () => {
  await withServer(async (baseUrl) => {
    const payload = await fetch(`${baseUrl}/context`, {
      headers: { "x-correlation-id": "trace-across-services" },
    }).then((response) => response.json());
    assert.equal(payload["x-correlation-id"], "trace-across-services");
  });
});

test("generates a correlation ID when the caller does not provide one", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/items/456`);
    assert.match(response.headers.get("x-correlation-id"), /^[0-9a-f-]{36}$/);
  });
});
