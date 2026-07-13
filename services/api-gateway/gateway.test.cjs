const assert = require("node:assert/strict");
const test = require("node:test");
const { resolveServiceUrl, upstreamPath } = require("./gateway.cjs");

test("resolves only registered services", () => {
  process.env.PROPERTY_SERVICE_URL = "http://property-service:4002/";
  assert.equal(resolveServiceUrl("property-service"), "http://property-service:4002");
  assert.equal(resolveServiceUrl("unknown"), null);
});

test("preserves path and query string after the service prefix", () => {
  const request = {
    params: { service: "property-service" },
    originalUrl: "/v1/services/property-service/v1/rooms?page=2",
    url: "/v1/rooms?page=2",
  };
  assert.equal(upstreamPath(request), "/v1/rooms?page=2");
});
