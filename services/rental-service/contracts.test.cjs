const assert = require("node:assert/strict");
const test = require("node:test");
const {
  checkExpiredContracts,
  confirmDeposit,
  confirmHandover,
  contractStats,
  createContract,
  deleteContract,
  getActiveContractByRoom,
  getContract,
  listContracts,
  renewContract,
  signContract,
  terminateContract,
  updateContract,
} = require("./contracts.cjs");

const host = { userId: "host-1", role: "HOST" };
const renter = { userId: "renter-1", role: "CUSTOMER" };
const admin = { userId: "admin-1", role: "ADMIN" };
const outsider = { userId: "other-1", role: "HOST" };

function baseContract(overrides = {}) {
  return {
    id: "contract-1",
    contractNumber: "NH-2026-001",
    bookingId: "booking-1",
    roomId: "room-1",
    hostId: host.userId,
    renterId: renter.userId,
    status: "DRAFT",
    startDate: new Date("2026-08-01"),
    endDate: new Date("2027-08-01"),
    monthlyRent: 3000000,
    depositAmount: 3000000,
    paymentDueDay: 5,
    paymentMethod: "BANK_TRANSFER",
    electricityRate: 3500,
    waterRate: 15000,
    utilitiesNotes: null,
    noticeDays: 30,
    depositReturnDays: 7,
    houseRules: "Giữ vệ sinh chung",
    inventory: [],
    notes: null,
    contentSnapshot: {
      parties: {
        host: { id: host.userId, fullName: "Nguyễn Chủ Nhà", email: "host@example.test" },
        renter: { id: renter.userId, fullName: "Lê Người Thuê", email: "renter@example.test" },
      },
      room: {
        id: "room-1",
        title: "Phòng thử nghiệm",
        address: "Thành phố Hồ Chí Minh",
        areaSquareMeters: "25",
        areaText: "25 m2",
        city: "Hồ Chí Minh",
        district: "Thủ Đức",
        maxOccupants: 2,
      },
    },
    events: [],
    ...overrides,
  };
}

function transactionPrisma(tx) {
  return { ...tx, $transaction: async (operation) => operation(tx) };
}

const validSignature = { signatureName: "Nguyễn Chủ Nhà", citizenId: "012345678901" };

const unauthenticatedCases = [
  ["listContracts", (prisma) => listContracts(prisma, null, {})],
  ["getContract", (prisma) => getContract(prisma, null, "contract-1")],
  ["getActiveContractByRoom", (prisma) => getActiveContractByRoom(prisma, null, "room-1")],
  ["createContract", (prisma) => createContract(prisma, null, {})],
  ["updateContract", (prisma) => updateContract(prisma, null, "contract-1", {})],
  ["deleteContract", (prisma) => deleteContract(prisma, null, "contract-1", {})],
  ["signContract", (prisma) => signContract(prisma, null, "contract-1", {})],
  ["confirmDeposit", (prisma) => confirmDeposit(prisma, null, "contract-1", {})],
  ["confirmHandover", (prisma) => confirmHandover(prisma, null, "contract-1", {})],
  ["renewContract", (prisma) => renewContract(prisma, null, "contract-1", {})],
  ["terminateContract", (prisma) => terminateContract(prisma, null, "contract-1", {})],
];

for (const [name, invoke] of unauthenticatedCases) {
  test(`${name} requires authentication`, async () => {
    const result = await invoke({});
    assert.equal(result.status, 401);
  });
}

const forbiddenRoleCases = [
  ["createContract", () => createContract({}, renter, {})],
  ["updateContract", () => updateContract({}, renter, "contract-1", {})],
  ["deleteContract", () => deleteContract({}, renter, "contract-1", {})],
  ["signContract", () => signContract({}, admin, "contract-1", validSignature)],
  ["confirmDeposit", () => confirmDeposit({}, renter, "contract-1", {})],
  ["confirmHandover", () => confirmHandover({}, admin, "contract-1", {})],
  ["renewContract", () => renewContract({}, renter, "contract-1", {})],
  ["terminateContract", () => terminateContract({}, { userId: "manager-1", role: "COMMUNITY_MANAGER" }, "contract-1", { terminationReason: "Kết thúc hợp đồng" })],
];

for (const [name, invoke] of forbiddenRoleCases) {
  test(`${name} rejects an unsupported role`, async () => {
    const result = await invoke();
    assert.equal(result.status, 403);
  });
}

