const { createHash, randomUUID } = require("node:crypto");
const { z } = require("zod");
const { getRoomCapacity, syncRoomOccupancy } = require("./capacity.cjs");
const { sanitizeForJson } = require("./serialization.cjs");

const TERMS_VERSION = "VN-HOUSING-2023-v1";
const contractStatuses = new Set([
  "DRAFT",
  "PENDING_HOST_SIGNATURE",
  "PENDING_RENTER_SIGNATURE",
  "PENDING_DEPOSIT",
  "PENDING_HANDOVER",
  "ACTIVE",
  "EXPIRED",
  "TERMINATED",
  "CANCELLED",
  "DISPUTED",
]);

const contractInclude = {
  room: {
    select: {
      id: true,
      title: true,
      address: true,
      areaText: true,
      areaValue: true,
      priceValue: true,
      city: true,
      district: true,
      currentOccupants: true,
      maxOccupants: true,
      ownerId: true,
    },
  },
  renter: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      avatarUrl: true,
      gender: true,
      birthDate: true,
      address: true,
    },
  },
  host: {
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      address: true,
    },
  },
  booking: {
    select: {
      id: true,
      status: true,
      startDate: true,
      endDate: true,
    },
  },
};

const contractDetailInclude = {
  ...contractInclude,
  events: {
    include: { actor: { select: { id: true, fullName: true, role: true } } },
    orderBy: { createdAt: "asc" },
  },
};

const inventoryItem = z.object({
  name: z.string().min(1),
  quantity: z.number().int().min(1),
  condition: z.string().optional(),
});

const createContractSchema = z.object({
  bookingId: z.string().min(1),
  endDate: z.coerce.date().optional(),
  monthlyRent: z.number().min(0).optional(),
  depositAmount: z.number().min(0),
  paymentDueDay: z.number().int().min(1).max(28).default(5),
  paymentMethod: z.string().max(100).optional(),
  electricityRate: z.number().min(0).optional(),
  waterRate: z.number().min(0).optional(),
  utilitiesNotes: z.string().max(1000).optional(),
  noticeDays: z.number().int().min(0).max(180).default(30),
  depositReturnDays: z.number().int().min(0).max(60).default(7),
  houseRules: z.string().max(5000).optional(),
  inventory: z.array(inventoryItem).optional(),
  notes: z.string().max(5000).optional(),
});

const updateContractSchema = z.object({
  endDate: z.coerce.date().optional(),
  monthlyRent: z.number().min(0).optional(),
  depositAmount: z.number().min(0).optional(),
  paymentDueDay: z.number().int().min(1).max(28).optional(),
  paymentMethod: z.string().max(100).nullable().optional(),
  electricityRate: z.number().min(0).nullable().optional(),
  waterRate: z.number().min(0).nullable().optional(),
  utilitiesNotes: z.string().max(1000).nullable().optional(),
  noticeDays: z.number().int().min(0).max(180).optional(),
  depositReturnDays: z.number().int().min(0).max(60).optional(),
  houseRules: z.string().max(5000).nullable().optional(),
  inventory: z.array(inventoryItem).optional(),
  notes: z.string().max(5000).nullable().optional(),
});

const signSchema = z.object({
  signatureName: z.string().trim().min(2),
  citizenId: z.string().regex(/^\d{12}$/),
});

const depositSchema = z.object({
  reference: z.string().trim().max(200).optional(),
  note: z.string().trim().max(1000).optional(),
});

const handoverSchema = z.object({
  note: z.string().trim().max(2000).optional(),
});

const renewSchema = z.object({
  newEndDate: z.coerce.date(),
  newMonthlyRent: z.number().min(0).optional(),
});

