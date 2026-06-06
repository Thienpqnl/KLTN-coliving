import { prisma } from "@/lib/prisma";
import { ContractStatus } from "@prisma/client";
import { ApiError } from "@/lib/api-error";

export interface CreateContractData {
  roomId: string;
  renterId: string;
  startDate: Date;
  endDate: Date;
  monthlyRent: number;
  depositAmount: number;
  notes?: string;
}

export interface UpdateContractData {
  endDate?: Date;
  monthlyRent?: number;
  notes?: string;
}

export interface TerminateContractData {
  terminationReason: string;
}

export interface RenewContractData {
  newEndDate: Date;
  newMonthlyRent?: number;
}

export const contractService = {
  // Get all contracts with filters
  async getAll(filters?: {
    status?: ContractStatus;
    roomId?: string;
    renterId?: string;
    page?: number;
    limit?: number;
  }) {
    const {
      status,
      roomId,
      renterId,
      page = 1,
      limit = 10,
    } = filters || {};

    const where: any = {};
    if (status) where.status = status;
    if (roomId) where.roomId = roomId;
    if (renterId) where.renterId = renterId;

    const [contracts, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        include: {
          room: {
            select: {
              id: true,
              title: true,
              address: true,
              priceValue: true,
            },
          },
          renter: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.contract.count({ where }),
    ]);

    return {
      contracts,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  },

  // Get contract by ID
  async getById(contractId: string) {
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        room: {
          select: {
            id: true,
            title: true,
            address: true,
            priceValue: true,
            city: true,
            district: true,
            currentOccupants: true,
            maxOccupants: true,
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
      },
    });

    if (!contract) {
      throw new ApiError(404, "Hợp đồng không tìm thấy");
    }

    return contract;
  },

  // Get contracts for a room
  async getRoomContracts(roomId: string, activeOnly = true) {
    const where: any = { roomId };
    if (activeOnly) {
      where.status = "ACTIVE";
    }

    return prisma.contract.findMany({
      where,
      include: {
        renter: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { startDate: "desc" },
    });
  },

  // Get contracts for a renter
  async getRenterContracts(renterId: string) {
    return prisma.contract.findMany({
      where: { renterId },
      include: {
        room: {
          select: {
            id: true,
            title: true,
            address: true,
            priceValue: true,
            city: true,
            district: true,
          },
        },
      },
      orderBy: { startDate: "desc" },
    });
  },

  // Create new contract
  async create(data: CreateContractData) {
    // Validate room exists
    const room = await prisma.room.findUnique({
      where: { id: data.roomId },
    });
    if (!room) {
      throw new ApiError(404, "Phòng không tìm thấy");
    }

    // Validate renter exists
    const renter = await prisma.user.findUnique({
      where: { id: data.renterId },
    });
    if (!renter) {
      throw new ApiError(404, "Người thuê không tìm thấy");
    }

    // Validate dates
    if (data.startDate >= data.endDate) {
      throw new ApiError(400, "Ngày kết thúc phải lớn hơn ngày bắt đầu");
    }

    // Check if renter already has active contract for this room
    const existingContract = await prisma.contract.findFirst({
      where: {
        roomId: data.roomId,
        renterId: data.renterId,
        status: "ACTIVE",
      },
    });

    if (existingContract) {
      throw new ApiError(
        400,
        "Người thuê này đã có hợp đồng hiệu lực cho phòng này"
      );
    }

    const contract = await prisma.contract.create({
      data: {
        roomId: data.roomId,
        renterId: data.renterId,
        startDate: data.startDate,
        endDate: data.endDate,
        monthlyRent: data.monthlyRent,
        depositAmount: data.depositAmount,
        notes: data.notes || null,
        status: "ACTIVE",
        renewalCount: 0,
      },
      include: {
        room: {
          select: {
            id: true,
            title: true,
            address: true,
          },
        },
        renter: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    // Auto-create occupancy record if it doesn't exist
    await prisma.occupancy.upsert({
      where: {
        Occupancy_room_user_unique: {
          roomId: data.roomId,
          userId: data.renterId,
        },
      },
      update: {
        status: "ACTIVE",
        terminatedAt: null,
      },
      create: {
        roomId: data.roomId,
        userId: data.renterId,
        status: "ACTIVE",
        joinedAt: data.startDate,
      },
    });

    return contract;
  },

  // Update contract (general update)
  async update(contractId: string, data: UpdateContractData) {
    const contract = await this.getById(contractId);

    if (contract.status !== "ACTIVE") {
      throw new ApiError(400, "Chỉ có thể cập nhật hợp đồng đang hiệu lực");
    }

    // Validate new dates if provided
    if (data.endDate && data.endDate <= contract.startDate) {
      throw new ApiError(400, "Ngày kết thúc phải lớn hơn ngày bắt đầu");
    }

    const updated = await prisma.contract.update({
      where: { id: contractId },
      data: {
        ...(data.endDate && { endDate: data.endDate }),
        ...(data.monthlyRent && { monthlyRent: data.monthlyRent }),
        ...(data.notes && { notes: data.notes }),
      },
      include: {
        room: { select: { id: true, title: true } },
        renter: { select: { id: true, fullName: true } },
      },
    });

    return updated;
  },

  // Renew contract
  async renew(contractId: string, data: RenewContractData) {
    const contract = await this.getById(contractId);

    if (contract.status !== "ACTIVE") {
      throw new ApiError(400, "Chỉ có thể gia hạn hợp đồng đang hiệu lực");
    }

    if (data.newEndDate <= contract.startDate) {
      throw new ApiError(400, "Ngày kết thúc mới phải lớn hơn ngày bắt đầu");
    }

    const renewed = await prisma.contract.update({
      where: { id: contractId },
      data: {
        endDate: data.newEndDate,
        ...(data.newMonthlyRent && { monthlyRent: data.newMonthlyRent }),
        renewalCount: {
          increment: 1,
        },
      },
      include: {
        room: { select: { id: true, title: true } },
        renter: { select: { id: true, fullName: true } },
      },
    });

    return renewed;
  },

  // Terminate contract
  async terminate(contractId: string, data: TerminateContractData) {
    const contract = await this.getById(contractId);

    if (contract.status !== "ACTIVE") {
      throw new ApiError(400, "Chỉ có thể chấm dứt hợp đồng đang hiệu lực");
    }

    const terminated = await prisma.contract.update({
      where: { id: contractId },
      data: {
        status: "TERMINATED",
        terminatedAt: new Date(),
        terminationReason: data.terminationReason,
      },
      include: {
        room: { select: { id: true, title: true } },
        renter: { select: { id: true, fullName: true } },
      },
    });

    // Update occupancy status
    await prisma.occupancy.updateMany({
      where: {
        roomId: contract.roomId,
        userId: contract.renterId,
        status: "ACTIVE",
      },
      data: {
        status: "INACTIVE",
        terminatedAt: new Date(),
        terminationReason: data.terminationReason,
      },
    });

    return terminated;
  },

  // Delete contract
  async delete(contractId: string) {
    const contract = await this.getById(contractId);

    if (contract.status !== "ACTIVE") {
      throw new ApiError(
        400,
        "Chỉ có thể xóa hợp đồng trạng thái ACTIVE hoặc EXPIRED"
      );
    }

    await prisma.contract.delete({
      where: { id: contractId },
    });
  },

  // Auto-update expired contracts
  async checkAndUpdateExpiredContracts() {
    const now = new Date();

    const updated = await prisma.contract.updateMany({
      where: {
        status: "ACTIVE",
        endDate: {
          lt: now,
        },
      },
      data: {
        status: "EXPIRED",
      },
    });

    return updated.count;
  },

  // Get contract statistics
  async getStats(roomId?: string) {
    const where: any = {};
    if (roomId) where.roomId = roomId;

    const [total, active, expired, terminated] = await Promise.all([
      prisma.contract.count({ where }),
      prisma.contract.count({ where: { ...where, status: "ACTIVE" } }),
      prisma.contract.count({ where: { ...where, status: "EXPIRED" } }),
      prisma.contract.count({ where: { ...where, status: "TERMINATED" } }),
    ]);

    return {
      total,
      active,
      expired,
      terminated,
    };
  },
};
