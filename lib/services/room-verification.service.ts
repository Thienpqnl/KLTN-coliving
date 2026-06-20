import {
  Prisma,
  RoomStatus,
  VerificationDocumentStatus,
  VerificationDocumentType,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";

const verificationInclude = {
  documents: { orderBy: { createdAt: "desc" as const } },
  reviewer: {
    select: { id: true, name: true, fullName: true, email: true },
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

export const roomVerificationService = {
  getForHost: async (roomId: string, ownerId: string) => {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: {
        id: true,
        ownerId: true,
        status: true,
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

  submit: async (roomId: string, ownerId: string) => {
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

    return prisma.$transaction(async (tx) => {
      await tx.roomVerification.upsert({
        where: { roomId },
        create: { roomId, submittedAt: new Date() },
        update: {
          submittedAt: new Date(),
          reviewedAt: null,
          reviewerId: null,
          revisionReason: null,
          rejectionReason: null,
          adminNote: null,
          identityPassed: false,
          ownershipPassed: false,
          addressPassed: false,
          imagesPassed: false,
          detailsPassed: false,
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
    const where: Prisma.RoomWhereInput = {
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

  getDetailForAdmin: async (roomId: string) => {
    const room = await prisma.room.findUnique({ where: { id: roomId }, include: adminRoomInclude });
    if (!room) throw new ApiError(404, "Không tìm thấy phòng");
    return room;
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

    if (data.action === "approve" && (!data.checklist || Object.values(data.checklist).some((value) => !value))) {
      throw new ApiError(400, "Cần hoàn tất toàn bộ checklist trước khi phê duyệt");
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