const validationCases = [
  ["createContract", () => createContract({}, host, {}), "bookingId"],
  ["updateContract", () => updateContract({}, host, "contract-1", { paymentDueDay: 29 }), "paymentDueDay"],
  ["signContract", () => signContract({}, host, "contract-1", { signatureName: "Nguyễn Chủ Nhà", citizenId: "123" }), "citizenId"],
  ["confirmDeposit", () => confirmDeposit({}, host, "contract-1", { reference: "x".repeat(201) }), "reference"],
  ["confirmHandover", () => confirmHandover({}, host, "contract-1", { note: "x".repeat(2001) }), "note"],
  ["renewContract", () => renewContract({}, host, "contract-1", { newEndDate: "invalid" }), "newEndDate"],
  ["terminateContract", () => terminateContract({}, host, "contract-1", { terminationReason: "no" }), "terminationReason"],
];

for (const [name, invoke, field] of validationCases) {
  test(`${name} validates ${field}`, async () => {
    const result = await invoke();
    assert.equal(result.status, 400);
    assert.ok(result.payload.errors[field]);
  });
}

test("listContracts scopes customers to their own contracts", async () => {
  let where;
  const prisma = {
    contract: {
      findMany: async (query) => { where = query.where; return []; },
      count: async () => 0,
    },
  };
  const result = await listContracts(prisma, renter, {});
  assert.equal(result.status, 200);
  assert.equal(where.renterId, renter.userId);
});

test("listContracts scopes hosts to their own contracts", async () => {
  let where;
  const prisma = {
    contract: {
      findMany: async (query) => { where = query.where; return []; },
      count: async () => 0,
    },
  };
  await listContracts(prisma, host, {});
  assert.equal(where.hostId, host.userId);
});

test("listContracts applies valid status and bounded pagination", async () => {
  let query;
  const prisma = {
    contract: {
      findMany: async (input) => { query = input; return []; },
      count: async () => 205,
    },
  };
  const result = await listContracts(prisma, admin, { status: "ACTIVE", page: 2, limit: 500, roomId: "room-1" });
  assert.equal(result.status, 200);
  assert.equal(query.where.status, "ACTIVE");
  assert.equal(query.where.roomId, "room-1");
  assert.equal(query.skip, 100);
  assert.equal(query.take, 100);
  assert.equal(result.payload.pages, 3);
});

test("getContract returns 404 for an unknown contract", async () => {
  const prisma = { contract: { findUnique: async () => null } };
  assert.equal((await getContract(prisma, host, "missing")).status, 404);
});

test("getContract rejects a user outside the contract", async () => {
  const prisma = { contract: { findUnique: async () => baseContract() } };
  assert.equal((await getContract(prisma, outsider, "contract-1")).status, 403);
});

test("getContract returns the decorated contract to its host", async () => {
  const prisma = { contract: { findUnique: async () => baseContract() } };
  const clients = { userMap: async () => new Map() };
  const result = await getContract(prisma, host, "contract-1", clients);
  assert.equal(result.status, 200);
  assert.equal(result.payload.room.id, "room-1");
  assert.equal(result.payload.host.fullName, "Nguyễn Chủ Nhà");
});

test("getActiveContractByRoom queries both host and renter access", async () => {
  let where;
  const prisma = { contract: { findFirst: async (query) => { where = query.where; return null; } } };
  const result = await getActiveContractByRoom(prisma, renter, "room-1");
  assert.equal(result.status, 200);
  assert.equal(where.status, "ACTIVE");
  assert.deepEqual(where.OR, [{ hostId: renter.userId }, { renterId: renter.userId }]);
});

test("createContract returns 404 when the booking does not exist", async () => {
  const prisma = { booking: { findUnique: async () => null } };
  const result = await createContract(prisma, host, { bookingId: "missing", depositAmount: 0 });
  assert.equal(result.status, 404);
});

test("createContract rejects a booking whose room has no host", async () => {
  const prisma = {
    booking: { findUnique: async () => ({ userId: renter.userId, roomId: "room-1" }) },
    rentalRoomSnapshot: { findUnique: async () => null },
  };
  const result = await createContract(prisma, host, { bookingId: "booking-1", depositAmount: 0 });
  assert.equal(result.status, 400);
});

test("updateContract returns 404 for an unknown contract", async () => {
  const prisma = { contract: { findUnique: async () => null } };
  assert.equal((await updateContract(prisma, host, "missing", {})).status, 404);
});

test("updateContract only edits a draft", async () => {
  const prisma = { contract: { findUnique: async () => baseContract({ status: "ACTIVE" }) } };
  assert.equal((await updateContract(prisma, host, "contract-1", {})).status, 400);
});

