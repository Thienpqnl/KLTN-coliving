import { prisma } from "./prisma";
import { UserProfileUpdate } from "./validation";
import { ApiError } from "./api-error";

export const userService = {
  // Get user by ID
  getById: async (id: string) => {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    return user;
  },

  // Get user by email
  getByEmail: async (email: string) => {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  },

  // Get user profile with bookings
  getProfile: async (id: string) => {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        bookings: {
          include: {
            room: {
              select: {
                id: true,
                title: true,
                image: true,
                price: true,
              },
            },
          },
        },
        reviews: {
          include: {
            room: {
              select: {
                id: true,
                title: true,
                image: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    return user;
  },

  // Update user profile
  updateProfile: async (id: string, data: UserProfileUpdate) => {
    // Verify user exists
    await this.getById(id);

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  },

  // Get all users (admin)
  getAll: async (filters?: { role?: string }) => {
    const users = await prisma.user.findMany({
      where: {
        ...(filters?.role && { 
          role: filters.role as 
            | "CUSTOMER" 
            | "SERVER" 
            | "DELIVER" 
            | "ADMIN"
        }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc" as const,
      },
    });

    return users;
  },

  // Delete user account
  delete: async (id: string) => {
    // Verify user exists
    await this.getById(id);

    // Delete related data first
    await Promise.all([
      prisma.review.deleteMany({ where: { userId: id } }),
      prisma.booking.deleteMany({ where: { userId: id } }),
      prisma.invoice.deleteMany({ where: { userId: id } }),
    ]);

    // Delete user
    await prisma.user.delete({
      where: { id },
    });

    return { message: "User deleted successfully" };
  },

  // Get user statistics
  getStats: async () => {
    const [total, customers, servers, delivers, admins] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.user.count({ where: { role: "SERVER" } }),
      prisma.user.count({ where: { role: "DELIVER" } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
    ]);

    return {
      total,
      customers,
      servers,
      delivers,
      admins,
    };
  },
};
