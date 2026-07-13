const assert = require("node:assert/strict");
const test = require("node:test");
const { removeDeviceToken, saveDeviceToken } = require("./device-tokens.cjs");

test("saveDeviceToken requires authenticated user", async () => {
  const result = await saveDeviceToken({}, {}, { token: "abc", os: "ios" });
  assert.equal(result.status, 401);
});

test("saveDeviceToken upserts token ownership", async () => {
  let upsertArgs;
  const prisma = {
    userDeviceToken: {
      upsert: async (args) => {
        upsertArgs = args;
      },
    },
  };

  const result = await saveDeviceToken(
    prisma,
    { userId: "user-1" },
    { token: "device-token", os: "android" },
  );

  assert.equal(result.status, 200);
  assert.equal(upsertArgs.where.token, "device-token");
  assert.equal(upsertArgs.update.userId, "user-1");
});

test("removeDeviceToken deletes matching token", async () => {
  let where;
  const prisma = {
    userDeviceToken: {
      deleteMany: async (args) => {
        where = args.where;
      },
    },
  };

  const result = await removeDeviceToken(prisma, { token: "device-token" });
  assert.equal(result.status, 200);
  assert.deepEqual(where, { token: "device-token" });
});
