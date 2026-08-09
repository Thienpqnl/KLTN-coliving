const assert = require("node:assert/strict");
const test = require("node:test");
const {
  GENERIC_RESEND_MESSAGE,
  confirmEmailVerification,
  hashVerificationToken,
  issueVerificationLink,
  requestEmailVerification,
} = require("./email-verification.cjs");

const TEST_TOKEN = "v".repeat(43);

function withEnvironment(run) {
  const previousSecret = process.env.JWT_SECRET;
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.JWT_SECRET = "email-verification-test-secret";
  process.env.NODE_ENV = "test";
  return Promise.resolve().then(run).finally(() => {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  });
}

test("verification resend does not reveal whether an account exists", () =>
  withEnvironment(async () => {
    const result = await requestEmailVerification(
      { user: { findUnique: async () => null } },
      { email: "missing@example.com" },
    );
    assert.equal(result.status, 200);
    assert.equal(result.payload.message, GENERIC_RESEND_MESSAGE);
    assert.equal(result.payload.devVerificationUrl, undefined);
  }));

test("verification issue stores only a token hash and sends the raw link", () =>
  withEnvironment(async () => {
    let createdData;
    let sentPayload;
    const verificationUrl = `http://localhost:3000/verify-email?token=${TEST_TOKEN}`;
    const prisma = {
      emailVerificationToken: {
        findFirst: async () => null,
        updateMany: async () => ({}),
        create: async ({ data }) => {
          createdData = data;
          return { id: "verification-1", ...data };
        },
        delete: async () => ({}),
      },
    };
    const result = await issueVerificationLink(
      prisma,
      { id: "user-1", email: "user@example.com" },
      {
        token: TEST_TOKEN,
        verificationUrl,
        sendLink: async (payload) => { sentPayload = payload; },
      },
    );

    assert.equal(result.sent, true);
    assert.equal(createdData.tokenHash, hashVerificationToken(TEST_TOKEN));
    assert.notEqual(createdData.tokenHash, TEST_TOKEN);
    assert.deepEqual(sentPayload, { to: "user@example.com", verificationUrl });
  }));

test("verification confirm rejects an unknown or expired token", () =>
  withEnvironment(async () => {
    const prisma = { emailVerificationToken: { findFirst: async () => null } };
    const result = await confirmEmailVerification(prisma, { token: TEST_TOKEN });
    assert.equal(result.status, 400);
  }));

test("verification confirm activates the account and consumes all active links", () =>
  withEnvironment(async () => {
    const operations = [];
    const prisma = {
      user: { update: (args) => Promise.resolve({ type: "user", args }) },
      emailVerificationToken: {
        findFirst: async () => ({
          id: "verification-1",
          userId: "user-1",
          user: { status: "PENDING_VERIFICATION" },
        }),
        update: (args) => Promise.resolve({ type: "verification", args }),
        updateMany: (args) => Promise.resolve({ type: "other-links", args }),
      },
      $transaction: async (items) => { operations.push(...(await Promise.all(items))); },
    };
    const result = await confirmEmailVerification(prisma, { token: TEST_TOKEN });
    assert.equal(result.status, 200);
    assert.equal(operations.length, 3);
    assert.equal(operations[0].args.data.status, "ACTIVE");
    assert.ok(operations[1].args.data.consumedAt instanceof Date);
  }));