test("updateContract rejects another host", async () => {
  const prisma = { contract: { findUnique: async () => baseContract() } };
  assert.equal((await updateContract(prisma, outsider, "contract-1", {})).status, 403);
});

test("updateContract rejects an end date before the start date", async () => {
  const prisma = { contract: { findUnique: async () => baseContract() } };
  const result = await updateContract(prisma, host, "contract-1", { endDate: new Date("2026-07-01") });
  assert.equal(result.status, 400);
});

test("deleteContract returns 404 for an unknown contract", async () => {
  const prisma = { contract: { findUnique: async () => null } };
  assert.equal((await deleteContract(prisma, host, "missing", {})).status, 404);
});

test("deleteContract only deletes a draft", async () => {
  const prisma = { contract: { findUnique: async () => baseContract({ status: "ACTIVE" }) } };
  assert.equal((await deleteContract(prisma, host, "contract-1", {})).status, 400);
});

test("deleteContract rejects another host", async () => {
  const prisma = { contract: { findUnique: async () => baseContract() } };
  assert.equal((await deleteContract(prisma, outsider, "contract-1", {})).status, 403);
});

test("deleteContract deletes the host's draft", async () => {
  let deletedId;
  const prisma = {
    contract: {
      findUnique: async () => baseContract(),
      delete: async ({ where }) => { deletedId = where.id; },
    },
  };
  const result = await deleteContract(prisma, host, "contract-1", {});
  assert.equal(result.status, 200);
  assert.equal(deletedId, "contract-1");
});

function signPrisma(contract) {
  const tx = {
    contract: {
      findUnique: async () => contract,
      update: async ({ data }) => ({ ...contract, ...data }),
    },
    contractEvent: { create: async ({ data }) => data },
  };
  return transactionPrisma(tx);
}

test("signContract returns 404 for an unknown contract", async () => {
  const prisma = transactionPrisma({ contract: { findUnique: async () => null } });
  assert.equal((await signContract(prisma, host, "missing", validSignature)).status, 404);
});

test("signContract rejects a host when the contract is not awaiting host signature", async () => {
  const result = await signContract(signPrisma(baseContract({ status: "ACTIVE" })), host, "contract-1", validSignature);
  assert.equal(result.status, 400);
});

test("signContract requires the host's account name", async () => {
  const result = await signContract(signPrisma(baseContract()), host, "contract-1", { ...validSignature, signatureName: "Tên khác" });
  assert.equal(result.status, 400);
});

test("signContract records the host signature and advances status", async () => {
  const result = await signContract(signPrisma(baseContract()), host, "contract-1", validSignature);
  assert.equal(result.status, 200);
  assert.equal(result.payload.status, "PENDING_RENTER_SIGNATURE");
  assert.ok(result.payload.hostSignedAt);
});

test("signContract rejects a renter before the host signs", async () => {
  const result = await signContract(signPrisma(baseContract({ status: "PENDING_RENTER_SIGNATURE", hostSignedAt: null })), renter, "contract-1", {
    signatureName: "Lê Người Thuê", citizenId: "012345678902",
  });
  assert.equal(result.status, 400);
});

test("signContract requires the renter's account name", async () => {
  const result = await signContract(signPrisma(baseContract({ status: "PENDING_RENTER_SIGNATURE", hostSignedAt: new Date() })), renter, "contract-1", {
    signatureName: "Tên khác", citizenId: "012345678902",
  });
  assert.equal(result.status, 400);
});

test("signContract sends a zero-deposit contract to handover", async () => {
  const result = await signContract(signPrisma(baseContract({ status: "PENDING_RENTER_SIGNATURE", hostSignedAt: new Date(), depositAmount: 0 })), renter, "contract-1", {
    signatureName: "Lê Người Thuê", citizenId: "012345678902",
  });
  assert.equal(result.status, 200);
  assert.equal(result.payload.status, "PENDING_HANDOVER");
});

test("signContract sends a deposit contract to deposit confirmation", async () => {
  const result = await signContract(signPrisma(baseContract({ status: "PENDING_RENTER_SIGNATURE", hostSignedAt: new Date(), depositAmount: 3000000 })), renter, "contract-1", {
    signatureName: "Lê Người Thuê", citizenId: "012345678902",
  });
  assert.equal(result.status, 200);
  assert.equal(result.payload.status, "PENDING_DEPOSIT");
});

test("signContract rejects a user who is not a contract party", async () => {
  const result = await signContract(signPrisma(baseContract()), { userId: "host-2", role: "HOST" }, "contract-1", validSignature);
  assert.equal(result.status, 403);
});

