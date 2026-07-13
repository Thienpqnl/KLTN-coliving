const crypto = require("node:crypto");
const { AsyncLocalStorage } = require("node:async_hooks");

const requestContext = new AsyncLocalStorage();

function correlationHeaders(headers = {}) {
  const result = { ...headers };
  const correlationId = requestContext.getStore()?.correlationId;
  if (correlationId) result["x-correlation-id"] = correlationId;
  return result;
}

function escapeLabel(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll("\n", "\\n").replaceAll('"', '\\"');
}

function normalizePath(request) {
  const routePath = request.route?.path;
  if (routePath) return `${request.baseUrl || ""}${routePath}`;
  return request.path.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ":id");
}

function createObservability(service) {
  const startedAt = Date.now();
  const requests = new Map();
  const durations = new Map();
  let inFlight = 0;

  function middleware(request, response, next) {
    const correlationId = request.get("x-correlation-id") || crypto.randomUUID();
    const start = process.hrtime.bigint();
    request.correlationId = correlationId;
    response.setHeader("x-correlation-id", correlationId);
    inFlight += 1;

    response.on("finish", () => {
      inFlight -= 1;
      const durationSeconds = Number(process.hrtime.bigint() - start) / 1e9;
      const path = normalizePath(request);
      const key = JSON.stringify([request.method, path, response.statusCode]);
      requests.set(key, (requests.get(key) || 0) + 1);
      const current = durations.get(key) || { count: 0, sum: 0 };
      durations.set(key, { count: current.count + 1, sum: current.sum + durationSeconds });

      if (request.path !== "/metrics") {
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          level: response.statusCode >= 500 ? "error" : "info",
          service,
          correlationId,
          method: request.method,
          path,
          status: response.statusCode,
          durationMs: Math.round(durationSeconds * 1000),
        }));
      }
    });
    requestContext.run({ correlationId }, next);
  }

  function metrics(_request, response) {
    const lines = [
      "# HELP coliving_service_info Static service information.",
      "# TYPE coliving_service_info gauge",
      `coliving_service_info{service="${escapeLabel(service)}"} 1`,
      "# HELP process_uptime_seconds Service process uptime.",
      "# TYPE process_uptime_seconds gauge",
      `process_uptime_seconds{service="${escapeLabel(service)}"} ${(Date.now() - startedAt) / 1000}`,
      "# HELP http_requests_in_flight Current HTTP requests in flight.",
      "# TYPE http_requests_in_flight gauge",
      `http_requests_in_flight{service="${escapeLabel(service)}"} ${inFlight}`,
      "# HELP http_requests_total Total completed HTTP requests.",
      "# TYPE http_requests_total counter",
    ];
    for (const [key, count] of requests) {
      const [method, path, status] = JSON.parse(key);
      const labels = `service="${escapeLabel(service)}",method="${method}",path="${escapeLabel(path)}",status="${status}"`;
      lines.push(`http_requests_total{${labels}} ${count}`);
    }
    lines.push("# HELP http_request_duration_seconds HTTP request duration.", "# TYPE http_request_duration_seconds summary");
    for (const [key, value] of durations) {
      const [method, path, status] = JSON.parse(key);
      const labels = `service="${escapeLabel(service)}",method="${method}",path="${escapeLabel(path)}",status="${status}"`;
      lines.push(`http_request_duration_seconds_sum{${labels}} ${value.sum}`);
      lines.push(`http_request_duration_seconds_count{${labels}} ${value.count}`);
    }
    response.type("text/plain; version=0.0.4").send(`${lines.join("\n")}\n`);
  }

  return { middleware, metrics };
}

module.exports = { correlationHeaders, createObservability };
