import "server-only";

import { roomService } from "@/lib/services/room.service";
import {
  getServiceUrl,
  requestServiceJson,
} from "@/lib/microservices/service-client";

export type PublicRoomDetail = Awaited<
  ReturnType<typeof roomService.getPublicById>
>;

export async function getPublicRoomById(id: string): Promise<PublicRoomDetail> {
  const propertyServiceUrl = getServiceUrl("PROPERTY");

  if (propertyServiceUrl) {
    try {
      return await requestServiceJson<PublicRoomDetail>(
        "property-service",
        propertyServiceUrl,
        `/v1/rooms/${encodeURIComponent(id)}`,
        { timeoutMs: Number(process.env.MICROSERVICE_TIMEOUT_MS || 3_000) },
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown error";
      console.warn(
        `[PropertyGateway] Property Service unavailable (${reason}); using local room detail implementation.`,
      );
    }
  }

  return roomService.getPublicById(id);
}
