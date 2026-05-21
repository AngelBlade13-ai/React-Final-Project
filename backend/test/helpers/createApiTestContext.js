const path = require("node:path");
const request = require("supertest");
const { MongoMemoryServer } = require("mongodb-memory-server");

const backendSrcRoot = path.resolve(__dirname, "../../src");
const mutationHeaders = {
  "x-suno-intent": "ui"
};

function clearBackendModuleCache() {
  Object.keys(require.cache).forEach((cacheKey) => {
    if (cacheKey.startsWith(backendSrcRoot)) {
      delete require.cache[cacheKey];
    }
  });
}

async function createApiTestContext(overrides = {}) {
  const mongoServer = await MongoMemoryServer.create({
    instance: {
      dbName: "suno_blog_test"
    }
  });

  process.env.NODE_ENV = "test";
  process.env.CLIENT_URL = "http://127.0.0.1:4173";
  process.env.JWT_SECRET = "test-secret";
  process.env.ADMIN_EMAIL = "admin@example.com";
  process.env.ADMIN_PASSWORD = "Admin123!";
  process.env.MONGODB_URI = mongoServer.getUri();
  process.env.MONGODB_DB_NAME = "suno_blog_test";

  Object.entries(overrides).forEach(([key, value]) => {
    process.env[key] = value;
  });

  clearBackendModuleCache();

  const { connectToDatabase, closeDatabase } = require("../../src/lib/mongo");
  const { ensureStore } = require("../../src/data/store");
  const app = require("../../src/app");

  await connectToDatabase();
  await ensureStore();

  return {
    agent: request.agent(app),
    client: request(app),
    mutationHeaders,
    async close() {
      await closeDatabase();
      clearBackendModuleCache();
      await mongoServer.stop();
    }
  };
}

module.exports = {
  createApiTestContext
};
