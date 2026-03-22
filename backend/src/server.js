require("dotenv").config({ quiet: true });
const app = require("./app");
const config = require("./config");
const { ensureStore } = require("./data/store");
const { connectToDatabase } = require("./lib/mongo");

async function startServer() {
  config.assertSecureConfig();
  await connectToDatabase();
  await ensureStore();

  app.listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start API", error);
  process.exit(1);
});
