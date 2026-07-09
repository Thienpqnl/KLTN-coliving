const { randomUUID } = require("node:crypto");
const { sanitizeForJson } = require("./serialization.cjs");

function failure(status, message) {
  return { status, payload: { error: message } };
}

function requireAuthenticated(identity) {
  return identity?.userId ? null : failure(401, "Khong duoc phep truy cap");
}

function nullableNumber(value) {
  return value === "" || value === undefined || value === null ? null : Number(value);
}

function normalizePreferenceInput(input = {}) {
  const budgetMinVnd = nullableNumber(input.budgetMinVnd);
  const budgetMaxVnd = nullableNumber(input.budgetMaxVnd);
  if (
    (budgetMinVnd !== null && !Number.isFinite(budgetMinVnd)) ||
    (budgetMaxVnd !== null && !Number.isFinite(budgetMaxVnd))
  ) {
    return { ok: false, message: "Ngan sach khong hop le" };
  }

  return {
    ok: true,
    data: {
      budgetMinVnd,
      budgetMaxVnd,
      preferredDistrict: input.preferredDistrict || null,
      lifestyleArchetype: input.lifestyleArchetype || null,
      priorityCleanliness: input.priorityCleanliness ?? 3,
      prioritySocialEnvironment: input.prioritySocialEnvironment ?? 3,
      acceptSmokingRoommates: input.acceptSmokingRoommates ?? false,
      acceptPets: input.acceptPets ?? false,
    },
  };
}

async function findPreferenceByUserId(prisma, userId) {
  const rows = await prisma.$queryRaw`
    SELECT
      "id",
      "userId",
      "budgetMinVnd",
      "budgetMaxVnd",
      "preferredDistrict",
      "lifestyleArchetype",
      "priorityCleanliness",
      "prioritySocialEnvironment",
      "acceptSmokingRoommates",
      "acceptPets",
      "createdAt",
      "updatedAt"
    FROM "user_preferences"
    WHERE "userId" = ${userId}
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function getPreference(prisma, identity) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;

  const user = await prisma.user.findUnique({
    where: { id: identity.userId },
    select: { id: true },
  });
  if (!user) return failure(404, "Nguoi dung khong tim thay");

  const preference = await findPreferenceByUserId(prisma, user.id);
  return { status: 200, payload: sanitizeForJson(preference ?? {}) };
}

async function upsertPreference(prisma, identity, input) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;

  const user = await prisma.user.findUnique({
    where: { id: identity.userId },
    select: { id: true },
  });
  if (!user) return failure(404, "Nguoi dung khong tim thay");

  const validated = normalizePreferenceInput(input);
  if (!validated.ok) return failure(400, validated.message);
  const data = validated.data;

  const rows = await prisma.$queryRaw`
    INSERT INTO "user_preferences" (
      "id",
      "userId",
      "budgetMinVnd",
      "budgetMaxVnd",
      "preferredDistrict",
      "lifestyleArchetype",
      "priorityCleanliness",
      "prioritySocialEnvironment",
      "acceptSmokingRoommates",
      "acceptPets",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      ${user.id},
      ${data.budgetMinVnd},
      ${data.budgetMaxVnd},
      ${data.preferredDistrict},
      ${data.lifestyleArchetype},
      ${data.priorityCleanliness},
      ${data.prioritySocialEnvironment},
      ${data.acceptSmokingRoommates},
      ${data.acceptPets},
      NOW(),
      NOW()
    )
    ON CONFLICT ("userId") DO UPDATE SET
      "budgetMinVnd" = EXCLUDED."budgetMinVnd",
      "budgetMaxVnd" = EXCLUDED."budgetMaxVnd",
      "preferredDistrict" = EXCLUDED."preferredDistrict",
      "lifestyleArchetype" = EXCLUDED."lifestyleArchetype",
      "priorityCleanliness" = EXCLUDED."priorityCleanliness",
      "prioritySocialEnvironment" = EXCLUDED."prioritySocialEnvironment",
      "acceptSmokingRoommates" = EXCLUDED."acceptSmokingRoommates",
      "acceptPets" = EXCLUDED."acceptPets",
      "updatedAt" = NOW()
    RETURNING
      "id",
      "userId",
      "budgetMinVnd",
      "budgetMaxVnd",
      "preferredDistrict",
      "lifestyleArchetype",
      "priorityCleanliness",
      "prioritySocialEnvironment",
      "acceptSmokingRoommates",
      "acceptPets",
      "createdAt",
      "updatedAt"
  `;

  return {
    status: 200,
    payload: sanitizeForJson({
      message: "Cap nhat thanh cong",
      preference: rows[0],
    }),
  };
}

module.exports = {
  findPreferenceByUserId,
  getPreference,
  normalizePreferenceInput,
  upsertPreference,
};
