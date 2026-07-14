const assert = require("node:assert/strict");
const test = require("node:test");
const { cancelBooking, createBooking, hostBookingStats, updateBooking } = require("./bookings.cjs");

test("createBooking rejects full rooms before writing a booking", async () => {
  let createCalled = false;
  const prisma = {
    rentalRoomSnapshot: {
      findUnique: async () => ({
        roomId: "room-1",
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
    rentalRoomSnapshot: {
      findUnique: async () => ({ roomId: "room-1", ownerId: "host-1" }),
    },
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

test("updateBooking prevents renters from bypassing cancellation details", async () => {
  const prisma = {
    rentalRoomSnapshot: {
      findUnique: async () => ({ roomId: "room-1", ownerId: "host-1" }),
    },
    booking: {
      findUnique: async () => ({
        id: "booking-1",
        userId: "renter-1",
        roomId: "room-1",
        status: "PENDING",
      }),
    },
  };

  const result = await updateBooking(
    prisma,
    { userId: "renter-1", role: "CUSTOMER" },
    "booking-1",
    { status: "CANCELLED" },
  );

  assert.equal(result.status, 400);
  assert.match(result.payload.message, /chức năng hủy booking/);
});

test("cancelBooking records cancellation metadata for a renter", async () => {
  let updateData;
  const booking = {
    id: "booking-1",
    userId: "renter-1",
    roomId: "room-1",
    status: "CONFIRMED",
    contract: null,
  };
  const prisma = {
    $transaction: async (operation) => operation(prisma),
    booking: {
      findUnique: async () => booking,
      update: async ({ data }) => {
        updateData = data;
        return { ...booking, ...data };
      },
    },
    rentalRoomSnapshot: {
      findUnique: async () => ({ roomId: "room-1", ownerId: "host-1" }),
    },
  };
  const clients = { userMap: async () => new Map() };

  const result = await cancelBooking(
    prisma,
    { userId: "renter-1", role: "CUSTOMER" },
    "booking-1",
    { reason: "Tôi thay đổi kế hoạch chuyển đến" },
    clients,
  );

  assert.equal(result.status, 200);
  assert.equal(updateData.status, "CANCELLED");
  assert.equal(updateData.cancelledById, "renter-1");
  assert.equal(updateData.cancellationActor, "RENTER");
  assert.equal(updateData.cancellationReason, "Tôi thay đổi kế hoạch chuyển đến");
  assert.ok(updateData.cancelledAt instanceof Date);
});

test("cancelBooking rejects direct cancellation for an active contract", async () => {
  let updateCalled = false;
  const prisma = {
    $transaction: async (operation) => operation(prisma),
    booking: {
      findUnique: async () => ({
        id: "booking-1",
        userId: "renter-1",
        roomId: "room-1",
        status: "CONFIRMED",
        contract: { id: "contract-1", status: "ACTIVE", depositStatus: "PAID" },
      }),
      update: async () => {
        updateCalled = true;
        return {};
      },
    },
    rentalRoomSnapshot: {
      findUnique: async () => ({ roomId: "room-1", ownerId: "host-1" }),
    },
  };

  const result = await cancelBooking(
    prisma,
    { userId: "renter-1", role: "CUSTOMER" },
    "booking-1",
    { reason: "Tôi muốn rời phòng sớm" },
  );

  assert.equal(result.status, 409);
  assert.equal(result.payload.code, "ACTIVE_CONTRACT");
  assert.equal(result.payload.contractId, "contract-1");
  assert.equal(updateCalled, false);
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
        { roomId: "room-1" },
        { roomId: "room-2" },
      ],
    },
    rentalRoomSnapshot: {
      findMany: async () => [
        { roomId: "room-1", status: "OCCUPIED", priceValue: 1000000 },
        { roomId: "room-2", status: "AVAILABLE", priceValue: 2500000 },
        { roomId: "room-3", status: "AVAILABLE", priceValue: 0 },
        { roomId: "room-4", status: "AVAILABLE", priceValue: 0 },
      ],
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
