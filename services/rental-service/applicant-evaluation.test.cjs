const assert = require("node:assert/strict");
const test = require("node:test");
const { evaluateApplicant } = require("./applicant-evaluation.cjs");

test("evaluateApplicant validates host ownership", async () => {
  const prisma = {
    booking: {
      findUnique: async () => ({
        id: "booking-1",
        userId: "renter-1",
        roomId: "room-1",
        room: { id: "room-1", title: "Studio" },
        user: { id: "renter-1", name: "Lan", email: "lan@example.com" },
      }),
    },
    room: {
      findUnique: async () => ({ id: "room-1", ownerId: "host-1" }),
    },
  };

  const result = await evaluateApplicant(
    prisma,
    { userId: "host-2", role: "HOST" },
    "booking-1",
    "http://ai.local",
  );

  assert.equal(result.status, 403);
});

test("evaluateApplicant returns fallback evaluation when AI is unavailable", async () => {
  const originalFetch = global.fetch;
  const originalError = console.error;
  global.fetch = async () => {
    throw new Error("offline");
  };
  console.error = () => {};

  const prisma = {
    booking: {
      findUnique: async () => ({
        id: "booking-1",
        userId: "renter-1",
        roomId: "room-1",
        startDate: new Date("2026-08-01"),
        endDate: new Date("2026-09-01"),
        status: "PENDING",
        room: { id: "room-1", title: "Studio" },
        user: {
          id: "renter-1",
          name: "Lan",
          email: "lan@example.com",
          fullName: "Nguyen Lan",
        },
      }),
    },
    room: {
      findUnique: async () => ({ id: "room-1", ownerId: "host-1", title: "Studio" }),
    },
  };

  try {
    const result = await evaluateApplicant(
      prisma,
      { userId: "host-1", role: "HOST" },
      "booking-1",
      "http://ai.local",
    );

    assert.equal(result.status, 200);
    assert.equal(result.payload.booking.id, "booking-1");
    assert.equal(result.payload.evaluation.status, "ERROR");
  } finally {
    global.fetch = originalFetch;
    console.error = originalError;
  }
});
