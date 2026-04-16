const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const POSTS_FILE = path.resolve(__dirname, "../data/posts.json");
const REPORT_FILE = path.resolve(__dirname, "../reports/donna-duplicate-cleanup-report.json");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const { connectToDatabase, closeDatabase } = require("../src/lib/mongo");
const { readStore, writeStore } = require("../src/data/store");
const { isDonnaPost } = require("./classify-release-status");

const CLEANUP_RULES = [
  { familyKey: "crown-of-dreams", keepSlug: "crown-of-dreams-original-version" },
  { familyKey: "heart-full-of-hope", keepSlug: "heart-full-of-hope-original-version" },
  { familyKey: "princess-in-waiting", keepSlug: "princess-in-waiting-original-version" },
  { familyKey: "shadows-of-the-crown", keepSlug: "shadows-of-the-crown-version-1" }
];

function normalizeFamilyKey(value = "") {
  return String(value || "").trim().toLowerCase();
}

function summarizePost(post) {
  return {
    title: post.title,
    slug: post.slug,
    published: Boolean(post.published),
    isPubliclyVisible: post.isPubliclyVisible !== false,
    releaseStatus: String(post.releaseStatus || "").trim() || "canon",
    sourceTag: String(post.sourceTag || "").trim(),
    supersededBySlug: String(post.supersededBySlug || "").trim(),
    supersededReason: String(post.supersededReason || "").trim()
  };
}

function applyCleanup(posts = [], timestamp = new Date().toISOString()) {
  const hiddenPosts = [];
  const keptPublicPosts = [];
  const ambiguousCases = [];
  const nextPosts = posts.map((post) => ({ ...post }));

  CLEANUP_RULES.forEach((rule) => {
    const familyPosts = nextPosts.filter((post) => normalizeFamilyKey(post.versionFamily) === rule.familyKey);
    const keepPost = familyPosts.find((post) => post.slug === rule.keepSlug);
    const donnaPosts = familyPosts.filter((post) => isDonnaPost(post));

    if (!familyPosts.length || !keepPost || !donnaPosts.length) {
      ambiguousCases.push({
        familyKey: rule.familyKey,
        issue: "Expected keep target or Donna duplicates were not found.",
        members: familyPosts.map(summarizePost)
      });
      return;
    }

    const unexpectedNonDonnaMembers = familyPosts.filter((post) => !isDonnaPost(post) && post.slug !== rule.keepSlug);

    if (unexpectedNonDonnaMembers.length) {
      ambiguousCases.push({
        familyKey: rule.familyKey,
        issue: "Additional non-Donna members exist outside the approved keep target.",
        members: familyPosts.map(summarizePost)
      });
    }

    familyPosts.forEach((post) => {
      if (post.slug === rule.keepSlug) {
        post.isPubliclyVisible = true;
        post.supersededBySlug = "";
        post.supersededReason = "";
        post.supersededAt = "";
        keptPublicPosts.push({
          familyKey: rule.familyKey,
          ...summarizePost(post)
        });
        return;
      }

      if (isDonnaPost(post)) {
        post.isPubliclyVisible = false;
        post.supersededBySlug = rule.keepSlug;
        post.supersededReason = "Superseded Donna duplicate hidden in favor of the approved non-Donna public version.";
        post.supersededAt = timestamp;
        hiddenPosts.push({
          familyKey: rule.familyKey,
          ...summarizePost(post)
        });
      }
    });
  });

  return {
    posts: nextPosts,
    report: {
      generatedAt: timestamp,
      summary: {
        familiesProcessed: CLEANUP_RULES.length,
        postsHidden: hiddenPosts.length,
        postsKeptPublic: keptPublicPosts.length,
        ambiguousCases: ambiguousCases.length
      },
      hiddenPosts,
      keptPublicPosts,
      ambiguousCases
    }
  };
}

function loadFileData() {
  return JSON.parse(fs.readFileSync(POSTS_FILE, "utf8"));
}

function writeFileData(data) {
  fs.writeFileSync(POSTS_FILE, `${JSON.stringify(data, null, 2)}\n`);
}

function writeReport(report) {
  fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true });
  fs.writeFileSync(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`);
}

async function updateFileTarget() {
  const data = loadFileData();
  const result = applyCleanup(Array.isArray(data.posts) ? data.posts : []);
  data.posts = result.posts;
  writeFileData(data);
  return result.report;
}

async function updateDbTarget() {
  await connectToDatabase();
  const store = await readStore();
  const result = applyCleanup(store.posts || []);
  await writeStore({ ...store, posts: result.posts });
  return result.report;
}

function printReport(target, report) {
  console.log(`Donna duplicate cleanup applied to ${target}:`);
  console.log(JSON.stringify(report.summary, null, 2));
  console.log("");
  console.log("Hidden Donna posts:");
  console.log(JSON.stringify(report.hiddenPosts, null, 2));
  console.log("");
  console.log("Kept public posts:");
  console.log(JSON.stringify(report.keptPublicPosts, null, 2));
  console.log("");
  console.log("Ambiguous cases:");
  console.log(JSON.stringify(report.ambiguousCases, null, 2));
}

async function main() {
  const targetArg = process.argv.find((argument) => argument.startsWith("--target="));
  const target = targetArg ? targetArg.split("=")[1] : "both";

  if (target === "file") {
    const report = await updateFileTarget();
    writeReport(report);
    printReport("file", report);
    return;
  }

  if (target === "db") {
    const report = await updateDbTarget();
    writeReport(report);
    printReport("db", report);
    return;
  }

  const fileReport = await updateFileTarget();
  printReport("file", fileReport);
  const dbReport = await updateDbTarget();
  writeReport(dbReport);
  printReport("db", dbReport);
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await closeDatabase();
    });
}
