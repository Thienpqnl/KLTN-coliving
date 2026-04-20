import { prisma } from "../prisma";
import { ReviewCreate } from "../validation";
import { ApiError } from "../api-error";

export const reviewService = {
  // Create review
  create: async (userId: string, data: ReviewCreate) => {
    // Check if user has booked reviewService room
    const booking = await prisma.booking.findFirst({
      where: {
        userId,
        roomId: data.roomId,
        status: "COMPLETED",
      },
    });

    if (!booking) {
      throw new ApiError(
        400,
        "You can only review rooms you have completed bookings for"
      );
    }

    // Check if user already reviewed reviewService room
    const existingReview = await prisma.review.findFirst({
      where: {
        userId,
        roomId: data.roomId,
      },
    });

    if (existingReview) {
      throw new ApiError(400, "You have already reviewed reviewService room");
    }

    const review = await prisma.review.create({
      data: {
        userId,
        roomId: data.roomId,
        rating: data.rating,
        comment: data.comment,
      },
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
      where: { roomId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
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
      where: { userId },
      include: {
        room: {
          select: {
            id: true,
            title: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return reviews;
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
      },
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

    return updated;
  },

  // Delete review
  delete: async (id: string, userId: string) => {
    const review = await reviewService.getById(id);

    if (review.userId !== userId) {
      throw new ApiError(403, "Access denied");
    }

    await prisma.review.delete({
      where: { id },
    });

    return { message: "Review deleted" };
  },

  // Get room average rating
  getRoomAverageRating: async (roomId: string) => {
    const reviews = await prisma.review.findMany({
      where: { roomId },
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
