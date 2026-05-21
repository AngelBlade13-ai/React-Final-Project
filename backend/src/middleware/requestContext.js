const crypto = require("crypto");
const config = require("../config");
const { logInfo, logWarn } = require("../lib/logger");

function getActorSnapshot(req) {
  if (req.admin?.email) {
    return {
      actorId: req.admin.email,
      actorRole: "admin"
    };
  }

  if (req.user?.sub) {
    return {
      actorId: req.user.sub,
      actorRole: req.user.role || "user"
    };
  }

  if (req.auth?.sub || req.auth?.email) {
    return {
      actorId: req.auth.sub || req.auth.email,
      actorRole: req.auth.role || "authenticated"
    };
  }

  return {
    actorId: "",
    actorRole: "anonymous"
  };
}

function requestContext(req, res, next) {
  const startedAt = process.hrtime.bigint();
  req.requestId = crypto.randomUUID();
  res.setHeader("x-request-id", req.requestId);

  res.on("finish", () => {
    if (!config.enableRequestLogging) {
      return;
    }

    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const payload = {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 10) / 10,
      slow: durationMs >= config.slowRequestThresholdMs,
      ip: req.ip,
      userAgent: String(req.get("user-agent") || "").slice(0, 180),
      ...getActorSnapshot(req)
    };

    if (res.statusCode >= 500 || payload.slow) {
      logWarn("http.request", payload);
      return;
    }

    logInfo("http.request", payload);
  });

  next();
}

module.exports = {
  getActorSnapshot,
  requestContext
};
