const bcrypt = require("bcrypt");
const crypto = require("node:crypto");
const { passwordResetDevMode, sendPasswordResetLink } = require("./email-sender.cjs");

const GENERIC_REQUEST_MESSAGE =
  "Nếu email tồn tại, liên kết đặt lại mật khẩu đã được gửi đến hộp thư của bạn.";
const TOKEN_LIFETIME_MS = 10 * 60 * 1000;
const REQUEST_COOLDOWN_MS = 60 * 1000;

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hashPasswordResetToken(token) {
  const pepper = process.env.PASSWORD_RESET_PEPPER || process.env.JWT_SECRET;
  if (!pepper) throw new Error("PASSWORD_RESET_PEPPER or JWT_SECRET is required");
  return crypto.createHmac("sha256", pepper).update(token).digest("hex");
}

function validPassword(password) {
  return (
    typeof password === "string" &&
    password.length >= 8 &&
    /[A-Za-z]/.test(password) &&
    /\d/.test(password)
  );
}

function createResetUrl(token) {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  if (process.env.NODE_ENV === "production" && !process.env.APP_URL) {
    throw new Error("APP_URL is required in production");
  }
  const url = new URL("/reset-password", appUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

async function requestPasswordReset(prisma, input, options = {}) {
  const email = normalizeEmail(input.email);
  if (!validEmail(email)) {
    return { status: 400, payload: { message: "Địa chỉ email không hợp lệ." } };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, status: true },
  });
  const genericResult = { status: 200, payload: { message: GENERIC_REQUEST_MESSAGE } };
  if (!user || user.status !== "ACTIVE") return genericResult;

  const now = options.now || new Date();
  const recentToken = await prisma.passwordResetOtp.findFirst({
    where: {
      userId: user.id,
      createdAt: { gt: new Date(now.getTime() - REQUEST_COOLDOWN_MS) },
    },
    orderBy: { createdAt: "desc" },
  });
  if (recentToken) return genericResult;

  const token = options.token || crypto.randomBytes(32).toString("base64url");
  const resetUrl = options.resetUrl || createResetUrl(token);
  await prisma.passwordResetOtp.updateMany({
    where: { userId: user.id, consumedAt: null },
    data: { consumedAt: now },
  });
  const record = await prisma.passwordResetOtp.create({
    data: {
      userId: user.id,
      codeHash: hashPasswordResetToken(token),
      expiresAt: new Date(now.getTime() + TOKEN_LIFETIME_MS),
      createdAt: now,
    },
  });

  try {
    await (options.sendLink || sendPasswordResetLink)({ to: user.email, resetUrl });
  } catch (error) {
    await prisma.passwordResetOtp.delete({ where: { id: record.id } }).catch(() => undefined);
    throw error;
  }

  return {
    status: 200,
    payload: {
      message: GENERIC_REQUEST_MESSAGE,
      ...(passwordResetDevMode() ? { devResetUrl: resetUrl } : {}),
    },
  };
}

async function confirmPasswordReset(prisma, input, options = {}) {
  const token = typeof input.token === "string" ? input.token.trim() : "";
  const newPassword = input.newPassword;

  if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) {
    return { status: 400, payload: { message: "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn." } };
  }
  if (!validPassword(newPassword)) {
    return {
      status: 400,
      payload: { message: "Mật khẩu phải có ít nhất 8 ký tự, gồm chữ và số." },
    };
  }

  const now = options.now || new Date();
  const record = await prisma.passwordResetOtp.findFirst({
    where: {
      codeHash: hashPasswordResetToken(token),
      consumedAt: null,
      expiresAt: { gt: now },
    },
    select: {
      id: true,
      userId: true,
      user: { select: { password: true, status: true } },
    },
  });
  if (!record || record.user.status !== "ACTIVE") {
    return { status: 400, payload: { message: "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn." } };
  }
  if (await bcrypt.compare(newPassword, record.user.password)) {
    return { status: 400, payload: { message: "Mật khẩu mới phải khác mật khẩu hiện tại." } };
  }

  const password = await bcrypt.hash(newPassword, 10);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { password } }),
    prisma.passwordResetOtp.update({ where: { id: record.id }, data: { consumedAt: now } }),
    prisma.passwordResetOtp.updateMany({
      where: { userId: record.userId, id: { not: record.id }, consumedAt: null },
      data: { consumedAt: now },
    }),
  ]);

  return {
    status: 200,
    payload: { message: "Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới." },
  };
}

module.exports = {
  GENERIC_REQUEST_MESSAGE,
  confirmPasswordReset,
  createResetUrl,
  hashPasswordResetToken,
  normalizeEmail,
  requestPasswordReset,
  validPassword,
};
