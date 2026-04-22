require("dotenv").config({ quiet: true });
const fs = require("fs/promises");
const path = require("path");
const config = require("../src/config");
const {
  ensureStore,
  readAdminAuditLogs,
  readStore
} = require("../src/data/store");
const { closeDatabase, connectToDatabase } = require("../src/lib/mongo");

function parseArgs(argv) {
  return argv.reduce(
    (args, entry) => {
      if (entry.startsWith("--output=")) {
        args.output = entry.slice("--output=".length);
      }

      if (entry.startsWith("--label=")) {
        args.label = entry.slice("--label=".length);
      }

      return args;
    },
    {
      label: "",
      output: path.join(__dirname, "..", "backups")
    }
  );
}

function sanitizeLabel(label = "") {
  return String(label || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const timestamp = new Date();
  const suffix = sanitizeLabel(args.label);
  const backupDir = path.resolve(args.output);
  const filename = suffix
    ? `ops-snapshot-${formatTimestamp(timestamp)}-${suffix}.json`
    : `ops-snapshot-${formatTimestamp(timestamp)}.json`;
  const outputPath = path.join(backupDir, filename);

  await connectToDatabase();
  await ensureStore();

  try {
    const [store, adminAuditLogs] = await Promise.all([
      readStore(),
      readAdminAuditLogs({ limit: 0 })
    ]);

    const payload = {
      exportedAt: timestamp.toISOString(),
      environment: config.nodeEnv,
      mongoDbName: config.mongoDbName,
      counts: {
        posts: store.posts.length,
        collections: store.collections.length,
        users: store.users.length,
        comments: store.comments.length,
        adminAuditLogs: adminAuditLogs.length
      },
      store,
      adminAuditLogs
    };

    await fs.mkdir(backupDir, { recursive: true });
    await fs.writeFile(outputPath, JSON.stringify(payload, null, 2));
    console.log(`Operational snapshot written to ${outputPath}`);
  } finally {
    await closeDatabase();
  }
}

main().catch((error) => {
  console.error("Failed to export operational backup.", error);
  process.exit(1);
});
