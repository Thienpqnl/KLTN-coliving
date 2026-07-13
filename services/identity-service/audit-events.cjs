const { ADMIN_AUDIT_REQUESTED } = require("../shared/audit-event.cjs");

function logValue(value) {
  if (value == null) return null;
  return typeof value === "string" ? value : JSON.stringify(value);
}

async function handleAdminAuditEvent(prisma, event) {
  if (event?.eventType !== ADMIN_AUDIT_REQUESTED) return { processed: false, ignored: true };
  if (!event.id) throw new Error("Audit event ID is required");
  const payload = event.payload || {};
  if (!payload.adminId || !payload.action || !payload.targetType) {
    throw new Error("Audit event payload is invalid");
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.identityInboxEvent.findUnique({
      where: { eventId: event.id },
      select: { id: true },
    });
    if (existing) return { processed: false, duplicate: true };

    await tx.identityInboxEvent.create({
      data: {
        eventId: event.id,
        eventType: event.eventType,
        sourceService: event.sourceService || null,
      },
    });
    await tx.adminLog.create({
      data: {
        adminId: payload.adminId,
        targetUserId: payload.targetUserId || null,
        action: payload.action,
        targetId: payload.targetId || null,
        targetType: payload.targetType,
        oldValue: logValue(payload.oldValue),
        newValue: logValue(payload.newValue),
        description: payload.description || null,
        ipAddress: payload.ipAddress || null,
        userAgent: payload.userAgent || null,
      },
    });
    return { processed: true };
  });
}

module.exports = { handleAdminAuditEvent, logValue };
