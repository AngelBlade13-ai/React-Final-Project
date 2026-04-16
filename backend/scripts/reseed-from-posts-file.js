require("dotenv").config({ quiet: true });
const config = require("../src/config");
const { connectToDatabase } = require("../src/lib/mongo");
const { readLegacySeed, readStore, writeStore } = require("../src/data/store");

async function reseedFromPostsFile() {
  config.assertSecureConfig();
  await connectToDatabase();

  const [currentStore, legacySeed] = await Promise.all([readStore(), readLegacySeed()]);

  await writeStore({
    ...currentStore,
    posts: legacySeed.posts,
    collections: legacySeed.collections
  });

  console.log(
    `Reseeded ${legacySeed.posts.length} posts and ${legacySeed.collections.length} collections from ${config.postsFile}.`
  );
}

reseedFromPostsFile().catch((error) => {
  console.error("Failed to reseed from posts file", error);
  process.exit(1);
});
