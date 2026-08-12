const crypto = require("node:crypto");
const {
  passwordResetDevMode,
  sendEmailVerificationLink,
} = require("./email-sender.cjs");

const GENERIC_RESEND_MESSAGE =
  "Nếu tài khoản đang chờ kích hoạt, một email xác minh mới đã được gửi.";
const VERIFICATION_LIFETIME_MS = 24 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hashVerificationToken(token) {
  const pepper =
    process.env.EMAIL_VERIFICATION_PEPPER ||
    process.env.PASSWORD_RESET_PEPPER ||
    process.env.JWT_SECRET;
  if (!pepper) {
    throw new Error("EMAIL_VERIFICATION_PEPPER, PASSWORD_RESET_PEPPER or JWT_SECRET is required");
  }
  return crypto.createHmac("sha256", pepper).update(token).digest("hex");
}

function createVerificationUrl(token) {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  if (process.env.NODE_ENV === "production" && !process.env.APP_URL) {
    throw new Error("APP_URL is required in production");
  }
  const url = new URL("/verify-email", appUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

async function issueVerificationLink(prisma, user, options = {}) {
  const now = options.now || new Date();
  const recentToken = await prisma.emailVerificationToken.findFirst({
    where: {
      userId: user.id,
      createdAt: { gt: new Date(now.getTime() - RESEND_COOLDOWN_MS) },
    },
    orderBy: { createdAt: "desc" },
  });
  if (recentToken && !options.ignoreCooldown) {
    return { sent: false, cooldown: true };
  }

  const token = options.token || crypto.randomBytes(32).toString("base64url");
  const verificationUrl = options.verificationUrl || createVerificationUrl(token);
  await prisma.emailVerificationToken.updateMany({
    where: { userId: user.id, consumedAt: null },
    data: { consumedAt: now },
  });
  const record = await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      tokenHash: hashVerificationToken(token),
      expiresAt: new Date(now.getTime() + VERIFICATION_LIFETIME_MS),
      createdAt: now,
    },
  });

  try {
    await (options.sendLink || sendEmailVerificationLink)({
      to: user.email,
      verificationUrl,
    });
  } catch (error) {
    await prisma.emailVerificationToken.delete({ where: { id: record.id } }).catch(() => undefined);
    throw error;
  }

  return { sent: true, verificationUrl };
}

async function requestEmailVerification(prisma, input, options = {}) {
  const email = normalizeEmail(input.email);
  if (!validEmail(email)) {
    return { status: 400, payload: { message: "Địa chỉ email không hợp lệ." } };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, status: true },
  });
  const result = { status: 200, payload: { message: GENERIC_RESEND_MESSAGE } };
  if (!user || user.status !== "PENDING_VERIFICATION") return result;

  const issued = await issueVerificationLink(prisma, user, options);
  return {
    status: 200,
    payload: {
      message: GENERIC_RESEND_MESSAGE,
      ...(passwordResetDevMode() && issued.verificationUrl
        ? { devVerificationUrl: issued.verificationUrl }
        : {}),
    },
  };
}

async function confirmEmailVerification(prisma, input, options = {}) {
  const token = typeof input.token === "string" ? input.token.trim() : "";
  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) {
    return { status: 400, payload: { message: "Liên kết kích hoạt không hợp lệ hoặc đã hết hạn." } };
  }

  const now = options.now || new Date();
  const record = await prisma.emailVerificationToken.findFirst({
    where: {
      tokenHash: hashVerificationToken(token),
      consumedAt: null,
      expiresAt: { gt: now },
    },
    select: {
      id: true,
      userId: true,
      user: { select: { status: true } },
    },
  });
  if (!record || record.user.status !== "PENDING_VERIFICATION") {
    return { status: 400, payload: { message: "Liên kết kích hoạt không hợp lệ hoặc đã hết hạn." } };
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { status: "ACTIVE" } }),
    prisma.emailVerificationToken.update({ where: { id: record.id }, data: { consumedAt: now } }),
    prisma.emailVerificationToken.updateMany({
      where: { userId: record.userId, id: { not: record.id }, consumedAt: null },
      data: { consumedAt: now },
    }),
  ]);

  return {
    status: 200,
    payload: { message: "Kích hoạt tài khoản thành công. Bạn có thể đăng nhập ngay." },
  };
}

module.exports = {
  GENERIC_RESEND_MESSAGE,
  confirmEmailVerification,
  createVerificationUrl,
  hashVerificationToken,
  issueVerificationLink,
  requestEmailVerification,
};
