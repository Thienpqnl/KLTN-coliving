const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { requireInternalService } = require("../shared/internal-auth.cjs");
const {
  changePassword,
  getCurrentUser,
  getProfile,
  login,
  register,
  updateProfile,
} = require("./auth.cjs");
const { requestPhoneOtp, verifyPhoneOtp } = require("./phone-otp.cjs");

const app = express();
const prisma = new PrismaClient();
const port = Number(process.env.PORT || 4001);

app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_request, response) => {
  response.json({ status: "ok", service: "identity-service" });
});

app.use("/v1", requireInternalService);

app.post("/v1/auth/login", async (request, response) => {
  try {
    const result = await login(
      prisma,
      String(request.body?.email || "").trim(),
      request.body?.password,
    );
    return response.status(result.status).json(result.payload);
  } catch (error) {
    console.error("[identity-service] POST /v1/auth/login failed", error);
    return response.status(error.statusCode || 500).json({
      message: "Hệ thống đang gặp sự cố. Vui lòng thử lại sau.",
    });
  }
});

app.get("/v1/auth/me", async (request, response) => {
  try {
    const result = await getCurrentUser(
      prisma,
      request.get("authorization"),
    );
    return response.status(result.status).json(result.payload);
  } catch (error) {
    console.error("[identity-service] GET /v1/auth/me failed", error);
    return response.status(error.statusCode || 500).json({
      message: "Hệ thống đang gặp sự cố. Vui lòng thử lại sau.",
    });
  }
});

app.post("/v1/auth/register", async (request, response) => {
  try {
    const result = await register(prisma, request.body || {});
    return response.status(result.status).json(result.payload);
  } catch (error) {
    console.error("[identity-service] POST /v1/auth/register failed", error);
    return response.status(error.statusCode || 500).json({
      message: "Hệ thống đang gặp sự cố. Vui lòng thử lại sau.",
    });
  }
});

app.get("/v1/profile", async (request, response) => {
  try {
    const result = await getProfile(prisma, request.get("authorization"));
    return response.status(result.status).json(result.payload);
  } catch (error) {
    console.error("[identity-service] GET /v1/profile failed", error);
    return response.status(500).json({ message: "Cannot load profile" });
  }
});

app.put("/v1/profile", async (request, response) => {
  try {
    const result = await updateProfile(
      prisma,
      request.get("authorization"),
      request.body || {},
    );
    return response.status(result.status).json(result.payload);
  } catch (error) {
    console.error("[identity-service] PUT /v1/profile failed", error);
    return response.status(500).json({ message: "Cannot update profile" });
  }
});

app.put("/v1/auth/change-password", async (request, response) => {
  try {
    const result = await changePassword(
      prisma,
      request.get("authorization"),
      request.body || {},
    );
    return response.status(result.status).json(result.payload);
  } catch (error) {
    console.error("[identity-service] PUT /v1/auth/change-password failed", error);
    return response.status(500).json({ message: "Cannot change password" });
  }
});

app.post("/v1/auth/phone/request-otp", async (request, response) => {
  try {
    const result = await requestPhoneOtp(
      prisma,
      request.get("authorization"),
      request.body || {},
    );
    return response.status(result.status).json(result.payload);
  } catch (error) {
    console.error("[identity-service] POST request OTP failed", error);
    return response.status(500).json({ message: "Cannot create phone OTP" });
  }
});

app.post("/v1/auth/phone/verify-otp", async (request, response) => {
  try {
    const result = await verifyPhoneOtp(
      prisma,
      request.get("authorization"),
      request.body || {},
    );
    return response.status(result.status).json(result.payload);
  } catch (error) {
    console.error("[identity-service] POST verify OTP failed", error);
    return response.status(500).json({ message: "Cannot verify phone OTP" });
  }
});

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`[identity-service] listening on port ${port}`);
});

async function shutdown(signal) {
  console.log(`[identity-service] received ${signal}, shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
