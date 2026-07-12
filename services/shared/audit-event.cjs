const ADMIN_AUDIT_REQUESTED = "audit.admin.action.requested";

function auditEvent(input) {
  return {
    aggregateType: "ADMIN_AUDIT",
    aggregateId: String(input.targetId || input.targetUserId || input.adminId),
    eventType: ADMIN_AUDIT_REQUESTED,
    payload: {
      adminId: input.adminId,
      targetUserId: input.targetUserId || null,
      action: input.action,
      targetId: input.targetId || null,
      targetType: input.targetType,
      oldValue: input.oldValue ?? null,
      newValue: input.newValue ?? null,
      description: input.description || null,
      ipAddress: input.ipAddress || null,
      userAgent: input.userAgent || null,
    },
  };
}

module.exports = { ADMIN_AUDIT_REQUESTED, auditEvent };
