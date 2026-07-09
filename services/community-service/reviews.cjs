const { z } = require("zod");
const { sanitizeForJson } = require("./serialization.cjs");

const eligibleBookingStatuses = ["CONFIRMED", "COMPLETED"];
const eligibleContractStatuses = ["ACTIVE", "EXPIRED", "TERMINATED"];
const reviewStatuses = new Set(["VISIBLE", "HIDDEN", "DELETED"]);

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

async function canUserReviewRoom(prisma, userId, roomId) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { id: true, ownerId: true },
  });
  if (!room) return failure(404, "Không tìm thấy phòng");
  if (room.ownerId === userId) {
    return { canReview: false, reason: "Chủ nhà không thể đánh giá phòng của chính mình" };
  }
  const [eligibleBooking, eligibleContract, existingReview] = await Promise.all([
    prisma.booking.findFirst({
      where: { userId, roomId, status: { in: eligibleBookingStatuses } },
      select: { id: true },
    }),
    prisma.contract.findFirst({
      where: { renterId: userId, roomId, status: { in: eligibleContractStatuses } },
      select: { id: true },
    }),
    prisma.review.findUnique({
      where: { roomId_userId: { roomId, userId } },
      select: { id: true, status: true },
    }),
  ]);
  if (existingReview && existingReview.status !== "DELETED") {
    return { canReview: false, reason: "Bạn đã đánh giá phòng này rồi", existingReviewId: existingReview.id };
  }
  if (!eligibleBooking && !eligibleContract) {
    return {
      canReview: false,
      reason: "Bạn cần có đặt phòng đã xác nhận hoặc hợp đồng thuê phòng hợp lệ để đánh giá",
    };
  }
  return { canReview: true, reason: null };
}

async function createReview(prisma, identity, input) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const parsed = validate(reviewCreateSchema, input);
  if (!parsed.ok) return parsed;
  const data = parsed.data;
  const eligibility = await canUserReviewRoom(prisma, identity.userId, data.roomId);
  if ("status" in eligibility) return eligibility;
  if (!eligibility.canReview) return failure(400, eligibility.reason || "Bạn chưa đủ điều kiện đánh giá phòng này");
  const deletedReview = await prisma.review.findUnique({
    where: { roomId_userId: { roomId: data.roomId, userId: identity.userId } },
    select: { id: true, status: true },
  });
  const includeUser = {
    user: { select: { id: true, name: true, fullName: true, email: true, avatarUrl: true } },
  };
  const review = deletedReview?.status === "DELETED"
    ? await prisma.review.update({
        where: { id: deletedReview.id },
        data: { rating: data.rating, comment: data.comment, status: "VISIBLE" },
        include: includeUser,
      })
    : await prisma.review.create({
        data: { userId: identity.userId, roomId: data.roomId, rating: data.rating, comment: data.comment },
        include: includeUser,
      });
  return { status: 201, payload: sanitizeForJson(review) };
}

async function getReviewById(prisma, id) {
  const review = await prisma.review.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  if (!review) return failure(404, "Review not found");
  return { status: 200, payload: sanitizeForJson(review) };
}

async function listRoomReviews(prisma, roomId) {
  const [reviews, rating] = await Promise.all([
    prisma.review.findMany({
      where: { roomId, status: "VISIBLE" },
      include: { user: { select: { id: true, name: true, fullName: true, avatarUrl: true } } },
      orderBy: { createdAt: "desc" },
    }),
    getRoomAverageRatingPayload(prisma, roomId),
  ]);
  return { reviews: sanitizeForJson(reviews), rating };
}

async function getRoomAverageRatingPayload(prisma, roomId) {
  const reviews = await prisma.review.findMany({ where: { roomId, status: "VISIBLE" } });
  if (reviews.length === 0) return { averageRating: 0, totalReviews: 0 };
  const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  return { averageRating: Math.round(averageRating * 10) / 10, totalReviews: reviews.length };
}

async function roomReviewsPayload(prisma, identity, roomId) {
  const data = await listRoomReviews(prisma, roomId);
  let eligibility = { canReview: false, reason: "Vui lòng đăng nhập để đánh giá" };
  if (identity?.userId) {
    const checked = await canUserReviewRoom(prisma, identity.userId, roomId);
    eligibility = "status" in checked ? { canReview: false, reason: checked.payload.message } : checked;
  }
  return { status: 200, payload: { ...data, eligibility } };
}

