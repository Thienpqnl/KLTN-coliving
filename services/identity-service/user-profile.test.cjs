const assert = require("node:assert/strict");
const test = require("node:test");
const {
  deleteLegacyAccount,
  getLegacyProfile,
  updateLegacyProfile,
} = require("./user-profile.cjs");

test("getLegacyProfile normalizes booking and review room images", async () => {
  const prisma = {
    user: {
      findUnique: async () => ({
        id: "user-1",
        bookings: [{
          id: "booking-1",
          room: {
            id: "room-1",
            priceValue: 1000000n,
            images: [{ url: "room.jpg" }],
          },
        }],
        reviews: [{
          id: "review-1",
          room: { id: "room-1", images: [{ url: "review-room.jpg" }] },
        }],
      }),
    },
  };

  const result = await getLegacyProfile(prisma, { userId: "user-1" });

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

test("deleteLegacyAccount removes dependent records before deleting user", async () => {
  const calls = [];
  const prisma = {
    user: {
      findUnique: async () => ({ id: "user-1" }),
      delete: async () => calls.push("user.delete"),
    },
    review: { deleteMany: async () => calls.push("review.deleteMany") },
    booking: { deleteMany: async () => calls.push("booking.deleteMany") },
    invoice: { deleteMany: async () => calls.push("invoice.deleteMany") },
  };

  const result = await deleteLegacyAccount(prisma, { userId: "user-1" });

  assert.equal(result.status, 200);
  assert.deepEqual(calls.sort(), [
    "booking.deleteMany",
    "invoice.deleteMany",
    "review.deleteMany",
    "user.delete",
  ].sort());
});
