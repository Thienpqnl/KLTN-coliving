const assert = require("node:assert/strict");
const test = require("node:test");
const {
  approveUtilityBill,
  createUtilityBill,
  listUtilityBills,
  submitUtilityBillProof,
} = require("./utility-bills.cjs");

const host = { userId: "host-1", role: "HOST" };
const renter = { userId: "renter-1", role: "CUSTOMER" };
const admin = { userId: "admin-1", role: "ADMIN" };
const outsider = { userId: "other-1", role: "CUSTOMER" };
const contract = {
  id: "contract-1",
  hostId: host.userId,
  renterId: renter.userId,
  electricityRate: 3500,
  waterRate: 15000,
};

test("listUtilityBills requires authentication", async () => {
  const result = await listUtilityBills({}, null, contract.id);
  assert.equal(result.status, 401);
});

test("listUtilityBills returns 404 for an unknown contract", async () => {
  const prisma = { contract: { findUnique: async () => null } };
  const result = await listUtilityBills(prisma, host, contract.id);
  assert.equal(result.status, 404);
});

test("listUtilityBills rejects users outside the contract", async () => {
  const prisma = { contract: { findUnique: async () => contract } };
  const result = await listUtilityBills(prisma, outsider, contract.id);
  assert.equal(result.status, 403);
});

for (const [label, identity] of [["host", host], ["renter", renter], ["admin", admin]]) {
  test(`listUtilityBills lets ${label} view bills in descending period order`, async () => {
    let query;
    const bills = [{ id: "bill-2", month: 8, year: 2026 }];
    const prisma = {
      contract: { findUnique: async () => contract },
      utilityBill: {
        findMany: async (input) => {
          query = input;
          return bills;
        },
      },
    };
    const result = await listUtilityBills(prisma, identity, contract.id);
    assert.equal(result.status, 200);
    assert.deepEqual(result.payload, bills);
    assert.deepEqual(query.orderBy, [{ year: "desc" }, { month: "desc" }]);
  });
}

test("createUtilityBill requires authentication", async () => {
  const result = await createUtilityBill({}, null, contract.id, {});
  assert.equal(result.status, 401);
});

test("createUtilityBill validates the billing month", async () => {
  const result = await createUtilityBill({}, host, contract.id, { month: 13, year: 2026 });
  assert.equal(result.status, 400);
  assert.ok(result.payload.errors.month);
});

test("createUtilityBill validates the billing year", async () => {
  const result = await createUtilityBill({}, host, contract.id, { month: 8, year: 2019 });
  assert.equal(result.status, 400);
  assert.ok(result.payload.errors.year);
});

test("createUtilityBill returns 404 for an unknown contract", async () => {
  const prisma = { contract: { findUnique: async () => null } };
  const result = await createUtilityBill(prisma, host, contract.id, { month: 8, year: 2026 });
  assert.equal(result.status, 404);
});

test("createUtilityBill rejects a renter", async () => {
  const prisma = { contract: { findUnique: async () => contract } };
  const result = await createUtilityBill(prisma, renter, contract.id, { month: 8, year: 2026 });
  assert.equal(result.status, 403);
});

test("createUtilityBill calculates electricity, water and total costs", async () => {
  let data;
  const prisma = {
    contract: { findUnique: async () => contract },
    utilityBill: {
      create: async (input) => {
        data = input.data;
        return { id: "bill-1", ...input.data };
      },
    },
  };
  const result = await createUtilityBill(prisma, host, contract.id, {
    month: 8,
    year: 2026,
    electricityUsage: 100,
    waterUsage: 4,
  });
  assert.equal(result.status, 201);
  assert.equal(data.electricityCost, 350000);
  assert.equal(data.waterCost, 60000);
  assert.equal(data.totalCost, 410000);
  assert.equal(result.payload.notification.userId, renter.userId);
});

test("createUtilityBill lets an admin create a zero-usage bill", async () => {
  const prisma = {
    contract: { findUnique: async () => contract },
    utilityBill: { create: async ({ data }) => ({ id: "bill-1", ...data }) },
  };
  const result = await createUtilityBill(prisma, admin, contract.id, { month: 8, year: 2026 });
  assert.equal(result.status, 201);
  assert.equal(result.payload.bill.totalCost, 0);
});

test("submitUtilityBillProof requires authentication", async () => {
  const result = await submitUtilityBillProof({}, null, "bill-1", {});
  assert.equal(result.status, 401);
});

