const assert = require("node:assert/strict");
const test = require("node:test");
const jwt = require("jsonwebtoken");
const {
  hashOtp,
  requestPhoneOtp,
  verifyPhoneOtp,
} = require("./phone-otp.cjs");

function withIdentityEnvironment(run) {
  const previousSecret = process.env.JWT_SECRET;
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.JWT_SECRET = "phone-otp-test-secret";
  process.env.NODE_ENV = "test";

  return Promise.resolve()
    .then(run)
    .finally(() => {
      if (previousSecret === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = previousSecret;
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
    });
}

test("requestPhoneOtp stores only a hash and exposes the code only outside production", () =>
  withIdentityEnvironment(async () => {
    let createdData;
    const prisma = {
      phoneOtp: {
        create: async ({ data }) => {
          createdData = data;
        },
      },
    };
    const token = jwt.sign({ userId: "user-otp" }, process.env.JWT_SECRET);
    const result = await requestPhoneOtp(
      prisma,
      `Bearer ${token}`,
      { phone: "090 000 0000" },
      { code: "123456" },
    );

    assert.equal(result.status, 200);
    assert.equal(result.payload.devOtp, "123456");
    assert.equal(createdData.phone, "0900000000");
    assert.equal(createdData.codeHash, hashOtp("123456"));
    assert.notEqual(createdData.codeHash, "123456");
  }));

test("verifyPhoneOtp increments failed attempts and commits successful verification", () =>
  withIdentityEnvironment(async () => {
    const token = jwt.sign({ userId: "user-otp" }, process.env.JWT_SECRET);
    let failedAttemptUpdated = false;
    let transactionOperations;
    const prisma = {
      phoneOtp: {
        findFirst: async () => ({
          id: "otp-1",
          codeHash: hashOtp("123456"),
          attemptCount: 0,
        }),
        update: (args) => {
          if (args.data.attemptCount) failedAttemptUpdated = true;
          return Promise.resolve(args);
        },
      },
      user: {
        update: (args) => Promise.resolve(args),
      },
      $transaction: async (operations) => {
        transactionOperations = await Promise.all(operations);
      },
    };

    const wrong = await verifyPhoneOtp(prisma, `Bearer ${token}`, {
      phone: "0900000000",
      code: "000000",
    });
    assert.equal(wrong.status, 400);
    assert.equal(failedAttemptUpdated, true);

    const correct = await verifyPhoneOtp(prisma, `Bearer ${token}`, {
      phone: "0900000000",
      code: "123456",
    });
    assert.equal(correct.status, 200);
    assert.equal(correct.payload.phoneVerified, true);
    assert.equal(transactionOperations.length, 2);
    assert.equal(transactionOperations[1].where.id, "user-otp");
  }));
