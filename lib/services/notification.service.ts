import { messaging } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";

class NotificationService {
  static async registerDeviceToken(
    userId: string,
    token: string,
    deviceType?: string
  ) {
    return prisma.userDeviceToken.upsert({
      where: { token },
      create: {
        userId,
        token,
        deviceType,
      },
      update: {
        userId,
        deviceType,
        updatedAt: new Date(),
      },
    });
  }

  static async removeDeviceToken(userId: string, token: string) {
    return prisma.userDeviceToken.deleteMany({
      where: { userId, token },
    });
  }
 static async saveToken(userId: string, token: string, deviceType?: string) {
  return await prisma.userDeviceToken.upsert({
    where: { token },
    update: {
      userId,
      deviceType: deviceType?.toUpperCase(), // Đồng bộ chữ hoa giống MOBILE truyền lên (ANDROID)
      updatedAt: new Date(),
    },
    create: {
      userId,
      token,
      deviceType: deviceType?.toUpperCase(),
    },
  });
}
    static async removeToken(token: string) {
    return await prisma.userDeviceToken.deleteMany({
      where: {
        token: token,
      },
    });
  }
  static async sendPushNotificationToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>
  ) {
    const tokens = await prisma.userDeviceToken.findMany({
      where: { userId },
    });
    const messageBase = {
      notification: {
        title,
        body,
      },
      data: data ?? {},
      android: {
        priority: "high" as const, 
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
          },
        },
      },
    };

    if (tokens.length === 0) {
      await messaging.send({
        topic: `user_${userId}`,
        ...messageBase,
      });
      return;
    }

    const response = await messaging.sendEachForMulticast({
      tokens: tokens.map((token) => token.token),
      ...messageBase,
    });

    const invalidTokens = response.responses
      .map((result, index) => ({ result, index }))
      .filter(({ result }) => !result.success)
      .map(({ index }) => tokens[index]?.token)
      .filter(Boolean);

    if (invalidTokens.length > 0) {
      await prisma.userDeviceToken.deleteMany({
        where: {
          token: { in: invalidTokens as string[] },
        },
      });
    }
  }
}

// Thêm dòng export default này ở cuối file
export default NotificationService;
