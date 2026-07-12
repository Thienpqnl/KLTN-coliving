function failure(status, message) {
  return { status, payload: { message } };
}

function requireAuthenticated(identity) {
  return identity?.userId ? null : failure(401, "Unauthorized");
}

function normalizeUserProfile(user, bookings = [], reviews = []) {
  return {
    ...user,
    bookings,
    reviews,
  };
}

async function getLegacyProfile(prisma, identity, clients = domainClients) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;

  const user = await prisma.user.findUnique({
    where: { id: identity.userId },
    select: {
      id: true,
      email: true,
      name: true,
      fullName: true,
      phone: true,
      phoneVerified: true,
      avatarUrl: true,
      address: true,
      birthDate: true,
      gender: true,
      role: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) return failure(404, "User not found");
  try {
    const [bookings, reviews] = await Promise.all([
      clients.getProfileBookings(identity.userId),
      clients.getProfileReviews(identity.userId),
    ]);
    return { status: 200, payload: normalizeUserProfile(user, bookings, reviews) };
  } catch (error) {
    return failure(error.status || 503, error.message || "Profile dependency unavailable");
  }
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

async function deleteLegacyAccount(prisma, identity, clients = domainClients) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;

  const user = await prisma.user.findUnique({
    where: { id: identity.userId },
    select: { id: true },
  });
  if (!user) return failure(404, "User not found");

  let policy;
  try {
    policy = await clients.getDeletionPolicy(identity.userId);
  } catch (error) {
    return failure(error.status || 503, error.message || "Rental Service unavailable");
  }
  if (!policy.allowed) {
    return failure(409, policy.reason || "Account has active rental obligations");
  }

  try {
    await Promise.all([
      clients.purgeCommunityData(identity.userId),
      clients.deletePreferences(identity.userId),
    ]);
  } catch (error) {
    return failure(error.status || 503, error.message || "Privacy cleanup dependency unavailable");
  }

  await prisma.user.update({
    where: { id: identity.userId },
    data: {
      status: "DELETED",
      email: `deleted+${identity.userId}@coliving.invalid`,
      password: await bcrypt.hash(randomUUID(), 10),
      name: "Deleted User",
      fullName: "Deleted User",
      phone: null,
      phoneVerified: false,
      phoneVerifiedAt: null,
      avatarUrl: null,
      address: null,
      latitude: null,
      longitude: null,
    },
  });

  return { status: 200, payload: { message: "User anonymized successfully" } };
}

module.exports = {
  deleteLegacyAccount,
  getLegacyProfile,
  updateLegacyProfile,
};
const bcrypt = require("bcrypt");
const { randomUUID } = require("node:crypto");
const domainClients = require("./domain-clients.cjs");
