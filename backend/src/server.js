const path = require("node:path");
require("dotenv").config({
  path: path.resolve(__dirname, "..", ".env"),
  quiet: true
});
const app = require("./app");
const config = require("./config");
const { ensureStore } = require("./data/store");
const { logInfo, reportError } = require("./lib/logger");
const { connectToDatabase } = require("./lib/mongo");

async function startServer() {
  config.assertSecureConfig();
  await connectToDatabase();
  await ensureStore();

  app.listen(config.port, () => {
    logInfo("server.started", {
      clientUrl: config.clientUrl,
      mongoDbName: config.mongoDbName,
      port: config.port
    });
  });
}

startServer().catch((error) => {
  reportError(error, {
    event: "server.start_failed"
  })
    .catch(() => {})
    .finally(() => {
      process.exit(1);
    });
});
