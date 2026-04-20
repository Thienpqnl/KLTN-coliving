import { NextRequest } from "next/server";
import { amenityService } from "@/lib/services/amenity.service";
import { amenityUpdateSchema } from "@/lib/validation";
import { getAuthUser } from "@/lib/auth";
import { handleApiError, successResponse } from "@/lib/api-error";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const amenity = await amenityService.getById(id);
    return successResponse(amenity);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    await getAuthUser(request);

    const { id } = await params;
    const body = await request.json();
    const data = amenityUpdateSchema.parse(body);

    const amenity = await amenityService.update(id, data);
    return successResponse(amenity);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    await getAuthUser(request);

    const { id } = await params;
    await amenityService.delete(id);
    return successResponse({ message: "Amenity deleted successfully" });
  } catch (error) {
    return handleApiError(error);
  }
}
