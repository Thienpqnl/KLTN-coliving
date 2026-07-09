import { NextRequest } from "next/server";
import { contractService } from "@/lib/services/contract.service";
import { handleApiError, successResponse } from "@/lib/api-error";
import {
  getServiceUrl,
  requestServiceJson,
  ServiceHttpError,
} from "@/lib/microservices/service-client";
import {
  isForwardableServiceError,
  serviceErrorPayload,
} from "@/lib/microservices/bff-service";

type ServicePayload = {
  message?: string;
  error?: string;
};

async function tryRentalAdmin(path: string, options: RequestInit = {}) {
  const rentalServiceUrl = getServiceUrl("RENTAL");
  if (!rentalServiceUrl) return null;
  try {
    const data = await requestServiceJson<unknown>(
      "rental-service",
      rentalServiceUrl,
      path,
      {
        ...options,
        timeoutMs: Number(process.env.MICROSERVICE_TIMEOUT_MS || 3_000),
      },
    );
    return successResponse(data);
  } catch (error) {
    if (isForwardableServiceError(error) && error instanceof ServiceHttpError) {
      const payload = serviceErrorPayload(error, "Không thể xử lý hợp đồng") as ServicePayload;
      return successResponse({ error: payload.error || payload.message || "Không thể xử lý hợp đồng" }, error.status);
    }
    const reason = error instanceof Error ? error.message : "Unknown error";
    console.warn(`[BFF] Rental Service unavailable (${reason}); using local admin contract implementation.`);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const proxied = await tryRentalAdmin("/v1/admin/contracts/check-expiry", {
      method: "POST",
      headers: authHeader ? { authorization: authHeader } : undefined,
    });
    if (proxied) return proxied;

    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return successResponse({ error: "Unauthorized: Invalid cron secret" }, 401);
    }
    const updatedCount = await contractService.checkAndUpdateExpiredContracts();
    return successResponse({
      success: true,
      message: `Checked and updated contract statuses. ${updatedCount} contracts updated to EXPIRED.`,
      updatedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Contract expiry check error:", error);
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const proxied = await tryRentalAdmin(`/v1/admin/contracts?${request.nextUrl.searchParams.toString()}`);
    if (proxied) return proxied;

    const roomId = request.nextUrl.searchParams.get("roomId");
    const stats = await contractService.getStats(roomId || undefined);
    return successResponse({ stats, timestamp: new Date().toISOString() });
  } catch (error) {
    return handleApiError(error);
  }
}
