const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const userProfileSelect = {
  id: true,
  email: true,
  name: true,
  fullName: true,
  phone: true,
  phoneVerified: true,
  phoneVerifiedAt: true,
  gender: true,
  birthDate: true,
  address: true,
  avatarUrl: true,
  role: true,
};

const editableProfileSelect = {
  ...userProfileSelect,
  createdAt: true,
};

function requireJwtSecret() {
  if (!process.env.JWT_SECRET) {
    const error = new Error("JWT_SECRET is missing");
    error.statusCode = 503;
    throw error;
  }
  return process.env.JWT_SECRET;
}

function verifyAuthorization(authorization) {
  const [scheme, token] = String(authorization || "").split(" ");
  if (scheme !== "Bearer" || !token) {
    return {
      ok: false,
      result: { status: 401, payload: { message: "Unauthorized" } },
    };
  }

  try {
    return { ok: true, payload: jwt.verify(token, requireJwtSecret()) };
  } catch {
    return {
      ok: false,
      result: { status: 401, payload: { message: "Unauthorized" } },
    };
  }
}

async function login(prisma, email, password) {
  if (!email || !password) {
    return {
      status: 400,
      payload: { message: "Vui lòng nhập đầy đủ email và mật khẩu" },
    };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return { status: 400, payload: { message: "Email không tồn tại" } };
  }
  if (!(await bcrypt.compare(password, user.password))) {
    return { status: 400, payload: { message: "Mật khẩu không chính xác" } };
  }

  const token = jwt.sign(
    { userId: user.id, role: user.role },
    requireJwtSecret(),
    { expiresIn: "1d" },
  );
  return {
    status: 200,
    payload: {
      token,
      user: { id: user.id, email: user.email, role: user.role },
    },
  };
}

async function register(prisma, input) {
  const email = String(input.email || "").trim();
  const password = input.password;
  const fullName = String(input.fullName || "").trim();
  const allowedRoles = ["HOST", "CUSTOMER", "COMMUNITY_MANAGER"];

  if (!email || !password || !fullName) {
    return {
      status: 400,
      payload: { message: "Vui lòng nhập đầy đủ thông tin đăng ký" },
    };
  }

  if (await prisma.user.findUnique({ where: { email } })) {
    return {
      status: 400,
      payload: { message: "Email này đã được sử dụng" },
    };
  }

  const user = await prisma.user.create({
    data: {
      email,
      password: await bcrypt.hash(password, 10),
      name: fullName,
      fullName,
      role: allowedRoles.includes(input.role) ? input.role : "CUSTOMER",
    },
  });
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    requireJwtSecret(),
    { expiresIn: "1d" },
  );

  return {
    status: 200,
    payload: {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      token,
    },
  };
}

async function getCurrentUser(prisma, authorization) {
  const authentication = verifyAuthorization(authorization);
  if (!authentication.ok) return authentication.result;

  const user = await prisma.user.findUnique({
    where: { id: authentication.payload.userId },
    select: userProfileSelect,
  });
  return user
    ? { status: 200, payload: user }
    : { status: 404, payload: { message: "User not found" } };
}

async function getProfile(prisma, authorization) {
  const authentication = verifyAuthorization(authorization);
  if (!authentication.ok) return authentication.result;

  const user = await prisma.user.findUnique({
    where: { id: authentication.payload.userId },
    select: editableProfileSelect,
  });
  return user
    ? { status: 200, payload: user }
    : { status: 404, payload: { message: "User not found" } };
}

async function updateProfile(prisma, authorization, input) {
  const authentication = verifyAuthorization(authorization);
  if (!authentication.ok) return authentication.result;

  const fullName = typeof input.fullName === "string" ? input.fullName.trim() : "";
  if (!fullName) {
    return {
      status: 400,
      payload: { message: "Họ và tên không được để trống" },
    };
  }

  let birthDate = null;
  if (typeof input.birthDate === "string" && input.birthDate) {
    birthDate = new Date(input.birthDate);
    if (Number.isNaN(birthDate.getTime())) {
      return { status: 400, payload: { message: "Ngày sinh không hợp lệ" } };
    }
  }

  const user = await prisma.user.update({
    where: { id: authentication.payload.userId },
    data: {
      fullName,
      name: fullName,
      phone: typeof input.phone === "string" && input.phone.trim() ? input.phone.trim() : null,
      gender: typeof input.gender === "string" && input.gender.trim() ? input.gender.trim() : null,
      birthDate,
      address: typeof input.address === "string" && input.address.trim() ? input.address.trim() : null,
      ...(typeof input.avatarUrl === "string" && {
        avatarUrl: input.avatarUrl.trim() || null,
      }),
    },
    select: editableProfileSelect,
  });
  return { status: 200, payload: user };
}

async function changePassword(prisma, authorization, input) {
  const authentication = verifyAuthorization(authorization);
  if (!authentication.ok) return authentication.result;
  const { currentPassword, newPassword } = input;

  if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
    return {
      status: 400,
      payload: { message: "Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới." },
    };
  }
  if (newPassword.length < 6) {
    return {
      status: 400,
      payload: { message: "Mật khẩu mới phải có ít nhất 6 ký tự." },
    };
  }
  if (currentPassword === newPassword) {
    return {
      status: 400,
      payload: { message: "Mật khẩu mới phải khác mật khẩu hiện tại." },
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: authentication.payload.userId },
    select: { id: true, password: true },
  });
  if (!user) {
    return { status: 404, payload: { message: "Không tìm thấy tài khoản." } };
  }
  if (!(await bcrypt.compare(currentPassword, user.password))) {
    return {
      status: 400,
      payload: { message: "Mật khẩu hiện tại không chính xác." },
    };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await bcrypt.hash(newPassword, 10) },
  });
  return {
    status: 200,
    payload: { message: "Đã đổi mật khẩu thành công." },
  };
}

async function getUserSummaries(prisma, ids = []) {
  const userIds = Array.isArray(ids)
    ? [...new Set(ids.map(String).filter(Boolean))]
    : [];
  if (userIds.length === 0) return { status: 200, payload: [] };

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      name: true,
      fullName: true,
      email: true,
      avatarUrl: true,
      preference: true,
    },
  });
  const order = new Map(userIds.map((id, index) => [id, index]));
  return {
    status: 200,
    payload: users.sort(
      (left, right) => (order.get(left.id) ?? 0) - (order.get(right.id) ?? 0),
    ),
  };
}

module.exports = {
  changePassword,
  editableProfileSelect,
  getCurrentUser,
  getProfile,
  getUserSummaries,
  login,
  register,
  updateProfile,
  userProfileSelect,
  verifyAuthorization,
};
