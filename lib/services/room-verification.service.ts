import {
  CommunityManagerRecommendation,
  Prisma,
  RoomStatus,
  VerificationCheckStatus,
  VerificationCheckType,
  VerificationDocumentStatus,
  VerificationDocumentType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { areaMatchesRoom, communityManagerAreaService } from "@/lib/services/community-manager-area.service";

const verificationInclude = {
  documents: { orderBy: { createdAt: "desc" as const } },
  checks: { orderBy: { createdAt: "asc" as const } },
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

type VerificationCheckSeedRoom = {
  title: string;
  description: string;
  address: string;
  city: string | null;
  ward: string | null;
  latitude: number | null;
  longitude: number | null;
  priceValue: bigint | null;
  areaValue: Prisma.Decimal | null;
  images: { id: string }[];
  owner: {
    fullName: string | null;
    name: string;
    phone: string | null;
    phoneVerified: boolean;
  } | null;
  verification: { documents: { type: VerificationDocumentType }[] } | null;
};

function hasDocument(room: VerificationCheckSeedRoom, type: VerificationDocumentType) {
  return Boolean(room.verification?.documents.some((document) => document.type === type));
}

function buildVerificationChecks(room: VerificationCheckSeedRoom) {
  const locationParts = [room.ward, room.city].filter(Boolean).join(", ");
  return [
    {
      type: VerificationCheckType.OWNER_PHONE,
      status: room.owner?.phoneVerified ? VerificationCheckStatus.MATCHED : VerificationCheckStatus.NEEDS_REVIEW,
      sourceValue: room.owner?.phone || "Chưa có số điện thoại",
      targetValue: room.owner?.phoneVerified ? "Đã xác minh OTP" : "Chưa xác minh OTP",
      note: room.owner?.phoneVerified ? "Hệ thống đã xác minh số điện thoại bằng OTP." : "Cần yêu cầu chủ nhà xác minh số điện thoại.",
    },
    {
      type: VerificationCheckType.OWNER_IDENTITY_DOCUMENT,
      status: hasDocument(room, VerificationDocumentType.IDENTITY) ? VerificationCheckStatus.NEEDS_REVIEW : VerificationCheckStatus.MISMATCHED,
      sourceValue: room.owner?.fullName || room.owner?.name || "Chưa có tên chủ nhà",
      targetValue: hasDocument(room, VerificationDocumentType.IDENTITY) ? "Đã có giấy tờ danh tính" : "Thiếu giấy tờ danh tính",
      note: "Community Manager cần đối chiếu họ tên chủ nhà với giấy tờ danh tính.",
    },
    {
      type: VerificationCheckType.OWNERSHIP_DOCUMENT,
      status: hasDocument(room, VerificationDocumentType.OWNERSHIP) ? VerificationCheckStatus.NEEDS_REVIEW : VerificationCheckStatus.MISMATCHED,
      sourceValue: room.address,
      targetValue: hasDocument(room, VerificationDocumentType.OWNERSHIP) ? "Đã có giấy tờ quyền cho thuê/sở hữu" : "Thiếu giấy tờ quyền cho thuê/sở hữu",
      note: "Cần kiểm tra giấy tờ có cho phép chủ nhà cho thuê hoặc chia sẻ phòng hay không.",
    },
    {
      type: VerificationCheckType.ROOM_ADDRESS,
      status: room.address && locationParts ? VerificationCheckStatus.NEEDS_REVIEW : VerificationCheckStatus.PENDING,
      sourceValue: room.address,
      targetValue: locationParts || "Chưa có tỉnh/thành hoặc phường/xã",
      note: "Đối chiếu địa chỉ khai báo với địa chỉ trên giấy tờ và thực địa.",
    },
    {
      type: VerificationCheckType.MAP_LOCATION,
      status: room.latitude != null && room.longitude != null ? VerificationCheckStatus.NEEDS_REVIEW : VerificationCheckStatus.MISMATCHED,
      sourceValue: room.latitude != null && room.longitude != null ? `${room.latitude}, ${room.longitude}` : "Chưa có tọa độ",
      targetValue: room.address,
      note: "Kiểm tra tọa độ Google Maps có gần đúng địa chỉ phòng và vị trí thực tế hay không.",
    },
    {
      type: VerificationCheckType.ROOM_IMAGES,
      status: room.images.length >= 3 ? VerificationCheckStatus.NEEDS_REVIEW : VerificationCheckStatus.MISMATCHED,
      sourceValue: `${room.images.length} ảnh`,
      targetValue: "Tối thiểu 3 ảnh phòng",
      note: "Kiểm tra ảnh có đúng hiện trạng phòng và không bị trùng lặp bất thường.",
    },
    {
      type: VerificationCheckType.ROOM_DETAILS,
      status: room.priceValue && room.areaValue ? VerificationCheckStatus.NEEDS_REVIEW : VerificationCheckStatus.MISMATCHED,
      sourceValue: `Giá: ${room.priceValue?.toString() || "chưa có"}; Diện tích: ${room.areaValue?.toString() || "chưa có"}`,
      targetValue: `${room.title} - ${room.description.slice(0, 160)}`,
      note: "Đối chiếu giá, diện tích và mô tả với thực tế khi khảo sát.",
    },
    {
      type: VerificationCheckType.LEGAL_DECLARATION,
      status: VerificationCheckStatus.MATCHED,
      sourceValue: "Chủ nhà đã gửi cam kết pháp lý khi nộp hồ sơ",
      targetValue: "Thông tin đúng sự thật, chịu trách nhiệm pháp luật, đồng ý xác minh",
      note: "Cam kết là điều kiện bắt buộc trước khi hồ sơ được gửi xét duyệt.",
    },
  ];
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

async function assertCommunityManagerCanAccessRoom(roomId: string, managerId: string) {
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
      provinceCode: room.provinceCode,
      ward: room.ward,
      wardCode: room.wardCode,
      district: room.district,
      districtId: room.districtId,
      address: room.address,
    });
    if (!canAccess) {
      throw new ApiError(403, "Hồ sơ này không thuộc khu vực phụ trách của bạn");
    }
  }

  return room;
}

