const assert = require("node:assert/strict");
const test = require("node:test");
const {
  createAmenity,
  deleteAmenity,
  getAmenityById,
  listAmenities,
  updateAmenity,
} = require("./amenities.cjs");

test("listAmenities returns amenities ordered by name", async () => {
  let findManyArgs;
  const prisma = {
    amenity: {
      findMany: async (args) => {
        findManyArgs = args;
        return [{ id: "wifi", name: "Wifi" }];
      },
    },
  };

  const result = await listAmenities(prisma);
  assert.equal(result.status, 200);
  assert.deepEqual(findManyArgs.orderBy, { name: "asc" });
  assert.equal(result.payload[0].name, "Wifi");
});

test("createAmenity validates auth and name", async () => {
  const unauthenticated = await createAmenity({}, {}, { name: "Wifi" });
  assert.equal(unauthenticated.status, 401);

  const invalid = await createAmenity({}, { userId: "admin-1" }, { name: "W" });
  assert.equal(invalid.status, 400);

  let createArgs;
  const prisma = {
    amenity: {
      create: async (args) => {
        createArgs = args;
        return { id: "amenity-1", ...args.data };
      },
    },
  };

  const result = await createAmenity(
    prisma,
    { userId: "admin-1" },
    { name: " Wifi " },
  );
  assert.equal(result.status, 201);
  assert.equal(createArgs.data.name, "Wifi");
});

test("updateAmenity checks existence and applies changes", async () => {
  const prisma = {
    amenity: {
      findUnique: async () => ({ id: "amenity-1", name: "Wifi" }),
      update: async ({ data }) => ({ id: "amenity-1", ...data }),
    },
  };

  const result = await updateAmenity(
    prisma,
    { userId: "admin-1" },
    "amenity-1",
    { name: "Parking" },
  );
  assert.equal(result.status, 200);
  assert.equal(result.payload.name, "Parking");
});

test("deleteAmenity removes relations before deleting amenity", async () => {
  const calls = [];
  const prisma = {
    amenity: {
      findUnique: async () => ({ id: "amenity-1", name: "Wifi" }),
      delete: async () => calls.push("amenity.delete"),
    },
    roomAmenity: {
      deleteMany: async () => calls.push("roomAmenity.deleteMany"),
    },
  };

  const result = await deleteAmenity(prisma, { userId: "admin-1" }, "amenity-1");
  assert.equal(result.status, 200);
  assert.deepEqual(calls, ["roomAmenity.deleteMany", "amenity.delete"]);
});

test("getAmenityById returns 404 for missing amenity", async () => {
  const prisma = {
    amenity: {
      findUnique: async () => null,
    },
  };

  const result = await getAmenityById(prisma, "missing");
  assert.equal(result.status, 404);
});
