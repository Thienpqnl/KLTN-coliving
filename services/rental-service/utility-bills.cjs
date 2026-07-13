const { z } = require("zod");
const { sanitizeForJson } = require("./serialization.cjs");

const createBillSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2020).max(2100),
  previousReading: z.number().optional(),
  currentReading: z.number().optional(),
  electricityUsage: z.number().optional(),
  waterUsage: z.number().optional(),
  notes: z.string().optional(),
});

const proofSchema = z.object({
  paymentProofUrl: z.string().url(),
});

function failure(status, message, errors) {
  return { status, payload: { message, ...(errors ? { errors } : {}) } };
}

function validate(schema, input) {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  const errors = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".") || "form";
    (errors[path] ||= []).push(issue.message);
  }
  return { ok: false, ...failure(400, "Validation failed", errors) };
}

function requireAuthenticated(identity) {
  return identity?.userId ? null : failure(401, "Unauthorized");
}

async function listUtilityBills(prisma, identity, contractId) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract) return failure(404, "Contract not found");
  if (contract.hostId !== identity.userId && contract.renterId !== identity.userId && identity.role !== "ADMIN") {
    return failure(403, "Unauthorized");
  }
  const bills = await prisma.utilityBill.findMany({
    where: { contractId },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });
  return { status: 200, payload: sanitizeForJson(bills) };
}

async function createUtilityBill(prisma, identity, contractId, input) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const parsed = validate(createBillSchema, input);
  if (!parsed.ok) return parsed;
  const data = parsed.data;
  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract) return failure(404, "Contract not found");
  if (contract.hostId !== identity.userId && identity.role !== "ADMIN") {
    return failure(403, "Only host can create utility bills");
  }
  const electricityUsage = data.electricityUsage || 0;
  const waterUsage = data.waterUsage || 0;
  const electricityCost = electricityUsage * (contract.electricityRate || 0);
  const waterCost = waterUsage * (contract.waterRate || 0);
  const totalCost = electricityCost + waterCost;
  const bill = await prisma.utilityBill.create({
    data: {
      contractId,
      month: data.month,
      year: data.year,
      previousReading: data.previousReading,
      currentReading: data.currentReading,
      electricityUsage,
      waterUsage,
      electricityCost,
      waterCost,
      totalCost,
      notes: data.notes,
    },
  });
  return {
    status: 201,
    payload: sanitizeForJson({
      bill,
      notification: {
        userId: contract.renterId,
        title: "Bạn có hóa đơn điện nước mới",
        body: `Hóa đơn điện nước tháng ${data.month}/${data.year} đã được tạo. Vui lòng kiểm tra và thanh toán.`,
        data: { billId: bill.id, contractId, type: "NEW_UTILITY_BILL" },
      },
    }),
  };
}

async function submitUtilityBillProof(prisma, identity, billId, input) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const parsed = validate(proofSchema, input);
  if (!parsed.ok) return parsed;
  const bill = await prisma.utilityBill.findUnique({
    where: { id: billId },
    include: { contract: true },
  });
  if (!bill) return failure(404, "Utility bill not found");
  if (bill.contract.renterId !== identity.userId) return failure(403, "Only renter can submit payment proof");
  if (bill.status === "PAID") return failure(409, "Hóa đơn này đã được xác nhận thanh toán, không thể gửi minh chứng mới");
  if (bill.paymentProofUrl) return failure(409, "Bạn đã gửi minh chứng cho hóa đơn này rồi");

  const updatedBill = await prisma.utilityBill.update({
    where: { id: billId },
    data: {
      paymentProofUrl: parsed.data.paymentProofUrl,
      paymentProofSubmittedAt: new Date(),
      status: "PENDING",
    },
  });
  return {
    status: 200,
    payload: sanitizeForJson({
      bill: updatedBill,
      notification: {
        userId: bill.contract.hostId,
        title: "Có minh chứng thanh toán điện nước mới",
        body: `Người thuê đã gửi minh chứng thanh toán cho hóa đơn ${bill.month}/${bill.year}. Vui lòng kiểm tra.`,
        data: { billId, contractId: bill.contractId, type: "UTILITY_BILL_PROOF_SUBMITTED" },
      },
    }),
  };
}

async function approveUtilityBill(prisma, identity, billId) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const bill = await prisma.utilityBill.findUnique({
    where: { id: billId },
    include: { contract: true },
  });
  if (!bill) return failure(404, "Utility bill not found");
  if (bill.contract.hostId !== identity.userId && identity.role !== "ADMIN") {
    return failure(403, "Only host can approve payment proof");
  }
  if (!bill.paymentProofUrl) return failure(400, "Chưa có minh chứng thanh toán để duyệt");
  if (bill.status === "PAID") return failure(409, "Hóa đơn này đã được xác nhận thanh toán trước đó");
  const updatedBill = await prisma.utilityBill.update({
    where: { id: billId },
    data: { status: "PAID", approvedAt: new Date() },
  });
  return {
    status: 200,
    payload: sanitizeForJson({
      bill: updatedBill,
      notification: {
        userId: bill.contract.renterId,
        title: "Minh chứng thanh toán đã được duyệt",
        body: `Hóa đơn ${bill.month}/${bill.year} đã được xác nhận thanh toán. Cảm ơn bạn đã hoàn tất minh chứng.`,
        data: { billId, contractId: bill.contractId, type: "UTILITY_BILL_APPROVED" },
      },
    }),
  };
}

module.exports = {
  approveUtilityBill,
  createUtilityBill,
  listUtilityBills,
  submitUtilityBillProof,
};
