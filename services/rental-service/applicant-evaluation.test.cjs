const assert = require("node:assert/strict");
const test = require("node:test");
const { evaluateApplicant } = require("./applicant-evaluation.cjs");
const { createContract, getActiveContractByRoom } = require("./contracts.cjs");

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
    rentalRoomSnapshot: {
      findUnique: async () => ({ roomId: "room-1", ownerId: "host-1", title: "Studio" }),
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

test("getActiveContractByRoom returns active contract for host or renter", async () => {
  let where;
  const prisma = {
    contract: {
      findFirst: async (args) => {
        where = args.where;
        return { id: "contract-1", roomId: "room-1", status: "ACTIVE" };
      },
    },
  };

  const result = await getActiveContractByRoom(
    prisma,
    { userId: "host-1" },
    "room-1",
  );

  assert.equal(result.status, 200);
  assert.equal(result.payload.id, "contract-1");
  assert.deepEqual(where.OR, [{ hostId: "host-1" }, { renterId: "host-1" }]);
});

test("createContract builds legal room content from Rental snapshot", async () => {
  const prisma = {
    booking: {
      findUnique: async () => ({
        id: "booking-1",
        userId: "renter-1",
        roomId: "room-1",
        status: "CONFIRMED",
        startDate: new Date("2026-08-01"),
        endDate: new Date("2026-09-01"),
        contract: null,
      }),
    },
    rentalRoomSnapshot: {
      findUnique: async () => ({
        roomId: "room-1",
        ownerId: "host-1",
        title: "Studio",
        address: "Thu Duc",
        areaText: "25 m2",
        areaValue: 25,
        city: "Ho Chi Minh City",
        district: "Thu Duc",
        maxOccupants: 2,
        priceValue: 2500000n,
      }),
    },
    user: {
      findUnique: async ({ where }) => ({
        id: where.id,
        fullName: where.id === "host-1" ? "Host Name" : "Renter Name",
        email: `${where.id}@example.com`,
        phone: "0900000000",
        address: "Vietnam",
      }),
    },
    contract: {
      create: async ({ data }) => ({ ...data, createdAt: new Date(), updatedAt: new Date() }),
    },
    contractEvent: { create: async () => ({}) },
    $transaction: async (operation) => operation(prisma),
  };

  const result = await createContract(
    prisma,
    { userId: "host-1", role: "HOST" },
    { bookingId: "booking-1", depositAmount: 1000000 },
    {
      getUser: async (id) => ({
        id,
        fullName: id === "host-1" ? "Host Name" : "Renter Name",
        email: `${id}@example.com`,
        phone: "0900000000",
        address: "Vietnam",
      }),
    },
  );

  assert.equal(result.status, 201);
  assert.equal(result.payload.hostId, "host-1");
  assert.equal(result.payload.room.title, "Studio");
  assert.equal(result.payload.contentSnapshot.room.areaText, "25 m2");
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
    rentalRoomSnapshot: {
      findUnique: async () => ({ roomId: "room-1", ownerId: "host-1", title: "Studio" }),
    },
  };

  try {
    const result = await evaluateApplicant(
      prisma,
      { userId: "host-1", role: "HOST" },
      "booking-1",
      "http://ai.local",
      {
        getUser: async () => ({
          id: "renter-1",
          name: "Lan",
          email: "lan@example.com",
          fullName: "Nguyen Lan",
        }),
      },
    );

    assert.equal(result.status, 200);
    assert.equal(result.payload.booking.id, "booking-1");
    assert.equal(result.payload.evaluation.status, "ERROR");
  } finally {
    global.fetch = originalFetch;
    console.error = originalError;
  }
});