async function createRoomReview(prisma, identity, roomId, input) {
  const result = await createReview(prisma, identity, { ...input, roomId });
  if (result.status !== 201) return result;
  const data = await listRoomReviews(prisma, roomId);
  const eligibility = await canUserReviewRoom(prisma, identity.userId, roomId);
  return {
    status: 201,
    payload: sanitizeForJson({
      review: result.payload,
      ...data,
      eligibility: "status" in eligibility ? { canReview: false, reason: eligibility.payload.message } : eligibility,
    }),
  };
}

async function listUserReviews(prisma, identity) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const reviews = await prisma.review.findMany({
    where: { userId: identity.userId, status: { not: "DELETED" } },
    include: {
      room: {
        select: {
          id: true,
          title: true,
          images: { orderBy: { sortOrder: "asc" }, select: { url: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return {
    status: 200,
    payload: sanitizeForJson(reviews.map((review) => ({
      ...review,
      room: { ...review.room, image: review.room.images.map((image) => image.url) },
    }))),
  };
}

async function listHostReviews(prisma, identity) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  if (identity.role !== "HOST" && identity.role !== "ADMIN") return failure(403, "Chỉ chủ nhà được xem đánh giá phòng");
  const reviews = await prisma.review.findMany({
    where: { status: "VISIBLE", room: { ownerId: identity.userId } },
    include: {
      user: { select: { id: true, name: true, fullName: true, email: true, avatarUrl: true } },
      room: {
        select: {
          id: true,
          title: true,
          address: true,
          priceText: true,
          priceValue: true,
          images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
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
      reviews: reviews.map((review) => ({ ...review, room: { ...review.room, image: review.room.images[0]?.url || null } })),
      stats: { totalReviews, averageRating, reviewedRooms, ratingDistribution },
    }),
  };
}

async function listAdminReviews(prisma, identity, query) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  if (identity.role !== "ADMIN") return failure(403, "Chỉ admin được truy cập");
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit || 20)));
  const status = reviewStatuses.has(String(query.status)) ? String(query.status) : undefined;
  const rating = query.rating ? Number(query.rating) : undefined;
  const search = String(query.search || "").trim();
  const where = {
    ...(status ? { status } : {}),
    ...(Number.isFinite(rating) ? { rating } : {}),
    ...(search ? {
      OR: [
        { comment: { contains: search, mode: "insensitive" } },
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { fullName: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { room: { title: { contains: search, mode: "insensitive" } } },
        { room: { address: { contains: search, mode: "insensitive" } } },
      ],
    } : {}),
  };
  const [reviews, total, visible, hidden, deleted, allVisibleReviews] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, fullName: true, email: true, avatarUrl: true } },
        room: {
          select: {
            id: true,
            title: true,
            address: true,
            owner: { select: { id: true, name: true, fullName: true, email: true } },
            images: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
          },
        },
      },
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
  return {
    status: 200,
    payload: sanitizeForJson({
      data: reviews.map((review) => ({ ...review, room: { ...review.room, image: review.room.images[0]?.url || null } })),
      stats: { total: visible + hidden + deleted, visible, hidden, deleted, averageRating },
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }),
  };
}

async function updateReviewStatus(prisma, identity, reviewId, input) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  if (identity.role !== "ADMIN") return failure(403, "Chỉ admin được cập nhật đánh giá");
  const parsed = validate(adminReviewSchema, input);
  if (!parsed.ok) return parsed;
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: { room: { select: { id: true, title: true } } },
  });
  if (!review) return failure(404, "Không tìm thấy đánh giá");
  const oldStatus = review.status;
  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: { status: parsed.data.status },
    include: {
      user: { select: { id: true, name: true, fullName: true, email: true, avatarUrl: true } },
      room: {
        select: {
          id: true,
          title: true,
          address: true,
          owner: { select: { id: true, name: true, fullName: true, email: true } },
        },
      },
    },
  });
  await prisma.adminLog.create({
    data: {
      adminId: identity.userId,
      action: "moderate_review",
      targetUserId: review.userId,
      targetId: reviewId,
      targetType: "review",
      oldValue: JSON.stringify({ status: oldStatus }),
      newValue: JSON.stringify({ status: parsed.data.status }),
      description: parsed.data.reason || `Đổi trạng thái đánh giá phòng "${review.room.title}" thành ${parsed.data.status}`,
    },
  });
  return { status: 200, payload: sanitizeForJson(updated) };
}

async function updateReview(prisma, identity, reviewId, input) {
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
    include: { user: { select: { id: true, name: true, fullName: true, email: true, avatarUrl: true } } },
  });
  return { status: 200, payload: sanitizeForJson(updated) };
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
  listAdminReviews,
  listHostReviews,
  listUserReviews,
  roomReviewsPayload,
  updateReview,
  updateReviewStatus,
};
