const assert = require("node:assert/strict");
const test = require("node:test");
const {
  createRoom,
  deleteRoom,
  updateRoom,
} = require("./room-commands.cjs");

const validRoom = {
  title: "Studio trung tam",
  description: "Phong day du tien nghi va anh sang",
  price: 3500000,
  area: "25 m2",
  address: "123 Duong Nguyen Hue, TPHCM",
  image: ["https://example.com/room.jpg"],
  amenityIds: ["amenity-1"],
  maxOccupants: 2,
};

test("createRoom requires HOST and writes images and amenities atomically", async () => {
  const denied = await createRoom({}, { userId: "customer", role: "CUSTOMER" }, validRoom);
  assert.equal(denied.status, 403);

  let createArgs;
  const prisma = {
    room: {
      create: async (args) => {
        createArgs = args;
        return {
          id: "room-1",
          ...args.data,
          images: args.data.images.create,
          amenities: [],
          bookings: [],
          reviews: [],
        };
      },
    },
  };
  const result = await createRoom(
    prisma,
    { userId: "host-1", role: "HOST" },
    validRoom,
  );

  assert.equal(result.status, 201);
  assert.equal(createArgs.data.ownerId, "host-1");
  assert.equal(createArgs.data.status, "DRAFT");
  assert.equal(createArgs.data.images.create.length, 1);
  assert.deepEqual(createArgs.data.amenities.create, [
    { amenityId: "amenity-1" },
  ]);
});

test("updateRoom rejects another host and resets review for a public room", async () => {
  const prismaForDenied = {
    room: {
      findUnique: async () => ({
        id: "room-1",
        ownerId: "host-1",
        status: "DRAFT",
      }),
    },
  };
  const denied = await updateRoom(
    prismaForDenied,
    { userId: "host-2", role: "HOST" },
    "room-1",
    { title: "Ten phong moi" },
  );
  assert.equal(denied.status, 403);

  let roomUpdateData;
  let verificationReset = false;
  const transaction = {
    room: {
      update: async ({ data }) => {
        roomUpdateData = data;
      },
      findUnique: async () => ({
        id: "room-1",
        ownerId: "host-1",
        status: "DRAFT",
        title: "Ten phong moi",
        images: [],
        bookings: [],
        amenities: [],
        reviews: [],
      }),
    },
    roomImage: {
      deleteMany: async () => {},
      createMany: async () => {},
    },
    roomAmenity: {
      deleteMany: async () => {},
      createMany: async () => {},
    },
    roomVerification: {
      upsert: async () => {
        verificationReset = true;
      },
    },
  };
  const prisma = {
    room: {
      findUnique: async () => ({
        id: "room-1",
        ownerId: "host-1",
        status: "AVAILABLE",
      }),
    },
    $transaction: async (callback) => callback(transaction),
  };

  const result = await updateRoom(
    prisma,
    { userId: "host-1", role: "HOST" },
    "room-1",
    { title: "Ten phong moi" },
  );
  assert.equal(result.status, 200);
  assert.equal(roomUpdateData.status, "DRAFT");
  assert.equal(verificationReset, true);
});

test("deleteRoom never deletes a room owned by another host", async () => {
  const prisma = {
    room: {
      findUnique: async () => ({ ownerId: "host-1" }),
    },
  };
  const result = await deleteRoom(
    prisma,
    { userId: "host-2", role: "HOST" },
    "room-1",
  );
  assert.equal(result.status, 403);
});
