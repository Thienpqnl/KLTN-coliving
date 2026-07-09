const assert = require("node:assert/strict");
const test = require("node:test");
const { createBooking, hostBookingStats, updateBooking } = require("./bookings.cjs");

test("createBooking rejects full rooms before writing a booking", async () => {
  let createCalled = false;
  const prisma = {
    room: {
      findUnique: async () => ({
        id: "room-1",
        ownerId: "host-1",
        status: "AVAILABLE",
        currentOccupants: 1,
        maxOccupants: 1,
      }),
    },
    occupancy: { count: async () => 1 },
    booking: {
      count: async () => 0,
      findFirst: async () => null,
      create: async () => {
        createCalled = true;
        return {};
      },
    },
  };

  const result = await createBooking(
    prisma,
    { userId: "renter-1", role: "CUSTOMER" },
    {
      roomId: "11111111-1111-4111-8111-111111111111",
      startDate: new Date("2026-08-01"),
      endDate: new Date("2026-09-01"),
    },
  );

  assert.equal(result.status, 409);
  assert.equal(createCalled, false);
});

test("updateBooking only lets host or admin confirm a pending booking", async () => {
  const prisma = {
    booking: {
      findUnique: async () => ({
        id: "booking-1",
        userId: "renter-1",
        roomId: "room-1",
        startDate: new Date("2026-08-01"),
        endDate: new Date("2026-09-01"),
        status: "PENDING",
        room: { ownerId: "host-1" },
      }),
    },
    $transaction: async (operation) => operation(prisma),
  };

  const result = await updateBooking(
    prisma,
    { userId: "renter-1", role: "CUSTOMER" },
    "booking-1",
    { status: "CONFIRMED" },
  );

  assert.equal(result.status, 403);
});

test("hostBookingStats returns host booking counters and projected revenue", async () => {
  let bookingCountCalls = 0;
  const prisma = {
    booking: {
      count: async () => {
        bookingCountCalls += 1;
        return bookingCountCalls;
      },
      findMany: async () => [
        { room: { priceValue: 1000000 } },
        { room: { priceValue: 2500000 } },
      ],
    },
    room: {
      count: async ({ where }) => (where.status === "OCCUPIED" ? 1 : 4),
    },
  };

  const result = await hostBookingStats(
    prisma,
    { userId: "host-1", role: "HOST" },
  );

  assert.equal(result.status, 200);
  assert.equal(result.payload.total, 1);
  assert.equal(result.payload.pending, 2);
  assert.equal(result.payload.projectedRevenue, 3500000);
  assert.equal(result.payload.occupancyPercentage, 25);
});
