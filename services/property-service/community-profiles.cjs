const identityClient = require("../shared/identity-client.cjs");

const communityRoomSelect = {
  id: true,
  title: true,
  address: true,
  priceText: true,
  priceValue: true,
  ownerId: true,
  status: true,
  images: {
    orderBy: { sortOrder: "asc" },
    select: { url: true, alt: true, sortOrder: true },
  },
};

function serialize(room, owner = null) {
  if (!room) return null;
  return {
    ...room,
    priceValue: room.priceValue == null ? null : Number(room.priceValue),
    image: room.images.map((image) => image.url),
    imageUrl: room.images[0]?.url || null,
    owner,
  };
}

async function getCommunityRoomProfile(prisma, roomId, clients = identityClient) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: communityRoomSelect,
  });
  if (!room) return null;
  const owner = room.ownerId ? await clients.getUser(room.ownerId) : null;
  return serialize(room, owner);
}

async function getCommunityRoomProfiles(prisma, roomIds, clients = identityClient) {
  const ids = [...new Set((roomIds || []).map(String).filter(Boolean))];
  if (ids.length === 0) return [];
  const rooms = await prisma.room.findMany({
    where: { id: { in: ids } },
    select: communityRoomSelect,
  });
  const owners = await clients.userMap(rooms.map((room) => room.ownerId));
  const order = new Map(ids.map((id, index) => [id, index]));
  return rooms
    .map((room) => serialize(room, owners.get(room.ownerId) || null))
    .sort((a, b) => order.get(a.id) - order.get(b.id));
}

async function getHostCommunityRooms(prisma, hostId, clients = identityClient) {
  const rooms = await prisma.room.findMany({
    where: { ownerId: hostId },
    select: communityRoomSelect,
    orderBy: { createdAt: "desc" },
  });
  const owner = await clients.getUser(hostId);
  return rooms.map((room) => serialize(room, owner));
}

async function searchCommunityRoomIds(prisma, search) {
  const value = String(search || "").trim();
  if (!value) return [];
  const rooms = await prisma.room.findMany({
    where: {
      OR: [
        { title: { contains: value, mode: "insensitive" } },
        { address: { contains: value, mode: "insensitive" } },
      ],
    },
    select: { id: true },
    take: 500,
  });
  return rooms.map((room) => room.id);
}

module.exports = {
  getCommunityRoomProfile,
  getCommunityRoomProfiles,
  getHostCommunityRooms,
  searchCommunityRoomIds,
};
