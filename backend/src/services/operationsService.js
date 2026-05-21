const config = require("../config");
const { isDatabaseReady } = require("../lib/mongo");

function buildHealthSnapshot() {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    uptimeSeconds: Math.round(process.uptime()),
    database: {
      connected: isDatabaseReady(),
      name: config.mongoDbName
    },
    logging: {
      level: config.logLevel,
      requestLogging: config.enableRequestLogging,
      adminAuditLogging: config.enableAdminAuditLogging,
      slowRequestThresholdMs: config.slowRequestThresholdMs,
      monitoringWebhookConfigured: Boolean(config.monitoringWebhookUrl)
    }
  };
}

module.exports = {
  buildHealthSnapshot
};
