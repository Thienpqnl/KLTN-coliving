import { NextRequest } from "next/server";

import { getAuthUser } from "@/lib/auth";

import { handleApiError, successResponse } from "@/lib/api-error";

import { sharedSpaceService } from "@/lib/services/shared-space.service";

import { prisma } from "@/lib/prisma";

import { z } from "zod";



const createResourceSchema = z.object({

  name: z.string().min(1, "Tên tài nguyên là bắt buộc"),

  description: z.string().optional(),

  type: z.enum(["EQUIPMENT", "SPACE"]),

  status: z.enum(["ACTIVE", "MAINTENANCE"]).default("ACTIVE"),

  requiresApproval: z.boolean().default(false),

  maxDurationMinutes: z.number().int().positive().default(120),

  roomId: z.uuid("Room ID không hợp lệ"),

});



export async function POST(request: NextRequest) {

  try {

    const user = await getAuthUser(request);

    const body = await request.json();



    const validatedData = createResourceSchema.parse(body);



    const newResource = await sharedSpaceService.createResource(user.userId, validatedData);

    

    return successResponse(newResource, 201);

  } catch (error) {

    return handleApiError(error);

  }

}



export async function DELETE(

  request: NextRequest,

  { params }: { params: Promise<{ id: string }> }

) {

  try {

    const user = await getAuthUser(request);

    const { id: resourceId } = await params;



    // Verify the resource belongs to a room owned by this host

    const resource = await prisma.sharedResource.findUnique({

      where: { id: resourceId },

      include: { room: true },

    });



    if (!resource) {

      return handleApiError(new Error("Tài nguyên không tồn tại"));

    }



    if (resource.room.ownerId !== user.userId) {

      return handleApiError(new Error("Bạn không có quyền xóa tài nguyên này"));

    }



    await prisma.sharedResource.delete({

      where: { id: resourceId },

    });



    return successResponse({ message: "Đã xóa tài nguyên thành công" });

  } catch (error) {

    return handleApiError(error);

  }

}