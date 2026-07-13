const assert = require("node:assert/strict");
const test = require("node:test");
const {
  getCommunityRoomProfile,
  getCommunityRoomProfiles,
} = require("./community-profiles.cjs");
const clients = {
  getUser: async () => null,
  userMap: async () => new Map(),
};

test("community room profile serializes Property-owned room data", async () => {
  const prisma = {
    room: {
      findUnique: async () => ({
        id: "room-1",
        title: "Studio",
        priceValue: 2500000n,
        images: [{ url: "room.jpg" }],
      }),
    },
  };
  const room = await getCommunityRoomProfile(prisma, "room-1", clients);
  assert.equal(room.priceValue, 2500000);
  assert.equal(room.imageUrl, "room.jpg");
});

test("community room batch preserves requested order", async () => {
  const prisma = {
    room: {
      findMany: async () => [
        { id: "room-1", images: [], priceValue: 1n },
        { id: "room-2", images: [], priceValue: 2n },
      ],
    },
  };
  const rooms = await getCommunityRoomProfiles(prisma, ["room-2", "room-1"], clients);
  assert.deepEqual(rooms.map((room) => room.id), ["room-2", "room-1"]);
});
