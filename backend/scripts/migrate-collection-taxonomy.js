const fs = require("fs/promises");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const config = require("../src/config");
const { connectToDatabase, closeDatabase } = require("../src/lib/mongo");
const { readStore, writeStore } = require("../src/data/store");

const TARGET_ARG = process.argv.find((arg) => arg.startsWith("--target="));
const TARGET = (TARGET_ARG ? TARGET_ARG.split("=")[1] : "both").trim().toLowerCase();
const VALID_TARGETS = new Set(["db", "file", "both"]);
const REAL_COLLECTION_SLUGS = ["fractureverse", "eldoria", "original-personal", "standalone"];
const REAL_COLLECTION_SET = new Set(REAL_COLLECTION_SLUGS);
const SOURCE_TAG_MAP = new Map([
  ["donna-era", "donna-era"],
  ["claude-enhanced", "claude-enhanced"]
]);
const WORLD_LAYER_MAP = new Map([
  ["eldoria-author-layer", "author-layer"],
  ["eldoria-core-narrative", "core"],
  ["eldoria-meta-memory-layer", "meta-memory"],
  ["fractureverse-core-timeline", "core"],
  ["proto-fracture-relationship-prototype", "proto"],
  ["proto-fracture-villain-origins", "proto"],
  ["proto-fracture-villain-philosophy", "proto"],
  ["proto-fractureverse-inspired", "inspired"],
  ["the-cycle-breaks-tonight", "villain"]
]);
const SUBCATEGORY_MAP = new Map([
  ["villain-anthology", "villain"],
  ["villain-monologues", "villain"],
  ["villain-monologues-necessary-monsters", "villain"],
  ["necessary-monsters", "villain"],
  ["campaign-stories-one-shots", "dnd-campaign"],
  ["d-and-d-character-arcs", "dnd-campaign"],
  ["dnd", "dnd-campaign"],
  ["becoming-identity-emergence", "identity"],
  ["emotional-isolation", "identity"],
  ["expression-spectrum", "identity"],
  ["identity-survival", "identity"],
  ["personal-identity-internal-confrontation", "identity"],
  ["personal-reflection-trans-identity-core", "identity"],
  ["tragic-identity-arc", "identity"],
  ["love-vulnerability", "love-vulnerability"],
  ["personal-identity-love-and-vulnerability", "love-vulnerability"],
  ["personal-identity-love-and-vulnerability-sapphic-sub-arc", "love-vulnerability"],
  ["princess-arc", "princess-motif"],
  ["personal-identity-princess-arc", "princess-motif"],
  ["personal-identity-princess-arc-symbolic-layer", "princess-motif"],
  ["community-pride", "community"],
  ["personal-identity-community-and-pride", "community"],
  ["hope-arc", "empowerment"],
  ["personal-identity-empowerment", "empowerment"],
  ["kawaii-adventure", "kawaii-playful"],
  ["kawaii-magical", "kawaii-playful"],
  ["quiet-survivor-arc", "quiet-survivor"],
  ["sadness-arc", "archive"]
]);
const SOURCE_TAG_PRECEDENCE = ["donna-era", "claude-enhanced"];
const WORLD_LAYER_PRECEDENCE = ["author-layer", "meta-memory", "core", "villain", "proto", "inspired"];
const SUBCATEGORY_PRECEDENCE = [
  "archive",
  "villain",
  "dnd-campaign",
  "quiet-survivor",
  "kawaii-playful",
  "community",
  "princess-motif",
  "love-vulnerability",
  "empowerment",
  "identity"
];
const FRACTUREVERSE_INFERENCE_SLUGS = new Set([
  "fractureverse-core-timeline",
  "proto-fracture-relationship-prototype",
  "proto-fracture-villain-origins",
  "proto-fracture-villain-philosophy",
  "proto-fractureverse-inspired",
  "the-cycle-breaks-tonight"
]);
const ELDORIA_INFERENCE_SLUGS = new Set(["eldoria-author-layer", "eldoria-core-narrative", "eldoria-meta-memory-layer"]);
const STANDALONE_INFERENCE_SLUGS = new Set([
  "villain-anthology",
  "villain-monologues",
  "villain-monologues-necessary-monsters",
  "necessary-monsters",
  "campaign-stories-one-shots",
  "d-and-d-character-arcs",
  "dnd"
]);
const ORIGINAL_PERSONAL_INFERENCE_SLUGS = new Set([
  "donna-era",
  "becoming-identity-emergence",
  "emotional-isolation",
  "expression-spectrum",
  "identity-survival",
  "personal-identity-internal-confrontation",
  "personal-reflection-trans-identity-core",
  "tragic-identity-arc",
  "love-vulnerability",
  "personal-identity-love-and-vulnerability",
  "personal-identity-love-and-vulnerability-sapphic-sub-arc",
  "princess-arc",
  "personal-identity-princess-arc",
  "personal-identity-princess-arc-symbolic-layer",
  "community-pride",
  "personal-identity-community-and-pride",
  "hope-arc",
  "personal-identity-empowerment",
  "kawaii-adventure",
  "kawaii-magical",
  "quiet-survivor-arc",
  "sadness-arc"
]);
const REPORT_PATH = path.resolve(__dirname, "../reports/collection-taxonomy-migration-report.json");

