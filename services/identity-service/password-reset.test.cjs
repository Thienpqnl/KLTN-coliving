const assert = require("node:assert/strict");
const test = require("node:test");
const bcrypt = require("bcrypt");
const {
  GENERIC_REQUEST_MESSAGE,
  confirmPasswordReset,
  hashPasswordResetToken,
  requestPasswordReset,
} = require("./password-reset.cjs");

const TEST_TOKEN = "a".repeat(43);

function withEnvironment(run) {
  const previousSecret = process.env.JWT_SECRET;
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.JWT_SECRET = "password-reset-test-secret";
  process.env.NODE_ENV = "test";
  return Promise.resolve().then(run).finally(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  });
}

test("password reset request does not reveal whether an account exists", () =>
  withEnvironment(async () => {
    const prisma = { user: { findUnique: async () => null } };
    const result = await requestPasswordReset(prisma, { email: "missing@example.com" });
    assert.equal(result.status, 200);
    assert.equal(result.payload.message, GENERIC_REQUEST_MESSAGE);
    assert.equal(result.payload.devResetUrl, undefined);
  }));

test("password reset request stores only a token hash and emails the reset link", () =>
  withEnvironment(async () => {
    let createdData;
    let sentPayload;
    const resetUrl = `http://localhost:3000/reset-password?token=${TEST_TOKEN}`;
    const prisma = {
      user: { findUnique: async () => ({ id: "user-1", email: "user@example.com", status: "ACTIVE" }) },
      passwordResetOtp: {
        findFirst: async () => null,
        updateMany: async () => ({}),
        create: async ({ data }) => {
          createdData = data;
          return { id: "reset-1", ...data };
        },
        delete: async () => ({}),
      },
    };
    const result = await requestPasswordReset(prisma, { email: "USER@example.com" }, {
      token: TEST_TOKEN,
      resetUrl,
      sendLink: async (payload) => { sentPayload = payload; },
    });

    assert.equal(result.status, 200);
    assert.equal(result.payload.devResetUrl, resetUrl);
    assert.equal(createdData.codeHash, hashPasswordResetToken(TEST_TOKEN));
    assert.notEqual(createdData.codeHash, TEST_TOKEN);
    assert.deepEqual(sentPayload, { to: "user@example.com", resetUrl });
  }));

test("password reset confirm rejects an unknown or expired token", () =>
  withEnvironment(async () => {
    const prisma = { passwordResetOtp: { findFirst: async () => null } };
    const result = await confirmPasswordReset(prisma, { token: TEST_TOKEN, newPassword: "NewPassword1" });
    assert.equal(result.status, 400);
  }));

test("password reset confirm changes the password and consumes all active links", () =>
  withEnvironment(async () => {
    const operations = [];
    const oldHash = await bcrypt.hash("OldPassword1", 4);
    const prisma = {
      user: { update: (args) => Promise.resolve({ type: "user", args }) },
      passwordResetOtp: {
        findFirst: async () => ({ id: "reset-1", userId: "user-1", user: { password: oldHash, status: "ACTIVE" } }),
        update: (args) => Promise.resolve({ type: "reset", args }),
        updateMany: (args) => Promise.resolve({ type: "other-links", args }),
      },
      $transaction: async (items) => { operations.push(...(await Promise.all(items))); },
    };
    const result = await confirmPasswordReset(prisma, { token: TEST_TOKEN, newPassword: "NewPassword1" });
    assert.equal(result.status, 200);
    assert.equal(operations.length, 3);
    assert.equal(await bcrypt.compare("NewPassword1", operations[0].args.data.password), true);
    assert.ok(operations[1].args.data.consumedAt instanceof Date);
  }));
