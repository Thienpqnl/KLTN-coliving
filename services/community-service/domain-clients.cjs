const identityClient = require("../shared/identity-client.cjs");

class DependencyError extends Error {
  constructor(service, status, message) {
    super(message);
    this.name = "DependencyError";
    this.service = service;
    this.status = status;
  }
}

function serviceUrl(name) {
  return String(process.env[`${name}_SERVICE_URL`] || "").replace(/\/+$/, "");
}

async function request(service, path, options = {}) {
  const baseUrl = serviceUrl(service);
  if (!baseUrl) throw new DependencyError(service, 503, `${service}_SERVICE_URL is not configured`);
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    Number(process.env.MICROSERVICE_TIMEOUT_MS || 3000),
  );
  const headers = new Headers(options.headers);
  headers.set("accept", "application/json");
  if (process.env.INTERNAL_SERVICE_TOKEN) {
    headers.set("x-internal-service-token", process.env.INTERNAL_SERVICE_TOKEN);
  }
  try {
    const response = await fetch(`${baseUrl}${path}`, { ...options, headers, signal: controller.signal });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new DependencyError(service, response.status, payload?.message || `HTTP ${response.status}`);
    }
    return payload;
  } catch (error) {
    if (error instanceof DependencyError) throw error;
    throw new DependencyError(service, 503, error.message || "Service unavailable");
  } finally {
    clearTimeout(timeout);
  }
}

async function getRoom(roomId) {
  return request("PROPERTY", `/v1/internal/community/rooms/${encodeURIComponent(roomId)}`);
}

async function getRooms(roomIds) {
  return request("PROPERTY", "/v1/internal/community/rooms/batch", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ roomIds }),
  });
}

async function getHostRooms(hostId) {
  return request("PROPERTY", `/v1/internal/community/hosts/${encodeURIComponent(hostId)}/rooms`);
}

async function searchRoomIds(search) {
  return request("PROPERTY", `/v1/internal/community/rooms/search?q=${encodeURIComponent(search)}`);
}

async function getReviewEligibility(userId, roomId) {
  return request(
    "RENTAL",
    `/v1/internal/community/review-eligibility?userId=${encodeURIComponent(userId)}&roomId=${encodeURIComponent(roomId)}`,
  );
}

async function getOccupancyAccess(userId, roomId) {
  return request(
    "RENTAL",
    `/v1/internal/community/occupancy-access?userId=${encodeURIComponent(userId)}&roomId=${encodeURIComponent(roomId)}`,
  );
}

module.exports = {
  DependencyError,
  getHostRooms,
  getOccupancyAccess,
  getReviewEligibility,
  getRoom,
  getRooms,
  searchRoomIds,
  getIdentityUser: identityClient.getUser,
  getIdentityUsers: identityClient.getUsers,
  searchIdentityUsers: identityClient.searchUsers,
};
