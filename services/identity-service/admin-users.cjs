const bcrypt = require("bcrypt");
const domainClients = require("./domain-clients.cjs");

const userListSelect = {
  id: true,
  email: true,
  name: true,
  fullName: true,
  phone: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
};

const userDetailSelect = {
  ...userListSelect,
  phoneVerified: true,
};

function requireAdmin(identity) {
  if (identity.role !== "ADMIN") {
    return { status: 403, payload: { error: "Forbidden: Admin only" } };
  }
  return null;
}

function parsePositiveInt(value, fallback) {
  const number = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

async function listUsers(prisma, identity, query = {}, clients = domainClients) {
  const denied = requireAdmin(identity);
  if (denied) return denied;

  const page = parsePositiveInt(query.page, 1);
  const limit = parsePositiveInt(query.limit, 20);
  const skip = (page - 1) * limit;
  const role = typeof query.role === "string" && query.role ? query.role : undefined;
  const status = typeof query.status === "string" && query.status ? query.status : undefined;
  const search = typeof query.search === "string" && query.search ? query.search : undefined;

  const where = {};
  if (role) where.role = role;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { name: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: userListSelect,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);
  let bookingCounts;
  let propertyCounts;
  try {
    [bookingCounts, propertyCounts] = await Promise.all([
      clients.getBookingCounts(users.map((user) => user.id)),
      clients.getPropertyCounts(users.map((user) => user.id)),
    ]);
  } catch (error) {
    return { status: error.status || 503, payload: { error: error.message || "Dependency unavailable" } };
  }
  const data = users.map((user) => ({
    ...user,
    _count: {
      bookings: Number(bookingCounts[user.id] || 0),
      rooms: Number(propertyCounts[user.id] || 0),
    },
  }));

  return {
    status: 200,
    payload: {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
  };
}

async function getUserById(prisma, identity, userId, clients = domainClients) {
  const denied = requireAdmin(identity);
  if (denied) return denied;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: userDetailSelect,
  });

  if (!user) return { status: 404, payload: { error: "User not found" } };
  try {
    const [bookingCounts, propertyCounts] = await Promise.all([
      clients.getBookingCounts([userId]),
      clients.getPropertyCounts([userId]),
    ]);
    return {
      status: 200,
      payload: {
        ...user,
        _count: {
          bookings: Number(bookingCounts[userId] || 0),
          rooms: Number(propertyCounts[userId] || 0),
        },
      },
    };
  } catch (error) {
    return { status: error.status || 503, payload: { error: error.message || "Dependency unavailable" } };
  }
}

async function logAdminAction(prisma, data) {
  await prisma.adminLog.create({
    data: {
      adminId: data.adminId,
      action: data.action,
      targetUserId: data.targetUserId,
      targetId: data.targetUserId,
      targetType: "user",
      oldValue: JSON.stringify(data.oldValue),
      newValue: JSON.stringify(data.newValue),
      description: data.description,
    },
  });
}

async function createUser(prisma, identity, input = {}) {
  const denied = requireAdmin(identity);
  if (denied) return denied;

  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const fullName = typeof input.fullName === "string" ? input.fullName.trim() : "";
  const phone = typeof input.phone === "string" ? input.phone.trim() : "";
  const password = input.password;
  const role = typeof input.role === "string" ? input.role : "CUSTOMER";
  const allowedRoles = ["CUSTOMER", "HOST", "COMMUNITY_MANAGER"];

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: 400, payload: { error: "Email không hợp lệ" } };
  }
  if (fullName.length < 2) {
    return { status: 400, payload: { error: "Họ và tên cần ít nhất 2 ký tự" } };
  }
  if (typeof password !== "string" || password.length < 8 || password.length > 72) {
    return { status: 400, payload: { error: "Mật khẩu phải có từ 8 đến 72 ký tự" } };
  }
  if (phone && !/^\+?[0-9]{9,15}$/.test(phone.replace(/[\s.-]/g, ""))) {
    return { status: 400, payload: { error: "Số điện thoại không hợp lệ" } };
  }
  if (!allowedRoles.includes(role)) {
    return { status: 400, payload: { error: "Vai trò không hợp lệ" } };
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { status: 409, payload: { error: "Email này đã được sử dụng" } };
  }

  const user = await prisma.user.create({
    data: {
      email,
      password: await bcrypt.hash(password, 10),
      name: fullName,
      fullName,
      phone: phone ? phone.replace(/[\s.-]/g, "") : null,
      role,
      status: "ACTIVE",
    },
    select: userListSelect,
  });

  await logAdminAction(prisma, {
    adminId: identity.userId,
    action: "create_user",
    targetUserId: user.id,
    oldValue: {},
    newValue: { role: user.role, status: user.status },
    description: `Created user account ${user.email}`,
  });

  return { status: 201, payload: { message: "Tạo người dùng thành công", user } };
}

