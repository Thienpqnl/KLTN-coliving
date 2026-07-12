const { z } = require("zod");
const {
  areaMatchesRoom,
  findBestManagerForRoom,
  getManagerActiveAreas,
  managerCanAccessRoom,
} = require("./community-manager-area.cjs");
const { sanitizeForJson } = require("./serialization.cjs");
const identityClient = require("../shared/identity-client.cjs");
const { auditEvent } = require("../shared/audit-event.cjs");
const { enqueueEvent } = require("./outbox.cjs");

const editableStatuses = new Set(["DRAFT", "NEEDS_REVISION", "REJECTED"]);
const documentTypes = new Set(["IDENTITY", "OWNERSHIP", "ROOM_PROOF", "OTHER"]);
const roomStatuses = new Set(["DRAFT", "PENDING", "AVAILABLE", "OCCUPIED", "NEEDS_REVISION", "REJECTED", "HIDDEN"]);
const checkStatuses = new Set(["PENDING", "MATCHED", "MISMATCHED", "NEEDS_REVIEW"]);

const verificationInclude = {
  documents: { orderBy: { createdAt: "desc" } },
  checks: { orderBy: { createdAt: "asc" } },
};

const adminRoomInclude = {
  images: { orderBy: { sortOrder: "asc" } },
  amenities: { include: { amenity: true } },
  verification: { include: verificationInclude },
};

async function hydrateRoomUsers(room, clients = identityClient) {
  if (!room) return room;
  const ids = [
    room.ownerId,
    room.verification?.reviewerId,
    room.verification?.assignedManagerId,
  ].filter(Boolean);
  const users = await clients.userMap(ids);
  return {
    ...room,
    owner: users.get(room.ownerId) || null,
    verification: room.verification
      ? {
          ...room.verification,
          reviewer: users.get(room.verification.reviewerId) || null,
          assignedManager: users.get(room.verification.assignedManagerId) || null,
        }
      : null,
  };
}

async function hydrateRoomsUsers(rooms, clients = identityClient) {
  const ids = rooms.flatMap((room) => [
    room.ownerId,
    room.verification?.reviewerId,
    room.verification?.assignedManagerId,
  ]).filter(Boolean);
  const users = await clients.userMap(ids);
  return rooms.map((room) => ({
    ...room,
    owner: users.get(room.ownerId) || null,
    verification: room.verification
      ? {
          ...room.verification,
          reviewer: users.get(room.verification.reviewerId) || null,
          assignedManager: users.get(room.verification.assignedManagerId) || null,
        }
      : null,
  }));
}

const documentSchema = z.object({
  type: z.string().refine((value) => documentTypes.has(value), "Loại tài liệu không hợp lệ"),
  fileUrl: z.string().url("URL tài liệu không hợp lệ"),
  note: z.string().max(500).optional(),
});

