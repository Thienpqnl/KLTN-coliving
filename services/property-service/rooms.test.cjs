const assert = require("node:assert/strict");
const test = require("node:test");
const {
  applyRentalCapacity,
  distanceInKilometers,
  findRoomById,
  listRooms,
  normalizeRoom,
} = require("./rooms.cjs");
const clients = { userMap: async () => new Map() };

test("normalizeRoom preserves the public room contract", () => {
  const room = normalizeRoom({
    id: "room-1",
    areaText: "25",
    areaValue: null,
    priceValue: 2500000n,
    currentOccupants: 1,
    maxOccupants: 3,
    images: [{ url: "first.jpg" }, { url: "second.jpg" }],
    bookings: [
      {
        status: "CONFIRMED",
        endDate: new Date(Date.now() + 60_000),
      },
    ],
  });

  assert.equal(room.price, 2500000);
  assert.equal(room.area, "25 m2");
  assert.deepEqual(room.image, ["first.jpg", "second.jpg"]);
  assert.equal(room.confirmedReservations, 1);
  assert.equal(room.availableOccupantSlots, 1);
});

test("applyRentalCapacity subtracts confirmed reservations from public room slots", () => {
  const room = applyRentalCapacity(
    { id: "room-1", currentOccupants: 0, maxOccupants: 3 },
    { currentOccupants: 1, confirmedReservations: 1, maxOccupants: 3 },
  );

  assert.equal(room.currentOccupants, 1);
  assert.equal(room.confirmedReservations, 1);
  assert.equal(room.usedOccupantSlots, 2);
  assert.equal(room.availableOccupantSlots, 1);
});

test("listRooms applies pagination and returns the gateway payload", async () => {
  let findManyArgs;
  const rows = [
    {
      id: "room-1",
      areaText: "30 m2",
      priceValue: 3000000n,
      currentOccupants: 0,
      maxOccupants: 2,
      images: [{ url: "room.jpg" }],
    },
  ];
  const prisma = {
    room: {
      count: (args) => ({ kind: "count", args }),
      findMany: (args) => {
        findManyArgs = args;
        return { kind: "rooms", args };
      },
    },
    $transaction: async () => [1, rows],
  };

  const result = await listRooms(prisma, {
    page: "2",
    limit: "12",
    search: "studio",
    sortBy: "price-low",
  }, clients);

  assert.equal(findManyArgs.skip, 12);
  assert.equal(findManyArgs.take, 12);
  assert.deepEqual(findManyArgs.orderBy, { priceValue: "asc" });
  assert.equal(result.page, 2);
  assert.equal(result.limit, 12);
  assert.equal(result.total, 1);
  assert.equal(result.rooms[0].price, 3000000);
});

test("distanceInKilometers calculates a stable geographic distance", () => {
  const distance = distanceInKilometers(10.7769, 106.7009, 10.802, 106.738);
  assert.ok(distance > 4 && distance < 6);
});

test("listRooms filters by available slots and travel radius before pagination", async () => {
  const rows = [
    {
      id: "near-open",
      latitude: 10.78,
      longitude: 106.71,
      currentOccupants: 1,
      maxOccupants: 3,
      images: [],
    },
    {
      id: "near-full",
      latitude: 10.781,
      longitude: 106.711,
      currentOccupants: 2,
      maxOccupants: 2,
      images: [],
    },
    {
      id: "far-open",
      latitude: 11.2,
      longitude: 107.2,
      currentOccupants: 0,
      maxOccupants: 4,
      images: [],
    },
  ];
  const prisma = {
    room: { findMany: async () => rows },
  };

  const result = await listRooms(prisma, {
    page: "1",
    limit: "12",
    originLat: "10.7769",
    originLng: "106.7009",
    maxDistanceKm: "5",
    minAvailableSlots: "2",
    sortBy: "distance",
  }, clients);

  assert.equal(result.total, 1);
  assert.equal(result.rooms[0].id, "near-open");
  assert.ok(result.rooms[0].distanceKm < 5);
});

test("findRoomById hides non-public rooms except from owner or admin", async () => {
  const draftRoom = {
    id: "room-draft",
    ownerId: "owner-1",
    status: "DRAFT",
    images: [],
    bookings: [],
  };
  const prisma = {
    room: { findUnique: async () => draftRoom },
  };

  assert.equal(await findRoomById(prisma, draftRoom.id, {}, clients), null);
  assert.equal(
    (await findRoomById(prisma, draftRoom.id, {
      userId: "owner-1",
      role: "HOST",
    }, clients)).id,
    draftRoom.id,
  );
  assert.equal(
    (await findRoomById(prisma, draftRoom.id, {
      userId: "admin-1",
      role: "ADMIN",
    }, clients)).id,
    draftRoom.id,
  );
});

test("findAvailableRooms uses Rental availability instead of Booking relations", async () => {
  const prisma = {
    room: {
      findMany: async () => [
        { id: "room-open", status: "AVAILABLE", images: [], reviews: [] },
        { id: "room-full", status: "AVAILABLE", images: [], reviews: [] },
      ],
    },
  };
  const { findAvailableRooms } = require("./rooms.cjs");
  const result = await findAvailableRooms(
    prisma,
    new Date("2026-08-01"),
    new Date("2026-09-01"),
    {
      "room-open": { available: true, confirmedReservations: 0 },
      "room-full": { available: false, confirmedReservations: 2 },
    },
    clients,
  );

  assert.deepEqual(result.map((room) => room.id), ["room-open"]);
});