function normalizeStringArray(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || "").trim()).filter(Boolean))];
}

function choosePrimaryValue({ candidates, existingValue, precedence }) {
  const normalizedCandidates = normalizeStringArray(candidates);

  if (!normalizedCandidates.length) {
    return "";
  }

  const normalizedExisting = String(existingValue || "").trim();

  if (normalizedExisting && normalizedCandidates.includes(normalizedExisting)) {
    return normalizedExisting;
  }

  for (const value of precedence) {
    if (normalizedCandidates.includes(value)) {
      return value;
    }
  }

  return normalizedCandidates[0];
}

function inferContainerSlug(originalCollectionSlugs) {
  if (originalCollectionSlugs.some((slug) => FRACTUREVERSE_INFERENCE_SLUGS.has(slug))) {
    return "fractureverse";
  }

  if (originalCollectionSlugs.some((slug) => ELDORIA_INFERENCE_SLUGS.has(slug))) {
    return "eldoria";
  }

  if (originalCollectionSlugs.some((slug) => STANDALONE_INFERENCE_SLUGS.has(slug))) {
    return "standalone";
  }

  if (originalCollectionSlugs.some((slug) => ORIGINAL_PERSONAL_INFERENCE_SLUGS.has(slug))) {
    return "original-personal";
  }

  return "";
}

function valuesDiffer(left, right) {
  return JSON.stringify(left) !== JSON.stringify(right);
}

function transformStore(store) {
  const removedCollections = store.collections
    .filter((collection) => !REAL_COLLECTION_SET.has(collection.slug))
    .map((collection) => ({
      id: collection.id,
      slug: collection.slug,
      title: collection.title
    }));
  const nextCollections = store.collections
    .filter((collection) => REAL_COLLECTION_SET.has(collection.slug))
    .map((collection) => ({
      ...collection,
      isPublicPrimary: true
    }))
    .sort((left, right) => REAL_COLLECTION_SLUGS.indexOf(left.slug) - REAL_COLLECTION_SLUGS.indexOf(right.slug));
  const postsUpdated = [];
  const metadataAssignments = {
    subCategory: 0,
    sourceTag: 0,
    worldLayer: 0,
    themeTags: 0,
    collectionSlugs: 0
  };
  const ambiguousMappings = [];

  const nextPosts = store.posts.map((post) => {
    const originalCollectionSlugs = normalizeStringArray(post.collectionSlugs);
    const existingThemeTags = normalizeStringArray(post.themeTags);
    const sourceCandidates = originalCollectionSlugs.map((slug) => SOURCE_TAG_MAP.get(slug)).filter(Boolean);
    const worldLayerCandidates = originalCollectionSlugs.map((slug) => WORLD_LAYER_MAP.get(slug)).filter(Boolean);
    const subCategoryCandidates = originalCollectionSlugs.map((slug) => SUBCATEGORY_MAP.get(slug)).filter(Boolean);
    const nextSourceTag = choosePrimaryValue({
      candidates: sourceCandidates,
      existingValue: post.sourceTag,
      precedence: SOURCE_TAG_PRECEDENCE
    });
    const nextWorldLayer = choosePrimaryValue({
      candidates: worldLayerCandidates,
      existingValue: post.worldLayer,
      precedence: WORLD_LAYER_PRECEDENCE
    });
    const nextSubCategory = choosePrimaryValue({
      candidates: subCategoryCandidates,
      existingValue: post.subCategory,
      precedence: SUBCATEGORY_PRECEDENCE
    });
    const nextThemeTags = normalizeStringArray([
      ...existingThemeTags,
      ...sourceCandidates.filter((value) => value && value !== nextSourceTag),
      ...worldLayerCandidates.filter((value) => value && value !== nextWorldLayer),
      ...subCategoryCandidates.filter((value) => value && value !== nextSubCategory)
    ]);
    const nextCollectionSlugs = originalCollectionSlugs.filter((slug) => REAL_COLLECTION_SET.has(slug));
    const inferredContainer = nextCollectionSlugs.length ? "" : inferContainerSlug(originalCollectionSlugs);

    if (inferredContainer && !nextCollectionSlugs.includes(inferredContainer)) {
      nextCollectionSlugs.push(inferredContainer);
    }

    const normalizedCollectionSlugs = normalizeStringArray(nextCollectionSlugs);
    const nextPost = {
      ...post,
      collectionSlugs: normalizedCollectionSlugs,
      subCategory: nextSubCategory,
      sourceTag: nextSourceTag,
      worldLayer: nextWorldLayer,
      themeTags: nextThemeTags
    };
    const fieldChanges = {};

    if (valuesDiffer(originalCollectionSlugs, normalizedCollectionSlugs)) {
      metadataAssignments.collectionSlugs += 1;
      fieldChanges.collectionSlugs = {
        previous: originalCollectionSlugs,
        next: normalizedCollectionSlugs,
        removed: originalCollectionSlugs.filter((slug) => !normalizedCollectionSlugs.includes(slug)),
        added: normalizedCollectionSlugs.filter((slug) => !originalCollectionSlugs.includes(slug))
      };
    }

    if (String(post.subCategory || "").trim() !== nextSubCategory) {
      metadataAssignments.subCategory += 1;
      fieldChanges.subCategory = {
        previous: String(post.subCategory || "").trim(),
        next: nextSubCategory
      };
    }

    if (String(post.sourceTag || "").trim() !== nextSourceTag) {
      metadataAssignments.sourceTag += 1;
      fieldChanges.sourceTag = {
        previous: String(post.sourceTag || "").trim(),
        next: nextSourceTag
      };
    }

    if (String(post.worldLayer || "").trim() !== nextWorldLayer) {
      metadataAssignments.worldLayer += 1;
      fieldChanges.worldLayer = {
        previous: String(post.worldLayer || "").trim(),
        next: nextWorldLayer
      };
    }

    if (valuesDiffer(existingThemeTags, nextThemeTags)) {
      metadataAssignments.themeTags += 1;
      fieldChanges.themeTags = {
        previous: existingThemeTags,
        next: nextThemeTags
      };
    }

    const ambiguous = {};

    if (normalizeStringArray(sourceCandidates).length > 1) {
      ambiguous.sourceTags = normalizeStringArray(sourceCandidates);
    }

    if (normalizeStringArray(worldLayerCandidates).length > 1) {
      ambiguous.worldLayers = normalizeStringArray(worldLayerCandidates);
    }

    if (normalizeStringArray(subCategoryCandidates).length > 1) {
      ambiguous.subCategories = normalizeStringArray(subCategoryCandidates);
    }

    if (!normalizedCollectionSlugs.length && originalCollectionSlugs.length) {
      ambiguous.missingContainer = originalCollectionSlugs;
    }

    if (Object.keys(fieldChanges).length) {
      postsUpdated.push({
        id: post.id,
        slug: post.slug,
        title: post.title,
        changes: fieldChanges
      });
    }

    if (Object.keys(ambiguous).length) {
      ambiguousMappings.push({
        id: post.id,
        slug: post.slug,
        title: post.title,
        ambiguous
      });
    }

    return nextPost;
  });

  return {
    nextStore: {
      ...store,
      collections: nextCollections,
      posts: nextPosts
    },
    report: {
      summary: {
        collectionsRemoved: removedCollections.length,
        postsUpdated: postsUpdated.length,
        metadataAssignments,
        ambiguousMappings: ambiguousMappings.length
      },
      removedCollections,
      postsUpdated,
      ambiguousMappings
    }
  };
}

