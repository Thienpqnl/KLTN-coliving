class IdentityDependencyError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "IdentityDependencyError";
    this.status = status;
  }
}

function baseUrl() {
  return String(process.env.IDENTITY_SERVICE_URL || "").replace(/\/+$/, "");
}

async function request(path, options = {}) {
  const url = baseUrl();
  if (!url) throw new IdentityDependencyError(503, "IDENTITY_SERVICE_URL is not configured");
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
    const response = await fetch(`${url}${path}`, { ...options, headers, signal: controller.signal });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new IdentityDependencyError(response.status, payload?.message || `HTTP ${response.status}`);
    }
    return payload;
  } catch (error) {
    if (error instanceof IdentityDependencyError) throw error;
    throw new IdentityDependencyError(503, error.message || "Identity Service unavailable");
  } finally {
    clearTimeout(timeout);
  }
}

function getUsers(ids) {
  return request("/v1/internal/domain/users/batch", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ids }),
  });
}

function getUser(id) {
  return request(`/v1/internal/domain/users/${encodeURIComponent(id)}`);
}

function searchUsers(input = {}) {
  return request("/v1/internal/domain/users/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
}

async function userMap(ids) {
  const users = await getUsers([...new Set((ids || []).filter(Boolean))]);
  return new Map(users.map((user) => [user.id, user]));
}

module.exports = {
  IdentityDependencyError,
  getUser,
  getUsers,
  searchUsers,
  userMap,
};