function depositPrisma(contract) {
  const tx = {
    contract: {
      findUnique: async () => contract,
      update: async ({ data }) => ({ ...contract, ...data }),
    },
    contractEvent: { create: async ({ data }) => data },
  };
  return transactionPrisma(tx);
}

test("confirmDeposit returns 404 for an unknown contract", async () => {
  const prisma = transactionPrisma({ contract: { findUnique: async () => null } });
  assert.equal((await confirmDeposit(prisma, host, "missing", {})).status, 404);
});

test("confirmDeposit rejects another host", async () => {
  const result = await confirmDeposit(depositPrisma(baseContract({ status: "PENDING_DEPOSIT" })), outsider, "contract-1", {});
  assert.equal(result.status, 403);
});

test("confirmDeposit requires the pending-deposit status", async () => {
  const result = await confirmDeposit(depositPrisma(baseContract({ status: "ACTIVE" })), host, "contract-1", {});
  assert.equal(result.status, 400);
});

test("confirmDeposit marks the deposit paid and advances to handover", async () => {
  const result = await confirmDeposit(depositPrisma(baseContract({ status: "PENDING_DEPOSIT" })), host, "contract-1", { reference: "BANK-001" });
  assert.equal(result.status, 200);
  assert.equal(result.payload.status, "PENDING_HANDOVER");
  assert.equal(result.payload.depositStatus, "PAID");
  assert.equal(result.payload.depositReference, "BANK-001");
});

function handoverPrisma(contract) {
  const tx = {
    contract: {
      findUnique: async () => contract,
      update: async ({ data }) => ({ ...contract, ...data }),
    },
    contractEvent: { create: async ({ data }) => data },
  };
  return transactionPrisma(tx);
}

test("confirmHandover returns 404 for an unknown contract", async () => {
  const prisma = transactionPrisma({ contract: { findUnique: async () => null } });
  assert.equal((await confirmHandover(prisma, host, "missing", {})).status, 404);
});

test("confirmHandover requires pending handover status", async () => {
  const result = await confirmHandover(handoverPrisma(baseContract({ status: "ACTIVE" })), host, "contract-1", {});
  assert.equal(result.status, 400);
});

test("confirmHandover rejects a user outside the contract", async () => {
  const result = await confirmHandover(handoverPrisma(baseContract({ status: "PENDING_HANDOVER" })), { userId: "other-1", role: "HOST" }, "contract-1", {});
  assert.equal(result.status, 403);
});

test("confirmHandover rejects duplicate host confirmation", async () => {
  const result = await confirmHandover(handoverPrisma(baseContract({ status: "PENDING_HANDOVER", hostHandoverConfirmedAt: new Date() })), host, "contract-1", {});
  assert.equal(result.status, 400);
});

test("confirmHandover rejects duplicate renter confirmation", async () => {
  const result = await confirmHandover(handoverPrisma(baseContract({ status: "PENDING_HANDOVER", renterHandoverConfirmedAt: new Date() })), renter, "contract-1", {});
  assert.equal(result.status, 400);
});

test("confirmHandover records the first party confirmation without activating", async () => {
  const result = await confirmHandover(handoverPrisma(baseContract({ status: "PENDING_HANDOVER", hostHandoverConfirmedAt: null, renterHandoverConfirmedAt: null })), host, "contract-1", { note: "Đã giao chìa khóa" });
  assert.equal(result.status, 200);
  assert.equal(result.payload.status, "PENDING_HANDOVER");
  assert.ok(result.payload.hostHandoverConfirmedAt);
});

test("renewContract returns 404 for an unknown contract", async () => {
  const prisma = { contract: { findUnique: async () => null } };
  assert.equal((await renewContract(prisma, host, "missing", { newEndDate: new Date("2028-01-01") })).status, 404);
});

test("renewContract only renews an active contract", async () => {
  const prisma = { contract: { findUnique: async () => baseContract({ status: "DRAFT" }) } };
  assert.equal((await renewContract(prisma, host, "contract-1", { newEndDate: new Date("2028-01-01") })).status, 400);
});

test("renewContract rejects another host", async () => {
  const prisma = { contract: { findUnique: async () => baseContract({ status: "ACTIVE" }) } };
  assert.equal((await renewContract(prisma, outsider, "contract-1", { newEndDate: new Date("2028-01-01") })).status, 403);
});

test("renewContract requires a later end date", async () => {
  const prisma = { contract: { findUnique: async () => baseContract({ status: "ACTIVE" }) } };
  assert.equal((await renewContract(prisma, host, "contract-1", { newEndDate: new Date("2027-01-01") })).status, 400);
});