async function ensureVerificationChecks(roomId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      images: { select: { id: true } },
      owner: { select: { fullName: true, name: true, phone: true, phoneVerified: true } },
      verification: {
        include: {
          documents: { select: { type: true } },
          checks: { select: { id: true } },
        },
      },
    },
  });

  if (!room?.verification || room.verification.checks.length > 0) return;

  await prisma.verificationCheck.createMany({
    data: buildVerificationChecks(room).map((check) => ({
      ...check,
      verificationId: room.verification!.id,
    })),
    skipDuplicates: true,
  });
}

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
        owner: { select: { fullName: true, name: true, phone: true, phoneVerified: true } },
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
      provinceCode: room.provinceCode,
      ward: room.ward,
      wardCode: room.wardCode,
      district: room.district,
      districtId: room.districtId,
      address: room.address,
    });
    const now = new Date();
    const verificationChecks = buildVerificationChecks(room);

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
          checks: {
            createMany: {
              data: verificationChecks,
            },
          },
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
          checks: {
            deleteMany: {},
            createMany: {
              data: verificationChecks,
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
    const areas = await communityManagerAreaService.getManagerActiveAreas(filters.managerId);
    const where: Prisma.RoomWhereInput = {
      ...buildAdminRoomWhere({ status: filters.status || RoomStatus.PENDING, search: filters.search }),
      verification: {
        is: {
          OR: [{ assignedManagerId: filters.managerId }, { assignedManagerId: null }],
        },
      },
    };

    const rooms = await prisma.room.findMany({
      where,
      include: adminRoomInclude,
      orderBy: [{ verification: { submittedAt: "desc" } }, { createdAt: "desc" }],
    });

    const accessibleRooms = rooms.filter((room) => {
      if (room.verification?.assignedManagerId === filters.managerId) return true;
      if (room.verification?.assignedManagerId) return false;

      return areas.some((area) =>
        areaMatchesRoom(area, {
          city: room.city,
          provinceCode: room.provinceCode,
          ward: room.ward,
          wardCode: room.wardCode,
          district: room.district,
          districtId: room.districtId,
          address: room.address,
        })
      );
    });

    const total = accessibleRooms.length;
    const pagedRooms = accessibleRooms.slice((filters.page - 1) * filters.limit, filters.page * filters.limit);

    return { rooms: pagedRooms, total, page: filters.page, limit: filters.limit, totalPages: Math.max(1, Math.ceil(total / filters.limit)) };
  },

  getDetailForCommunityManager: async (roomId: string, managerId: string) => {
    await assertCommunityManagerCanAccessRoom(roomId, managerId);
    await ensureVerificationChecks(roomId);

    const room = await prisma.room.findUnique({ where: { id: roomId }, include: adminRoomInclude });
    if (!room) throw new ApiError(404, "Không tìm thấy phòng");
    return room;
  },

  updateVerificationCheck: async (
    roomId: string,
    checkId: string,
    managerId: string,
    data: { status: VerificationCheckStatus; note?: string | null }
  ) => {
    await assertCommunityManagerCanAccessRoom(roomId, managerId);

    const check = await prisma.verificationCheck.findFirst({
      where: { id: checkId, verification: { roomId } },
    });
    if (!check) throw new ApiError(404, "Không tìm thấy tiêu chí đối khớp");

    return prisma.verificationCheck.update({
      where: { id: checkId },
      data: {
        status: data.status,
        note: data.note?.trim() || null,
        checkedById: managerId,
        checkedAt: new Date(),
      },
    });
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
    const room = await assertCommunityManagerCanAccessRoom(roomId, managerId);
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
