const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const { connectToDatabase, closeDatabase } = require("../src/lib/mongo");
const { readStore, writeStore } = require("../src/data/store");

const PUBLIC_PRIMARY_COLLECTION_SLUGS = new Set(["fractureverse", "eldoria", "original-personal", "standalone"]);
const SUBCATEGORY_RULES = [
  { key: "archive", slugs: ["donna-era"] },
  { key: "community", slugs: ["community-pride", "personal-identity-community-and-pride"] },
  {
    key: "princess",
    slugs: ["princess-arc", "personal-identity-princess-arc", "personal-identity-princess-arc-symbolic-layer"]
  },
  {
    key: "love-vulnerability",
    slugs: [
      "love-vulnerability",
      "personal-identity-love-and-vulnerability",
      "personal-identity-love-and-vulnerability-sapphic-sub-arc"
    ]
  },
  { key: "empowerment", slugs: ["personal-identity-empowerment", "hope-arc"] },
  {
    key: "identity",
    slugs: [
      "becoming-identity-emergence",
      "personal-reflection-trans-identity-core",
      "personal-identity-internal-confrontation",
      "identity-survival",
      "tragic-identity-arc",
      "quiet-survivor-arc",
      "emotional-isolation",
      "expression-spectrum"
    ]
  }
];

function inferSubCategory(post) {
  const collectionSlugs = Array.isArray(post?.collectionSlugs) ? post.collectionSlugs.map((slug) => String(slug).trim()) : [];

  for (const rule of SUBCATEGORY_RULES) {
    if (rule.slugs.some((slug) => collectionSlugs.includes(slug))) {
      return rule.key;
    }
  }

  return "";
}

async function main() {
  await connectToDatabase();

  const store = await readStore();
  const collectionChanges = [];
  const postChanges = [];
  let skippedCollections = 0;
  let skippedPosts = 0;

  const nextCollections = store.collections.map((collection) => {
    const targetValue = PUBLIC_PRIMARY_COLLECTION_SLUGS.has(collection.slug);
    const currentValue = Boolean(collection.isPublicPrimary);

    if (currentValue === targetValue && typeof collection.isPublicPrimary === "boolean") {
      skippedCollections += 1;
      return collection;
    }

    collectionChanges.push({
      slug: collection.slug,
      previous: typeof collection.isPublicPrimary === "boolean" ? collection.isPublicPrimary : "UNSET",
      next: targetValue
    });

    return {
      ...collection,
      isPublicPrimary: targetValue
    };
  });

  const nextPosts = store.posts.map((post) => {
    const existingSubCategory = typeof post.subCategory === "string" ? post.subCategory.trim() : "";

    if (existingSubCategory) {
      skippedPosts += 1;
      return post;
    }

    const inferredSubCategory = inferSubCategory(post);

    if (!inferredSubCategory) {
      skippedPosts += 1;
      return post;
    }

    postChanges.push({
      id: post.id,
      slug: post.slug,
      subCategory: inferredSubCategory
    });

    return {
      ...post,
      subCategory: inferredSubCategory
    };
  });

  if (collectionChanges.length || postChanges.length) {
    await writeStore({
      ...store,
      collections: nextCollections,
      posts: nextPosts
    });
  }

  console.log("");
  console.log("Collection visibility changes:");
  if (collectionChanges.length) {
    collectionChanges.forEach((change) => {
      console.log(`- ${change.slug}: ${change.previous} -> ${change.next}`);
    });
  } else {
    console.log("- none");
  }

  console.log("");
  console.log("Post subCategory assignments:");
  if (postChanges.length) {
    postChanges.forEach((change) => {
      console.log(`- ${change.slug || change.id}: ${change.subCategory}`);
    });
  } else {
    console.log("- none");
  }

  console.log("");
  console.log("Summary:");
  console.log(`- collections changed: ${collectionChanges.length}`);
  console.log(`- collections skipped: ${skippedCollections}`);
  console.log(`- posts changed: ${postChanges.length}`);
  console.log(`- posts skipped: ${skippedPosts}`);
  console.log(`- write performed: ${collectionChanges.length || postChanges.length ? "yes" : "no"}`);
}

main()
  .catch((error) => {
    console.error("Backfill failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
