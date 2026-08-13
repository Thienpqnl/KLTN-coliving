import { NextRequest } from "next/server";
import { ApiError, handleApiError } from "@/lib/api-error";
import { getAuthUser } from "@/lib/auth";
import { tryProxyRentalService } from "@/lib/microservices/rental-bff";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (user.role !== "HOST" && user.role !== "ADMIN") {
      throw new ApiError(403, "Chỉ chủ nhà mới được quản lý thành viên trong phòng");
    }

    const proxied = await tryProxyRentalService({
      identity: user,
      path: "/v1/host/occupancy/overview",
      fallbackMessage: "Không thể tải danh sách thành viên",
      timeoutMs: Number(process.env.MICROSERVICE_TIMEOUT_MS || 5_000),
    });
    if (proxied) return proxied;

    throw new ApiError(503, "Rental Service chưa sẵn sàng");
  } catch (error) {
    return handleApiError(error);
  }
}
