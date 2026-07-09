const { randomUUID } = require("node:crypto");
const { sanitizeForJson } = require("./serialization.cjs");

function failure(status, message) {
  return { status, payload: { message } };
}

function requireAuthenticated(identity) {
  return identity?.userId ? null : failure(401, "Unauthorized");
}

async function listFavorites(prisma, identity) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const favorites = await prisma.$queryRaw`
    SELECT
      f."id",
      f."roomId",
      f."createdAt",
      r."title",
      r."address",
      r."priceText",
      r."priceValue",
      (
        SELECT ri."url"
        FROM "RoomImage" ri
        WHERE ri."roomId" = r."id"
        ORDER BY ri."sortOrder" ASC
        LIMIT 1
      ) AS "imageUrl"
    FROM "FavoriteRoom" f
    INNER JOIN "Room" r ON r."id" = f."roomId"
    WHERE f."userId" = ${identity.userId}
    ORDER BY f."createdAt" DESC
  `;
  return { status: 200, payload: sanitizeForJson(favorites) };
}

async function getFavorite(prisma, identity, roomId) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const favorite = await prisma.favoriteRoom.findUnique({
    where: { userId_roomId: { userId: identity.userId, roomId } },
    select: { id: true },
  });
  return { status: 200, payload: { favorited: Boolean(favorite) } };
}

async function addFavorite(prisma, identity, roomId) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { id: true } });
  if (!room) return failure(404, "Room not found");
  await prisma.$executeRaw`
    INSERT INTO "FavoriteRoom" ("id", "userId", "roomId")
    VALUES (${randomUUID()}, ${identity.userId}, ${roomId})
    ON CONFLICT ("userId", "roomId") DO NOTHING
  `;
  return { status: 201, payload: { favorited: true } };
}

async function removeFavorite(prisma, identity, roomId) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  await prisma.favoriteRoom.deleteMany({ where: { userId: identity.userId, roomId } });
  return { status: 200, payload: { favorited: false } };
}

module.exports = {
  addFavorite,
  getFavorite,
  listFavorites,
  removeFavorite,
};
