const path = require("path");

const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 4000,
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  logLevel: process.env.LOG_LEVEL || "info",
  enableRequestLogging:
    process.env.ENABLE_REQUEST_LOGGING === undefined
      ? process.env.NODE_ENV !== "test"
      : process.env.ENABLE_REQUEST_LOGGING !== "false",
  enableAdminAuditLogging: process.env.ENABLE_ADMIN_AUDIT_LOGGING !== "false",
  enableCatalogFileMutations:
    process.env.ENABLE_CATALOG_FILE_MUTATIONS === "true" ||
    process.env.NODE_ENV !== "production",
  slowRequestThresholdMs: Number(process.env.SLOW_REQUEST_THRESHOLD_MS) || 1200,
  monitoringWebhookUrl: process.env.MONITORING_WEBHOOK_URL || "",
  jwtSecret: process.env.JWT_SECRET || "change-me",
  adminEmail: process.env.ADMIN_EMAIL || "admin@example.com",
  adminPassword: process.env.ADMIN_PASSWORD || "Admin123!",
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH || "",
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017",
  mongoDirectUri: process.env.MONGODB_DIRECT_URI || "",
  mongoDbName: process.env.MONGODB_DB_NAME || "suno_blog",
  postsFile:
    process.env.POSTS_FILE ||
    path.join(__dirname, "..", "data", "posts.local.json"),
  websiteRoot: path.resolve(__dirname, "..", ".."),
  importerRoot:
    process.env.IMPORTER_ROOT ||
    (process.platform === "win32"
      ? "D:\\Projects\\PythonProject"
      : path.resolve(__dirname, "..", "..", "..", "PythonProject")),
  importerUrl: process.env.IMPORTER_URL || "http://127.0.0.1:8765",
  importerPythonPath: process.env.IMPORTER_PYTHON_PATH || "",
  localAiEnabled: process.env.LOCAL_AI_ENABLED !== "false",
  localAiBaseUrl: process.env.LOCAL_AI_BASE_URL || "http://127.0.0.1:11434",
  localAiModel: process.env.LOCAL_AI_MODEL || "qwen2.5:7b",
  localAiModelProfilesRaw: process.env.LOCAL_AI_MODEL_PROFILES || "",
  localAiTimeoutMs: Number(process.env.LOCAL_AI_TIMEOUT_MS) || 120000,
  localAiStatusCacheMs: Number(process.env.LOCAL_AI_STATUS_CACHE_MS) || 8000,
  localAiKeepAlive: process.env.LOCAL_AI_KEEP_ALIVE || "45m",
  localAiDefaultNumCtx: Number(process.env.LOCAL_AI_DEFAULT_NUM_CTX) || 4096,
  localAiDefaultNumPredict:
    Number(process.env.LOCAL_AI_DEFAULT_NUM_PREDICT) || 320,
  localAiNumThread: Number(process.env.LOCAL_AI_NUM_THREAD) || 0,
  localAiPostNumPredict: Number(process.env.LOCAL_AI_POST_NUM_PREDICT) || 700,
  localAiPathNumPredict: Number(process.env.LOCAL_AI_PATH_NUM_PREDICT) || 850,
  localAiNewPathNumPredict:
    Number(process.env.LOCAL_AI_NEW_PATH_NUM_PREDICT) || 900,
  runpodPodName: process.env.RUNPOD_POD_NAME || "",
  runpodPodId: process.env.RUNPOD_POD_ID || "",
  runpodPodIdOverride: process.env.RUNPOD_POD_ID_OVERRIDE === "true",
  runpodApiKey: process.env.RUNPOD_API_KEY || "",
  runpodApiBaseUrl:
    process.env.RUNPOD_API_BASE_URL || "https://rest.runpod.io/v1",
  runpodSshHost: process.env.RUNPOD_SSH_HOST || "",
  runpodSshPort: Number(process.env.RUNPOD_SSH_PORT) || 22,
  runpodSshUser: process.env.RUNPOD_SSH_USER || "root",
  runpodSshKeyPath: process.env.RUNPOD_SSH_KEY_PATH || "",
  runpodTunnelLocalPort: Number(process.env.RUNPOD_TUNNEL_LOCAL_PORT) || 11434,
  runpodTunnelRemoteHost: process.env.RUNPOD_TUNNEL_REMOTE_HOST || "127.0.0.1",
  runpodTunnelRemotePort:
    Number(process.env.RUNPOD_TUNNEL_REMOTE_PORT) || 11434,
  remoteOllamaKeepAlive:
    process.env.REMOTE_OLLAMA_KEEP_ALIVE ||
    process.env.LOCAL_AI_KEEP_ALIVE ||
    "45m",
  remoteOllamaNumParallel: Number(process.env.REMOTE_OLLAMA_NUM_PARALLEL) || 1,
  operationalSeedFile:
    process.env.OPERATIONAL_SEED_FILE ||
    path.join(__dirname, "..", "data", "operational-seed.local.json"),
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || "",
  cloudinaryFolder: process.env.CLOUDINARY_FOLDER || "suno-releases",
  cloudinaryChunkSize:
    Number(process.env.CLOUDINARY_CHUNK_SIZE) || 20 * 1024 * 1024
};

function assertSecureConfig() {
  if (!config.mongoUri) {
    throw new Error("MONGODB_URI is required.");
  }

  if (!config.mongoDbName) {
    throw new Error("MONGODB_DB_NAME is required.");
  }

  if (config.nodeEnv === "production") {
    if (!process.env.JWT_SECRET || config.jwtSecret === "change-me") {
      throw new Error("Set a strong JWT_SECRET in production.");
    }

    if (!process.env.ADMIN_EMAIL || !config.adminEmail) {
      throw new Error("ADMIN_EMAIL is required in production.");
    }

    if (
      !config.adminPasswordHash &&
      (!process.env.ADMIN_PASSWORD || config.adminPassword === "Admin123!")
    ) {
      throw new Error(
        "Set ADMIN_PASSWORD_HASH or a strong ADMIN_PASSWORD in production."
      );
    }
  }
}

module.exports = {
  ...config,
  assertSecureConfig
};