const declarationSchema = z.object({
  informationAccurateConfirmed: z.literal(true),
  legalResponsibilityAccepted: z.literal(true),
  verificationConsentAccepted: z.literal(true),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

const managerChecklistSchema = z.object({
  identityPassed: z.boolean(),
  ownershipPassed: z.boolean(),
  addressPassed: z.boolean(),
  imagesPassed: z.boolean(),
  detailsPassed: z.boolean(),
  facilityPassed: z.boolean(),
  safetyPassed: z.boolean(),
  legalOccupancyPassed: z.boolean(),
});

const managerReviewSchema = z.object({
  action: z.enum(["recommend_approval", "request_revision", "recommend_rejection"]),
  managerNote: z.string().max(2000).optional(),
  inspectionDate: z.string().optional(),
  inspectionImages: z.array(z.string().url()).optional(),
  checklist: managerChecklistSchema,
});

const updateCheckSchema = z.object({
  status: z.string().refine((value) => checkStatuses.has(value), "Trạng thái đối khớp không hợp lệ"),
  note: z.string().max(2000).nullable().optional(),
});

const adminChecklistSchema = z.object({
  identityPassed: z.boolean(),
  ownershipPassed: z.boolean(),
  addressPassed: z.boolean(),
  imagesPassed: z.boolean(),
  detailsPassed: z.boolean(),
});

const adminReviewSchema = z.object({
  action: z.enum(["approve", "request_revision", "reject", "hide"]),
  reason: z.string().max(1000).optional(),
  adminNote: z.string().max(1000).optional(),
  checklist: adminChecklistSchema.optional(),
  ipAddress: z.string().max(100).optional(),
  userAgent: z.string().max(1000).optional(),
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

function requireRole(identity, role, message) {
  return identity?.userId && identity.role === role ? null : failure(403, message);
}

function assertHostOwns(room, ownerId) {
  if (!room || room.ownerId !== ownerId) {
    return failure(403, "Bạn không có quyền quản lý phòng này");
  }
  return null;
}

function buildRoomLocation(room) {
  return {
    city: room.city,
    provinceCode: room.provinceCode,
    ward: room.ward,
    wardCode: room.wardCode,
    district: room.district,
    districtId: room.districtId,
    address: room.address,
  };
}

function validateSubmission(room) {
  const errors = {};
  const addError = (field, message) => {
    errors[field] = [...(errors[field] || []), message];
  };

  if (room.title.trim().length < 3) addError("title", "Tên phòng chưa hợp lệ");
  if (room.description.trim().length < 10) addError("description", "Mô tả cần ít nhất 10 ký tự");
  if (!room.priceValue || room.priceValue <= BigInt(0)) addError("price", "Giá thuê chưa hợp lệ");
  if (!room.areaValue || room.areaValue.lte(0)) addError("area", "Diện tích chưa hợp lệ");
  if (room.address.trim().length < 5) addError("address", "Địa chỉ chưa đầy đủ");
  if (room.latitude == null || room.longitude == null) addError("location", "Cần chọn vị trí trên bản đồ");
  if (room.images.length < 3) addError("images", "Cần ít nhất 3 ảnh phòng");

  const types = new Set(room.verification?.documents.map((document) => document.type) || []);
  if (!types.has("IDENTITY")) addError("identityDocument", "Thiếu minh chứng danh tính chủ nhà");
  if (!types.has("OWNERSHIP")) addError("ownershipDocument", "Thiếu giấy tờ chứng minh quyền cho thuê");
  if (!types.has("ROOM_PROOF")) addError("roomProof", "Thiếu ảnh hoặc tài liệu chứng minh phòng thực tế");

  return Object.keys(errors).length > 0
    ? failure(400, "Thông tin phòng chưa đủ để gửi xét duyệt", errors)
    : null;
}

function hasDocument(room, type) {
  return Boolean(room.verification?.documents.some((document) => document.type === type));
}

function buildVerificationChecks(room) {
  const locationParts = [room.ward, room.city].filter(Boolean).join(", ");
  return [
    {
      type: "OWNER_PHONE",
      status: room.owner?.phoneVerified ? "MATCHED" : "NEEDS_REVIEW",
      sourceValue: room.owner?.phone || "Chưa có số điện thoại",
      targetValue: room.owner?.phoneVerified ? "Đã xác minh OTP" : "Chưa xác minh OTP",
      note: room.owner?.phoneVerified
        ? "Hệ thống đã xác minh số điện thoại bằng OTP."
        : "Cần yêu cầu chủ nhà xác minh số điện thoại.",
    },
    {
      type: "OWNER_IDENTITY_DOCUMENT",
      status: hasDocument(room, "IDENTITY") ? "NEEDS_REVIEW" : "MISMATCHED",
      sourceValue: room.owner?.fullName || room.owner?.name || "Chưa có tên chủ nhà",
      targetValue: hasDocument(room, "IDENTITY") ? "Đã có giấy tờ danh tính" : "Thiếu giấy tờ danh tính",
      note: "Community Manager cần đối chiếu họ tên chủ nhà với giấy tờ danh tính.",
    },
    {
      type: "OWNERSHIP_DOCUMENT",
      status: hasDocument(room, "OWNERSHIP") ? "NEEDS_REVIEW" : "MISMATCHED",
      sourceValue: room.address,
      targetValue: hasDocument(room, "OWNERSHIP") ? "Đã có giấy tờ quyền cho thuê/sở hữu" : "Thiếu giấy tờ quyền cho thuê/sở hữu",
      note: "Cần kiểm tra giấy tờ có cho phép chủ nhà cho thuê hoặc chia sẻ phòng hay không.",
    },
    {
      type: "ROOM_ADDRESS",
      status: room.address && locationParts ? "NEEDS_REVIEW" : "PENDING",
      sourceValue: room.address,
      targetValue: locationParts || "Chưa có tỉnh/thành hoặc phường/xã",
      note: "Đối chiếu địa chỉ khai báo với địa chỉ trên giấy tờ và thực địa.",
    },
    {
      type: "MAP_LOCATION",
      status: room.latitude != null && room.longitude != null ? "NEEDS_REVIEW" : "MISMATCHED",
      sourceValue: room.latitude != null && room.longitude != null ? `${room.latitude}, ${room.longitude}` : "Chưa có tọa độ",
      targetValue: room.address,
      note: "Kiểm tra tọa độ Google Maps có gần đúng địa chỉ phòng và vị trí thực tế hay không.",
    },
    {
      type: "ROOM_IMAGES",
      status: room.images.length >= 3 ? "NEEDS_REVIEW" : "MISMATCHED",
      sourceValue: `${room.images.length} ảnh`,
      targetValue: "Tối thiểu 3 ảnh phòng",
      note: "Kiểm tra ảnh có đúng hiện trạng phòng và không bị trùng lặp bất thường.",
    },
    {
      type: "ROOM_DETAILS",
      status: room.priceValue && room.areaValue ? "NEEDS_REVIEW" : "MISMATCHED",
      sourceValue: `Giá: ${room.priceValue?.toString() || "chưa có"}; Diện tích: ${room.areaValue?.toString() || "chưa có"}`,
      targetValue: `${room.title} - ${room.description.slice(0, 160)}`,
      note: "Đối chiếu giá, diện tích và mô tả với thực tế khi khảo sát.",
    },
    {
      type: "LEGAL_DECLARATION",
      status: "MATCHED",
      sourceValue: "Chủ nhà đã gửi cam kết pháp lý khi nộp hồ sơ",
      targetValue: "Thông tin đúng sự thật, chịu trách nhiệm pháp luật, đồng ý xác minh",
      note: "Cam kết là điều kiện bắt buộc trước khi hồ sơ được gửi xét duyệt.",
    },
  ];
}

function buildAdminRoomWhere(filters, ownerIds = []) {
  const searchConditions = filters.search
    ? [
        { title: { contains: filters.search, mode: "insensitive" } },
        { address: { contains: filters.search, mode: "insensitive" } },
        ...(ownerIds.length > 0 ? [{ ownerId: { in: ownerIds } }] : []),
      ]
    : [];
  return {
    ...(filters.status ? { status: filters.status } : {}),
    ...(searchConditions.length > 0 ? { OR: searchConditions } : {}),
  };
}

async function getAccessiblePendingRoom(prisma, roomId, managerId) {
  const room = await prisma.room.findUnique({ where: { id: roomId }, include: { verification: true } });
  if (!room) return failure(404, "Không tìm thấy phòng");
  if (room.status !== "PENDING") return failure(409, "Chỉ có thể xác minh phòng đang chờ duyệt");
  if (room.verification?.assignedManagerId && room.verification.assignedManagerId !== managerId) {
    return failure(403, "Hồ sơ này đã được phân công cho nhân viên khác");
  }
  if (!room.verification?.assignedManagerId) {
    const canAccess = await managerCanAccessRoom(prisma, managerId, buildRoomLocation(room));
    if (!canAccess) return failure(403, "Hồ sơ này không thuộc khu vực phụ trách của bạn");
  }
  return { room };
}

async function ensureVerificationChecks(prisma, roomId, clients = identityClient) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      images: { select: { id: true } },
      verification: {
        include: {
          documents: { select: { type: true } },
          checks: { select: { id: true } },
        },
      },
    },
  });

  if (!room?.verification || room.verification.checks.length > 0) return;
  const owner = await clients.getUser(room.ownerId);

  await prisma.verificationCheck.createMany({
    data: buildVerificationChecks({ ...room, owner }).map((check) => ({
      ...check,
      verificationId: room.verification.id,
    })),
    skipDuplicates: true,
  });
}