const terminateSchema = z.object({
  terminationReason: z.string().min(5),
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

function context(identity, body = {}) {
  return {
    actorId: identity.userId,
    role: identity.role,
    ipAddress: body.ipAddress,
    userAgent: body.userAgent,
  };
}

function buildSnapshot(source) {
  return {
    legalBasis: [
      "Bộ luật Dân sự 2015",
      "Luật Nhà ở 2023 số 27/2023/QH15",
      "Luật Cư trú 2020",
      "Luật Giao dịch điện tử 2023",
    ],
    termsVersion: TERMS_VERSION,
    contractNumber: source.contractNumber,
    parties: {
      host: {
        id: source.host.id,
        fullName: source.host.fullName,
        email: source.host.email,
        phone: source.host.phone,
        address: source.host.address,
      },
      renter: {
        id: source.renter.id,
        fullName: source.renter.fullName,
        email: source.renter.email,
        phone: source.renter.phone,
        address: source.renter.address,
      },
    },
    room: {
      id: source.room.id,
      title: source.room.title,
      address: source.room.address,
      areaSquareMeters: source.room.areaValue?.toString() ?? source.room.areaText ?? null,
      areaText: source.room.areaText,
      city: source.room.city,
      district: source.room.district,
      maxOccupants: source.room.maxOccupants,
      purpose: "Thuê để ở",
    },
    financialTerms: {
      monthlyRent: source.monthlyRent,
      depositAmount: source.depositAmount,
      paymentDueDay: source.paymentDueDay,
      paymentMethod: source.paymentMethod,
      depositReturnDays: source.depositReturnDays,
    },
    utilities: {
      electricityRate: source.electricityRate,
      waterRate: source.waterRate,
      notes: source.utilitiesNotes,
    },
    duration: {
      startDate: source.startDate.toISOString(),
      endDate: source.endDate.toISOString(),
      noticeDays: source.noticeDays,
    },
    houseRules: source.houseRules,
    inventory: source.inventory == null ? null : JSON.parse(JSON.stringify(source.inventory)),
    additionalNotes: source.notes,
    commitments: [
      "Các bên cam kết thông tin cung cấp là đúng sự thật và tự nguyện ký kết.",
      "Phòng được sử dụng đúng mục đích ở và tuân thủ quy định về cư trú, an ninh, phòng cháy chữa cháy.",
      "Mọi sửa đổi sau khi ký phải được hai bên chấp thuận và lưu thành phụ lục hoặc sự kiện hợp đồng.",
    ],
  };
}

function snapshotHash(snapshot) {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

function normalizedName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("vi-VN");
}

function signatureNameError(expected, actual) {
  return normalizedName(expected) === normalizedName(actual)
    ? null
    : failure(400, "Họ tên xác nhận phải trùng với họ tên tài khoản");
}

function canAccessContract(identity, contract) {
  return identity.role === "ADMIN" || contract.hostId === identity.userId || contract.renterId === identity.userId;
}

async function listContracts(prisma, identity, query) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const status = contractStatuses.has(String(query.status)) ? String(query.status) : undefined;
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit || 10)));
  const where = {
    ...(status ? { status } : {}),
    ...(query.roomId ? { roomId: String(query.roomId) } : {}),
    ...(identity.role === "CUSTOMER"
      ? { renterId: identity.userId }
      : query.renterId
        ? { renterId: String(query.renterId) }
        : {}),
    ...(identity.role === "HOST" ? { hostId: identity.userId } : {}),
  };
  const [contracts, total] = await Promise.all([
    prisma.contract.findMany({
      where,
      include: contractInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contract.count({ where }),
  ]);
  return { status: 200, payload: sanitizeForJson({ contracts, total, page, limit, pages: Math.ceil(total / limit) }) };
}

async function getContract(prisma, identity, contractId) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const contract = await prisma.contract.findUnique({ where: { id: contractId }, include: contractDetailInclude });
  if (!contract) return failure(404, "Không tìm thấy hợp đồng");
  if (!canAccessContract(identity, contract)) return failure(403, "Không được phép truy cập hợp đồng này");
  return { status: 200, payload: sanitizeForJson(contract) };
}

