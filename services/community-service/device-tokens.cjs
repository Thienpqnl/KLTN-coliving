const { z } = require("zod");

const tokenSchema = z.object({
  token: z.string().min(1, "Token là bắt buộc"),
  os: z.enum(["android", "ios"]),
});

function failure(status, message, errors) {
  return { status, payload: { message, ...(errors ? { errors } : {}) } };
}

function validate(schema, input) {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  const errors = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join(".") || "form";
    (errors[path] ||= []).push(issue.message);
  }
  return { ok: false, ...failure(400, "Validation failed", errors) };
}

function requireAuthenticated(identity) {
  return identity?.userId ? null : failure(401, "Unauthorized");
}

async function saveDeviceToken(prisma, identity, input) {
  const denied = requireAuthenticated(identity);
  if (denied) return denied;
  const parsed = validate(tokenSchema, input);
  if (!parsed.ok) return parsed;
  const { token, os } = parsed.data;
  await prisma.userDeviceToken.upsert({
    where: { token },
    update: { userId: identity.userId, os },
    create: { userId: identity.userId, token, os },
  });
  return { status: 200, payload: { message: "Đăng ký thiết bị thành công" } };
}

async function removeDeviceToken(prisma, input) {
  const parsed = validate(z.object({ token: z.string() }), input);
  if (!parsed.ok) return parsed;
  await prisma.userDeviceToken.deleteMany({ where: { token: parsed.data.token } });
  return { status: 200, payload: { message: "Xóa thiết bị thành công" } };
}

module.exports = { removeDeviceToken, saveDeviceToken };
