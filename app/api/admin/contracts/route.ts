import { NextRequest, NextResponse } from "next/server";
import { contractService } from "@/lib/services/contract.service";
import { handleApiError, successResponse } from "@/lib/api-error";

/**
 * POST /api/admin/contracts/check-expiry
 * 
 * This endpoint checks and updates contract statuses:
 * - Updates ACTIVE contracts with endDate in the past to EXPIRED
 * 
 * Can be called manually or scheduled as a cron job
 * Optional: pass Authorization header for authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Check for admin/cron job authorization
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // If CRON_SECRET is set, validate it
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return successResponse(
        { error: "Unauthorized: Invalid cron secret" },
        401
      );
    }

    // Run the expiry check
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

/**
 * GET /api/admin/contracts/stats
 * 
 * Get contract statistics
 */
export async function GET(request: NextRequest) {
  try {
    const roomId = request.nextUrl.searchParams.get("roomId");

    const stats = await contractService.getStats(roomId || undefined);

    return successResponse({
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
