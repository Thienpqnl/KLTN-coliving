const SERVICE_ALIASES = {
  identity: "IDENTITY_SERVICE_URL",
  "identity-service": "IDENTITY_SERVICE_URL",
  property: "PROPERTY_SERVICE_URL",
  "property-service": "PROPERTY_SERVICE_URL",
  rental: "RENTAL_SERVICE_URL",
  "rental-service": "RENTAL_SERVICE_URL",
  community: "COMMUNITY_SERVICE_URL",
  "community-service": "COMMUNITY_SERVICE_URL",
  preference: "PREFERENCE_SERVICE_URL",
  "preference-service": "PREFERENCE_SERVICE_URL",
  ai: "AI_SERVICE_URL",
  "ai-service": "AI_SERVICE_URL",
};

function resolveServiceUrl(service) {
  const envName = SERVICE_ALIASES[String(service || "").toLowerCase()];
  const value = envName ? process.env[envName]?.trim() : "";
  return value ? value.replace(/\/+$/, "") : null;
}

function upstreamPath(request) {
  const original = request.originalUrl || request.url;
  const prefix = `/v1/services/${encodeURIComponent(request.params.service)}`;
  const index = original.indexOf(prefix);
  const remainder = index >= 0 ? original.slice(index + prefix.length) : request.url;
  return remainder.startsWith("/") ? remainder : `/${remainder}`;
}

module.exports = { resolveServiceUrl, upstreamPath };
