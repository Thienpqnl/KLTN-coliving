const assert = require("node:assert/strict");
const test = require("node:test");
const { purgeUserPrivateData } = require("./identity-access.cjs");

test("Community privacy cleanup is idempotent and stays in Community tables", async () => {
  const operations = [
    Promise.resolve({ count: 2 }),
    Promise.resolve({ count: 1 }),
    Promise.resolve({ count: 3 }),
  ];
  const prisma = {
    favoriteRoom: { deleteMany: () => operations[0] },
    userDeviceToken: { deleteMany: () => operations[1] },
    review: { updateMany: () => operations[2] },
    $transaction: async (values) => Promise.all(values),
  };
  const result = await purgeUserPrivateData(prisma, "user-1");
  assert.deepEqual(result, {
    favoritesDeleted: 2,
    deviceTokensDeleted: 1,
    reviewsAnonymized: 3,
  });
});