async function createContract(prisma, identity, input) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  if (identity.role !== "HOST" && identity.role !== "ADMIN") return failure(403, "Bạn không có quyền tạo hợp đồng");
  const parsed = validate(createContractSchema, input);
  if (!parsed.ok) return parsed;
  const data = parsed.data;

  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: data.bookingId },
      include: {
        contract: { select: { id: true } },
        room: { select: { id: true, ownerId: true, priceValue: true } },
      },
    });
    if (!booking) return failure(404, "Không tìm thấy booking");
    if (booking.status !== "CONFIRMED") return failure(400, "Chỉ có thể tạo hợp đồng từ booking đã xác nhận");
    if (booking.contract) return failure(400, "Booking này đã có hợp đồng");
    if (!booking.room.ownerId) return failure(400, "Phòng chưa có chủ nhà");
    if (identity.role === "HOST" && booking.room.ownerId !== identity.userId) {
      return failure(403, "Bạn không có quyền tạo hợp đồng cho booking này");
    }

    const startDate = booking.startDate;
    const endDate = data.endDate || booking.endDate;
    if (startDate >= endDate) return failure(400, "Ngày kết thúc phải sau ngày bắt đầu");

    const [room, host, renter] = await Promise.all([
      tx.room.findUnique({
        where: { id: booking.roomId },
        select: { id: true, title: true, address: true, areaText: true, areaValue: true, city: true, district: true, maxOccupants: true, ownerId: true },
      }),
      tx.user.findUnique({ where: { id: booking.room.ownerId }, select: { id: true, fullName: true, email: true, phone: true, address: true } }),
      tx.user.findUnique({ where: { id: booking.userId }, select: { id: true, fullName: true, email: true, phone: true, address: true } }),
    ]);
    if (!room) return failure(404, "Không tìm thấy phòng");
    if (!host || room.ownerId !== host.id) return failure(403, "Chủ nhà không sở hữu phòng này");
    if (!renter) return failure(404, "Không tìm thấy người thuê");

    const id = randomUUID();
    const contractNumber = `HD-${new Date().getFullYear()}-${id.slice(0, 8).toUpperCase()}`;
    const monthlyRent = data.monthlyRent ?? Number(booking.room.priceValue ?? 0);
    const snapshot = buildSnapshot({
      ...data,
      contractNumber,
      startDate,
      endDate,
      monthlyRent,
      paymentMethod: data.paymentMethod ?? null,
      electricityRate: data.electricityRate ?? null,
      waterRate: data.waterRate ?? null,
      utilitiesNotes: data.utilitiesNotes ?? null,
      houseRules: data.houseRules ?? null,
      inventory: data.inventory ?? null,
      notes: data.notes ?? null,
      host,
      renter,
      room,
    });

    const contract = await tx.contract.create({
      data: {
        id,
        contractNumber,
        bookingId: booking.id,
        roomId: booking.roomId,
        renterId: booking.userId,
        hostId: booking.room.ownerId,
        startDate,
        endDate,
        monthlyRent,
        depositAmount: data.depositAmount,
        depositStatus: data.depositAmount > 0 ? "PENDING" : "NOT_REQUIRED",
        paymentDueDay: data.paymentDueDay,
        paymentMethod: data.paymentMethod,
        electricityRate: data.electricityRate,
        waterRate: data.waterRate,
        utilitiesNotes: data.utilitiesNotes,
        noticeDays: data.noticeDays,
        depositReturnDays: data.depositReturnDays,
        houseRules: data.houseRules,
        inventory: data.inventory,
        contentSnapshot: snapshot,
        contentHash: snapshotHash(snapshot),
        termsVersion: TERMS_VERSION,
        notes: data.notes,
        status: "DRAFT",
      },
      include: contractInclude,
    });
    await tx.contractEvent.create({
      data: {
        contractId: id,
        actorId: identity.userId,
        type: "CONTRACT_CREATED",
        toStatus: "DRAFT",
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
    return { status: 201, payload: sanitizeForJson(contract) };
  });
}

