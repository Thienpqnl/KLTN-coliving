const crypto = require("node:crypto");
const { verifyAuthorization } = require("./auth.cjs");

function hashOtp(code) {
  return crypto
    .createHash("sha256")
    .update(`${code}:${process.env.JWT_SECRET || "dev-secret"}`)
    .digest("hex");
}

function normalizePhone(value) {
  return typeof value === "string" ? value.replace(/\s+/g, "") : "";
}

function validPhone(phone) {
  return phone.length >= 9 && phone.length <= 20;
}

async function requestPhoneOtp(prisma, authorization, input, options = {}) {
  const authentication = verifyAuthorization(authorization);
  if (!authentication.ok) return authentication.result;

  const phone = normalizePhone(input.phone);
  if (!validPhone(phone)) {
    return { status: 400, payload: { message: "Số điện thoại không hợp lệ" } };
  }

  const code = options.code || String(crypto.randomInt(100000, 999999));
  await prisma.phoneOtp.create({
    data: {
      userId: authentication.payload.userId,
      phone,
      codeHash: hashOtp(code),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    },
  });

  return {
    status: 200,
    payload: {
      message: "Đã gửi mã OTP đến số điện thoại",
      ...(process.env.NODE_ENV !== "production" ? { devOtp: code } : {}),
    },
  };
}

async function verifyPhoneOtp(prisma, authorization, input) {
  const authentication = verifyAuthorization(authorization);
  if (!authentication.ok) return authentication.result;

  const phone = normalizePhone(input.phone);
  const code = typeof input.code === "string" ? input.code : "";
  if (!validPhone(phone) || !/^\d{6}$/.test(code)) {
    return { status: 400, payload: { message: "Mã OTP không hợp lệ" } };
  }

  const otp = await prisma.phoneOtp.findFirst({
    where: {
      userId: authentication.payload.userId,
      phone,
      verifiedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    return {
      status: 400,
      payload: { message: "Mã OTP không tồn tại hoặc đã hết hạn" },
    };
  }
  if (otp.attemptCount >= 5) {
    return {
      status: 429,
      payload: { message: "Bạn đã nhập sai quá nhiều lần" },
    };
  }
  if (otp.codeHash !== hashOtp(code)) {
    await prisma.phoneOtp.update({
      where: { id: otp.id },
      data: { attemptCount: { increment: 1 } },
    });
    return { status: 400, payload: { message: "Mã OTP không chính xác" } };
  }

  const verifiedAt = new Date();
  await prisma.$transaction([
    prisma.phoneOtp.update({
      where: { id: otp.id },
      data: { verifiedAt },
    }),
    prisma.user.update({
      where: { id: authentication.payload.userId },
      data: { phone, phoneVerified: true, phoneVerifiedAt: verifiedAt },
    }),
  ]);

  return {
    status: 200,
    payload: { phone, phoneVerified: true, phoneVerifiedAt: verifiedAt },
  };
}

module.exports = {
  hashOtp,
  normalizePhone,
  requestPhoneOtp,
  verifyPhoneOtp,
};