async function getForHost(prisma, identity, roomId, clients = identityClient) {
  const denied = requireRole(identity, "HOST", "Chỉ chủ nhà được truy cập");
  if (denied) return denied;

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
  if (!room) return failure(404, "Không tìm thấy phòng");

  const notOwner = assertHostOwns(room, identity.userId);
  if (notOwner) return notOwner;
  return { status: 200, payload: sanitizeForJson(await hydrateRoomUsers(room, clients)) };
}

async function addDocument(prisma, identity, roomId, input) {
  const denied = requireRole(identity, "HOST", "Chỉ chủ nhà được truy cập");
  if (denied) return denied;
  const parsed = validate(documentSchema, input);
  if (!parsed.ok) return parsed;

  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { id: true, ownerId: true, status: true } });
  if (!room) return failure(404, "Không tìm thấy phòng");
  const notOwner = assertHostOwns(room, identity.userId);
  if (notOwner) return notOwner;
  if (!editableStatuses.has(room.status)) {
    return failure(409, "Không thể thay đổi minh chứng khi phòng đang được xét duyệt hoặc đã công khai");
  }

  const verification = await prisma.roomVerification.upsert({
    where: { roomId },
    create: { roomId },
    update: {},
  });

  const document = await prisma.roomVerificationDocument.create({
    data: {
      verificationId: verification.id,
      type: parsed.data.type,
      fileUrl: parsed.data.fileUrl,
      note: parsed.data.note,
    },
  });
  return { status: 201, payload: sanitizeForJson(document) };
}

