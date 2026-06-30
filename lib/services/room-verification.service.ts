import {
  CommunityManagerRecommendation,
  Prisma,
  RoomStatus,
  VerificationDocumentStatus,
  VerificationDocumentType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { communityManagerAreaService } from "@/lib/services/community-manager-area.service";

const verificationInclude = {
  documents: { orderBy: { createdAt: "desc" as const } },
  reviewer: {
    select: { id: true, name: true, fullName: true, email: true },
  },
  assignedManager: {
    select: { id: true, name: true, fullName: true, email: true, phone: true },
  },
};

const adminRoomInclude = {
  owner: {
    select: {
      id: true,
      name: true,
      fullName: true,
      email: true,
      phone: true,
      phoneVerified: true,
      status: true,
    },
  },
  images: { orderBy: { sortOrder: "asc" as const } },
  amenities: { include: { amenity: true } },
  verification: { include: verificationInclude },
};

const editableStatuses: RoomStatus[] = [
  RoomStatus.DRAFT,
  RoomStatus.NEEDS_REVISION,
  RoomStatus.REJECTED,
];

function assertOwner(ownerId: string | null, userId: string) {
  if (!ownerId || ownerId !== userId) {
    throw new ApiError(403, "Bạn không có quyền quản lý phòng này");
  }
}

function validateSubmission(room: {
  title: string;
  description: string;
  address: string;
  priceValue: bigint | null;
  areaValue: Prisma.Decimal | null;
  latitude: number | null;
  longitude: number | null;
  images: { id: string }[];
  verification: { documents: { type: VerificationDocumentType }[] } | null;
}) {
  const errors: Record<string, string[]> = {};
  const addError = (field: string, message: string) => {
    errors[field] = [...(errors[field] || []), message];
  };

  if (room.title.trim().length < 3) addError("title", "Tên phòng chưa hợp lệ");
  if (room.description.trim().length < 10) addError("description", "Mô tả cần ít nhất 10 ký tự");
  if (!room.priceValue || room.priceValue <= BigInt(0)) addError("price", "Giá thuê chưa hợp lệ");
  if (!room.areaValue || room.areaValue.lte(0)) addError("area", "Diện tích chưa hợp lệ");
  if (room.address.trim().length < 5) addError("address", "Địa chỉ chưa đầy đủ");
  if (room.latitude == null || room.longitude == null) addError("location", "Cần chọn vị trí trên bản đồ");
  if (room.images.length < 3) addError("images", "Cần ít nhất 3 ảnh phòng");

  const documentTypes = new Set(room.verification?.documents.map((document) => document.type) || []);
  if (!documentTypes.has(VerificationDocumentType.IDENTITY)) {
    addError("identityDocument", "Thiếu minh chứng danh tính chủ nhà");
  }
  if (!documentTypes.has(VerificationDocumentType.OWNERSHIP)) {
    addError("ownershipDocument", "Thiếu giấy tờ chứng minh quyền cho thuê");
  }
  if (!documentTypes.has(VerificationDocumentType.ROOM_PROOF)) {
    addError("roomProof", "Thiếu ảnh hoặc tài liệu chứng minh phòng thực tế");
  }

  if (Object.keys(errors).length > 0) {
    throw new ApiError(400, "Thông tin phòng chưa đủ để gửi xét duyệt", errors);
  }
}

const buildAdminRoomWhere = (filters: { status?: RoomStatus; search?: string }): Prisma.RoomWhereInput => ({
  ...(filters.status ? { status: filters.status } : {}),
  ...(filters.search
    ? {
        OR: [
          { title: { contains: filters.search, mode: Prisma.QueryMode.insensitive } },
          { address: { contains: filters.search, mode: Prisma.QueryMode.insensitive } },
          { owner: { email: { contains: filters.search, mode: Prisma.QueryMode.insensitive } } },
          { owner: { fullName: { contains: filters.search, mode: Prisma.QueryMode.insensitive } } },
        ],
      }
    : {}),
});

export const roomVerificationService = {
  getForHost: async (roomId: string, ownerId: string) => {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        ownerId: true,
        status: true,
        _count: { select: { images: true } },
        verification: { include: verificationInclude },
      },
    });

    if (!room) throw new ApiError(404, "Không tìm thấy phòng");
    assertOwner(room.ownerId, ownerId);
    return room;
  },

  addDocument: async (
    roomId: string,
    ownerId: string,
    data: { type: VerificationDocumentType; fileUrl: string; note?: string }
  ) => {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, ownerId: true, status: true },
    });

    if (!room) throw new ApiError(404, "Không tìm thấy phòng");
    assertOwner(room.ownerId, ownerId);
    if (!editableStatuses.includes(room.status)) {
      throw new ApiError(409, "Không thể thay đổi minh chứng khi phòng đang được xét duyệt hoặc đã công khai");
    }

    const verification = await prisma.roomVerification.upsert({
      where: { roomId },
      create: { roomId },
      update: {},
    });

    return prisma.roomVerificationDocument.create({
      data: {
        verificationId: verification.id,
        type: data.type,
        fileUrl: data.fileUrl,
        note: data.note,
      },
    });
  },

  deleteDocument: async (roomId: string, documentId: string, ownerId: string) => {
    const document = await prisma.roomVerificationDocument.findUnique({
      where: { id: documentId },
      include: { verification: { select: { roomId: true, room: { select: { ownerId: true, status: true } } } } },
    });

    if (!document || document.verification.roomId !== roomId) {
      throw new ApiError(404, "Không tìm thấy tài liệu");
    }
    assertOwner(document.verification.room.ownerId, ownerId);
    if (!editableStatuses.includes(document.verification.room.status)) {
      throw new ApiError(409, "Không thể xóa minh chứng ở trạng thái hiện tại");
    }

    await prisma.roomVerificationDocument.delete({ where: { id: documentId } });
    return { id: documentId };
  },

  submit: async (
    roomId: string,
    ownerId: string,
    declaration: {
      informationAccurateConfirmed: true;
      legalResponsibilityAccepted: true;
      verificationConsentAccepted: true;
      ipAddress?: string;
      userAgent?: string;
    }
  ) => {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        images: { select: { id: true } },
        verification: { include: { documents: true } },
      },
    });

    if (!room) throw new ApiError(404, "Không tìm thấy phòng");
    assertOwner(room.ownerId, ownerId);
    if (!editableStatuses.includes(room.status)) {
      throw new ApiError(409, "Phòng không thể gửi xét duyệt ở trạng thái hiện tại");
    }

    validateSubmission(room);
    const assignedManager = await communityManagerAreaService.findBestManagerForRoom({
      city: room.city,
      district: room.district,
      districtId: room.districtId,
    });
    const now = new Date();

    return prisma.$transaction(async (tx) => {
      await tx.roomVerification.upsert({
        where: { roomId },
        create: {
          roomId,
          submittedAt: now,
          assignedManagerId: assignedManager?.id || null,
          managerAssignedAt: assignedManager ? now : null,
          managerRecommendation: CommunityManagerRecommendation.PENDING,
          informationAccurateConfirmed: true,
          legalResponsibilityAccepted: true,
          verificationConsentAccepted: true,
          declarationAcceptedAt: now,
          declarationVersion: "ROOM_VERIFICATION_DECLARATION_V2_CM",
          declarationIpAddress: declaration.ipAddress,
          declarationUserAgent: declaration.userAgent,
        },
        update: {
          submittedAt: now,
          reviewedAt: null,
          reviewerId: null,
          revisionReason: null,
          rejectionReason: null,
          adminNote: null,
          assignedManagerId: assignedManager?.id || null,
          managerAssignedAt: assignedManager ? now : null,
          managerReviewedAt: null,
          managerNote: null,
          inspectionDate: null,
          inspectionImages: Prisma.JsonNull,
          managerRecommendation: CommunityManagerRecommendation.PENDING,
          identityPassed: false,
          ownershipPassed: false,
          addressPassed: false,
          imagesPassed: false,
          detailsPassed: false,
          facilityPassed: false,
          safetyPassed: false,
          legalOccupancyPassed: false,
          informationAccurateConfirmed: true,
          legalResponsibilityAccepted: true,
          verificationConsentAccepted: true,
          declarationAcceptedAt: now,
          declarationVersion: "ROOM_VERIFICATION_DECLARATION_V2_CM",
          declarationIpAddress: declaration.ipAddress,
          declarationUserAgent: declaration.userAgent,
          documents: {
            updateMany: {
              where: {},
              data: { status: VerificationDocumentStatus.PENDING, note: null },
            },
          },
        },
      });

      return tx.room.update({
        where: { id: roomId },
        data: { status: RoomStatus.PENDING },
        include: adminRoomInclude,
      });
    });
  },

  getForAdmin: async (filters: { status?: RoomStatus; search?: string; page: number; limit: number }) => {
    const where = buildAdminRoomWhere(filters);
    const [rooms, total] = await Promise.all([
      prisma.room.findMany({
        where,
        include: adminRoomInclude,
        orderBy: [{ verification: { submittedAt: "desc" } }, { createdAt: "desc" }],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.room.count({ where }),
    ]);

    return { rooms, total, page: filters.page, limit: filters.limit, totalPages: Math.max(1, Math.ceil(total / filters.limit)) };
  },

  getDetailForAdmin: async (roomId: string) => {
    const room = await prisma.room.findUnique({ where: { id: roomId }, include: adminRoomInclude });
    if (!room) throw new ApiError(404, "Không tìm thấy phòng");
    return room;
  },

  getForCommunityManager: async (filters: {
    managerId: string;
    status?: RoomStatus;
    search?: string;
    page: number;
    limit: number;
  }) => {
    const scopeWhere = await communityManagerAreaService.buildManagerRoomScopeWhere(filters.managerId);
    const assignmentWhere: Prisma.RoomWhereInput[] = [
      { verification: { is: { assignedManagerId: filters.managerId } } },
    ];

    if (scopeWhere) {
      assignmentWhere.push({
        AND: [
          scopeWhere,
          { verification: { is: { assignedManagerId: null } } },
        ],
      });
    }

    const where: Prisma.RoomWhereInput = {
      ...buildAdminRoomWhere({ status: filters.status || RoomStatus.PENDING, search: filters.search }),
      OR: assignmentWhere,
    };

    const [rooms, total] = await Promise.all([
      prisma.room.findMany({
        where,
        include: adminRoomInclude,
        orderBy: [{ verification: { submittedAt: "desc" } }, { createdAt: "desc" }],
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
      }),
      prisma.room.count({ where }),
    ]);

    return { rooms, total, page: filters.page, limit: filters.limit, totalPages: Math.max(1, Math.ceil(total / filters.limit)) };
  },

  getDetailForCommunityManager: async (roomId: string, managerId: string) => {
    const room = await prisma.room.findUnique({ where: { id: roomId }, include: adminRoomInclude });
    if (!room) throw new ApiError(404, "Không tìm thấy phòng");
    if (room.status !== RoomStatus.PENDING) throw new ApiError(409, "Chỉ có thể xác minh phòng đang chờ duyệt");
    if (room.verification?.assignedManagerId && room.verification.assignedManagerId !== managerId) {
      throw new ApiError(403, "Hồ sơ này đã được phân công cho nhân viên khác");
    }
    if (!room.verification?.assignedManagerId) {
      const canAccess = await communityManagerAreaService.managerCanAccessRoom(managerId, {
        city: room.city,
        district: room.district,
        districtId: room.districtId,
      });
      if (!canAccess) {
        throw new ApiError(403, "Hồ sơ này không thuộc khu vực phụ trách của bạn");
      }
    }
    return room;
  },

  reviewByCommunityManager: async (
    roomId: string,
    managerId: string,
    data: {
      action: "recommend_approval" | "request_revision" | "recommend_rejection";
      managerNote?: string;
      inspectionDate?: string;
      inspectionImages?: string[];
      checklist: {
        identityPassed: boolean;
        ownershipPassed: boolean;
        addressPassed: boolean;
        imagesPassed: boolean;
        detailsPassed: boolean;
        facilityPassed: boolean;
        safetyPassed: boolean;
        legalOccupancyPassed: boolean;
      };
    }
  ) => {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { verification: true },
    });
    if (!room) throw new ApiError(404, "Không tìm thấy phòng");
    if (room.status !== RoomStatus.PENDING) throw new ApiError(409, "Chỉ có thể xác minh phòng đang chờ duyệt");
    if (room.verification?.assignedManagerId && room.verification.assignedManagerId !== managerId) {
      throw new ApiError(403, "Hồ sơ này đã được phân công cho nhân viên khác");
    }
    if (!room.verification?.assignedManagerId) {
      const canAccess = await communityManagerAreaService.managerCanAccessRoom(managerId, {
        city: room.city,
        district: room.district,
        districtId: room.districtId,
      });
      if (!canAccess) {
        throw new ApiError(403, "Hồ sơ này không thuộc khu vực phụ trách của bạn");
      }
    }
    if (data.action === "recommend_approval" && Object.values(data.checklist).some((value) => !value)) {
      throw new ApiError(400, "Cần hoàn tất toàn bộ checklist trước khi đề xuất duyệt");
    }
    if ((data.action === "request_revision" || data.action === "recommend_rejection") && !data.managerNote?.trim()) {
      throw new ApiError(400, "Vui lòng nhập ghi chú hoặc lý do");
    }

    const recommendation =
      data.action === "recommend_approval"
        ? CommunityManagerRecommendation.RECOMMEND_APPROVAL
        : data.action === "request_revision"
          ? CommunityManagerRecommendation.NEEDS_REVISION
          : CommunityManagerRecommendation.RECOMMEND_REJECTION;

    const nextStatus = data.action === "request_revision" ? RoomStatus.NEEDS_REVISION : RoomStatus.PENDING;

    return prisma.$transaction(async (tx) => {
      await tx.roomVerification.upsert({
        where: { roomId },
        create: {
          roomId,
          assignedManagerId: managerId,
          managerAssignedAt: new Date(),
          managerReviewedAt: new Date(),
          managerRecommendation: recommendation,
          managerNote: data.managerNote,
          inspectionDate: data.inspectionDate ? new Date(data.inspectionDate) : null,
          inspectionImages: data.inspectionImages || [],
          revisionReason: data.action === "request_revision" ? data.managerNote : null,
          rejectionReason: data.action === "recommend_rejection" ? data.managerNote : null,
          ...data.checklist,
        },
        update: {
          assignedManagerId: managerId,
          managerAssignedAt: room.verification?.managerAssignedAt || new Date(),
          managerReviewedAt: new Date(),
          managerRecommendation: recommendation,
          managerNote: data.managerNote,
          inspectionDate: data.inspectionDate ? new Date(data.inspectionDate) : null,
          inspectionImages: data.inspectionImages || [],
          revisionReason: data.action === "request_revision" ? data.managerNote : null,
          rejectionReason: data.action === "recommend_rejection" ? data.managerNote : null,
          ...data.checklist,
        },
      });

      return tx.room.update({
        where: { id: roomId },
        data: { status: nextStatus },
        include: adminRoomInclude,
      });
    });
  },

  review: async (
    roomId: string,
    adminId: string,
    data: {
      action: "approve" | "request_revision" | "reject" | "hide";
      reason?: string;
      adminNote?: string;
      checklist?: {
        identityPassed: boolean;
        ownershipPassed: boolean;
        addressPassed: boolean;
        imagesPassed: boolean;
        detailsPassed: boolean;
      };
    }
  ) => {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { verification: true },
    });
    if (!room) throw new ApiError(404, "Không tìm thấy phòng");

    if (data.action === "approve" && room.verification?.managerRecommendation !== CommunityManagerRecommendation.RECOMMEND_APPROVAL) {
      throw new ApiError(400, "Cần nhân viên quản lý cộng đồng xác minh và đề xuất duyệt trước");
    }
    if (
      data.action === "approve"
      && (!room.verification?.facilityPassed || !room.verification.safetyPassed || !room.verification.legalOccupancyPassed)
    ) {
      throw new ApiError(400, "Hồ sơ chưa hoàn tất checklist xác minh thực địa");
    }
    if (data.action === "approve" && (!data.checklist || Object.values(data.checklist).some((value) => !value))) {
      throw new ApiError(400, "Cần hoàn tất toàn bộ checklist trước khi phê duyệt");
    }
    if (
      data.action === "approve"
      && (!room.verification?.informationAccurateConfirmed
        || !room.verification.legalResponsibilityAccepted
        || !room.verification.verificationConsentAccepted
        || !room.verification.declarationAcceptedAt)
    ) {
      throw new ApiError(400, "Chủ nhà chưa hoàn tất cam kết xác minh bắt buộc");
    }
    if ((data.action === "request_revision" || data.action === "reject" || data.action === "hide") && !data.reason?.trim()) {
      throw new ApiError(400, "Vui lòng nhập lý do");
    }

    const nextStatus: RoomStatus =
      data.action === "approve"
        ? RoomStatus.AVAILABLE
        : data.action === "request_revision"
          ? RoomStatus.NEEDS_REVISION
          : data.action === "reject"
            ? RoomStatus.REJECTED
            : RoomStatus.HIDDEN;

    return prisma.$transaction(async (tx) => {
      const verification = await tx.roomVerification.upsert({
        where: { roomId },
        create: {
          roomId,
          reviewerId: adminId,
          reviewedAt: new Date(),
          revisionReason: data.action === "request_revision" ? data.reason : null,
          rejectionReason: data.action === "reject" ? data.reason : null,
          adminNote: data.adminNote,
          ...(data.checklist || {}),
        },
        update: {
          reviewerId: adminId,
          reviewedAt: new Date(),
          revisionReason: data.action === "request_revision" ? data.reason : null,
          rejectionReason: data.action === "reject" ? data.reason : null,
          adminNote: data.adminNote,
          ...(data.checklist || {}),
        },
      });

      const updatedRoom = await tx.room.update({
        where: { id: roomId },
        data: { status: nextStatus },
        include: adminRoomInclude,
      });

      await tx.adminLog.create({
        data: {
          adminId,
          targetUserId: room.ownerId,
          action: `ROOM_${data.action.toUpperCase()}`,
          targetId: roomId,
          targetType: "ROOM",
          oldValue: room.status,
          newValue: nextStatus,
          description: data.reason || data.adminNote || `Cập nhật trạng thái phòng thành ${nextStatus}`,
        },
      });

      return { room: updatedRoom, verification };
    });
  },
};
