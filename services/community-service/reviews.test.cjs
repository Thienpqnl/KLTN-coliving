const assert = require("node:assert/strict");
const test = require("node:test");
const {
  createReview,
  listHostReviews,
  updateReviewStatus,
} = require("./reviews.cjs");

const roomId = "11111111-1111-4111-8111-111111111111";

test("createReview rejects room owner and users without booking or contract", async () => {
  const ownerPrisma = {
    room: {
      findUnique: async () => ({ id: roomId, ownerId: "user-1" }),
    },
  };

  const ownerResult = await createReview(
    ownerPrisma,
    { userId: "user-1" },
    { roomId, rating: 5 },
    {
      getRoom: async () => ({ id: roomId, ownerId: "user-1" }),
      getReviewEligibility: async () => ({ eligible: true }),
    },
  );
  assert.equal(ownerResult.status, 400);

  const noEligibilityPrisma = {
    room: {
      findUnique: async () => ({ id: roomId, ownerId: "host-1" }),
    },
    booking: { findFirst: async () => null },
    contract: { findFirst: async () => null },
    review: { findUnique: async () => null },
  };

  const result = await createReview(
    noEligibilityPrisma,
    { userId: "user-1" },
    { roomId, rating: 5 },
    {
      getRoom: async () => ({ id: roomId, ownerId: "host-1" }),
      getReviewEligibility: async () => ({ eligible: false }),
    },
  );
  assert.equal(result.status, 400);
});

test("createReview creates visible review for eligible renter", async () => {
  let createArgs;
  const prisma = {
    room: {
      findUnique: async () => ({ id: roomId, ownerId: "host-1" }),
    },
    booking: { findFirst: async () => ({ id: "booking-1" }) },
    contract: { findFirst: async () => null },
    review: {
      findUnique: async () => null,
      create: async (args) => {
        createArgs = args;
        return { id: "review-1", ...args.data };
      },
    },
  };

  const result = await createReview(
    prisma,
    { userId: "user-1" },
    { roomId, rating: 5, comment: "Tot" },
    {
      getRoom: async () => ({ id: roomId, ownerId: "host-1" }),
      getReviewEligibility: async () => ({ eligible: true }),
      getIdentityUsers: async () => [{ id: "user-1", fullName: "User One" }],
    },
  );

  assert.equal(result.status, 201);
  assert.equal(createArgs.data.userId, "user-1");
  assert.equal(createArgs.data.roomId, roomId);
});

test("createReview reports dependency outages without querying foreign tables", async () => {
  const result = await createReview(
    {},
    { userId: "user-1" },
    { roomId, rating: 5 },
    {
      getRoom: async () => { const error = new Error("Property offline"); error.status = 503; throw error; },
      getReviewEligibility: async () => ({ eligible: true }),
    },
  );
  assert.equal(result.status, 503);
});

test("listHostReviews only allows host or admin", async () => {
  const denied = await listHostReviews({}, { userId: "user-1", role: "CUSTOMER" });
  assert.equal(denied.status, 403);
});

test("updateReviewStatus is admin-only and enqueues a moderation audit", async () => {
  const denied = await updateReviewStatus(
    {},
    { userId: "host-1", role: "HOST" },
    "review-1",
    { status: "HIDDEN" },
  );
  assert.equal(denied.status, 403);

  const calls = [];
  const prisma = {
    review: {
      findUnique: async () => ({
        id: "review-1",
        userId: "user-1",
        status: "VISIBLE",
        room: { id: roomId, title: "Studio" },
      }),
      update: async ({ data }) => ({ id: "review-1", ...data }),
    },
    communityOutboxEvent: {
      create: async ({ data }) => calls.push(data),
    },
    $transaction: async (operation) => operation(prisma),
  };

  const result = await updateReviewStatus(
    prisma,
    { userId: "admin-1", role: "ADMIN" },
    "review-1",
    { status: "HIDDEN", reason: "Vi pham" },
    {
      getRoom: async () => ({ id: roomId, title: "Studio" }),
      getIdentityUsers: async () => [{ id: "user-1", fullName: "User One" }],
    },
  );

  assert.equal(result.status, 200);
  assert.equal(calls[0].eventType, "audit.admin.action.requested");
  assert.equal(calls[0].payload.action, "moderate_review");
});
