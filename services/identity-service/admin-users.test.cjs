const assert = require("node:assert/strict");
const test = require("node:test");
const {
  getAdminLogs,
  getUserById,
  getUserStats,
  listUsers,
  updateUserAction,
} = require("./admin-users.cjs");

test("listUsers is admin-only and returns pagination", async () => {
  const denied = await listUsers({}, { userId: "user-1", role: "HOST" });
  assert.equal(denied.status, 403);

  let findManyArgs;
  const prisma = {
    user: {
      findMany: async (args) => {
        findManyArgs = args;
        return [{ id: "user-1", email: "user@example.com" }];
      },
      count: async () => 1,
    },
  };

  const result = await listUsers(
    prisma,
    { userId: "admin-1", role: "ADMIN" },
    { page: "2", limit: "10", role: "HOST", search: "lan" },
    {
      getBookingCounts: async () => ({ "user-1": 3 }),
      getPropertyCounts: async () => ({ "user-1": 2 }),
    },
  );

  assert.equal(result.status, 200);
  assert.equal(findManyArgs.skip, 10);
  assert.equal(findManyArgs.take, 10);
  assert.equal(findManyArgs.where.role, "HOST");
  assert.equal(result.payload.pagination.totalPages, 1);
  assert.deepEqual(result.payload.data[0]._count, { bookings: 3, rooms: 2 });
});

test("getUserById returns 404 when user is missing", async () => {
  const prisma = {
    user: { findUnique: async () => null },
  };

  const result = await getUserById(
    prisma,
    { userId: "admin-1", role: "ADMIN" },
    "missing",
  );
  assert.equal(result.status, 404);
});

test("updateUserAction blocks current admin destructive actions", async () => {
  const result = await updateUserAction(
    {},
    { userId: "admin-1", role: "ADMIN" },
    "admin-1",
    { action: "lock" },
  );

  assert.equal(result.status, 400);
});

test("updateUserAction locks a user and writes admin log", async () => {
  const calls = [];
  const prisma = {
    user: {
      findUnique: async () => ({ id: "user-1", status: "ACTIVE", role: "HOST" }),
      update: async ({ data }) => {
        calls.push({ kind: "user.update", data });
        return { id: "user-1", ...data };
      },
    },
    adminLog: {
      create: async ({ data }) => calls.push({ kind: "adminLog.create", data }),
    },
  };

  const result = await updateUserAction(
    prisma,
    { userId: "admin-1", role: "ADMIN" },
    "user-1",
    { action: "lock", reason: "Spam" },
  );

  assert.equal(result.status, 200);
  assert.equal(calls[0].data.status, "LOCKED");
  assert.equal(calls[1].data.action, "lock_user");
});

test("getUserStats includes key counters and monthly buckets", async () => {
  let countCalls = 0;
  const prisma = {
    user: {
      count: async () => {
        countCalls += 1;
        return countCalls;
      },
    },
  };

  const result = await getUserStats(prisma, { userId: "admin-1", role: "ADMIN" });
  assert.equal(result.status, 200);
  assert.equal(result.payload.total, 1);
  assert.equal(result.payload.tenants, 2);
  assert.equal(result.payload.byMonth.length, 12);
});

test("getAdminLogs is admin-only and returns paginated logs", async () => {
  const denied = await getAdminLogs({}, { userId: "host-1", role: "HOST" });
  assert.equal(denied.status, 403);

  let findManyArgs;
  const prisma = {
    adminLog: {
      findMany: async (args) => {
        findManyArgs = args;
        return [{ id: "log-1", action: "lock_user" }];
      },
      count: async () => 1,
    },
  };

  const result = await getAdminLogs(
    prisma,
    { userId: "admin-1", role: "ADMIN" },
    { page: "2", limit: "10", action: "lock_user", targetType: "user" },
  );

  assert.equal(result.status, 200);
  assert.equal(findManyArgs.skip, 10);
  assert.equal(findManyArgs.take, 10);
  assert.deepEqual(findManyArgs.where, {
    action: "lock_user",
    targetType: "user",
  });
  assert.equal(result.payload.pagination.total, 1);
});
