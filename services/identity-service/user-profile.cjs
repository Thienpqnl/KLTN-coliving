function failure(status, message) {
  return { status, payload: { message } };
}

function requireAuthenticated(identity) {
  return identity?.userId ? null : failure(401, "Unauthorized");
}

function normalizeUserProfile(user) {
  return {
    ...user,
    bookings: user.bookings.map((booking) => ({
      ...booking,
      room: {
        ...booking.room,
        priceValue: booking.room.priceValue == null ? null : Number(booking.room.priceValue),
        price: booking.room.priceValue == null ? 0 : Number(booking.room.priceValue),
        image: booking.room.images.map((image) => image.url),
      },
    })),
    reviews: user.reviews.map((review) => ({
      ...review,
      room: {
        ...review.room,
        image: review.room.images.map((image) => image.url),
      },
    })),
  };
}

async function getLegacyProfile(prisma, identity) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;

  const user = await prisma.user.findUnique({
    where: { id: identity.userId },
    include: {
      bookings: {
        include: {
          room: {
            select: {
              id: true,
              title: true,
              priceValue: true,
              priceText: true,
              images: {
                orderBy: { sortOrder: "asc" },
                select: { url: true },
              },
            },
          },
        },
      },
      reviews: {
        include: {
          room: {
            select: {
              id: true,
              title: true,
              images: {
                orderBy: { sortOrder: "asc" },
                select: { url: true },
              },
            },
          },
        },
      },
    },
  });

  if (!user) return failure(404, "User not found");
  return { status: 200, payload: normalizeUserProfile(user) };
}

async function updateLegacyProfile(prisma, identity, input = {}) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;

  const user = await prisma.user.findUnique({
    where: { id: identity.userId },
    select: { id: true },
  });
  if (!user) return failure(404, "User not found");

  const updated = await prisma.user.update({
    where: { id: identity.userId },
    data: {
      ...(input.name ? { name: String(input.name).trim() } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return { status: 200, payload: updated };
}

async function deleteLegacyAccount(prisma, identity) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;

  const user = await prisma.user.findUnique({
    where: { id: identity.userId },
    select: { id: true },
  });
  if (!user) return failure(404, "User not found");

  await Promise.all([
    prisma.review.deleteMany({ where: { userId: identity.userId } }),
    prisma.booking.deleteMany({ where: { userId: identity.userId } }),
    prisma.invoice.deleteMany({ where: { userId: identity.userId } }),
  ]);
  await prisma.user.delete({ where: { id: identity.userId } });

  return { status: 200, payload: { message: "User deleted successfully" } };
}

module.exports = {
  deleteLegacyAccount,
  getLegacyProfile,
  updateLegacyProfile,
};
