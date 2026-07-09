const assert = require("node:assert/strict");
const test = require("node:test");
const {
  areaMatchesRoom,
  listManagersWithAreas,
  replaceManagerAreas,
} = require("./community-manager-area.cjs");

test("area matching understands region and Ho Chi Minh aliases", () => {
  assert.equal(
    areaMatchesRoom(
      { region: "SOUTH", city: null },
      {
        city: "Ho Chi Minh City",
        address: "Dang Huu Pho, Thao Dien, An Khanh, Ho Chi Minh City",
      },
    ),
    true,
  );

  assert.equal(
    areaMatchesRoom(
      { city: "Thanh pho Ho Chi Minh" },
      { city: "HCM", address: "Thao Dien, Ho Chi Minh City" },
    ),
    true,
  );
});

test("listManagersWithAreas is admin-only and returns manager areas", async () => {
  const denied = await listManagersWithAreas({}, { userId: "cm-1", role: "COMMUNITY_MANAGER" });
  assert.equal(denied.status, 403);

  let findManyArgs;
  const prisma = {
    user: {
      findMany: async (args) => {
        findManyArgs = args;
        return [{ id: "cm-1", email: "cm@example.com", communityManagerAreas: [] }];
      },
    },
  };

  const result = await listManagersWithAreas(prisma, { userId: "admin-1", role: "ADMIN" });
  assert.equal(result.status, 200);
  assert.equal(findManyArgs.where.role, "COMMUNITY_MANAGER");
  assert.deepEqual(result.payload, [
    { id: "cm-1", email: "cm@example.com", communityManagerAreas: [] },
  ]);
});

test("replaceManagerAreas validates manager role and replaces areas transactionally", async () => {
  const denied = await replaceManagerAreas({}, { userId: "host-1", role: "HOST" }, "cm-1", []);
  assert.equal(denied.status, 403);

  const notCommunityManager = {
    user: {
      findUnique: async () => ({ id: "user-1", role: "CUSTOMER" }),
    },
  };
  const invalid = await replaceManagerAreas(
    notCommunityManager,
    { userId: "admin-1", role: "ADMIN" },
    "user-1",
    [],
  );
  assert.equal(invalid.status, 400);

  let createdAreas;
  const tx = {
    communityManagerArea: {
      deleteMany: async () => {},
      createMany: async ({ data }) => {
        createdAreas = data;
      },
    },
    user: {
      findUnique: async () => ({
        id: "cm-1",
        email: "cm@example.com",
        communityManagerAreas: createdAreas,
      }),
    },
  };
  const prisma = {
    user: {
      findUnique: async () => ({ id: "cm-1", role: "COMMUNITY_MANAGER" }),
    },
    $transaction: async (callback) => callback(tx),
  };

  const result = await replaceManagerAreas(
    prisma,
    { userId: "admin-1", role: "ADMIN" },
    "cm-1",
    [{ region: "SOUTH", city: " Ho Chi Minh ", isActive: true }],
  );

  assert.equal(result.status, 200);
  assert.equal(createdAreas[0].managerId, "cm-1");
  assert.equal(createdAreas[0].city, "Ho Chi Minh");
  assert.equal(result.payload.communityManagerAreas[0].region, "SOUTH");
});
