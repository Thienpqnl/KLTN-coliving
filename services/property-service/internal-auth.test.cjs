const assert = require("node:assert/strict");
const test = require("node:test");
const { requireInternalService } = require("./internal-auth.cjs");

function invoke(headers = {}) {
  let nextCalled = false;
  let statusCode = 200;
  let payload;
  const request = {
    get: (name) => headers[name.toLowerCase()],
  };
  const response = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(value) {
      payload = value;
      return this;
    },
  };

  requireInternalService(request, response, () => {
    nextCalled = true;
  });
  return { nextCalled, payload, statusCode };
}

test("internal service authentication accepts only the configured token", () => {
  const previousToken = process.env.INTERNAL_SERVICE_TOKEN;
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  process.env.INTERNAL_SERVICE_TOKEN = "a-secure-internal-token";

  try {
    assert.equal(invoke().statusCode, 401);
    assert.equal(
      invoke({ "x-internal-service-token": "wrong-token" }).statusCode,
      401,
    );
    assert.equal(
      invoke({
        "x-internal-service-token": "a-secure-internal-token",
      }).nextCalled,
      true,
    );
  } finally {
    if (previousToken === undefined) delete process.env.INTERNAL_SERVICE_TOKEN;
    else process.env.INTERNAL_SERVICE_TOKEN = previousToken;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
});