async function updateUserAction(prisma, identity, userId, input = {}) {
  const denied = requireAdmin(identity);
  if (denied) return denied;

  const { action, reason, newRole } = input;
  if (!["lock", "unlock", "delete", "update_role"].includes(action)) {
    return { status: 400, payload: { error: "Invalid action" } };
  }

  if (
    userId === identity.userId &&
    (action === "lock" || action === "delete" || action === "update_role")
  ) {
    return {
      status: 400,
      payload: {
        error: "Khong the khoa, xoa hoac thay doi vai tro cua tai khoan admin hien tai",
      },
    };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { status: 404, payload: { error: "User not found" } };

  if (action === "lock" && user.status === "LOCKED") {
    return { status: 400, payload: { error: "User already locked" } };
  }
  if (action === "unlock" && user.status !== "LOCKED") {
    return { status: 400, payload: { error: "User is not locked" } };
  }
  if (action === "update_role" && !newRole) {
    return { status: 400, payload: { error: "newRole is required" } };
  }

  const updates = {
    lock: { status: "LOCKED" },
    unlock: { status: "ACTIVE" },
    delete: { status: "DELETED" },
    update_role: { role: newRole },
  };
  const descriptions = {
    lock: reason || "User account locked",
    unlock: reason || "User account unlocked",
    delete: reason || "User account deleted",
    update_role: reason || `User role changed from ${user.role} to ${newRole}`,
  };
  const actions = {
    lock: "lock_user",
    unlock: "unlock_user",
    delete: "delete_user",
    update_role: "update_user_role",
  };

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updates[action],
  });

  await logAdminAction(prisma, {
    adminId: identity.userId,
    action: actions[action],
    targetUserId: userId,
    oldValue: action === "update_role" ? { role: user.role } : { status: user.status },
    newValue: updates[action],
    description: descriptions[action],
  });

  return { status: 200, payload: updatedUser };
}

async function getUserStats(prisma, identity) {
  const denied = requireAdmin(identity);
  if (denied) return denied;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [total, tenants, landlords, communityManagers, locked, deleted, newThisMonth] =
    await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "CUSTOMER", status: "ACTIVE" } }),
      prisma.user.count({ where: { role: "HOST", status: "ACTIVE" } }),
      prisma.user.count({ where: { role: "COMMUNITY_MANAGER", status: "ACTIVE" } }),
      prisma.user.count({ where: { status: "LOCKED" } }),
      prisma.user.count({ where: { status: "DELETED" } }),
      prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
    ]);

  const byMonth = [];
  for (let index = 11; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
    const count = await prisma.user.count({
      where: { createdAt: { gte: start, lte: end } },
    });
    byMonth.push({ month: date.toISOString().substring(0, 7), count });
  }

  return {
    status: 200,
    payload: {
      total,
      tenants,
      landlords,
      communityManagers,
      locked,
      deleted,
      newThisMonth,
      byMonth,
    },
  };
}

async function getAdminLogs(prisma, identity, query = {}) {
  const denied = requireAdmin(identity);
  if (denied) return denied;

  const page = parsePositiveInt(query.page, 1);
  const limit = parsePositiveInt(query.limit, 50);
  const action = typeof query.action === "string" && query.action ? query.action : undefined;
  const targetType = typeof query.targetType === "string" && query.targetType ? query.targetType : undefined;
  const adminId = typeof query.adminId === "string" && query.adminId ? query.adminId : undefined;

  const where = {};
  if (action) where.action = action;
  if (targetType) where.targetType = targetType;
  if (adminId) where.adminId = adminId;

  const [logs, total] = await Promise.all([
    prisma.adminLog.findMany({
      where,
      include: {
        admin: {
          select: { id: true, name: true, email: true },
        },
        targetUser: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.adminLog.count({ where }),
  ]);

  return {
    status: 200,
    payload: {
      data: logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    },
  };
}

async function createAdmin(prisma, input = {}, expectedSecret) {
  const email = typeof input.email === "string" ? input.email.trim() : "";
  const password = input.password;
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const fullName = typeof input.fullName === "string" ? input.fullName.trim() : "";
  const adminSecret = input.adminSecret;

  if (!email || !email.includes("@") || typeof password !== "string" || password.length < 6 || name.length < 2 || fullName.length < 2) {
    return { status: 400, payload: { error: "Validation error" } };
  }

  if (adminSecret !== expectedSecret) {
    return { status: 403, payload: { error: "Invalid admin secret key" } };
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return { status: 400, payload: { error: "User already exists" } };
  }

  const adminUser = await prisma.user.create({
    data: {
      email,
      password: await bcrypt.hash(password, 10),
      name,
      fullName,
      role: "ADMIN",
      status: "ACTIVE",
    },
  });
  const { password: _password, ...userWithoutPassword } = adminUser;

  return {
    status: 201,
    payload: {
      message: "Admin user created successfully",
      user: userWithoutPassword,
    },
  };
}

module.exports = {
  createAdmin,
  createUser,
  getAdminLogs,
  getUserById,
  getUserStats,
  listUsers,
  updateUserAction,
};
