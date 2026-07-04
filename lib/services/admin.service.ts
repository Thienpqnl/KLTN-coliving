import{ prisma } from "@/lib/prisma";
import { Prisma, UserStatus, Role } from "@prisma/client";

export class AdminService {
  // Get all users with optional filtering
  static async getAllUsers(filters?: {
    role?: Role;
    status?: UserStatus;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};
    if (filters?.role) where.role = filters.role;
    if (filters?.status) where.status = filters.status;
    if (filters?.search) {
      where.OR = [
        { email: { contains: filters.search, mode: "insensitive" } },
        { name: { contains: filters.search, mode: "insensitive" } },
        { phone: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          fullName: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { bookings: true, rooms: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return {
      data: users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Lock user account
  static async lockUser(userId: string, adminId: string, reason?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");
    if (user.status === UserStatus.LOCKED) throw new Error("User already locked");

    const oldStatus = user.status;
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.LOCKED },
    });

    // Log the action
    await prisma.adminLog.create({
      data: {
        adminId,
        action: "lock_user",
        targetUserId: userId,
        targetId: userId,
        targetType: "user",
        oldValue: JSON.stringify({ status: oldStatus }),
        newValue: JSON.stringify({ status: UserStatus.LOCKED }),
        description: reason || "User account locked",
      },
    });

    return updatedUser;
  }

  // Unlock user account
  static async unlockUser(adminId: string, userId: string, reason?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");
    if (user.status !== UserStatus.LOCKED) throw new Error("User is not locked");

    const oldStatus = user.status;
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.ACTIVE },
    });

    // Log the action
    await prisma.adminLog.create({
      data: {
        adminId,
        action: "unlock_user",
        targetUserId: userId,
        targetId: userId,
        targetType: "user",
        oldValue: JSON.stringify({ status: oldStatus }),
        newValue: JSON.stringify({ status: UserStatus.ACTIVE }),
        description: reason || "User account unlocked",
      },
    });

    return updatedUser;
  }

  // Soft delete user
  static async deleteUser(userId: string, adminId: string, reason?: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const oldStatus = user.status;
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.DELETED },
    });

    // Log the action
    await prisma.adminLog.create({
      data: {
        adminId,
        action: "delete_user",
        targetUserId: userId,
        targetId: userId,
        targetType: "user",
        oldValue: JSON.stringify({ status: oldStatus }),
        newValue: JSON.stringify({ status: UserStatus.DELETED }),
        description: reason || "User account deleted",
      },
    });

    return updatedUser;
  }

  // Get user statistics
  static async getUserStats() {
    const [total, tenants, landlords, communityManagers, locked, deleted, newThisMonth] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({
          where: { role: Role.CUSTOMER, status: UserStatus.ACTIVE },
        }),
        prisma.user.count({
          where: { role: Role.HOST, status: UserStatus.ACTIVE },
        }),
        prisma.user.count({
          where: { role: Role.COMMUNITY_MANAGER, status: UserStatus.ACTIVE },
        }),
        prisma.user.count({ where: { status: UserStatus.LOCKED } }),
        prisma.user.count({ where: { status: UserStatus.DELETED } }),
        prisma.user.count({
          where: {
            createdAt: {
              gte: new Date(new Date().setDate(1)),
            },
          },
        }),
      ]);

    // Get new users by month for last 12 months
    const monthlyNewUsers = await this.getMonthlyUserStats(12);

    return {
      total,
      tenants,
      landlords,
      communityManagers,
      locked,
      deleted,
      newThisMonth,
      byMonth: monthlyNewUsers,
    };
  }

  // Get monthly user stats
  private static async getMonthlyUserStats(months: number) {
    const stats = [];
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const year = date.getFullYear();
      const month = date.getMonth();

      const startOfMonth = new Date(year, month, 1);
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59);

      const count = await prisma.user.count({
        where: {
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
      });

      stats.push({
        month: date.toISOString().substring(0, 7),
        count,
      });
    }
    return stats;
  }

  // Get room statistics
  static async getRoomStats() {
    const [total, available, occupied, pending, hidden] = await Promise.all([
      prisma.room.count(),
      prisma.room.count({
        where: { status: "AVAILABLE" },
      }),
      prisma.room.count({
        where: { status: "OCCUPIED" },
      }),
      prisma.room.count({
        where: { status: "PENDING" },
      }),
      prisma.room.count({
        where: { status: "HIDDEN" },
      }),
    ]);

    // Get revenue stats
    const bookings = await prisma.booking.findMany({
      where: { status: "COMPLETED" },
      include: { invoice: true },
    });

    const totalRevenue = bookings.reduce(
      (sum, booking) => sum + (booking.invoice?.totalAmount || 0),
      0
    );

    return {
      total,
      available,
      occupied,
      pending,
      hidden,
      revenue: {
        total: totalRevenue,
        completedBookings: bookings.length,
      },
    };
  }

  // Get admin logs
  static async getAdminLogs(filters?: {
    action?: string;
    targetType?: string;
    adminId?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 50;
    const skip = (page - 1) * limit;

    const where: Prisma.AdminLogWhereInput = {};
    if (filters?.action) where.action = filters.action;
    if (filters?.targetType) where.targetType = filters.targetType;
    if (filters?.adminId) where.adminId = filters.adminId;

    const [logs, total] = await Promise.all([
      prisma.adminLog.findMany({
        where,
        include: {
          admin: {
            select: { id: true, name: true, email: true },
          },
          targetUser: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.adminLog.count({ where }),
    ]);

    return {
      data: logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Update user role
  static async updateUserRole(
    userId: string,
    newRole: Role,
    adminId: string,
    reason?: string
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error("User not found");

    const oldRole = user.role;
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: newRole as Role },
    });

    // Log the action
    await prisma.adminLog.create({
      data: {
        adminId,
        action: "update_user_role",
        targetUserId: userId,
        targetId: userId,
        targetType: "user",
        oldValue: JSON.stringify({ role: oldRole }),
        newValue: JSON.stringify({ role: newRole }),
        description: reason || `User role changed from ${oldRole} to ${newRole}`,
      },
    });

    return updatedUser;
  }
}
