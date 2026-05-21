require("dotenv").config({ quiet: true });
const { connectToDatabase, closeDatabase } = require("../src/lib/mongo");
const { readStore, writeSiteContent } = require("../src/data/store");
const { applyPublicListenerCopy } = require("../src/data/publicListenerCopy");

async function main() {
  await connectToDatabase();
  const store = await readStore();
  const current = store.siteContent || {};
  const next = applyPublicListenerCopy(current);

  await writeSiteContent(next);

  console.log("Public site copy refresh complete.");
  console.log(`Tagline: ${next.branding?.siteTagline || ""}`);
  console.log(`Home note eyebrow: ${next.home?.noteEyebrow || ""}`);
  console.log(
    `Guided paths: ${(next.guidedPaths || []).length} (eyebrows normalized where applicable)`
  );

  await closeDatabase();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
