const { randomUUID } = require("node:crypto");
const { sanitizeForJson } = require("./serialization.cjs");
const domainClients = require("./domain-clients.cjs");

function failure(status, message) {
  return { status, payload: { message } };
}

function requireAuthenticated(identity) {
  return identity?.userId ? null : failure(401, "Unauthorized");
}

async function listFavorites(prisma, identity, clients = domainClients) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const favorites = await prisma.favoriteRoom.findMany({
    where: { userId: identity.userId },
    select: { id: true, roomId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  try {
    const rooms = await clients.getRooms(favorites.map((favorite) => favorite.roomId));
    const byId = new Map(rooms.map((room) => [room.id, room]));
    return {
      status: 200,
      payload: sanitizeForJson(favorites.flatMap((favorite) => {
        const room = byId.get(favorite.roomId);
        if (!room) return [];
        const { id: _roomId, ...roomData } = room;
        return [{ ...favorite, ...roomData }];
      })),
    };
  } catch (error) {
    return failure(error.status || 503, error.message || "Property Service unavailable");
  }
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

async function addFavorite(prisma, identity, roomId, clients = domainClients) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  let room;
  try {
    room = await clients.getRoom(roomId);
  } catch (error) {
    return failure(error.status || 503, error.message || "Property Service unavailable");
  }
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
