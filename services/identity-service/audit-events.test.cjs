const assert = require("node:assert/strict");
const test = require("node:test");
const { handleAdminAuditEvent } = require("./audit-events.cjs");

test("Identity writes a remote admin audit event once", async () => {
  const calls = [];
  const tx = {
    identityInboxEvent: {
      findUnique: async () => null,
      create: async ({ data }) => calls.push({ type: "inbox", data }),
    },
    adminLog: {
      create: async ({ data }) => calls.push({ type: "log", data }),
    },
  };
  const prisma = { $transaction: async (operation) => operation(tx) };

  const result = await handleAdminAuditEvent(prisma, {
    id: "event-1",
    sourceService: "property-service",
    eventType: "audit.admin.action.requested",
    payload: {
      adminId: "admin-1",
      targetUserId: "host-1",
      action: "ROOM_APPROVE",
      targetId: "room-1",
      targetType: "ROOM",
      oldValue: { status: "PENDING" },
      newValue: { status: "AVAILABLE" },
    },
  });

  assert.deepEqual(result, { processed: true });
  assert.equal(calls[0].type, "inbox");
  assert.equal(calls[1].type, "log");
  assert.equal(calls[1].data.oldValue, '{"status":"PENDING"}');
});

test("Identity acknowledges a duplicate audit event without writing another log", async () => {
  let created = false;
  const tx = {
    identityInboxEvent: { findUnique: async () => ({ id: "inbox-1" }) },
    adminLog: { create: async () => { created = true; } },
  };
  const prisma = { $transaction: async (operation) => operation(tx) };

  const result = await handleAdminAuditEvent(prisma, {
    id: "event-1",
    eventType: "audit.admin.action.requested",
    payload: { adminId: "admin-1", action: "ROOM_APPROVE", targetType: "ROOM" },
  });

  assert.deepEqual(result, { processed: false, duplicate: true });
  assert.equal(created, false);
});