async function migrateDb() {
  await connectToDatabase();
  const store = await readStore();
  const { nextStore, report } = transformStore(store);

  if (report.summary.collectionsRemoved || report.summary.postsUpdated) {
    await writeStore(nextStore);
  }

  return report;
}

async function migrateFile() {
  const filePath = path.resolve(config.postsFile);
  const raw = await fs.readFile(filePath, "utf8");
  const data = JSON.parse(raw);
  const { nextStore, report } = transformStore(data);

  if (report.summary.collectionsRemoved || report.summary.postsUpdated) {
    await fs.writeFile(filePath, `${JSON.stringify(nextStore, null, 2)}\n`, "utf8");
  }

  return {
    filePath,
    ...report
  };
}

async function main() {
  if (!VALID_TARGETS.has(TARGET)) {
    throw new Error(`Invalid target "${TARGET}". Use --target=db, --target=file, or --target=both.`);
  }

  const output = {};

  if (TARGET === "db" || TARGET === "both") {
    output.db = await migrateDb();
  }

  if (TARGET === "file" || TARGET === "both") {
    output.file = await migrateFile();
  }

  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await fs.writeFile(REPORT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log("");
  console.log("Collection taxonomy migration:");
  Object.entries(output).forEach(([target, report]) => {
    console.log(`- ${target}:`);
    console.log(`  collections removed: ${report.summary.collectionsRemoved}`);
    console.log(`  posts updated: ${report.summary.postsUpdated}`);
    console.log(`  subCategory assignments: ${report.summary.metadataAssignments.subCategory}`);
    console.log(`  sourceTag assignments: ${report.summary.metadataAssignments.sourceTag}`);
    console.log(`  worldLayer assignments: ${report.summary.metadataAssignments.worldLayer}`);
    console.log(`  themeTags assignments: ${report.summary.metadataAssignments.themeTags}`);
    console.log(`  collection rewrites: ${report.summary.metadataAssignments.collectionSlugs}`);
    console.log(`  ambiguous mappings: ${report.summary.ambiguousMappings}`);
  });
  console.log("");
  console.log(`Report written to ${REPORT_PATH}`);
}

main()
  .catch((error) => {
    console.error("Collection taxonomy migration failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
