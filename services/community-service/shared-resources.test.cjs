const assert = require("node:assert/strict");
const test = require("node:test");
const {
  createHostResource,
  createResourceBooking,
  updateResourceBooking,
} = require("./shared-resources.cjs");

const roomId = "11111111-1111-4111-8111-111111111111";
const resourceId = "22222222-2222-4222-8222-222222222222";

test("createHostResource allows host and returns notification intent", async () => {
  const prisma = {
    sharedResource: {
      create: async ({ data }) => ({ id: resourceId, ...data }),
    },
  };

  const result = await createHostResource(
    prisma,
    { userId: "host-1", role: "HOST" },
    {
      roomId,
      name: "Phong sinh hoat chung",
      type: "SPACE",
      maxDurationMinutes: 120,
    },
    { getRoom: async () => ({ id: roomId, ownerId: "host-1" }) },
  );

  assert.equal(result.status, 201);
  assert.equal(result.payload.resource.ownerId, "host-1");
  assert.equal(result.payload.notification.topic, "user_host-1");
});

test("createHostResource rejects non-host users", async () => {
  const result = await createHostResource(
    {},
    { userId: "user-1", role: "CUSTOMER" },
    { roomId, name: "May giat", type: "EQUIPMENT" },
  );

  assert.equal(result.status, 403);
});

test("createResourceBooking rejects conflicting booking windows", async () => {
  const startTime = new Date(Date.now() + 60 * 60 * 1000);
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
  const prisma = {
    $transaction: async (callback) => callback({
      $queryRaw: async () => [{ id: resourceId }],
      sharedResource: {
        findUnique: async () => ({
          id: resourceId,
          roomId,
          status: "ACTIVE",
          maxDurationMinutes: 120,
        }),
      },
      occupancy: {
        findUnique: async () => ({ id: "occ-1", status: "ACTIVE" }),
      },
      resourceBooking: {
        findMany: async () => [{ startTime, endTime, status: "APPROVED" }],
      },
    }),
  };

  const result = await createResourceBooking(
    prisma,
    { userId: "user-1" },
    roomId,
    {
      resourceId,
      title: "Su dung phong",
      startTime: new Date(startTime.getTime() + 10 * 60 * 1000),
      endTime: new Date(endTime.getTime() + 10 * 60 * 1000),
    },
    { getOccupancyAccess: async () => ({ active: true }) },
  );

  assert.equal(result.status, 409);
});

test("updateResourceBooking lets renter cancel own booking", async () => {
  const calls = [];
  const prisma = {
    resourceBooking: {
      findUnique: async () => ({
        id: "booking-1",
        userId: "user-1",
        resourceId,
        resource: { status: "ACTIVE" },
      }),
      update: async ({ data }) => {
        calls.push({ kind: "booking", data });
        return { id: "booking-1", ...data };
      },
    },
    sharedResource: {
      update: async ({ data }) => calls.push({ kind: "resource", data }),
    },
  };

  const result = await updateResourceBooking(
    prisma,
    { userId: "user-1", role: "CUSTOMER" },
    "booking-1",
    { status: "CANCELLED" },
  );

  assert.equal(result.status, 200);
  assert.equal(calls[0].data.status, "CANCELLED");
  assert.equal(calls[1].data.status, "ACTIVE");
});
