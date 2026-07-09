const assert = require("node:assert/strict");
const test = require("node:test");
const {
  getPreference,
  normalizePreferenceInput,
  upsertPreference,
} = require("./preferences.cjs");

test("normalizePreferenceInput handles empty numeric values and defaults", () => {
  const result = normalizePreferenceInput({
    budgetMinVnd: "",
    budgetMaxVnd: 5000000,
  });

  assert.equal(result.ok, true);
  assert.equal(result.data.budgetMinVnd, null);
  assert.equal(result.data.budgetMaxVnd, 5000000);
  assert.equal(result.data.priorityCleanliness, 3);
  assert.equal(result.data.acceptPets, false);
});

test("getPreference requires authentication and returns empty object when missing", async () => {
  const denied = await getPreference({}, {});
  assert.equal(denied.status, 401);

  const prisma = {
    user: { findUnique: async () => ({ id: "user-1" }) },
    $queryRaw: async () => [],
  };
  const result = await getPreference(prisma, { userId: "user-1" });

  assert.equal(result.status, 200);
  assert.deepEqual(result.payload, {});
});

test("upsertPreference validates user and returns saved preference", async () => {
  const rows = [{
    id: "pref-1",
    userId: "user-1",
    budgetMinVnd: 1000000n,
    budgetMaxVnd: 3000000n,
  }];
  const prisma = {
    user: { findUnique: async () => ({ id: "user-1" }) },
    $queryRaw: async () => rows,
  };

  const result = await upsertPreference(
    prisma,
    { userId: "user-1" },
    { budgetMinVnd: 1000000, budgetMaxVnd: 3000000 },
  );

  assert.equal(result.status, 200);
  assert.equal(result.payload.message, "Cap nhat thanh cong");
  assert.equal(result.payload.preference.budgetMinVnd, 1000000);
});