test("submitUtilityBillProof validates the proof URL", async () => {
  const result = await submitUtilityBillProof({}, renter, "bill-1", { paymentProofUrl: "not-a-url" });
  assert.equal(result.status, 400);
});

test("submitUtilityBillProof returns 404 for an unknown bill", async () => {
  const prisma = { utilityBill: { findUnique: async () => null } };
  const result = await submitUtilityBillProof(prisma, renter, "bill-1", {
    paymentProofUrl: "https://example.test/proof.png",
  });
  assert.equal(result.status, 404);
});

test("submitUtilityBillProof rejects a user who is not the renter", async () => {
  const prisma = { utilityBill: { findUnique: async () => ({ id: "bill-1", contract }) } };
  const result = await submitUtilityBillProof(prisma, outsider, "bill-1", {
    paymentProofUrl: "https://example.test/proof.png",
  });
  assert.equal(result.status, 403);
});

test("submitUtilityBillProof rejects an already paid bill", async () => {
  const prisma = { utilityBill: { findUnique: async () => ({ id: "bill-1", status: "PAID", contract }) } };
  const result = await submitUtilityBillProof(prisma, renter, "bill-1", {
    paymentProofUrl: "https://example.test/proof.png",
  });
  assert.equal(result.status, 409);
});

test("submitUtilityBillProof rejects duplicate proof", async () => {
  const prisma = {
    utilityBill: {
      findUnique: async () => ({ id: "bill-1", status: "UNPAID", paymentProofUrl: "https://old.test/proof.png", contract }),
    },
  };
  const result = await submitUtilityBillProof(prisma, renter, "bill-1", {
    paymentProofUrl: "https://example.test/proof.png",
  });
  assert.equal(result.status, 409);
});

test("submitUtilityBillProof stores the proof and notifies the host", async () => {
  let updateData;
  const bill = { id: "bill-1", month: 8, year: 2026, status: "UNPAID", paymentProofUrl: null, contractId: contract.id, contract };
  const prisma = {
    utilityBill: {
      findUnique: async () => bill,
      update: async ({ data }) => {
        updateData = data;
        return { ...bill, ...data };
      },
    },
  };
  const result = await submitUtilityBillProof(prisma, renter, bill.id, {
    paymentProofUrl: "https://example.test/proof.png",
  });
  assert.equal(result.status, 200);
  assert.equal(updateData.status, "PENDING");
  assert.ok(updateData.paymentProofSubmittedAt instanceof Date);
  assert.equal(result.payload.notification.userId, host.userId);
});

test("approveUtilityBill requires authentication", async () => {
  const result = await approveUtilityBill({}, null, "bill-1");
  assert.equal(result.status, 401);
});

test("approveUtilityBill returns 404 for an unknown bill", async () => {
  const prisma = { utilityBill: { findUnique: async () => null } };
  const result = await approveUtilityBill(prisma, host, "bill-1");
  assert.equal(result.status, 404);
});

test("approveUtilityBill rejects a user who is not the host", async () => {
  const prisma = { utilityBill: { findUnique: async () => ({ id: "bill-1", contract }) } };
  const result = await approveUtilityBill(prisma, outsider, "bill-1");
  assert.equal(result.status, 403);
});

test("approveUtilityBill requires a submitted proof", async () => {
  const prisma = { utilityBill: { findUnique: async () => ({ id: "bill-1", status: "UNPAID", paymentProofUrl: null, contract }) } };
  const result = await approveUtilityBill(prisma, host, "bill-1");
  assert.equal(result.status, 400);
});

test("approveUtilityBill rejects an already paid bill", async () => {
  const prisma = { utilityBill: { findUnique: async () => ({ id: "bill-1", status: "PAID", paymentProofUrl: "https://example.test/proof.png", contract }) } };
  const result = await approveUtilityBill(prisma, host, "bill-1");
  assert.equal(result.status, 409);
});

test("approveUtilityBill marks the bill paid and notifies the renter", async () => {
  let updateData;
  const bill = { id: "bill-1", month: 8, year: 2026, status: "PENDING", paymentProofUrl: "https://example.test/proof.png", contractId: contract.id, contract };
  const prisma = {
    utilityBill: {
      findUnique: async () => bill,
      update: async ({ data }) => {
        updateData = data;
        return { ...bill, ...data };
      },
    },
  };
  const result = await approveUtilityBill(prisma, host, bill.id);
  assert.equal(result.status, 200);
  assert.equal(updateData.status, "PAID");
  assert.ok(updateData.approvedAt instanceof Date);
  assert.equal(result.payload.notification.userId, renter.userId);
});
