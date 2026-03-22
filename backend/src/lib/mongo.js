const { MongoClient, ServerApiVersion } = require("mongodb");
const config = require("../config");

let clientPromise = null;
let database = null;

async function connectToDatabase() {
  if (database) {
    return database;
  }

  if (!clientPromise) {
    const client = new MongoClient(config.mongoUri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true
      }
    });

    clientPromise = client.connect();
  }

  const client = await clientPromise;
  database = client.db(config.mongoDbName);
  return database;
}

function getDb() {
  if (!database) {
    throw new Error("MongoDB has not been initialized. Call connectToDatabase() first.");
  }

  return database;
}

module.exports = {
  connectToDatabase,
  getDb
};
