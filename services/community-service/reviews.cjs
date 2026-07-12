const { z } = require("zod");
const { sanitizeForJson } = require("./serialization.cjs");
const domainClients = require("./domain-clients.cjs");
const { auditEvent } = require("../shared/audit-event.cjs");
const { enqueueEvent } = require("./outbox.cjs");

const reviewStatuses = new Set(["VISIBLE", "HIDDEN", "DELETED"]);

async function attachRoomProfiles(reviews, clients = domainClients) {
  const rooms = await clients.getRooms(reviews.map((review) => review.roomId));
  const byId = new Map(rooms.map((room) => [room.id, room]));
  return reviews.map((review) => ({ ...review, room: byId.get(review.roomId) || null }));
}

async function attachUserProfiles(reviews, clients = domainClients) {
  const users = await clients.getIdentityUsers(reviews.map((review) => review.userId));
  const byId = new Map(users.map((user) => [user.id, user]));
  return reviews.map((review) => ({ ...review, user: byId.get(review.userId) || null }));
}

const reviewCreateSchema = z.object({
  roomId: z.string().uuid("Invalid room ID"),
  rating: z.number().int().min(1).max(5, "Rating must be between 1 and 5"),
  comment: z.string().max(500, "Comment must be less than 500 characters").optional(),
});

const reviewUpdateSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().max(500).optional(),
});

const adminReviewSchema = z.object({
  status: z.enum(["VISIBLE", "HIDDEN", "DELETED"]),
  reason: z.string().max(1000).optional(),
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

function requireAuthenticated(identity) {
  return identity?.userId ? null : failure(401, "Unauthorized");
}

async function canUserReviewRoom(prisma, userId, roomId, clients = domainClients) {
  let room;
  let rentalEligibility;
  try {
    [room, rentalEligibility] = await Promise.all([
      clients.getRoom(roomId),
      clients.getReviewEligibility(userId, roomId),
    ]);
  } catch (error) {
    return failure(error.status || 503, error.message || "Dependency unavailable");
  }
  if (!room) return failure(404, "Không tìm thấy phòng");
  if (room.ownerId === userId) {
    return { canReview: false, reason: "Chủ nhà không thể đánh giá phòng của chính mình" };
  }
  const existingReview = await prisma.review.findUnique({
      where: { roomId_userId: { roomId, userId } },
      select: { id: true, status: true },
    });
  if (existingReview && existingReview.status !== "DELETED") {
    return { canReview: false, reason: "Bạn đã đánh giá phòng này rồi", existingReviewId: existingReview.id };
  }
  if (!rentalEligibility.eligible) {
    return {
      canReview: false,
      reason: "Bạn cần có đặt phòng đã xác nhận hoặc hợp đồng thuê phòng hợp lệ để đánh giá",
    };
  }
  return { canReview: true, reason: null };
}

async function createReview(prisma, identity, input, clients = domainClients) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const parsed = validate(reviewCreateSchema, input);
  if (!parsed.ok) return parsed;
  const data = parsed.data;
  const eligibility = await canUserReviewRoom(prisma, identity.userId, data.roomId, clients);
  if ("status" in eligibility) return eligibility;
  if (!eligibility.canReview) return failure(400, eligibility.reason || "Bạn chưa đủ điều kiện đánh giá phòng này");
  const deletedReview = await prisma.review.findUnique({
    where: { roomId_userId: { roomId: data.roomId, userId: identity.userId } },
    select: { id: true, status: true },
  });
  const review = deletedReview?.status === "DELETED"
    ? await prisma.review.update({
        where: { id: deletedReview.id },
        data: { rating: data.rating, comment: data.comment, status: "VISIBLE" },
      })
    : await prisma.review.create({
        data: { userId: identity.userId, roomId: data.roomId, rating: data.rating, comment: data.comment },
      });
  try {
    const [hydrated] = await attachUserProfiles([review], clients);
    return { status: 201, payload: sanitizeForJson(hydrated) };
  } catch (error) {
    return failure(error.status || 503, error.message || "Identity Service unavailable");
  }
}

async function getReviewById(prisma, id, clients = domainClients) {
  const review = await prisma.review.findUnique({
    where: { id },
  });
  if (!review) return failure(404, "Review not found");
  try {
    const [hydrated] = await attachUserProfiles([review], clients);
    return { status: 200, payload: sanitizeForJson(hydrated) };
  } catch (error) {
    return failure(error.status || 503, error.message || "Identity Service unavailable");
  }
}

async function listRoomReviews(prisma, roomId, clients = domainClients) {
  const [reviews, rating] = await Promise.all([
    prisma.review.findMany({
      where: { roomId, status: "VISIBLE" },
      orderBy: { createdAt: "desc" },
    }),
    getRoomAverageRatingPayload(prisma, roomId),
  ]);
  const hydrated = await attachUserProfiles(reviews, clients);
  return { reviews: sanitizeForJson(hydrated), rating };
}

async function getRoomAverageRatingPayload(prisma, roomId) {
  const reviews = await prisma.review.findMany({ where: { roomId, status: "VISIBLE" } });
  if (reviews.length === 0) return { averageRating: 0, totalReviews: 0 };
  const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  return { averageRating: Math.round(averageRating * 10) / 10, totalReviews: reviews.length };
}

async function roomReviewsPayload(prisma, identity, roomId, clients = domainClients) {
  let data;
  try {
    data = await listRoomReviews(prisma, roomId, clients);
  } catch (error) {
    return failure(error.status || 503, error.message || "Identity Service unavailable");
  }
  let eligibility = { canReview: false, reason: "Vui lòng đăng nhập để đánh giá" };
  if (identity?.userId) {
    const checked = await canUserReviewRoom(prisma, identity.userId, roomId, clients);
    eligibility = "status" in checked ? { canReview: false, reason: checked.payload.message } : checked;
  }
  return { status: 200, payload: { ...data, eligibility } };
}

async function createRoomReview(prisma, identity, roomId, input, clients = domainClients) {
  const result = await createReview(prisma, identity, { ...input, roomId }, clients);
  if (result.status !== 201) return result;
  const data = await listRoomReviews(prisma, roomId, clients);
  const eligibility = await canUserReviewRoom(prisma, identity.userId, roomId, clients);
  return {
    status: 201,
    payload: sanitizeForJson({
      review: result.payload,
      ...data,
      eligibility: "status" in eligibility ? { canReview: false, reason: eligibility.payload.message } : eligibility,
    }),
  };
}

async function listUserReviews(prisma, identity, clients = domainClients) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const reviews = await prisma.review.findMany({
    where: { userId: identity.userId, status: { not: "DELETED" } },
    orderBy: { createdAt: "desc" },
  });
  let hydrated;
  try {
    hydrated = await attachRoomProfiles(reviews, clients);
  } catch (error) {
    return failure(error.status || 503, error.message || "Property Service unavailable");
  }
  return {
    status: 200,
    payload: sanitizeForJson(hydrated.map((review) => ({
      ...review,
      room: review.room ? { ...review.room, image: review.room.image || [] } : null,
    }))),
  };
}

