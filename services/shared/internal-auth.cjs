const crypto = require("node:crypto");

function secureEquals(left, right) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function requireInternalService(request, response, next) {
  const expectedToken = process.env.INTERNAL_SERVICE_TOKEN;

  if (!expectedToken) {
    if (process.env.NODE_ENV === "production") {
      return response.status(503).json({
        error: "SERVICE_NOT_CONFIGURED",
        message: "Internal service authentication is not configured",
      });
    }
    return next();
  }

  const suppliedToken = request.get("x-internal-service-token") || "";
  if (!secureEquals(suppliedToken, expectedToken)) {
    return response.status(401).json({
      error: "UNAUTHORIZED_SERVICE",
      message: "Invalid internal service credentials",
    });
  }

  return next();
}

function requestIdentity(request) {
  return {
    userId: request.get("x-user-id") || null,
    role: request.get("x-user-role") || null,
  };
}

module.exports = { requestIdentity, requireInternalService, secureEquals };
