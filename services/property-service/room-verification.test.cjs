const assert = require("node:assert/strict");
const test = require("node:test");
const { reviewByAdmin } = require("./room-verification.cjs");

test("room approval stores an audit intent in the Property outbox transaction", async () => {
  let outboxData;
  const room = {
    id: "room-1",
    ownerId: "host-1",
    status: "PENDING",
    verification: {
      managerRecommendation: "RECOMMEND_APPROVAL",
      facilityPassed: true,
      safetyPassed: true,
      legalOccupancyPassed: true,
      informationAccurateConfirmed: true,
      legalResponsibilityAccepted: true,
      verificationConsentAccepted: true,
      declarationAcceptedAt: new Date(),
    },
  };
  const tx = {
    roomVerification: { upsert: async () => ({ id: "verification-1" }) },
    room: {
      update: async ({ data }) => ({
        ...room,
        status: data.status,
        verification: null,
      }),
    },
    propertyOutboxEvent: {
      create: async ({ data }) => {
        outboxData = data;
        return { id: "event-1", ...data };
      },
    },
  };
  const prisma = {
    room: { findUnique: async () => room },
    $transaction: async (operation) => operation(tx),
  };

  const result = await reviewByAdmin(
    prisma,
    { userId: "admin-1", role: "ADMIN" },
    "room-1",
    {
      action: "approve",
      checklist: {
        identityPassed: true,
        ownershipPassed: true,
        addressPassed: true,
        imagesPassed: true,
        detailsPassed: true,
      },
    },
    { userMap: async () => new Map() },
  );

  assert.equal(result.status, 200);
  assert.equal(outboxData.eventType, "audit.admin.action.requested");
  assert.equal(outboxData.payload.action, "ROOM_APPROVE");
  assert.equal(outboxData.payload.targetUserId, "host-1");
});