async function deleteDocument(prisma, identity, roomId, documentId) {
  const denied = requireRole(identity, "HOST", "Chỉ chủ nhà được truy cập");
  if (denied) return denied;

  const document = await prisma.roomVerificationDocument.findUnique({
    where: { id: documentId },
    include: { verification: { select: { roomId: true, room: { select: { ownerId: true, status: true } } } } },
  });
  if (!document || document.verification.roomId !== roomId) return failure(404, "Không tìm thấy tài liệu");

  const notOwner = assertHostOwns(document.verification.room, identity.userId);
  if (notOwner) return notOwner;
  if (!editableStatuses.has(document.verification.room.status)) {
    return failure(409, "Không thể xóa minh chứng ở trạng thái hiện tại");
  }

  await prisma.roomVerificationDocument.delete({ where: { id: documentId } });
  return { status: 200, payload: { id: documentId } };
}

async function submit(prisma, identity, roomId, input, clients = identityClient) {
  const denied = requireRole(identity, "HOST", "Chỉ chủ nhà được gửi xét duyệt");
  if (denied) return denied;
  const parsed = validate(declarationSchema, input);
  if (!parsed.ok) return parsed;

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      images: { select: { id: true } },
      verification: { include: { documents: true } },
    },
  });
  if (!room) return failure(404, "Không tìm thấy phòng");
  const notOwner = assertHostOwns(room, identity.userId);
  if (notOwner) return notOwner;
  if (!editableStatuses.has(room.status)) {
    return failure(409, "Phòng không thể gửi xét duyệt ở trạng thái hiện tại");
  }
  const invalid = validateSubmission(room);
  if (invalid) return invalid;
  const owner = await clients.getUser(room.ownerId);
  const hydratedRoom = { ...room, owner };

  const assignedManager = await findBestManagerForRoom(prisma, buildRoomLocation(room), clients);
  const now = new Date();
  const verificationChecks = buildVerificationChecks(hydratedRoom);
  const declaration = parsed.data;

  const updatedRoom = await prisma.$transaction(async (tx) => {
    await tx.roomVerification.upsert({
      where: { roomId },
      create: {
        roomId,
        submittedAt: now,
        assignedManagerId: assignedManager?.id || null,
        managerAssignedAt: assignedManager ? now : null,
        managerRecommendation: "PENDING",
        informationAccurateConfirmed: true,
        legalResponsibilityAccepted: true,
        verificationConsentAccepted: true,
        declarationAcceptedAt: now,
        declarationVersion: "ROOM_VERIFICATION_DECLARATION_V2_CM",
        declarationIpAddress: declaration.ipAddress,
        declarationUserAgent: declaration.userAgent,
        checks: { createMany: { data: verificationChecks } },
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
        inspectionImages: [],
        managerRecommendation: "PENDING",
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
        documents: { updateMany: { where: {}, data: { status: "PENDING", note: null } } },
        checks: { deleteMany: {}, createMany: { data: verificationChecks } },
      },
    });

    return tx.room.update({
      where: { id: roomId },
      data: { status: "PENDING" },
      include: adminRoomInclude,
    });
  });

  return { status: 200, payload: sanitizeForJson(await hydrateRoomUsers(updatedRoom, clients)) };
}

