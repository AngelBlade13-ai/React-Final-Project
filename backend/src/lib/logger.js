const config = require("../config");

const LEVEL_PRIORITY = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

function getActiveLogPriority() {
  return (
    LEVEL_PRIORITY[
      String(config.logLevel || "info")
        .trim()
        .toLowerCase()
    ] || LEVEL_PRIORITY.info
  );
}

function shouldWrite(level) {
  return (
    (LEVEL_PRIORITY[level] || LEVEL_PRIORITY.info) >= getActiveLogPriority()
  );
}

function serializeError(error) {
  if (!error) {
    return null;
  }

  return {
    name: String(error.name || "Error"),
    message: String(error.message || error),
    code: error.code || "",
    stack: typeof error.stack === "string" ? error.stack : ""
  };
}

function sanitizeDetails(details = {}) {
  try {
    return JSON.parse(JSON.stringify(details));
  } catch {
    return {
      serializationError: "Failed to serialize log details."
    };
  }
}

function writeLog(level, event, details = {}) {
  if (!shouldWrite(level)) {
    return null;
  }

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    environment: config.nodeEnv,
    ...sanitizeDetails(details)
  };
  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }

  return entry;
}

async function reportError(error, context = {}) {
  const entry = writeLog("error", context.event || "runtime.error", {
    ...context,
    error: serializeError(error)
  });

  if (!entry || !config.monitoringWebhookUrl) {
    return entry;
  }

  try {
    const response = await fetch(config.monitoringWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(entry)
    });

    if (!response.ok) {
      writeLog("warn", "monitoring.webhook_failed", {
        monitoredEvent: entry.event,
        statusCode: response.status
      });
    }
  } catch (monitoringError) {
    writeLog("warn", "monitoring.webhook_failed", {
      monitoredEvent: entry.event,
      error: serializeError(monitoringError)
    });
  }

  return entry;
}

module.exports = {
  logDebug: (event, details) => writeLog("debug", event, details),
  logInfo: (event, details) => writeLog("info", event, details),
  logWarn: (event, details) => writeLog("warn", event, details),
  reportError,
  serializeError
};