async function updateContract(prisma, identity, contractId, input) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  if (identity.role !== "HOST" && identity.role !== "ADMIN") return failure(403, "Bạn không có quyền cập nhật hợp đồng");
  const parsed = validate(updateContractSchema, input);
  if (!parsed.ok) return parsed;
  const current = await prisma.contract.findUnique({ where: { id: contractId }, include: contractDetailInclude });
  if (!current) return failure(404, "Không tìm thấy hợp đồng");
  if (current.status !== "DRAFT") return failure(400, "Chỉ được chỉnh sửa hợp đồng khi còn là bản nháp");
  if (identity.role !== "ADMIN" && current.hostId !== identity.userId) return failure(403, "Bạn không có quyền chỉnh sửa hợp đồng này");

  const data = parsed.data;
  const merged = {
    ...current,
    ...data,
    endDate: data.endDate ?? current.endDate,
    monthlyRent: data.monthlyRent ?? current.monthlyRent,
    depositAmount: data.depositAmount ?? current.depositAmount,
    paymentDueDay: data.paymentDueDay ?? current.paymentDueDay,
    noticeDays: data.noticeDays ?? current.noticeDays,
    depositReturnDays: data.depositReturnDays ?? current.depositReturnDays,
    inventory: data.inventory ?? current.inventory,
    host: current.host,
    renter: current.renter,
    room: current.room,
  };
  if (merged.startDate >= merged.endDate) return failure(400, "Ngày kết thúc phải sau ngày bắt đầu");
  const snapshot = buildSnapshot(merged);

  const updated = await prisma.$transaction(async (tx) => {
    const contract = await tx.contract.update({
      where: { id: contractId },
      data: {
        ...data,
        contentSnapshot: snapshot,
        contentHash: snapshotHash(snapshot),
        depositStatus: merged.depositAmount > 0 ? "PENDING" : "NOT_REQUIRED",
      },
      include: contractInclude,
    });
    await tx.contractEvent.create({
      data: {
        contractId,
        actorId: identity.userId,
        type: "DRAFT_UPDATED",
        fromStatus: "DRAFT",
        toStatus: "DRAFT",
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
    return contract;
  });
  return { status: 200, payload: sanitizeForJson(updated) };
}

async function deleteContract(prisma, identity, contractId, input) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  if (identity.role !== "HOST" && identity.role !== "ADMIN") return failure(403, "Bạn không có quyền xóa hợp đồng");
  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract) return failure(404, "Không tìm thấy hợp đồng");
  if (contract.status !== "DRAFT") return failure(400, "Chỉ được xóa hợp đồng còn là bản nháp");
  if (identity.role !== "ADMIN" && contract.hostId !== identity.userId) return failure(403, "Bạn không có quyền xóa hợp đồng này");
  await prisma.contract.delete({ where: { id: contractId } });
  return { status: 200, payload: { message: "Đã xóa bản nháp hợp đồng" } };
}

