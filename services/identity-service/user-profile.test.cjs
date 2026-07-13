const assert = require("node:assert/strict");
const test = require("node:test");
const {
  deleteLegacyAccount,
  getLegacyProfile,
  updateLegacyProfile,
} = require("./user-profile.cjs");

test("getLegacyProfile composes Identity, Rental and Community data", async () => {
  const prisma = {
    user: {
      findUnique: async () => ({
        id: "user-1",
        email: "user@example.com",
      }),
    },
  };

  const result = await getLegacyProfile(
    prisma,
    { userId: "user-1" },
    {
      getProfileBookings: async () => [{ id: "booking-1", room: { price: 1000000, image: ["room.jpg"] } }],
      getProfileReviews: async () => [{ id: "review-1", room: { image: ["review-room.jpg"] } }],
    },
  );

  assert.equal(result.status, 200);
  assert.equal(result.payload.bookings[0].room.price, 1000000);
  assert.deepEqual(result.payload.bookings[0].room.image, ["room.jpg"]);
  assert.deepEqual(result.payload.reviews[0].room.image, ["review-room.jpg"]);
});

test("updateLegacyProfile updates basic profile fields", async () => {
  let updateData;
  const prisma = {
    user: {
      findUnique: async () => ({ id: "user-1" }),
      update: async ({ data }) => {
        updateData = data;
        return { id: "user-1", ...data };
      },
    },
  };

  const result = await updateLegacyProfile(
    prisma,
    { userId: "user-1" },
    { name: " Lan ", phone: "090" },
  );

  assert.equal(result.status, 200);
  assert.deepEqual(updateData, { name: "Lan", phone: "090" });
});

test("deleteLegacyAccount checks policy, purges privacy data and anonymizes user", async () => {
  const calls = [];
  const prisma = {
    user: {
      findUnique: async () => ({ id: "user-1" }),
      update: async ({ data }) => calls.push({ kind: "user.update", data }),
    },
  };

  const result = await deleteLegacyAccount(
    prisma,
    { userId: "user-1" },
    {
      getDeletionPolicy: async () => ({ allowed: true }),
      purgeCommunityData: async () => calls.push({ kind: "community.purge" }),
      deletePreferences: async () => calls.push({ kind: "preference.delete" }),
    },
  );

  assert.equal(result.status, 200);
  assert.equal(calls.some((call) => call.kind === "community.purge"), true);
  assert.equal(calls.some((call) => call.kind === "preference.delete"), true);
  const update = calls.find((call) => call.kind === "user.update");
  assert.equal(update.data.status, "DELETED");
  assert.match(update.data.email, /^deleted\+user-1@/);
});

test("deleteLegacyAccount is blocked before cleanup when rental obligations exist", async () => {
  let cleanupCalled = false;
  const prisma = { user: { findUnique: async () => ({ id: "user-1" }) } };
  const result = await deleteLegacyAccount(
    prisma,
    { userId: "user-1" },
    {
      getDeletionPolicy: async () => ({ allowed: false, reason: "Active contract" }),
      purgeCommunityData: async () => { cleanupCalled = true; },
      deletePreferences: async () => { cleanupCalled = true; },
    },
  );
  assert.equal(result.status, 409);
  assert.equal(cleanupCalled, false);
});
