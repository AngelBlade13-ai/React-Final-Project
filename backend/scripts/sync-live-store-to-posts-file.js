require("dotenv").config({ quiet: true });

const config = require("../src/config");
const { connectToDatabase } = require("../src/lib/mongo");
const { applyLiveStoreSync, previewLiveStoreSync } = require("../src/services/liveStoreSync");

async function main() {
  const options = parseArgs(process.argv.slice(2));

  config.assertSecureConfig();
  await connectToDatabase();
  const result = options.write
    ? await applyLiveStoreSync({ outputDir: options.outputDir })
    : await previewLiveStoreSync({ outputDir: options.outputDir });

  console.log(`Live store snapshot: ${result.liveSnapshotPath}`);
  console.log(`Sync report:         ${result.reportPath}`);
  console.log(
    `Post drift summary:  ${result.report.posts.onlyInLive.length} live-only, `
      + `${result.report.posts.onlyInFile.length} file-only, `
      + `${result.report.posts.changed.length} changed`
  );

  if (!options.write) {
    console.log("No file changes written. Re-run with --write to overwrite posts.json from the live store.");
    return;
  }

  console.log(`Backed up posts file: ${result.backupPath}`);
  console.log(`Updated posts file:   ${config.postsFile}`);
}

function parseArgs(argv) {
  const options = {
    write: false,
    outputDir: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--write") {
      options.write = true;
      continue;
    }

    if (arg.startsWith("--output-dir=")) {
      options.outputDir = arg.slice("--output-dir=".length).trim();
      continue;
    }

    if (arg === "--output-dir") {
      const nextValue = argv[index + 1];
      if (!nextValue) {
        throw new Error("--output-dir requires a value.");
      }
      options.outputDir = nextValue.trim();
      index += 1;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log("Usage: node scripts/sync-live-store-to-posts-file.js [--write] [--output-dir PATH]");
  console.log("");
  console.log("Without --write, this creates a live store snapshot and a drift report only.");
  console.log("With --write, it also backs up backend/data/posts.json and overwrites it from the live store.");
}

main().catch((error) => {
  console.error("Failed to reconcile live store back into posts file.", error);
  process.exit(1);
});
