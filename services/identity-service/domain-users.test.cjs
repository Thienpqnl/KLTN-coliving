const assert = require("node:assert/strict");
const test = require("node:test");
const { getDomainUsers, searchDomainUsers } = require("./domain-users.cjs");

test("getDomainUsers preserves requested order and exposes only domain profile fields", async () => {
  let args;
  const prisma = {
    user: {
      findMany: async (input) => {
        args = input;
        return [
          { id: "user-1", email: "one@example.com" },
          { id: "user-2", email: "two@example.com" },
        ];
      },
    },
  };

  const users = await getDomainUsers(prisma, ["user-2", "user-1", "user-2"]);

  assert.deepEqual(users.map((user) => user.id), ["user-2", "user-1"]);
  assert.deepEqual(args.where.id.in, ["user-2", "user-1"]);
  assert.equal(args.select.password, undefined);
});

test("searchDomainUsers applies role, status and text filters", async () => {
  let args;
  const prisma = { user: { findMany: async (input) => { args = input; return []; } } };

  await searchDomainUsers(prisma, {
    search: "lan",
    role: "COMMUNITY_MANAGER",
    status: "ACTIVE",
  });

  assert.equal(args.where.role, "COMMUNITY_MANAGER");
  assert.equal(args.where.status, "ACTIVE");
  assert.equal(args.where.OR.length, 4);
  assert.equal(args.take, 500);
});
