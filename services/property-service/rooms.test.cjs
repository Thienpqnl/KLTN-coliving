const assert = require("node:assert/strict");
const test = require("node:test");
const { findRoomById, listRooms, normalizeRoom } = require("./rooms.cjs");

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
  assert.equal(room.availableOccupantSlots, 2);
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
  });

  assert.equal(findManyArgs.skip, 12);
  assert.equal(findManyArgs.take, 12);
  assert.deepEqual(findManyArgs.orderBy, { priceValue: "asc" });
  assert.equal(result.page, 2);
  assert.equal(result.limit, 12);
  assert.equal(result.total, 1);
  assert.equal(result.rooms[0].price, 3000000);
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

  assert.equal(await findRoomById(prisma, draftRoom.id), null);
  assert.equal(
    (await findRoomById(prisma, draftRoom.id, {
      userId: "owner-1",
      role: "HOST",
    })).id,
    draftRoom.id,
  );
  assert.equal(
    (await findRoomById(prisma, draftRoom.id, {
      userId: "admin-1",
      role: "ADMIN",
    })).id,
    draftRoom.id,
  );
});
