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

function jsonRequest(service, path, body) {
  return request(service, path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function getProfileBookings(userId) {
  return request("RENTAL", `/v1/internal/identity/users/${encodeURIComponent(userId)}/profile-bookings`);
}

function getProfileReviews(userId) {
  return request("COMMUNITY", `/v1/internal/identity/users/${encodeURIComponent(userId)}/profile-reviews`);
}

function getBookingCounts(userIds) {
  return jsonRequest("RENTAL", "/v1/internal/identity/user-activity-counts", { userIds });
}

function getPropertyCounts(userIds) {
  return jsonRequest("PROPERTY", "/v1/internal/identity/user-property-counts", { userIds });
}

function getDeletionPolicy(userId) {
  return request("RENTAL", `/v1/internal/identity/users/${encodeURIComponent(userId)}/deletion-policy`);
}

function purgeCommunityData(userId) {
  return request("COMMUNITY", `/v1/internal/identity/users/${encodeURIComponent(userId)}/private-data`, {
    method: "DELETE",
  });
}

function deletePreferences(userId) {
  return request("PREFERENCE", `/v1/internal/identity/users/${encodeURIComponent(userId)}/preferences`, {
    method: "DELETE",
  });
}

module.exports = {
  DependencyError,
  deletePreferences,
  getBookingCounts,
  getDeletionPolicy,
  getProfileBookings,
  getProfileReviews,
  getPropertyCounts,
  purgeCommunityData,
};