async function signContract(prisma, identity, contractId, input) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  if (identity.role !== "HOST" && identity.role !== "CUSTOMER") return failure(403, "Tài khoản này không phải bên ký hợp đồng");
  const parsed = validate(signSchema, input);
  if (!parsed.ok) return parsed;
  const data = parsed.data;

  return prisma.$transaction(async (tx) => {
    const contract = await tx.contract.findUnique({
      where: { id: contractId },
      include: { host: { select: { fullName: true } }, renter: { select: { fullName: true } } },
    });
    if (!contract) return failure(404, "Không tìm thấy hợp đồng");
    const now = new Date();
    const fromStatus = contract.status;
    let toStatus;
    let update;
    let type;

    if (identity.userId === contract.hostId && identity.role === "HOST") {
      if (contract.status !== "DRAFT" && contract.status !== "PENDING_HOST_SIGNATURE") {
        return failure(400, "Hợp đồng hiện không chờ chữ ký của chủ nhà");
      }
      const nameError = signatureNameError(contract.host.fullName, data.signatureName);
      if (nameError) return nameError;
      toStatus = "PENDING_RENTER_SIGNATURE";
      type = "HOST_SIGNED";
      update = {
        status: toStatus,
        hostSignedAt: now,
        hostSignatureName: data.signatureName.trim(),
        hostSignatureIp: input.ipAddress,
        hostSignatureUserAgent: input.userAgent,
      };
    } else if (identity.userId === contract.renterId && identity.role === "CUSTOMER") {
      if (contract.status !== "PENDING_RENTER_SIGNATURE" || !contract.hostSignedAt) {
        return failure(400, "Hợp đồng chưa sẵn sàng để người thuê ký");
      }
      const nameError = signatureNameError(contract.renter.fullName, data.signatureName);
      if (nameError) return nameError;
      toStatus = contract.depositAmount > 0 ? "PENDING_DEPOSIT" : "PENDING_HANDOVER";
      type = "RENTER_SIGNED";
      update = {
        status: toStatus,
        renterSignedAt: now,
        renterSignatureName: data.signatureName.trim(),
        renterSignatureIp: input.ipAddress,
        renterSignatureUserAgent: input.userAgent,
      };
    } else {
      return failure(403, "Bạn không phải bên ký của hợp đồng này");
    }

    const signed = await tx.contract.update({ where: { id: contractId }, data: update, include: contractInclude });
    await tx.contractEvent.create({
      data: {
        contractId,
        actorId: identity.userId,
        type,
        fromStatus,
        toStatus,
        metadata: { citizenId: data.citizenId },
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
    return { status: 200, payload: sanitizeForJson(signed) };
  });
}

async function confirmDeposit(prisma, identity, contractId, input) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  if (identity.role !== "HOST" && identity.role !== "ADMIN") return failure(403, "Chỉ chủ nhà được xác nhận tiền cọc");
  const parsed = validate(depositSchema, input);
  if (!parsed.ok) return parsed;
  const data = parsed.data;
  return prisma.$transaction(async (tx) => {
    const contract = await tx.contract.findUnique({ where: { id: contractId } });
    if (!contract) return failure(404, "Không tìm thấy hợp đồng");
    if (identity.role !== "ADMIN" && identity.userId !== contract.hostId) return failure(403, "Chỉ chủ nhà được xác nhận đã nhận tiền cọc");
    if (contract.status !== "PENDING_DEPOSIT") return failure(400, "Hợp đồng hiện không chờ xác nhận tiền cọc");
    const updated = await tx.contract.update({
      where: { id: contractId },
      data: {
        status: "PENDING_HANDOVER",
        depositStatus: "PAID",
        depositPaidAt: new Date(),
        depositReference: data.reference?.trim() || null,
      },
      include: contractInclude,
    });
    await tx.contractEvent.create({
      data: {
        contractId,
        actorId: identity.userId,
        type: "DEPOSIT_CONFIRMED",
        fromStatus: "PENDING_DEPOSIT",
        toStatus: "PENDING_HANDOVER",
        note: data.note,
        metadata: data.reference ? { reference: data.reference } : undefined,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
    return { status: 200, payload: sanitizeForJson(updated) };
  });
}

async function confirmHandover(prisma, identity, contractId, input) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  if (identity.role !== "HOST" && identity.role !== "CUSTOMER") return failure(403, "Tài khoản này không phải bên bàn giao hợp đồng");
  const parsed = validate(handoverSchema, input);
  if (!parsed.ok) return parsed;
  const data = parsed.data;
  return prisma.$transaction(async (tx) => {
    const contract = await tx.contract.findUnique({ where: { id: contractId } });
    if (!contract) return failure(404, "Không tìm thấy hợp đồng");
    if (contract.status !== "PENDING_HANDOVER") return failure(400, "Hợp đồng hiện không ở bước bàn giao");
    const isHost = identity.userId === contract.hostId && identity.role === "HOST";
    const isRenter = identity.userId === contract.renterId && identity.role === "CUSTOMER";
    if (!isHost && !isRenter) return failure(403, "Bạn không phải bên tham gia hợp đồng này");
    if (isHost && contract.hostHandoverConfirmedAt) return failure(400, "Chủ nhà đã xác nhận bàn giao");
    if (isRenter && contract.renterHandoverConfirmedAt) return failure(400, "Người thuê đã xác nhận nhận phòng");

    const now = new Date();
    const activated = (isHost || Boolean(contract.hostHandoverConfirmedAt)) && (isRenter || Boolean(contract.renterHandoverConfirmedAt));
    const updated = await tx.contract.update({
      where: { id: contractId },
      data: {
        ...(isHost ? { hostHandoverConfirmedAt: now } : { renterHandoverConfirmedAt: now }),
        ...(data.note ? { handoverNotes: data.note } : {}),
        ...(activated ? { status: "ACTIVE", activatedAt: now } : {}),
      },
      include: contractInclude,
    });

    if (activated) {
      const capacity = await getRoomCapacity(tx, contract.roomId, { startDate: contract.startDate, endDate: contract.endDate }, contract.bookingId || undefined);
      if (!capacity) return failure(404, "Không tìm thấy phòng");
      const existingOccupancy = await tx.occupancy.findUnique({
        where: { Occupancy_room_user_unique: { roomId: contract.roomId, userId: contract.renterId } },
      });
      if ((!existingOccupancy || existingOccupancy.status !== "ACTIVE") && capacity.isFull) {
        return failure(409, "Phòng đã đủ người nên chưa thể hoàn tất bàn giao");
      }
      await tx.occupancy.upsert({
        where: { Occupancy_room_user_unique: { roomId: contract.roomId, userId: contract.renterId } },
        update: { status: "ACTIVE", joinedAt: contract.startDate, terminatedAt: null, terminationReason: null },
        create: { roomId: contract.roomId, userId: contract.renterId, joinedAt: contract.startDate, status: "ACTIVE" },
      });
      if (contract.bookingId) await tx.booking.update({ where: { id: contract.bookingId }, data: { status: "COMPLETED" } });
      await syncRoomOccupancy(tx, contract.roomId);
    }

    await tx.contractEvent.create({
      data: {
        contractId,
        actorId: identity.userId,
        type: isHost ? "HOST_HANDOVER_CONFIRMED" : "RENTER_HANDOVER_CONFIRMED",
        fromStatus: "PENDING_HANDOVER",
        toStatus: activated ? "ACTIVE" : "PENDING_HANDOVER",
        note: data.note,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
    return { status: 200, payload: sanitizeForJson(updated) };
  });
}

async function renewContract(prisma, identity, contractId, input) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  if (identity.role !== "HOST" && identity.role !== "ADMIN") return failure(403, "Bạn không có quyền gia hạn hợp đồng");
  const parsed = validate(renewSchema, input);
  if (!parsed.ok) return parsed;
  const data = parsed.data;
  const contract = await prisma.contract.findUnique({ where: { id: contractId }, include: contractInclude });
  if (!contract) return failure(404, "Không tìm thấy hợp đồng");
  if (contract.status !== "ACTIVE") return failure(400, "Chỉ được gia hạn hợp đồng đang hiệu lực");
  if (identity.role !== "ADMIN" && contract.hostId !== identity.userId) return failure(403, "Bạn không có quyền gia hạn hợp đồng này");
  if (data.newEndDate <= contract.endDate) return failure(400, "Ngày hết hạn mới phải sau ngày hết hạn hiện tại");
  const renewed = await prisma.$transaction(async (tx) => {
    const updated = await tx.contract.update({
      where: { id: contractId },
      data: {
        endDate: data.newEndDate,
        ...(data.newMonthlyRent !== undefined ? { monthlyRent: data.newMonthlyRent } : {}),
        renewalCount: { increment: 1 },
      },
      include: contractInclude,
    });
    await tx.contractEvent.create({
      data: {
        contractId,
        actorId: identity.userId,
        type: "RENEWAL_RECORDED",
        fromStatus: "ACTIVE",
        toStatus: "ACTIVE",
        metadata: {
          previousEndDate: contract.endDate.toISOString(),
          newEndDate: data.newEndDate.toISOString(),
          previousMonthlyRent: contract.monthlyRent,
          newMonthlyRent: data.newMonthlyRent ?? contract.monthlyRent,
        },
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
    return updated;
  });
  return { status: 200, payload: sanitizeForJson(renewed) };
}

async function terminateContract(prisma, identity, contractId, input) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  if (identity.role !== "HOST" && identity.role !== "CUSTOMER" && identity.role !== "ADMIN") {
    return failure(403, "Bạn không có quyền rời phòng hoặc chấm dứt hợp đồng");
  }
  const parsed = validate(terminateSchema, input);
  if (!parsed.ok) return parsed;
  const contract = await prisma.contract.findUnique({ where: { id: contractId }, include: contractInclude });
  if (!contract) return failure(404, "Không tìm thấy hợp đồng");
  if (!canAccessContract(identity, contract)) return failure(403, "Không được phép truy cập hợp đồng này");
  if (contract.status !== "ACTIVE") return failure(400, "Chỉ được chấm dứt hợp đồng đang hiệu lực");
  const terminated = await prisma.$transaction(async (tx) => {
    const now = new Date();
    const updated = await tx.contract.update({
      where: { id: contractId },
      data: { status: "TERMINATED", terminatedAt: now, terminationReason: parsed.data.terminationReason },
      include: contractInclude,
    });
    await tx.occupancy.updateMany({
      where: { roomId: contract.roomId, userId: contract.renterId, status: "ACTIVE" },
      data: { status: "INACTIVE", terminatedAt: now, terminationReason: parsed.data.terminationReason },
    });
    await syncRoomOccupancy(tx, contract.roomId);
    await tx.contractEvent.create({
      data: {
        contractId,
        actorId: identity.userId,
        type: identity.role === "CUSTOMER" ? "RENTER_LEFT_ROOM" : "CONTRACT_TERMINATED",
        fromStatus: "ACTIVE",
        toStatus: "TERMINATED",
        note: parsed.data.terminationReason,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
    return updated;
  });
  return { status: 200, payload: sanitizeForJson(terminated) };
}

async function checkExpiredContracts(prisma, authHeader) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return { status: 401, payload: { error: "Unauthorized: Invalid cron secret" } };
  }
  const updated = await prisma.contract.updateMany({
    where: { status: "ACTIVE", endDate: { lt: new Date() } },
    data: { status: "EXPIRED" },
  });
  return {
    status: 200,
    payload: {
      success: true,
      message: `Checked and updated contract statuses. ${updated.count} contracts updated to EXPIRED.`,
      updatedCount: updated.count,
      timestamp: new Date().toISOString(),
    },
  };
}

async function contractStats(prisma, query) {
  const roomId = query.roomId ? String(query.roomId) : undefined;
  const where = roomId ? { roomId } : {};
  const statuses = await prisma.contract.groupBy({ by: ["status"], where, _count: { _all: true } });
  const byStatus = Object.fromEntries(statuses.map((item) => [item.status, item._count._all]));
  return {
    status: 200,
    payload: {
      stats: { total: statuses.reduce((sum, item) => sum + item._count._all, 0), byStatus },
      timestamp: new Date().toISOString(),
    },
  };
}

module.exports = {
  checkExpiredContracts,
  confirmDeposit,
  confirmHandover,
  contractStats,
  createContract,
  deleteContract,
  getContract,
  listContracts,
  renewContract,
  signContract,
  terminateContract,
  updateContract,
};
