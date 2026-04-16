const { Resolver } = require("node:dns").promises;
const { MongoClient, ServerApiVersion } = require("mongodb");
const config = require("../config");

let clientPromise = null;
let database = null;
let activeClient = null;

function createClient(uri) {
  return new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true
    }
  });
}

function isSrvDnsFailure(error, uri) {
  return (
    typeof uri === "string" &&
    uri.startsWith("mongodb+srv://") &&
    (error?.code === "ECONNREFUSED" || error?.code === "ENOTFOUND" || error?.code === "ETIMEOUT") &&
    error?.syscall === "querySrv"
  );
}

function buildTxtRecordValue(txtRecords = []) {
  return txtRecords
    .map((entry) => entry.join(""))
    .find(Boolean) || "";
}

function parseSrvAnswerData(answer = "") {
  const match = String(answer).trim().match(/^\d+\s+\d+\s+(\d+)\s+(.+)$/);

  if (!match) {
    return null;
  }

  return {
    port: Number(match[1]),
    name: match[2].replace(/\.$/, "")
  };
}

async function resolveAtlasRecordsWithPublicDns(hostname) {
  const resolver = new Resolver();
  resolver.setServers(["1.1.1.1", "8.8.8.8"]);

  const serviceName = `_mongodb._tcp.${hostname}`;
  const [srvRecords, txtRecords] = await Promise.all([
    resolver.resolveSrv(serviceName),
    resolver.resolveTxt(hostname).catch(() => [])
  ]);

  return {
    srvRecords,
    txtValue: buildTxtRecordValue(txtRecords)
  };
}

async function resolveAtlasRecordsWithDoh(hostname) {
  const serviceName = `_mongodb._tcp.${hostname}`;
  const [srvResponse, txtResponse] = await Promise.all([
    fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(serviceName)}&type=SRV`, {
      headers: { accept: "application/dns-json" }
    }),
    fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=TXT`, {
      headers: { accept: "application/dns-json" }
    })
  ]);

  if (!srvResponse.ok) {
    throw new Error(`Cloudflare DNS-over-HTTPS SRV lookup failed with status ${srvResponse.status}.`);
  }

  const srvJson = await srvResponse.json();
  const txtJson = txtResponse.ok ? await txtResponse.json() : { Answer: [] };
  const srvAnswers = Array.isArray(srvJson.Answer) ? srvJson.Answer : [];
  const txtAnswers = Array.isArray(txtJson.Answer) ? txtJson.Answer : [];

  const srvRecords = srvAnswers
    .map((answer) => parseSrvAnswerData(answer?.data))
    .filter(Boolean);

  const txtValue = txtAnswers
    .map((answer) => String(answer?.data || "").replace(/^"|"$/g, "").replace(/\\"/g, "\""))
    .find(Boolean) || "";

  return { srvRecords, txtValue };
}

async function resolveAtlasRecords(hostname) {
  try {
    return await resolveAtlasRecordsWithPublicDns(hostname);
  } catch (publicDnsError) {
    try {
      return await resolveAtlasRecordsWithDoh(hostname);
    } catch (dohError) {
      dohError.cause = publicDnsError;
      throw dohError;
    }
  }
}

async function buildDirectMongoUriFromSrv(srvUri) {
  const parsed = new URL(srvUri);
  const { srvRecords, txtValue } = await resolveAtlasRecords(parsed.hostname);

  if (!srvRecords.length) {
    throw new Error(`No MongoDB SRV records were returned for ${parsed.hostname}.`);
  }

  const params = new URLSearchParams(parsed.searchParams);

  if (txtValue) {
    const txtParams = new URLSearchParams(txtValue);

    for (const [key, value] of txtParams.entries()) {
      if (!params.has(key)) {
        params.set(key, value);
      }
    }
  }

  if (!params.has("tls") && !params.has("ssl")) {
    params.set("tls", "true");
  }

  const username = parsed.username ? encodeURIComponent(decodeURIComponent(parsed.username)) : "";
  const password = parsed.password ? encodeURIComponent(decodeURIComponent(parsed.password)) : "";
  const auth =
    username || password
      ? `${username}${password ? `:${password}` : ""}@`
      : "";
  const hosts = srvRecords
    .map((record) => `${record.name}:${record.port}`)
    .join(",");
  const pathname = parsed.pathname && parsed.pathname !== "/" ? parsed.pathname : "/";
  const query = params.toString();

  return `mongodb://${auth}${hosts}${pathname}${query ? `?${query}` : ""}`;
}

async function connectWithFallback(uri) {
  try {
    return await createClient(uri).connect();
  } catch (error) {
    if (!isSrvDnsFailure(error, uri)) {
      throw error;
    }

    const fallbackUri = config.mongoDirectUri || (await buildDirectMongoUriFromSrv(uri));
    console.warn("MongoDB SRV lookup failed. Retrying with a direct connection URI for restricted DNS environments.");
    return createClient(fallbackUri).connect();
  }
}

async function connectToDatabase() {
  if (database) {
    return database;
  }

  if (!clientPromise) {
    clientPromise = connectWithFallback(config.mongoUri);
  }

  const client = await clientPromise;
  activeClient = client;
  database = client.db(config.mongoDbName);
  return database;
}

function getDb() {
  if (!database) {
    throw new Error("MongoDB has not been initialized. Call connectToDatabase() first.");
  }

  return database;
}

async function closeDatabase() {
  if (activeClient) {
    await activeClient.close();
  }

  activeClient = null;
  clientPromise = null;
  database = null;
}

module.exports = {
  closeDatabase,
  connectToDatabase,
  getDb
};