async function listForAdmin(prisma, identity, query, clients = identityClient) {
  const denied = requireRole(identity, "ADMIN", "Chỉ admin được truy cập");
  if (denied) return denied;
  const status = roomStatuses.has(String(query.status)) ? String(query.status) : undefined;
  const search = String(query.search || "").trim() || undefined;
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(50, Math.max(1, Number(query.limit || 20)));
  const ownerIds = search
    ? (await clients.searchUsers({ search })).map((user) => user.id)
    : [];
  const where = buildAdminRoomWhere({ status, search }, ownerIds);

  const [rooms, total] = await Promise.all([
    prisma.room.findMany({
      where,
      include: adminRoomInclude,
      orderBy: [{ verification: { submittedAt: "desc" } }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.room.count({ where }),
  ]);
  const hydratedRooms = await hydrateRoomsUsers(rooms, clients);
  return {
    status: 200,
    payload: sanitizeForJson({ rooms: hydratedRooms, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) }),
  };
}

async function getDetailForAdmin(prisma, identity, roomId, clients = identityClient) {
  const denied = requireRole(identity, "ADMIN", "Chỉ admin được truy cập");
  if (denied) return denied;
  const room = await prisma.room.findUnique({ where: { id: roomId }, include: adminRoomInclude });
  if (!room) return failure(404, "Không tìm thấy phòng");
  return { status: 200, payload: sanitizeForJson(await hydrateRoomUsers(room, clients)) };
}

async function listForCommunityManager(prisma, identity, query, clients = identityClient) {
  const denied = requireRole(identity, "COMMUNITY_MANAGER", "Chỉ nhân viên quản lý cộng đồng được truy cập");
  if (denied) return denied;

  const status = roomStatuses.has(String(query.status)) ? String(query.status) : undefined;
  const search = String(query.search || "").trim() || undefined;
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(50, Math.max(1, Number(query.limit || 20)));
  const areas = await getManagerActiveAreas(prisma, identity.userId);
  const ownerIds = search
    ? (await clients.searchUsers({ search })).map((user) => user.id)
    : [];
  const where = {
    ...buildAdminRoomWhere({ status: status || "PENDING", search }, ownerIds),
    verification: { is: { OR: [{ assignedManagerId: identity.userId }, { assignedManagerId: null }] } },
  };

  const rooms = await prisma.room.findMany({
    where,
    include: adminRoomInclude,
    orderBy: [{ verification: { submittedAt: "desc" } }, { createdAt: "desc" }],
  });

  const accessibleRooms = rooms.filter((room) => {
    if (room.verification?.assignedManagerId === identity.userId) return true;
    if (room.verification?.assignedManagerId) return false;
    return areas.some((area) => areaMatchesRoom(area, buildRoomLocation(room)));
  });
  const total = accessibleRooms.length;
  const pagedRooms = await hydrateRoomsUsers(
    accessibleRooms.slice((page - 1) * limit, page * limit),
    clients,
  );

  return {
    status: 200,
    payload: sanitizeForJson({ rooms: pagedRooms, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) }),
  };
}

async function getDetailForCommunityManager(prisma, identity, roomId, clients = identityClient) {
  const denied = requireRole(identity, "COMMUNITY_MANAGER", "Chỉ nhân viên quản lý cộng đồng được truy cập");
  if (denied) return denied;
  const access = await getAccessiblePendingRoom(prisma, roomId, identity.userId);
  if (!access.room) return access;
  await ensureVerificationChecks(prisma, roomId, clients);

  const room = await prisma.room.findUnique({ where: { id: roomId }, include: adminRoomInclude });
  if (!room) return failure(404, "Không tìm thấy phòng");
  return { status: 200, payload: sanitizeForJson(await hydrateRoomUsers(room, clients)) };
}

async function updateVerificationCheck(prisma, identity, roomId, checkId, input) {
  const denied = requireRole(identity, "COMMUNITY_MANAGER", "Chỉ nhân viên quản lý cộng đồng được cập nhật đối khớp hồ sơ");
  if (denied) return denied;
  const parsed = validate(updateCheckSchema, input);
  if (!parsed.ok) return parsed;
  const access = await getAccessiblePendingRoom(prisma, roomId, identity.userId);
  if (!access.room) return access;

  const check = await prisma.verificationCheck.findFirst({ where: { id: checkId, verification: { roomId } } });
  if (!check) return failure(404, "Không tìm thấy tiêu chí đối khớp");

  const updatedCheck = await prisma.verificationCheck.update({
    where: { id: checkId },
    data: {
      status: parsed.data.status,
      note: parsed.data.note?.trim() || null,
      checkedById: identity.userId,
      checkedAt: new Date(),
    },
  });
  return { status: 200, payload: sanitizeForJson(updatedCheck) };
}

async function reviewByCommunityManager(prisma, identity, roomId, input, clients = identityClient) {
  const denied = requireRole(identity, "COMMUNITY_MANAGER", "Chỉ nhân viên quản lý cộng đồng được xác minh hồ sơ");
  if (denied) return denied;
  const parsed = validate(managerReviewSchema, input);
  if (!parsed.ok) return parsed;
  const data = parsed.data;
  const access = await getAccessiblePendingRoom(prisma, roomId, identity.userId);
  if (!access.room) return access;

  if (data.action === "recommend_approval" && Object.values(data.checklist).some((value) => !value)) {
    return failure(400, "Cần hoàn tất toàn bộ checklist trước khi đề xuất duyệt");
  }
  if ((data.action === "request_revision" || data.action === "recommend_rejection") && !data.managerNote?.trim()) {
    return failure(400, "Vui lòng nhập ghi chú hoặc lý do");
  }

  const recommendation = data.action === "recommend_approval"
    ? "RECOMMEND_APPROVAL"
    : data.action === "request_revision"
      ? "NEEDS_REVISION"
      : "RECOMMEND_REJECTION";
  const nextStatus = data.action === "request_revision" ? "NEEDS_REVISION" : "PENDING";

  const updatedRoom = await prisma.$transaction(async (tx) => {
    await tx.roomVerification.upsert({
      where: { roomId },
      create: {
        roomId,
        assignedManagerId: identity.userId,
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
        assignedManagerId: identity.userId,
        managerAssignedAt: access.room.verification?.managerAssignedAt || new Date(),
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
  return { status: 200, payload: sanitizeForJson(await hydrateRoomUsers(updatedRoom, clients)) };
}

async function reviewByAdmin(prisma, identity, roomId, input, clients = identityClient) {
  const denied = requireRole(identity, "ADMIN", "Chỉ admin được xét duyệt");
  if (denied) return denied;
  const parsed = validate(adminReviewSchema, input);
  if (!parsed.ok) return parsed;
  const data = parsed.data;

  const room = await prisma.room.findUnique({ where: { id: roomId }, include: { verification: true } });
  if (!room) return failure(404, "Không tìm thấy phòng");

  if (data.action === "approve" && room.verification?.managerRecommendation !== "RECOMMEND_APPROVAL") {
    return failure(400, "Cần nhân viên quản lý cộng đồng xác minh và đề xuất duyệt trước");
  }
  if (
    data.action === "approve" &&
    (!room.verification?.facilityPassed || !room.verification.safetyPassed || !room.verification.legalOccupancyPassed)
  ) {
    return failure(400, "Hồ sơ chưa hoàn tất checklist xác minh thực địa");
  }
  if (data.action === "approve" && (!data.checklist || Object.values(data.checklist).some((value) => !value))) {
    return failure(400, "Cần hoàn tất toàn bộ checklist trước khi phê duyệt");
  }
  if (
    data.action === "approve" &&
    (!room.verification?.informationAccurateConfirmed ||
      !room.verification.legalResponsibilityAccepted ||
      !room.verification.verificationConsentAccepted ||
      !room.verification.declarationAcceptedAt)
  ) {
    return failure(400, "Chủ nhà chưa hoàn tất cam kết xác minh bắt buộc");
  }
  if ((data.action === "request_revision" || data.action === "reject" || data.action === "hide") && !data.reason?.trim()) {
    return failure(400, "Vui lòng nhập lý do");
  }

  const nextStatus = data.action === "approve"
    ? "AVAILABLE"
    : data.action === "request_revision"
      ? "NEEDS_REVISION"
      : data.action === "reject"
        ? "REJECTED"
        : "HIDDEN";

  const result = await prisma.$transaction(async (tx) => {
    const verification = await tx.roomVerification.upsert({
      where: { roomId },
      create: {
        roomId,
        reviewerId: identity.userId,
        reviewedAt: new Date(),
        revisionReason: data.action === "request_revision" ? data.reason : null,
        rejectionReason: data.action === "reject" ? data.reason : null,
        adminNote: data.adminNote,
        ...(data.checklist || {}),
      },
      update: {
        reviewerId: identity.userId,
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

    await enqueueEvent(
      tx,
      auditEvent({
        adminId: identity.userId,
        targetUserId: room.ownerId,
        action: `ROOM_${data.action.toUpperCase()}`,
        targetId: roomId,
        targetType: "ROOM",
        oldValue: room.status,
        newValue: nextStatus,
        description: data.reason || data.adminNote || `Cập nhật trạng thái phòng thành ${nextStatus}`,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      }),
    );

    return { room: updatedRoom, verification };
  });

  return {
    status: 200,
    payload: sanitizeForJson({
      ...result,
      room: await hydrateRoomUsers(result.room, clients),
    }),
  };
}

module.exports = {
  addDocument,
  deleteDocument,
  getDetailForAdmin,
  getDetailForCommunityManager,
  getForHost,
  listForAdmin,
  listForCommunityManager,
  reviewByAdmin,
  reviewByCommunityManager,
  submit,
  updateVerificationCheck,
};
