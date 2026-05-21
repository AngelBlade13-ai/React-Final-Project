const { MongoMemoryServer } = require("mongodb-memory-server");

async function start() {
  const mongoServer = await MongoMemoryServer.create({
    instance: {
      dbName: "suno_blog_e2e"
    }
  });

  process.env.NODE_ENV = process.env.NODE_ENV || "test";
  process.env.PORT = process.env.PORT || "4100";
  process.env.CLIENT_URL = process.env.CLIENT_URL || "http://127.0.0.1:4173";
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
  process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
  process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin123!";
  process.env.MONGODB_URI = process.env.MONGODB_URI || mongoServer.getUri();
  process.env.MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || "suno_blog_e2e";

  const app = require("../src/app");
  const { ensureStore } = require("../src/data/store");
  const { closeDatabase, connectToDatabase } = require("../src/lib/mongo");

  await connectToDatabase();
  await ensureStore();

  const server = app.listen(Number(process.env.PORT), () => {
    console.log(`Test API listening on http://127.0.0.1:${process.env.PORT}`);
  });

  async function shutdown() {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
    await closeDatabase();
    await mongoServer.stop();
    process.exit(0);
  }

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start().catch((error) => {
  console.error("Failed to start test API server", error);
  process.exit(1);
});
