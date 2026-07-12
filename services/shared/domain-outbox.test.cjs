const assert = require("node:assert/strict");
const test = require("node:test");
const { createDomainOutbox } = require("./domain-outbox.cjs");

test("domain outbox publishes source service and marks the event published", async () => {
  const updates = [];
  const event = {
    id: "event-1",
    aggregateType: "ADMIN_AUDIT",
    aggregateId: "room-1",
    eventType: "audit.admin.action.requested",
    payload: { action: "ROOM_APPROVE" },
    status: "PENDING",
    attempts: 0,
    createdAt: new Date("2026-07-10T00:00:00Z"),
  };
  const prisma = {
    propertyOutboxEvent: {
      findMany: async () => [event],
      updateMany: async () => ({ count: 1 }),
      update: async (args) => updates.push(args),
    },
  };
  let published;
  const publisher = { publish: async (value) => { published = value; } };
  const outbox = createDomainOutbox({
    delegateName: "propertyOutboxEvent",
    serviceName: "property-service",
  });

  await outbox.processOutboxBatch(prisma, publisher);

  assert.equal(published.sourceService, "property-service");
  assert.equal(updates[0].data.status, "PUBLISHED");
});