test("renewContract updates the end date and monthly rent", async () => {
  const current = baseContract({ status: "ACTIVE" });
  const tx = {
    contract: {
      findUnique: async () => current,
      update: async ({ data }) => ({ ...current, endDate: data.endDate, monthlyRent: data.monthlyRent }),
    },
    contractEvent: { create: async ({ data }) => data },
  };
  const prisma = transactionPrisma(tx);
  const result = await renewContract(prisma, host, "contract-1", { newEndDate: new Date("2028-01-01"), newMonthlyRent: 3200000 });
  assert.equal(result.status, 200);
  assert.equal(result.payload.monthlyRent, 3200000);
  assert.equal(new Date(result.payload.endDate).getUTCFullYear(), 2028);
});

test("terminateContract returns 404 for an unknown contract", async () => {
  const prisma = { contract: { findUnique: async () => null } };
  assert.equal((await terminateContract(prisma, host, "missing", { terminationReason: "Kết thúc hợp đồng" })).status, 404);
});

test("terminateContract rejects a user outside the contract", async () => {
  const prisma = { contract: { findUnique: async () => baseContract({ status: "ACTIVE" }) } };
  assert.equal((await terminateContract(prisma, outsider, "contract-1", { terminationReason: "Kết thúc hợp đồng" })).status, 403);
});

test("terminateContract only terminates an active contract", async () => {
  const prisma = { contract: { findUnique: async () => baseContract({ status: "DRAFT" }) } };
  assert.equal((await terminateContract(prisma, host, "contract-1", { terminationReason: "Kết thúc hợp đồng" })).status, 400);
});

test("terminateContract deactivates occupancy and publishes the new projection", async () => {
  const current = baseContract({ status: "ACTIVE" });
  let occupancyData;
  let outboxData;
  const tx = {
    contract: {
      findUnique: async () => current,
      update: async ({ data }) => ({ ...current, ...data }),
    },
    occupancy: {
      updateMany: async ({ data }) => { occupancyData = data; return { count: 1 }; },
      count: async () => 0,
    },
    rentalRoomSnapshot: {
      findUnique: async () => ({ status: "OCCUPIED", maxOccupants: 2 }),
      update: async ({ data }) => ({ roomId: "room-1", ...data }),
    },
    rentalOutboxEvent: { create: async ({ data }) => { outboxData = data; return data; } },
    contractEvent: { create: async ({ data }) => data },
  };
  const result = await terminateContract(transactionPrisma(tx), renter, "contract-1", { terminationReason: "Chuyển sang nơi ở mới" });
  assert.equal(result.status, 200);
  assert.equal(result.payload.status, "TERMINATED");
  assert.equal(occupancyData.status, "INACTIVE");
  assert.equal(outboxData.eventType, "rental.occupancy.changed");
});

test("checkExpiredContracts rejects an invalid cron secret", async () => {
  const previous = process.env.CRON_SECRET;
  process.env.CRON_SECRET = "cron-secret";
  try {
    const result = await checkExpiredContracts({}, "Bearer wrong");
    assert.equal(result.status, 401);
  } finally {
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  }
});

test("checkExpiredContracts expires active contracts past their end date", async () => {
  let query;
  const previous = process.env.CRON_SECRET;
  delete process.env.CRON_SECRET;
  try {
    const prisma = { contract: { updateMany: async (input) => { query = input; return { count: 3 }; } } };
    const result = await checkExpiredContracts(prisma);
    assert.equal(result.status, 200);
    assert.equal(result.payload.updatedCount, 3);
    assert.equal(query.where.status, "ACTIVE");
    assert.equal(query.data.status, "EXPIRED");
  } finally {
    if (previous !== undefined) process.env.CRON_SECRET = previous;
  }
});

test("contractStats aggregates counts by status", async () => {
  const prisma = {
    contract: {
      groupBy: async () => [
        { status: "ACTIVE", _count: { _all: 3 } },
        { status: "DRAFT", _count: { _all: 2 } },
      ],
    },
  };
  const result = await contractStats(prisma, {});
  assert.equal(result.status, 200);
  assert.equal(result.payload.stats.total, 5);
  assert.deepEqual(result.payload.stats.byStatus, { ACTIVE: 3, DRAFT: 2 });
});

test("contractStats scopes statistics to a room", async () => {
  let where;
  const prisma = { contract: { groupBy: async (query) => { where = query.where; return []; } } };
  await contractStats(prisma, { roomId: "room-1" });
  assert.deepEqual(where, { roomId: "room-1" });
});
