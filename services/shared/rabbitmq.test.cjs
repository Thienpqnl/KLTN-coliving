const assert = require("node:assert/strict");
const test = require("node:test");

const { messageProperties, retryCount } = require("./rabbitmq.cjs");

test("retryCount defaults to zero and reads retry headers", () => {
  assert.equal(retryCount({ properties: { headers: {} } }), 0);
  assert.equal(retryCount({ properties: { headers: { "x-retry-count": 4 } } }), 4);
});

test("messageProperties preserves identity and merges headers", () => {
  const result = messageProperties({
    properties: {
      contentType: "application/json",
      messageId: "event-1",
      type: "property.room.changed",
      appId: "property-service",
      headers: { trace: "trace-1" },
    },
  }, { "x-retry-count": 2 });
  assert.equal(result.messageId, "event-1");
  assert.equal(result.headers.trace, "trace-1");
  assert.equal(result.headers["x-retry-count"], 2);
  assert.equal(result.persistent, true);
});
