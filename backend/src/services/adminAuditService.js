const crypto = require("crypto");
const config = require("../config");
const { insertAdminAuditLog } = require("../data/store");
const { logWarn, serializeError } = require("../lib/logger");

function sanitizeDetails(details = {}) {
  try {
    return JSON.parse(JSON.stringify(details));
  } catch {
    return {};
  }
}

function listChangedKeys(previous = {}, next = {}, keys = []) {
  return keys.filter(
    (key) =>
      JSON.stringify(previous?.[key] ?? null) !==
      JSON.stringify(next?.[key] ?? null)
  );
}

function buildAdminAuditEvent(req, entry = {}) {
  return {
    id: crypto.randomUUID(),
    actorEmail:
      String(
        entry.actorEmail || req.admin?.email || req.auth?.email || ""
      ).trim() || "admin",
    actorRole: "admin",
    action: String(entry.action || "").trim(),
    entityType: String(entry.entityType || "").trim(),
    entityId: String(entry.entityId || "").trim(),
    entityLabel: String(entry.entityLabel || "").trim(),
    requestId: String(req.requestId || "").trim(),
    method: String(req.method || "")
      .trim()
      .toUpperCase(),
    path: String(req.originalUrl || req.path || "").trim(),
    details: sanitizeDetails(entry.details),
    createdAt: new Date().toISOString()
  };
}

async function recordAdminAuditEvent(req, entry = {}, options = {}) {
  if (!config.enableAdminAuditLogging) {
    return null;
  }

  const auditEvent = buildAdminAuditEvent(req, entry);

  try {
    await insertAdminAuditLog(auditEvent, options);
    return auditEvent;
  } catch (error) {
    logWarn("ops.audit_write_failed", {
      action: auditEvent.action,
      path: auditEvent.path,
      requestId: auditEvent.requestId,
      error: serializeError(error)
    });
    return null;
  }
}

module.exports = {
  buildAdminAuditEvent,
  listChangedKeys,
  recordAdminAuditEvent
};
