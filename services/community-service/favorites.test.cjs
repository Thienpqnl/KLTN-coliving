const assert = require("node:assert/strict");
const test = require("node:test");
const {
  addFavorite,
  getFavorite,
  removeFavorite,
} = require("./favorites.cjs");

test("favorite actions require authentication", async () => {
  const result = await addFavorite({}, {}, "room-1");
  assert.equal(result.status, 401);
});

test("getFavorite returns favorited boolean", async () => {
  const prisma = {
    favoriteRoom: {
      findUnique: async () => ({ id: "favorite-1" }),
    },
  };

  const result = await getFavorite(prisma, { userId: "user-1" }, "room-1");
  assert.equal(result.status, 200);
  assert.equal(result.payload.favorited, true);
});

test("addFavorite validates room existence and writes idempotently", async () => {
  let executed = false;
  const prisma = {
    room: {
      findUnique: async () => ({ id: "room-1" }),
    },
    $executeRaw: async () => {
      executed = true;
    },
  };

  const result = await addFavorite(
    prisma,
    { userId: "user-1" },
    "room-1",
    { getRoom: async () => ({ id: "room-1" }) },
  );
  assert.equal(result.status, 201);
  assert.equal(result.payload.favorited, true);
  assert.equal(executed, true);
});

test("removeFavorite deletes only current user's favorite", async () => {
  let where;
  const prisma = {
    favoriteRoom: {
      deleteMany: async (args) => {
        where = args.where;
      },
    },
  };

  const result = await removeFavorite(prisma, { userId: "user-1" }, "room-1");
  assert.equal(result.status, 200);
  assert.deepEqual(where, { userId: "user-1", roomId: "room-1" });
});
