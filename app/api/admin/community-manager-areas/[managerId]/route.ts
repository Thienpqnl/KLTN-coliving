import { NextRequest } from "next/server";
import { ServiceRegion } from "@prisma/client";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import { ApiError, handleApiError, successResponse } from "@/lib/api-error";
import { tryProxyPropertyService } from "@/lib/microservices/property-bff";
import { communityManagerAreaService } from "@/lib/services/community-manager-area.service";

const areaSchema = z.object({
  region: z.nativeEnum(ServiceRegion).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  provinceCode: z.string().trim().max(80).nullable().optional(),
  ward: z.string().trim().max(120).nullable().optional(),
  wardCode: z.string().trim().max(80).nullable().optional(),
  district: z.string().trim().max(120).nullable().optional(),
  districtId: z.string().trim().max(80).nullable().optional(),
  isActive: z.boolean().optional(),
});

const updateAreasSchema = z.object({
  areas: z.array(areaSchema).max(30),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ managerId: string }> },
) {
  try {
    const user = await getAuthUser(request);
    if (user.role !== "ADMIN") {
      throw new ApiError(403, "Chi admin duoc quan ly khu vuc phu trach");
    }

    const { managerId } = await params;
    const data = updateAreasSchema.parse(await request.json());

    const proxied = await tryProxyPropertyService({
      identity: { userId: user.userId, role: user.role },
      path: `/v1/admin/community-manager-areas/${managerId}`,
      method: "PUT",
      body: data,
      fallbackMessage: "Khong the cap nhat khu vuc phu trach",
    });
    if (proxied) return proxied;

    return successResponse(
      await communityManagerAreaService.replaceManagerAreas(managerId, data.areas),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
