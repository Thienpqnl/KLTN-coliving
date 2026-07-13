import { NextRequest } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { tryProxyRentalService } from "@/lib/microservices/rental-bff";

// GET /api/rooms/[id]/contract - Get active contract for a room
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    const { id: roomId } = await params;

    const proxied = await tryProxyRentalService({
      identity: { userId: user.userId, role: user.role },
      path: `/v1/rooms/${roomId}/contract`,
      fallbackMessage: "Cannot load active room contract",
    });
    if (proxied) return proxied;

    // Find active contract for this room where user is either host or renter
    const contract = await prisma.contract.findFirst({
      where: {
        roomId,
        status: 'ACTIVE',
        OR: [
          { hostId: user.userId },
          { renterId: user.userId }
        ]
      },
      include: {
        host: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        renter: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        room: {
          select: {
            id: true,
            title: true,
            address: true
          }
        }
      }
    });

    if (!contract) {
      return successResponse(null);
    }

    return successResponse(contract);
  } catch (error) {
    return handleApiError(error);
  }
}