async function listHostReviews(prisma, identity, clients = domainClients) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  if (identity.role !== "HOST" && identity.role !== "ADMIN") return failure(403, "Chỉ chủ nhà được xem đánh giá phòng");
  let rooms;
  try {
    rooms = await clients.getHostRooms(identity.userId);
  } catch (error) {
    return failure(error.status || 503, error.message || "Property Service unavailable");
  }
  const roomById = new Map(rooms.map((room) => [room.id, room]));
  const reviews = await prisma.review.findMany({
    where: { status: "VISIBLE", roomId: { in: rooms.map((room) => room.id) } },
    orderBy: { createdAt: "desc" },
  });
  let reviewsWithUsers;
  try {
    reviewsWithUsers = await attachUserProfiles(reviews, clients);
  } catch (error) {
    return failure(error.status || 503, error.message || "Identity Service unavailable");
  }
  const totalReviews = reviews.length;
  const averageRating = totalReviews
    ? Math.round((reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews) * 10) / 10
    : 0;
  const reviewedRooms = new Set(reviews.map((review) => review.roomId)).size;
  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: reviews.filter((review) => review.rating === rating).length,
  }));
  return {
    status: 200,
    payload: sanitizeForJson({
      reviews: reviewsWithUsers.map((review) => {
        const room = roomById.get(review.roomId) || null;
        return { ...review, room: room ? { ...room, image: room.imageUrl || null } : null };
      }),
      stats: { totalReviews, averageRating, reviewedRooms, ratingDistribution },
    }),
  };
}

