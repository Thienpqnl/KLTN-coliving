import { prisma } from "../prisma";
import { ReviewCreate } from "../validation";
import { ApiError } from "../api-error";
import type { Prisma } from "@prisma/client";

const eligibleBookingStatuses = ["CONFIRMED", "COMPLETED"] as const;
const eligibleContractStatuses = ["ACTIVE", "EXPIRED", "TERMINATED"] as const;

export const reviewService = {
  canUserReviewRoom: async (userId: string, roomId: string) => {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      select: { id: true, ownerId: true },
    });

    if (!room) {
      throw new ApiError(404, "Không tìm thấy phòng");
    }

    if (room.ownerId === userId) {
      return {
        canReview: false,
        reason: "Chủ nhà không thể đánh giá phòng của chính mình",
      };
    }

    const [eligibleBooking, eligibleContract, existingReview] = await Promise.all([
      prisma.booking.findFirst({
        where: {
          userId,
          roomId,
          status: { in: [...eligibleBookingStatuses] },
        },
        select: { id: true },
      }),
      prisma.contract.findFirst({
        where: {
          renterId: userId,
          roomId,
          status: { in: [...eligibleContractStatuses] },
        },
        select: { id: true },
      }),
      prisma.review.findUnique({
        where: {
          roomId_userId: {
            roomId,
            userId,
          },
        },
        select: { id: true, status: true },
      }),
    ]);

    if (existingReview && existingReview.status !== "DELETED") {
      return {
        canReview: false,
        reason: "Bạn đã đánh giá phòng này rồi",
        existingReviewId: existingReview.id,
      };
    }

    if (!eligibleBooking && !eligibleContract) {
      return {
        canReview: false,
        reason: "Bạn cần có đặt phòng đã xác nhận hoặc hợp đồng thuê phòng hợp lệ để đánh giá",
      };
    }

    return {
      canReview: true,
      reason: null,
    };
  },

  // Create review
  create: async (userId: string, data: ReviewCreate) => {
    const eligibility = await reviewService.canUserReviewRoom(userId, data.roomId);

    if (!eligibility.canReview) {
      throw new ApiError(400, eligibility.reason || "Bạn chưa đủ điều kiện đánh giá phòng này");
    }

    const deletedReview = await prisma.review.findUnique({
      where: {
        roomId_userId: {
          roomId: data.roomId,
          userId,
        },
      },
      select: { id: true, status: true },
    });

    const includeUser = {
      user: {
        select: {
          id: true,
          name: true,
          fullName: true,
          email: true,
          avatarUrl: true,
        },
      },
    };

    if (deletedReview?.status === "DELETED") {
      return prisma.review.update({
        where: { id: deletedReview.id },
        data: {
          rating: data.rating,
          comment: data.comment,
          status: "VISIBLE",
        },
        include: includeUser,
      });
    }

    const review = await prisma.review.create({
      data: {
        userId,
        roomId: data.roomId,
        rating: data.rating,
        comment: data.comment,
      },
      include: {
        ...includeUser,
      },
    });

    return review;
  },

  // Get review by ID
  getById: async (id: string) => {
    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!review) {
      throw new ApiError(404, "Review not found");
    }

    return review;
  },

  // Get reviews by room
  getByRoom: async (roomId: string) => {
    const reviews = await prisma.review.findMany({
      where: { roomId, status: "VISIBLE" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            fullName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return reviews;
  },

  // Get user reviews
  getByUser: async (userId: string) => {
    const reviews = await prisma.review.findMany({
      where: { userId, status: { not: "DELETED" } },
      include: {
        room: {
          select: {
            id: true,
            title: true,
            images: {
              orderBy: {
                sortOrder: "asc",
              },
              select: {
                url: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return reviews.map((review) => ({
      ...review,
      room: {
        ...review.room,
        image: review.room.images.map((image) => image.url),
      },
    }));
  },

  getByHost: async (hostId: string) => {
    const reviews = await prisma.review.findMany({
      where: {
        status: "VISIBLE",
        room: {
          ownerId: hostId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
        room: {
          select: {
            id: true,
            title: true,
            address: true,
            priceText: true,
            priceValue: true,
            images: {
              orderBy: {
                sortOrder: "asc",
              },
              take: 1,
              select: {
                url: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
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
      reviews: reviews.map((review) => ({
        ...review,
        room: {
          ...review.room,
          image: review.room.images[0]?.url || null,
        },
      })),
      stats: {
        totalReviews,
        averageRating,
        reviewedRooms,
        ratingDistribution,
      },
    };
  },

  getForAdmin: async (filters?: {
    page?: number;
    limit?: number;
    status?: "VISIBLE" | "HIDDEN" | "DELETED";
    rating?: number;
    search?: string;
  }) => {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ReviewWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.rating) {
      where.rating = filters.rating;
    }

    if (filters?.search) {
      where.OR = [
        { comment: { contains: filters.search, mode: "insensitive" } },
        { user: { name: { contains: filters.search, mode: "insensitive" } } },
        { user: { fullName: { contains: filters.search, mode: "insensitive" } } },
        { user: { email: { contains: filters.search, mode: "insensitive" } } },
        { room: { title: { contains: filters.search, mode: "insensitive" } } },
        { room: { address: { contains: filters.search, mode: "insensitive" } } },
      ];
    }

    const [reviews, total, visible, hidden, deleted, allVisibleReviews] = await Promise.all([
      prisma.review.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              fullName: true,
              email: true,
              avatarUrl: true,
            },
          },
          room: {
            select: {
              id: true,
              title: true,
              address: true,
              owner: {
                select: {
                  id: true,
                  name: true,
                  fullName: true,
                  email: true,
                },
              },
              images: {
                orderBy: {
                  sortOrder: "asc",
                },
                take: 1,
                select: {
                  url: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.review.count({ where }),
      prisma.review.count({ where: { status: "VISIBLE" } }),
      prisma.review.count({ where: { status: "HIDDEN" } }),
      prisma.review.count({ where: { status: "DELETED" } }),
      prisma.review.findMany({
        where: { status: "VISIBLE" },
        select: { rating: true },
      }),
    ]);

    const averageRating = allVisibleReviews.length
      ? Math.round((allVisibleReviews.reduce((sum, review) => sum + review.rating, 0) / allVisibleReviews.length) * 10) / 10
      : 0;

    return {
      data: reviews.map((review) => ({
        ...review,
        room: {
          ...review.room,
          image: review.room.images[0]?.url || null,
        },
      })),
      stats: {
        total: visible + hidden + deleted,
        visible,
        hidden,
        deleted,
        averageRating,
      },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  updateStatusByAdmin: async (
    reviewId: string,
    adminId: string,
    status: "VISIBLE" | "HIDDEN" | "DELETED",
    reason?: string
  ) => {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        room: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!review) {
      throw new ApiError(404, "Không tìm thấy đánh giá");
    }

    const oldStatus = review.status;
    const updated = await prisma.review.update({
      where: { id: reviewId },
      data: { status },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
        room: {
          select: {
            id: true,
            title: true,
            address: true,
            owner: {
              select: {
                id: true,
                name: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    await prisma.adminLog.create({
      data: {
        adminId,
        action: "moderate_review",
        targetUserId: review.userId,
        targetId: reviewId,
        targetType: "review",
        oldValue: JSON.stringify({ status: oldStatus }),
        newValue: JSON.stringify({ status }),
        description: reason || `Đổi trạng thái đánh giá phòng "${review.room.title}" thành ${status}`,
      },
    });

    return updated;
  },

  // Update review
  update: async (id: string, userId: string, rating?: number, comment?: string) => {
    const review = await reviewService.getById(id);

    if (review.userId !== userId) {
      throw new ApiError(403, "Access denied");
    }

    const updated = await prisma.review.update({
      where: { id },
      data: {
        ...(rating !== undefined && { rating }),
        ...(comment !== undefined && { comment }),
        status: "VISIBLE",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            fullName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    return updated;
  },

  // Delete review
  delete: async (id: string, userId: string) => {
    const review = await reviewService.getById(id);

    if (review.userId !== userId) {
      throw new ApiError(403, "Access denied");
    }

    await prisma.review.update({
      where: { id },
      data: { status: "DELETED" },
    });

    return { message: "Review deleted" };
  },

  // Get room average rating
  getRoomAverageRating: async (roomId: string) => {
    const reviews = await prisma.review.findMany({
      where: { roomId, status: "VISIBLE" },
    });

    if (reviews.length === 0) {
      return { averageRating: 0, totalReviews: 0 };
    }

    const averageRating =
      reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    return {
      averageRating: Math.round(averageRating * 10) / 10,
      totalReviews: reviews.length,
    };
  },
};
