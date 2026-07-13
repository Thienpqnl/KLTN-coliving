const { z } = require("zod");
const { normalizeRoom, roomDetailInclude } = require("./rooms.cjs");

const roomInputSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  price: z.number().positive(),
  area: z.string().min(1),
  address: z.string().min(5),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  image: z.array(z.string().url()).optional(),
  amenityIds: z.array(z.string()).optional(),
  cleanlinessRequired: z.enum(["low", "medium", "high"]).optional(),
  noiseTolerance: z.enum(["quiet", "moderate", "active"]).optional(),
  guestPolicy: z.enum(["no_guests", "occasionally", "frequently"]).optional(),
  preferredSleepHabit: z.enum(["early", "normal", "late"]).optional(),
  preferredOccupation: z.string().optional(),
  curfewPolicy: z.string().optional(),
  maxOccupants: z.number().int().min(1).optional(),
  preferredGender: z.string().optional(),
  allowSmoking: z.boolean().optional(),
  allowPets: z.boolean().optional(),
});

function failure(status, message, errors) {
  return { ok: false, status, payload: { message, ...(errors ? { errors } : {}) } };
}

function validate(schema, input) {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };

  const errors = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".") || "form";
    (errors[path] ||= []).push(issue.message);
  }
  return failure(400, "Validation failed", errors);
}

function roomScalarData(data) {
  const numericArea = data.area
    .replace(/[^\d.,]/g, "")
    .replace(",", ".");
  return {
    title: data.title,
    description: data.description,
    priceText: `${data.price.toLocaleString("vi-VN")} đ/tháng`,
    priceValue: BigInt(Math.round(data.price)),
    areaText: data.area,
    areaValue: numericArea || null,
    address: data.address,
    latitude: data.latitude,
    longitude: data.longitude,
    cleanlinessRequired: data.cleanlinessRequired,
    noiseTolerance: data.noiseTolerance,
    guestPolicy: data.guestPolicy,
    preferredSleepHabit: data.preferredSleepHabit,
    preferredOccupation: data.preferredOccupation,
    curfewPolicy: data.curfewPolicy,
    maxOccupants: data.maxOccupants,
    preferredGender: data.preferredGender,
    allowSmoking: data.allowSmoking,
    allowPets: data.allowPets,
  };
}

function requireHost(identity) {
  return identity?.userId && identity.role === "HOST"
    ? null
    : failure(403, "Chỉ chủ nhà được quản lý phòng");
}

async function createRoom(prisma, identity, input) {
  const denied = requireHost(identity);
  if (denied) return denied;
  const parsed = validate(roomInputSchema, input);
  if (!parsed.ok) return parsed;
  const data = parsed.data;

  const room = await prisma.room.create({
    data: {
      ...roomScalarData(data),
      ownerId: identity.userId,
      status: "DRAFT",
      images: {
        create: (data.image || []).map((url, index) => ({
          url,
          alt: data.title,
          sortOrder: index,
        })),
      },
      amenities: {
        create: (data.amenityIds || []).map((amenityId) => ({ amenityId })),
      },
    },
    include: roomDetailInclude,
  });
  return { ok: true, status: 201, payload: normalizeRoom(room) };
}

async function listHostRooms(prisma, identity) {
  const denied = requireHost(identity);
  if (denied) return denied;
  const rooms = await prisma.room.findMany({
    where: { ownerId: identity.userId },
    include: roomDetailInclude,
    orderBy: { createdAt: "desc" },
  });
  return { ok: true, status: 200, payload: rooms.map(normalizeRoom) };
}

async function updateRoom(prisma, identity, id, input) {
  const denied = requireHost(identity);
  if (denied) return denied;
  const parsed = validate(roomInputSchema.partial(), input);
  if (!parsed.ok) return parsed;

  const existing = await prisma.room.findUnique({
    where: { id },
    select: { id: true, ownerId: true, status: true },
  });
  if (!existing || existing.ownerId !== identity.userId) {
    return failure(403, "Bạn chỉ có thể sửa phòng của mình");
  }
  if (existing.status === "PENDING") {
    return failure(409, "Phòng đang được xét duyệt nên chưa thể chỉnh sửa");
  }

  const data = parsed.data;
  const scalar = {};
  if (data.title !== undefined) scalar.title = data.title;
  if (data.description !== undefined) scalar.description = data.description;
  if (data.price !== undefined) {
    scalar.priceText = `${data.price.toLocaleString("vi-VN")} đ/tháng`;
    scalar.priceValue = BigInt(Math.round(data.price));
  }
  if (data.area !== undefined) {
    scalar.areaText = data.area;
    scalar.areaValue = data.area.replace(/[^\d.,]/g, "").replace(",", ".") || null;
  }
  for (const key of [
    "address",
    "latitude",
    "longitude",
    "cleanlinessRequired",
    "noiseTolerance",
    "guestPolicy",
    "preferredSleepHabit",
    "preferredOccupation",
    "curfewPolicy",
    "maxOccupants",
    "preferredGender",
    "allowSmoking",
    "allowPets",
  ]) {
    if (data[key] !== undefined) scalar[key] = data[key];
  }

  const requiresReview = existing.status === "AVAILABLE";
  if (requiresReview) scalar.status = "DRAFT";

  const room = await prisma.$transaction(async (transaction) => {
    await transaction.room.update({ where: { id }, data: scalar });

    if (data.image !== undefined) {
      await transaction.roomImage.deleteMany({ where: { roomId: id } });
      if (data.image.length > 0) {
        await transaction.roomImage.createMany({
          data: data.image.map((url, index) => ({
            roomId: id,
            url,
            alt: data.title,
            sortOrder: index,
          })),
        });
      }
    }

    if (data.amenityIds !== undefined) {
      await transaction.roomAmenity.deleteMany({ where: { roomId: id } });
      if (data.amenityIds.length > 0) {
        await transaction.roomAmenity.createMany({
          data: data.amenityIds.map((amenityId) => ({ roomId: id, amenityId })),
        });
      }
    }

    if (requiresReview) {
      await transaction.roomVerification.upsert({
        where: { roomId: id },
        create: { roomId: id },
        update: {
          submittedAt: null,
          reviewedAt: null,
          reviewerId: null,
          revisionReason: null,
          rejectionReason: null,
          identityPassed: false,
          ownershipPassed: false,
          addressPassed: false,
          imagesPassed: false,
          detailsPassed: false,
          informationAccurateConfirmed: false,
          legalResponsibilityAccepted: false,
          verificationConsentAccepted: false,
          declarationAcceptedAt: null,
          declarationVersion: null,
          declarationIpAddress: null,
          declarationUserAgent: null,
        },
      });
    }

    return transaction.room.findUnique({
      where: { id },
      include: roomDetailInclude,
    });
  });

  return { ok: true, status: 200, payload: normalizeRoom(room) };
}

async function deleteRoom(prisma, identity, id) {
  const denied = requireHost(identity);
  if (denied) return denied;
  const existing = await prisma.room.findUnique({
    where: { id },
    select: { ownerId: true },
  });
  if (!existing || existing.ownerId !== identity.userId) {
    return failure(403, "Bạn chỉ có thể xóa phòng của mình");
  }

  await prisma.$transaction([
    prisma.roomAmenity.deleteMany({ where: { roomId: id } }),
    prisma.room.delete({ where: { id } }),
  ]);
  return {
    ok: true,
    status: 200,
    payload: { message: "Room deleted successfully" },
  };
}

module.exports = {
  createRoom,
  deleteRoom,
  listHostRooms,
  roomInputSchema,
  updateRoom,
};
