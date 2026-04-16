const path = require("path");

const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 4000,
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  jwtSecret: process.env.JWT_SECRET || "change-me",
  adminEmail: process.env.ADMIN_EMAIL || "admin@example.com",
  adminPassword: process.env.ADMIN_PASSWORD || "Admin123!",
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH || "",
  mongoUri: process.env.MONGODB_URI || "mongodb://127.0.0.1:27017",
  mongoDirectUri: process.env.MONGODB_DIRECT_URI || "",
  mongoDbName: process.env.MONGODB_DB_NAME || "suno_blog",
  postsFile: process.env.POSTS_FILE || path.join(__dirname, "..", "data", "posts.json"),
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || "",
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || "",
  cloudinaryFolder: process.env.CLOUDINARY_FOLDER || "suno-releases",
  cloudinaryChunkSize: Number(process.env.CLOUDINARY_CHUNK_SIZE) || 20 * 1024 * 1024
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

    if (!config.adminPasswordHash && (!process.env.ADMIN_PASSWORD || config.adminPassword === "Admin123!")) {
      throw new Error("Set ADMIN_PASSWORD_HASH or a strong ADMIN_PASSWORD in production.");
    }
  }
}

module.exports = {
  ...config,
  assertSecureConfig
};