async function listAdminReviews(prisma, identity, query, clients = domainClients) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  if (identity.role !== "ADMIN") return failure(403, "Chỉ admin được truy cập");
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit || 20)));
  const status = reviewStatuses.has(String(query.status)) ? String(query.status) : undefined;
  const rating = query.rating ? Number(query.rating) : undefined;
  const search = String(query.search || "").trim();
  let roomSearchIds = [];
  let userSearchIds = [];
  if (search) {
    try {
      const [rooms, users] = await Promise.all([
        clients.searchRoomIds(search),
        clients.searchIdentityUsers({ search }),
      ]);
      roomSearchIds = rooms;
      userSearchIds = users.map((user) => user.id);
    } catch (error) {
      return failure(error.status || 503, error.message || "Property Service unavailable");
    }
  }
  const where = {
    ...(status ? { status } : {}),
    ...(Number.isFinite(rating) ? { rating } : {}),
    ...(search ? {
      OR: [
        { comment: { contains: search, mode: "insensitive" } },
        { userId: { in: userSearchIds } },
        { roomId: { in: roomSearchIds } },
      ],
    } : {}),
  };
  const [reviews, total, visible, hidden, deleted, allVisibleReviews] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.review.count({ where }),
    prisma.review.count({ where: { status: "VISIBLE" } }),
    prisma.review.count({ where: { status: "HIDDEN" } }),
    prisma.review.count({ where: { status: "DELETED" } }),
    prisma.review.findMany({ where: { status: "VISIBLE" }, select: { rating: true } }),
  ]);
  const averageRating = allVisibleReviews.length
    ? Math.round((allVisibleReviews.reduce((sum, review) => sum + review.rating, 0) / allVisibleReviews.length) * 10) / 10
    : 0;
  let hydrated;
  try {
    hydrated = await attachUserProfiles(
      await attachRoomProfiles(reviews, clients),
      clients,
    );
  } catch (error) {
    return failure(error.status || 503, error.message || "Property Service unavailable");
  }
  return {
    status: 200,
    payload: sanitizeForJson({
      data: hydrated.map((review) => ({
        ...review,
        room: review.room ? { ...review.room, image: review.room.imageUrl || null } : null,
      })),
      stats: { total: visible + hidden + deleted, visible, hidden, deleted, averageRating },
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }),
  };
}

async function updateReviewStatus(prisma, identity, reviewId, input, clients = domainClients) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  if (identity.role !== "ADMIN") return failure(403, "Chỉ admin được cập nhật đánh giá");
  const parsed = validate(adminReviewSchema, input);
  if (!parsed.ok) return parsed;
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
  });
  if (!review) return failure(404, "Không tìm thấy đánh giá");
  let room;
  try {
    room = await clients.getRoom(review.roomId);
  } catch (error) {
    return failure(error.status || 503, error.message || "Property Service unavailable");
  }
  const oldStatus = review.status;
  const updated = await prisma.$transaction(async (tx) => {
    const moderated = await tx.review.update({
    where: { id: reviewId },
    data: { status: parsed.data.status },
    });
    await enqueueEvent(
      tx,
      auditEvent({
      adminId: identity.userId,
      action: "moderate_review",
      targetUserId: review.userId,
      targetId: reviewId,
      targetType: "review",
      oldValue: { status: oldStatus },
      newValue: { status: parsed.data.status },
      description: parsed.data.reason || `Đổi trạng thái đánh giá phòng "${room.title}" thành ${parsed.data.status}`,
        ipAddress: parsed.data.ipAddress,
        userAgent: parsed.data.userAgent,
      }),
    );
    return moderated;
  });
  try {
    const [hydrated] = await attachUserProfiles([{ ...updated, room }], clients);
    return { status: 200, payload: sanitizeForJson(hydrated) };
  } catch (error) {
    return failure(error.status || 503, error.message || "Identity Service unavailable");
  }
}

async function updateReview(prisma, identity, reviewId, input, clients = domainClients) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const parsed = validate(reviewUpdateSchema, input);
  if (!parsed.ok) return parsed;
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) return failure(404, "Review not found");
  if (review.userId !== identity.userId) return failure(403, "Access denied");
  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: {
      ...(parsed.data.rating !== undefined ? { rating: parsed.data.rating } : {}),
      ...(parsed.data.comment !== undefined ? { comment: parsed.data.comment } : {}),
      status: "VISIBLE",
    },
  });
  try {
    const [hydrated] = await attachUserProfiles([updated], clients);
    return { status: 200, payload: sanitizeForJson(hydrated) };
  } catch (error) {
    return failure(error.status || 503, error.message || "Identity Service unavailable");
  }
}

async function deleteReview(prisma, identity, reviewId) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) return failure(404, "Review not found");
  if (review.userId !== identity.userId) return failure(403, "Access denied");
  await prisma.review.update({ where: { id: reviewId }, data: { status: "DELETED" } });
  return { status: 200, payload: { message: "Review deleted" } };
}

module.exports = {
  createReview,
  createRoomReview,
  deleteReview,
  getReviewById,
  getRoomAverageRatingPayload,
  listAdminReviews,
  listHostReviews,
  listUserReviews,
  roomReviewsPayload,
  updateReview,
  updateReviewStatus,
};
