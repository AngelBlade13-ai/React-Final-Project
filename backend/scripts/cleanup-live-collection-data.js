const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env"), quiet: true });
const { MongoClient } = require("mongodb");

const payloadPath = "d:\\Downloads\\site_ready_admin_payloads.json";

const explicitCollectionUpdates = {
  "claude-enhanced": {
    theme: "default",
    featuredReleaseSlug: "will-you-see-me-streamlined",
    description:
      "Later rewrite and refinement shelf. Includes polished variants, streamlined rewrites, and select cross-project revisions; not a canon Eldoria collection."
  },
  "love-vulnerability": {
    theme: "default",
    featuredReleaseSlug: "searching-for-true-love",
    description:
      "Cross-project songs centered on longing, fear of rejection, emotional exposure, and romantic vulnerability."
  },
  "princess-arc": {
    theme: "default",
    featuredReleaseSlug: "queen-reclaimed",
    description: "Cross-project identity songs using princess, queen, and crown motifs."
  },
  "proto-fracture-relationship-prototype": {
    theme: "default",
    featuredReleaseSlug: "ashes-and-allies",
    description: "Pre-canon relationship studies that seeded later Fractureverse dynamics."
  },
  "proto-fracture-villain-origins": {
    theme: "default",
    featuredReleaseSlug: "you-remember-me-now",
    description: "Pre-canon villain-origin studies that fed into later Fractureverse ideas."
  },
  "proto-fracture-villain-philosophy": {
    theme: "default",
    featuredReleaseSlug: "necessary-damage",
    description: "Pre-canon villain philosophy sketches connected to later Fractureverse themes."
  },
  "proto-fractureverse-inspired": {
    theme: "default",
    featuredReleaseSlug: "you-remember-me-now",
    description: "Pre-canon and inspired works that seeded Fractureverse themes without being strict canon."
  },
  "eldoria-core-narrative": {
    title: "Eldoria - Core Narrative"
  },
  "expression-spectrum": {
    featuredReleaseSlug: "blooming-forward-"
  },
  "identity-survival": {
    featuredReleaseSlug: "the-girl-i-couldnt-kill-heartbreaking-fragile-version"
  }
};

async function main() {
  const payload = JSON.parse(fs.readFileSync(payloadPath, "utf8"));
  const desiredFeaturedByCollection = new Map(
    (payload.collections || []).map((collection) => [collection.slug, String(collection.featuredReleaseSlug || "").trim()])
  );

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  try {
    const db = client.db(process.env.MONGODB_DB_NAME);
    const collectionsCollection = db.collection("collections");
    const posts = await db
      .collection("posts")
      .find({}, { projection: { slug: 1, collectionSlugs: 1 } })
      .toArray();
    const postSlugs = new Set(posts.map((post) => post.slug));
    const collectionMembership = new Map();

    for (const post of posts) {
      for (const slug of post.collectionSlugs || []) {
        if (!collectionMembership.has(slug)) {
          collectionMembership.set(slug, new Set());
        }

        collectionMembership.get(slug).add(post.slug);
      }
    }

    const collections = await collectionsCollection.find({}).toArray();
    const updates = [];

    for (const collection of collections) {
      const membership = collectionMembership.get(collection.slug) || new Set();
      const desiredFeatured = desiredFeaturedByCollection.get(collection.slug) || "";
      const patch = {};

      if (!collection.featuredReleaseSlug && desiredFeatured && postSlugs.has(desiredFeatured) && membership.has(desiredFeatured)) {
        patch.featuredReleaseSlug = desiredFeatured;
      }

      const explicitPatch = explicitCollectionUpdates[collection.slug];

      if (explicitPatch) {
        Object.assign(patch, explicitPatch);
      }

      const hasChanges = Object.entries(patch).some(([key, value]) => collection[key] !== value);

      if (!hasChanges) {
        continue;
      }

      await collectionsCollection.updateOne({ _id: collection._id }, { $set: patch });
      updates.push({ slug: collection.slug, patch });
    }

    console.log(JSON.stringify({ updatedCollections: updates.length, updates }, null, 2));
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
