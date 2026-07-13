const { listUserReviews } = require("./reviews.cjs");

async function getUserProfileReviews(prisma, userId) {
  return listUserReviews(prisma, { userId, role: "CUSTOMER" });
}

async function purgeUserPrivateData(prisma, userId) {
  const [favorites, deviceTokens, reviews] = await prisma.$transaction([
    prisma.favoriteRoom.deleteMany({ where: { userId } }),
    prisma.userDeviceToken.deleteMany({ where: { userId } }),
    prisma.review.updateMany({
      where: { userId, status: { not: "DELETED" } },
      data: { status: "DELETED", comment: null },
    }),
  ]);
  return {
    favoritesDeleted: favorites.count,
    deviceTokensDeleted: deviceTokens.count,
    reviewsAnonymized: reviews.count,
  };
}

module.exports = { getUserProfileReviews, purgeUserPrivateData };
