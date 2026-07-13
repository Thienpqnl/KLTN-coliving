const assert = require("node:assert/strict");
const test = require("node:test");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const {
  changePassword,
  getCurrentUser,
  login,
  register,
  updateProfile,
} = require("./auth.cjs");

test("login keeps validation and invalid credential contracts", async () => {
  const prisma = {
    user: { findUnique: async () => null },
  };

  assert.equal((await login(prisma, "", "")).status, 400);
  assert.deepEqual(
    (await login(prisma, "missing@example.com", "secret")).payload,
    { message: "Email không tồn tại" },
  );
});

test("login rejects locked and deleted accounts before password verification", async () => {
  const locked = await login(
    { user: { findUnique: async () => ({ status: "LOCKED" }) } },
    "locked@example.com",
    "secret",
  );
  const deleted = await login(
    { user: { findUnique: async () => ({ status: "DELETED" }) } },
    "deleted@example.com",
    "secret",
  );
  assert.equal(locked.status, 403);
  assert.equal(deleted.status, 403);
});

test("login returns a compatible JWT and user payload", async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "identity-service-test-secret";
  const passwordHash = await bcrypt.hash("correct-password", 4);
  const prisma = {
    user: {
      findUnique: async () => ({
        id: "user-1",
        email: "user@example.com",
        password: passwordHash,
        role: "CUSTOMER",
      }),
    },
  };

  try {
    const wrong = await login(prisma, "user@example.com", "wrong-password");
    assert.equal(wrong.status, 400);

    const result = await login(
      prisma,
      "user@example.com",
      "correct-password",
    );
    assert.equal(result.status, 200);
    assert.deepEqual(result.payload.user, {
      id: "user-1",
      email: "user@example.com",
      role: "CUSTOMER",
    });
    const decoded = jwt.verify(
      result.payload.token,
      process.env.JWT_SECRET,
    );
    assert.equal(decoded.userId, "user-1");
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});

test("getCurrentUser verifies the bearer token before querying the profile", async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "identity-service-test-secret";
  let queriedUserId;
  const prisma = {
    user: {
      findUnique: async ({ where }) => {
        queriedUserId = where.id;
        return { id: where.id, email: "user@example.com", role: "CUSTOMER" };
      },
    },
  };

  try {
    assert.equal((await getCurrentUser(prisma, "Bearer invalid")).status, 401);
    const token = jwt.sign(
      { userId: "user-2", role: "CUSTOMER" },
      process.env.JWT_SECRET,
    );
    const result = await getCurrentUser(prisma, `Bearer ${token}`);
    assert.equal(result.status, 200);
    assert.equal(queriedUserId, "user-2");
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});

test("register restricts public roles and returns a compatible session", async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "identity-service-test-secret";
  let createdData;
  const prisma = {
    user: {
      findUnique: async () => null,
      create: async ({ data }) => {
        createdData = data;
        return { id: "new-user", ...data };
      },
    },
  };

  try {
    const result = await register(prisma, {
      email: "new@example.com",
      password: "password123",
      fullName: "Nguyen Van A",
      role: "ADMIN",
    });
    assert.equal(result.status, 200);
    assert.equal(createdData.role, "CUSTOMER");
    assert.equal(result.payload.user.fullName, "Nguyen Van A");
    assert.ok(result.payload.token);
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});

test("updateProfile validates the name and updates the authenticated user", async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "identity-service-test-secret";
  const token = jwt.sign({ userId: "user-3" }, process.env.JWT_SECRET);
  let updateArgs;
  const prisma = {
    user: {
      update: async (args) => {
        updateArgs = args;
        return { id: args.where.id, ...args.data };
      },
    },
  };

  try {
    assert.equal(
      (await updateProfile(prisma, `Bearer ${token}`, { fullName: "" })).status,
      400,
    );
    const result = await updateProfile(prisma, `Bearer ${token}`, {
      fullName: "  Nguyen Van B  ",
      phone: " 0900000000 ",
    });
    assert.equal(result.status, 200);
    assert.equal(updateArgs.where.id, "user-3");
    assert.equal(updateArgs.data.fullName, "Nguyen Van B");
    assert.equal(updateArgs.data.phone, "0900000000");
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});

test("changePassword verifies the old password before storing the new hash", async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "identity-service-test-secret";
  const token = jwt.sign({ userId: "user-4" }, process.env.JWT_SECRET);
  const oldHash = await bcrypt.hash("old-password", 4);
  let updatedPassword;
  const prisma = {
    user: {
      findUnique: async () => ({ id: "user-4", password: oldHash }),
      update: async ({ data }) => {
        updatedPassword = data.password;
      },
    },
  };

  try {
    const wrong = await changePassword(prisma, `Bearer ${token}`, {
      currentPassword: "wrong-password",
      newPassword: "new-password",
    });
    assert.equal(wrong.status, 400);

    const result = await changePassword(prisma, `Bearer ${token}`, {
      currentPassword: "old-password",
      newPassword: "new-password",
    });
    assert.equal(result.status, 200);
    assert.equal(await bcrypt.compare("new-password", updatedPassword), true);
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});
