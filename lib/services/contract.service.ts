import { createHash, randomUUID } from "node:crypto";
import { ContractDepositStatus, ContractStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";

const TERMS_VERSION = "VN-HOUSING-2023-v1";

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
} satisfies Prisma.ContractInclude;

const contractDetailInclude = {
  ...contractInclude,
  events: {
    include: {
      actor: { select: { id: true, fullName: true, role: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.ContractInclude;

export interface CreateContractData {
  bookingId: string;
  roomId: string;
  renterId: string;
  hostId: string;
  startDate: Date;
  endDate: Date;
  monthlyRent: number;
  depositAmount: number;
  paymentDueDay: number;
  paymentMethod?: string;
  electricityRate?: number;
  waterRate?: number;
  utilitiesNotes?: string;
  noticeDays: number;
  depositReturnDays: number;
  houseRules?: string;
  inventory?: Prisma.InputJsonValue;
  notes?: string;
}

export interface UpdateContractData {
  endDate?: Date;
  monthlyRent?: number;
  depositAmount?: number;
  paymentDueDay?: number;
  paymentMethod?: string | null;
  electricityRate?: number | null;
  waterRate?: number | null;
  utilitiesNotes?: string | null;
  noticeDays?: number;
  depositReturnDays?: number;
  houseRules?: string | null;
  inventory?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
  notes?: string | null;
}

export interface ActionContext {
  actorId: string;
  role: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface SignContractData extends ActionContext {
  signatureName: string;
  citizenId: string;
}

export interface ConfirmDepositData extends ActionContext {
  reference?: string;
  note?: string;
}

export interface ConfirmHandoverData extends ActionContext {
  note?: string;
}

export interface TerminateContractData extends ActionContext {
  terminationReason: string;
}

export interface RenewContractData extends ActionContext {
  newEndDate: Date;
  newMonthlyRent?: number;
}

type SnapshotSource = {
  contractNumber: string;
  startDate: Date;
  endDate: Date;
  monthlyRent: number;
  depositAmount: number;
  paymentDueDay: number;
  paymentMethod: string | null;
  electricityRate: number | null;
  waterRate: number | null;
  utilitiesNotes: string | null;
  noticeDays: number;
  depositReturnDays: number;
  houseRules: string | null;
  inventory: unknown;
  notes: string | null;
  host: { id: string; fullName: string; email: string; phone: string | null; address: string | null };
  renter: { id: string; fullName: string; email: string; phone: string | null; address: string | null };
  room: {
    id: string;
    title: string;
    address: string;
    areaText: string | null;
    areaValue: Prisma.Decimal | null;
    city: string | null;
    district: string | null;
    maxOccupants: number | null;
  };
};

function buildSnapshot(source: SnapshotSource): Prisma.InputJsonObject {
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
    inventory: source.inventory == null
      ? null
      : JSON.parse(JSON.stringify(source.inventory)) as Prisma.InputJsonValue,
    additionalNotes: source.notes,
    commitments: [
      "Các bên cam kết thông tin cung cấp là đúng sự thật và tự nguyện ký kết.",
      "Phòng được sử dụng đúng mục đích ở và tuân thủ quy định về cư trú, an ninh, phòng cháy chữa cháy.",
      "Mọi sửa đổi sau khi ký phải được hai bên chấp thuận và lưu thành phụ lục hoặc sự kiện hợp đồng.",
    ],
  };
}

function snapshotHash(snapshot: Prisma.InputJsonObject) {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

function normalizedName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("vi-VN");
}

function assertSignatureName(expected: string, actual: string) {
  if (normalizedName(expected) !== normalizedName(actual)) {
    throw new ApiError(400, "Họ tên xác nhận phải trùng với họ tên tài khoản");
  }
}

function normalizeCitizenId(value: string) {
  const citizenId = value.replace(/\s+/g, "");
  if (!/^\d{12}$/.test(citizenId)) {
    throw new ApiError(400, "Số căn cước công dân phải gồm đúng 12 chữ số");
  }
  return citizenId;
}

async function syncRoomOccupants(tx: Prisma.TransactionClient, roomId: string) {
  const count = await tx.occupancy.count({ where: { roomId, status: "ACTIVE" } });
  await tx.room.update({ where: { id: roomId }, data: { currentOccupants: count } });
}

export const contractService = {
  async getAll(filters?: {
    status?: ContractStatus;
    roomId?: string;
    renterId?: string;
    hostId?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, roomId, renterId, hostId, page = 1, limit = 10 } = filters || {};
    const where: Prisma.ContractWhereInput = {};
    if (status) where.status = status;
    if (roomId) where.roomId = roomId;
    if (renterId) where.renterId = renterId;
    if (hostId) where.hostId = hostId;

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

    return { contracts, total, page, limit, pages: Math.ceil(total / limit) };
  },

  async getById(contractId: string) {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: contractDetailInclude,
    });
    if (!contract) throw new ApiError(404, "Không tìm thấy hợp đồng");
    return contract;
  },

  async getRoomContracts(roomId: string, activeOnly = true) {
    return prisma.contract.findMany({
      where: { roomId, ...(activeOnly ? { status: ContractStatus.ACTIVE } : {}) },
      include: { renter: { select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true } } },
      orderBy: { startDate: "desc" },
    });
  },

  async getRenterContracts(renterId: string) {
    return prisma.contract.findMany({ where: { renterId }, include: contractInclude, orderBy: { createdAt: "desc" } });
  },

  async create(data: CreateContractData, context: ActionContext) {
    if (data.startDate >= data.endDate) {
      throw new ApiError(400, "Ngày kết thúc phải sau ngày bắt đầu");
    }

    return prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: data.bookingId },
        include: { contract: { select: { id: true } } },
      });
      if (!booking) throw new ApiError(404, "Không tìm thấy yêu cầu đặt phòng");
      if (booking.status !== "CONFIRMED") throw new ApiError(400, "Chỉ có thể lập hợp đồng từ booking đã xác nhận");
      if (booking.contract) throw new ApiError(400, "Booking này đã có hợp đồng");

      const [room, host, renter] = await Promise.all([
        tx.room.findUnique({
          where: { id: data.roomId },
          select: { id: true, title: true, address: true, areaText: true, areaValue: true, city: true, district: true, maxOccupants: true, ownerId: true },
        }),
        tx.user.findUnique({ where: { id: data.hostId }, select: { id: true, fullName: true, email: true, phone: true, address: true } }),
        tx.user.findUnique({ where: { id: data.renterId }, select: { id: true, fullName: true, email: true, phone: true, address: true } }),
      ]);
      if (!room) throw new ApiError(404, "Không tìm thấy phòng");
      if (!host || room.ownerId !== host.id) throw new ApiError(403, "Chủ nhà không sở hữu phòng này");
      if (!renter) throw new ApiError(404, "Không tìm thấy người thuê");

      const id = randomUUID();
      const contractNumber = `HD-${new Date().getFullYear()}-${id.slice(0, 8).toUpperCase()}`;
      const depositStatus = data.depositAmount > 0 ? ContractDepositStatus.PENDING : ContractDepositStatus.NOT_REQUIRED;
      const snapshot = buildSnapshot({
        ...data,
        contractNumber,
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
          bookingId: data.bookingId,
          roomId: data.roomId,
          renterId: data.renterId,
          hostId: data.hostId,
          startDate: data.startDate,
          endDate: data.endDate,
          monthlyRent: data.monthlyRent,
          depositAmount: data.depositAmount,
          depositStatus,
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
          status: ContractStatus.DRAFT,
        },
        include: contractInclude,
      });

      await tx.contractEvent.create({
        data: {
          contractId: id,
          actorId: context.actorId,
          type: "CONTRACT_CREATED",
          toStatus: ContractStatus.DRAFT,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      });
      return contract;
    });
  },

  async update(contractId: string, data: UpdateContractData, context: ActionContext) {
    const current = await this.getById(contractId);
    if (current.status !== ContractStatus.DRAFT) {
      throw new ApiError(400, "Chỉ được chỉnh sửa hợp đồng khi còn là bản nháp");
    }
    if (context.role !== "ADMIN" && current.hostId !== context.actorId) {
      throw new ApiError(403, "Bạn không có quyền chỉnh sửa hợp đồng này");
    }

    const merged = {
      ...current,
      ...data,
      endDate: data.endDate ?? current.endDate,
      monthlyRent: data.monthlyRent ?? current.monthlyRent,
      depositAmount: data.depositAmount ?? current.depositAmount,
      paymentDueDay: data.paymentDueDay ?? current.paymentDueDay,
      noticeDays: data.noticeDays ?? current.noticeDays,
      depositReturnDays: data.depositReturnDays ?? current.depositReturnDays,
      inventory: data.inventory === Prisma.JsonNull ? null : (data.inventory ?? current.inventory),
      host: current.host,
      renter: current.renter,
      room: current.room,
    };
    if (merged.startDate >= merged.endDate) throw new ApiError(400, "Ngày kết thúc phải sau ngày bắt đầu");
    const snapshot = buildSnapshot(merged);

    return prisma.$transaction(async (tx) => {
      const updated = await tx.contract.update({
        where: { id: contractId },
        data: {
          ...data,
          contentSnapshot: snapshot,
          contentHash: snapshotHash(snapshot),
          depositStatus:
            merged.depositAmount > 0 ? ContractDepositStatus.PENDING : ContractDepositStatus.NOT_REQUIRED,
        },
        include: contractInclude,
      });
      await tx.contractEvent.create({
        data: {
          contractId,
          actorId: context.actorId,
          type: "DRAFT_UPDATED",
          fromStatus: ContractStatus.DRAFT,
          toStatus: ContractStatus.DRAFT,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
        },
      });
      return updated;
    });
  },

  async sign(contractId: string, data: SignContractData) {
    return prisma.$transaction(async (tx) => {
      const contract = await tx.contract.findUnique({
        where: { id: contractId },
        include: { host: { select: { fullName: true } }, renter: { select: { fullName: true } } },
      });
      if (!contract) throw new ApiError(404, "Không tìm thấy hợp đồng");

      const now = new Date();
      const citizenId = normalizeCitizenId(data.citizenId);
      const fromStatus = contract.status;
      let toStatus: ContractStatus;
      let update: Prisma.ContractUpdateInput;

      if (data.actorId === contract.hostId && data.role === "HOST") {
        if (contract.status !== ContractStatus.DRAFT && contract.status !== ContractStatus.PENDING_HOST_SIGNATURE) {
          throw new ApiError(400, "Hợp đồng hiện không chờ chữ ký của chủ nhà");
        }
        assertSignatureName(contract.host.fullName, data.signatureName);
        toStatus = ContractStatus.PENDING_RENTER_SIGNATURE;
        update = {
          status: toStatus,
          hostSignedAt: now,
          hostSignatureName: data.signatureName.trim(),
          hostSignatureIp: data.ipAddress,
          hostSignatureUserAgent: data.userAgent,
        };
      } else if (data.actorId === contract.renterId && data.role === "CUSTOMER") {
        if (contract.status !== ContractStatus.PENDING_RENTER_SIGNATURE || !contract.hostSignedAt) {
          throw new ApiError(400, "Hợp đồng chưa sẵn sàng để người thuê ký");
        }
        assertSignatureName(contract.renter.fullName, data.signatureName);
        toStatus = contract.depositAmount > 0 ? ContractStatus.PENDING_DEPOSIT : ContractStatus.PENDING_HANDOVER;
        update = {
          status: toStatus,
          renterSignedAt: now,
          renterSignatureName: data.signatureName.trim(),
          renterSignatureIp: data.ipAddress,
          renterSignatureUserAgent: data.userAgent,
        };
      } else {
        throw new ApiError(403, "Bạn không phải bên ký của hợp đồng này");
      }

      const signed = await tx.contract.update({ where: { id: contractId }, data: update, include: contractInclude });
      await tx.contractEvent.create({
        data: {
          contractId,
          actorId: data.actorId,
          type: data.role === "HOST" ? "HOST_SIGNED" : "RENTER_SIGNED",
          fromStatus,
          toStatus,
          metadata: { citizenId },
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });
      return signed;
    });
  },

  async confirmDeposit(contractId: string, data: ConfirmDepositData) {
    return prisma.$transaction(async (tx) => {
      const contract = await tx.contract.findUnique({ where: { id: contractId } });
      if (!contract) throw new ApiError(404, "Không tìm thấy hợp đồng");
      if (data.role !== "ADMIN" && (data.role !== "HOST" || data.actorId !== contract.hostId)) {
        throw new ApiError(403, "Chỉ chủ nhà được xác nhận đã nhận tiền cọc");
      }
      if (contract.status !== ContractStatus.PENDING_DEPOSIT) {
        throw new ApiError(400, "Hợp đồng hiện không chờ xác nhận tiền cọc");
      }

      const updated = await tx.contract.update({
        where: { id: contractId },
        data: {
          status: ContractStatus.PENDING_HANDOVER,
          depositStatus: ContractDepositStatus.PAID,
          depositPaidAt: new Date(),
          depositReference: data.reference?.trim() || null,
        },
        include: contractInclude,
      });
      await tx.contractEvent.create({
        data: {
          contractId,
          actorId: data.actorId,
          type: "DEPOSIT_CONFIRMED",
          fromStatus: ContractStatus.PENDING_DEPOSIT,
          toStatus: ContractStatus.PENDING_HANDOVER,
          note: data.note,
          metadata: data.reference ? { reference: data.reference } : undefined,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });
      return updated;
    });
  },

  async confirmHandover(contractId: string, data: ConfirmHandoverData) {
    return prisma.$transaction(async (tx) => {
      const contract = await tx.contract.findUnique({ where: { id: contractId } });
      if (!contract) throw new ApiError(404, "Không tìm thấy hợp đồng");
      if (contract.status !== ContractStatus.PENDING_HANDOVER) {
        throw new ApiError(400, "Hợp đồng hiện không ở bước bàn giao");
      }

      const isHost = data.actorId === contract.hostId && data.role === "HOST";
      const isRenter = data.actorId === contract.renterId && data.role === "CUSTOMER";
      if (!isHost && !isRenter) throw new ApiError(403, "Bạn không phải bên tham gia hợp đồng này");
      if (isHost && contract.hostHandoverConfirmedAt) throw new ApiError(400, "Chủ nhà đã xác nhận bàn giao");
      if (isRenter && contract.renterHandoverConfirmedAt) throw new ApiError(400, "Người thuê đã xác nhận nhận phòng");

      const now = new Date();
      const hostConfirmed = isHost || Boolean(contract.hostHandoverConfirmedAt);
      const renterConfirmed = isRenter || Boolean(contract.renterHandoverConfirmedAt);
      const activated = hostConfirmed && renterConfirmed;
      const updated = await tx.contract.update({
        where: { id: contractId },
        data: {
          ...(isHost ? { hostHandoverConfirmedAt: now } : { renterHandoverConfirmedAt: now }),
          ...(data.note ? { handoverNotes: data.note } : {}),
          ...(activated ? { status: ContractStatus.ACTIVE, activatedAt: now } : {}),
        },
        include: contractInclude,
      });

      if (activated) {
        await tx.occupancy.upsert({
          where: { Occupancy_room_user_unique: { roomId: contract.roomId, userId: contract.renterId } },
          update: { status: "ACTIVE", joinedAt: contract.startDate, terminatedAt: null, terminationReason: null },
          create: { roomId: contract.roomId, userId: contract.renterId, joinedAt: contract.startDate, status: "ACTIVE" },
        });
        if (contract.bookingId) {
          await tx.booking.update({ where: { id: contract.bookingId }, data: { status: "COMPLETED" } });
        }
        await syncRoomOccupants(tx, contract.roomId);
      }

      await tx.contractEvent.create({
        data: {
          contractId,
          actorId: data.actorId,
          type: isHost ? "HOST_HANDOVER_CONFIRMED" : "RENTER_HANDOVER_CONFIRMED",
          fromStatus: ContractStatus.PENDING_HANDOVER,
          toStatus: activated ? ContractStatus.ACTIVE : ContractStatus.PENDING_HANDOVER,
          note: data.note,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });
      return updated;
    });
  },

  async renew(contractId: string, data: RenewContractData) {
    const contract = await this.getById(contractId);
    if (contract.status !== ContractStatus.ACTIVE) throw new ApiError(400, "Chỉ được gia hạn hợp đồng đang hiệu lực");
    if (data.role !== "ADMIN" && (data.role !== "HOST" || contract.hostId !== data.actorId)) {
      throw new ApiError(403, "Bạn không có quyền gia hạn hợp đồng này");
    }
    if (data.newEndDate <= contract.endDate) throw new ApiError(400, "Ngày hết hạn mới phải sau ngày hết hạn hiện tại");

    return prisma.$transaction(async (tx) => {
      const renewed = await tx.contract.update({
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
          actorId: data.actorId,
          type: "RENEWAL_RECORDED",
          fromStatus: ContractStatus.ACTIVE,
          toStatus: ContractStatus.ACTIVE,
          metadata: {
            previousEndDate: contract.endDate.toISOString(),
            newEndDate: data.newEndDate.toISOString(),
            previousMonthlyRent: contract.monthlyRent,
            newMonthlyRent: data.newMonthlyRent ?? contract.monthlyRent,
          },
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });
      return renewed;
    });
  },

  async terminate(contractId: string, data: TerminateContractData) {
    const contract = await this.getById(contractId);
    if (contract.status !== ContractStatus.ACTIVE) throw new ApiError(400, "Chỉ được chấm dứt hợp đồng đang hiệu lực");
    const isParty = data.actorId === contract.hostId || data.actorId === contract.renterId;
    if (data.role !== "ADMIN" && !isParty) throw new ApiError(403, "Bạn không có quyền chấm dứt hợp đồng này");

    return prisma.$transaction(async (tx) => {
      const now = new Date();
      const terminated = await tx.contract.update({
        where: { id: contractId },
        data: { status: ContractStatus.TERMINATED, terminatedAt: now, terminationReason: data.terminationReason },
        include: contractInclude,
      });
      await tx.occupancy.updateMany({
        where: { roomId: contract.roomId, userId: contract.renterId, status: "ACTIVE" },
        data: { status: "INACTIVE", terminatedAt: now, terminationReason: data.terminationReason },
      });
      await syncRoomOccupants(tx, contract.roomId);
      await tx.contractEvent.create({
        data: {
          contractId,
          actorId: data.actorId,
          type: "CONTRACT_TERMINATED",
          fromStatus: ContractStatus.ACTIVE,
          toStatus: ContractStatus.TERMINATED,
          note: data.terminationReason,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        },
      });
      return terminated;
    });
  },

  async delete(contractId: string, context: ActionContext) {
    const contract = await this.getById(contractId);
    if (contract.status !== ContractStatus.DRAFT) throw new ApiError(400, "Chỉ được xóa hợp đồng còn là bản nháp");
    if (context.role !== "ADMIN" && contract.hostId !== context.actorId) throw new ApiError(403, "Bạn không có quyền xóa hợp đồng này");
    await prisma.contract.delete({ where: { id: contractId } });
  },

  async checkAndUpdateExpiredContracts() {
    const updated = await prisma.contract.updateMany({
      where: { status: ContractStatus.ACTIVE, endDate: { lt: new Date() } },
      data: { status: ContractStatus.EXPIRED },
    });
    return updated.count;
  },

  async getStats(roomId?: string, hostId?: string) {
    const where: Prisma.ContractWhereInput = { ...(roomId ? { roomId } : {}), ...(hostId ? { hostId } : {}) };
    const statuses = await prisma.contract.groupBy({ by: ["status"], where, _count: { _all: true } });
    const byStatus = Object.fromEntries(statuses.map((item) => [item.status, item._count._all]));
    return { total: statuses.reduce((sum, item) => sum + item._count._all, 0), byStatus };
  },
};
