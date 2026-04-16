const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const POSTS_FILE = path.resolve(__dirname, "../data/posts.json");
const REPORT_FILE = path.resolve(__dirname, "../reports/donna-duplicate-candidates-report.json");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const {
  applyClassification,
  getFamilyKey,
  getReleaseStatus,
  getVersionValue,
  isDonnaPost,
  isMeaningfulAlternate
} = require("./classify-release-status");

function sortPosts(posts = []) {
  const statusWeight = { canon: 3, alternate: 2, working: 1, "": 0 };

  return posts.slice().sort((left, right) => {
    const leftStatus = getReleaseStatus(left);
    const rightStatus = getReleaseStatus(right);

    if ((statusWeight[rightStatus] || 0) !== (statusWeight[leftStatus] || 0)) {
      return (statusWeight[rightStatus] || 0) - (statusWeight[leftStatus] || 0);
    }

    if (Boolean(right.isPrimaryVersion) !== Boolean(left.isPrimaryVersion)) {
      return Number(Boolean(right.isPrimaryVersion)) - Number(Boolean(left.isPrimaryVersion));
    }

    if (Boolean(right.isHomepageEligible) !== Boolean(left.isHomepageEligible)) {
      return Number(Boolean(right.isHomepageEligible)) - Number(Boolean(left.isHomepageEligible));
    }

    if (Boolean(left.isArchive) !== Boolean(right.isArchive)) {
      return Number(Boolean(left.isArchive)) - Number(Boolean(right.isArchive));
    }

    return String(right.createdAt || "").localeCompare(String(left.createdAt || ""));
  });
}

function summarizePost(post) {
  return {
    title: post.title,
    slug: post.slug,
    releaseStatus: getReleaseStatus(post) || "unclassified",
    versionFamily: String(post.versionFamily || "").trim(),
    version: getVersionValue(post),
    isPrimaryVersion: Boolean(post.isPrimaryVersion),
    isHomepageEligible: Boolean(post.isHomepageEligible),
    isArchive: Boolean(post.isArchive),
    isPubliclyVisible: post.isPubliclyVisible !== false,
    sourceTag: String(post.sourceTag || "").trim(),
    createdAt: String(post.createdAt || "")
  };
}

function getPublicPosts(posts = []) {
  return posts.filter((post) => {
    const status = getReleaseStatus(post);
    return (status === "canon" || status === "alternate") && post.isPubliclyVisible !== false;
  });
}

function getCanonicalSignals(posts = []) {
  return {
    hasCanon: posts.some((post) => getReleaseStatus(post) === "canon"),
    hasAlternate: posts.some((post) => getReleaseStatus(post) === "alternate"),
    hasPrimary: posts.some((post) => Boolean(post.isPrimaryVersion)),
    hasHomepage: posts.some((post) => Boolean(post.isHomepageEligible)),
    allWorkingOrArchive:
      posts.length > 0 &&
      posts.every((post) => getReleaseStatus(post) === "working" || Boolean(post.isArchive)),
    hasMeaningfulAlternate: posts.some((post) => {
      const status = getReleaseStatus(post);
      return status === "alternate" || isMeaningfulAlternate(post);
    })
  };
}

function recommendFamily(familyKey, posts) {
  const donnaPosts = sortPosts(posts.filter((post) => isDonnaPost(post)));
  const nonDonnaPosts = sortPosts(posts.filter((post) => !isDonnaPost(post)));
  const publicDonnaPosts = getPublicPosts(donnaPosts);
  const publicNonDonnaPosts = getPublicPosts(nonDonnaPosts);
  const donnaSignals = getCanonicalSignals(donnaPosts);
  const nonDonnaSignals = getCanonicalSignals(nonDonnaPosts);
  const reasons = [];
  let recommendation = "keep-donna";
  let confidence = "medium";

  if (publicDonnaPosts.length > 0 && publicNonDonnaPosts.length > 0) {
    recommendation = "keep-both";
    confidence = "high";
    reasons.push("Both Donna and non-Donna posts are currently classified for public visibility.");
  } else if (publicNonDonnaPosts.length > 0) {
    recommendation = "keep-non-donna";
    confidence = nonDonnaSignals.hasCanon || donnaSignals.allWorkingOrArchive ? "high" : "medium";
    reasons.push("Only non-Donna posts are currently classified for public visibility.");
  } else if (publicDonnaPosts.length > 0) {
    recommendation = "keep-donna";
    confidence = donnaSignals.hasCanon || nonDonnaSignals.allWorkingOrArchive ? "high" : "medium";
    reasons.push("Only Donna posts are currently classified for public visibility.");
  } else if (nonDonnaSignals.hasMeaningfulAlternate && !donnaSignals.hasCanon) {
    recommendation = "keep-non-donna";
    confidence = "medium";
    reasons.push("The non-Donna side reads as a meaningful alternate or refined rewrite while Donna lacks a public-favored version.");
  } else if (nonDonnaSignals.hasMeaningfulAlternate) {
    recommendation = "keep-both";
    confidence = "medium";
    reasons.push("The non-Donna side looks meaningfully distinct, so the family may need canon/alternate treatment.");
  } else {
    recommendation = "keep-donna";
    confidence = "medium";
    reasons.push("No stronger non-Donna public signal was found, so the default bias stays with the Donna source record.");
  }

  if (nonDonnaSignals.hasCanon && donnaSignals.allWorkingOrArchive) {
    reasons.push("Non-Donna has the stronger canon signal while the Donna side is effectively archival/working.");
  }

  if (donnaSignals.hasCanon && nonDonnaSignals.allWorkingOrArchive) {
    reasons.push("Donna has the stronger canon signal while the non-Donna side is effectively archival/working.");
  }

  if (publicDonnaPosts.length > 0 && publicNonDonnaPosts.length > 0 && (donnaSignals.hasAlternate || nonDonnaSignals.hasAlternate)) {
    reasons.push("This family already presents as canon plus alternate rather than a simple duplicate.");
  }

  return {
    familyKey,
    matchBasis: posts.some((post) => String(post.versionFamily || "").trim()) ? "versionFamily" : "clean-title-fallback",
    recommendation,
    confidence,
    reasons,
    donnaPosts: donnaPosts.map(summarizePost),
    nonDonnaPosts: nonDonnaPosts.map(summarizePost)
  };
}

function buildDuplicateReport(posts = []) {
  const classifiedPosts = applyClassification(posts, { force: false }).posts;
  const families = new Map();

  classifiedPosts.forEach((post) => {
    const familyKey = getFamilyKey(post);

    if (!families.has(familyKey)) {
      families.set(familyKey, []);
    }

    families.get(familyKey).push(post);
  });

  const candidates = [...families.entries()]
    .filter(([, familyPosts]) => familyPosts.some((post) => isDonnaPost(post)) && familyPosts.some((post) => !isDonnaPost(post)))
    .map(([familyKey, familyPosts]) => recommendFamily(familyKey, familyPosts))
    .sort((left, right) => left.familyKey.localeCompare(right.familyKey));

  const recommendationCounts = candidates.reduce(
    (accumulator, candidate) => {
      accumulator[candidate.recommendation] += 1;
      return accumulator;
    },
    { "keep-donna": 0, "keep-non-donna": 0, "keep-both": 0 }
  );

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      totalFamiliesScanned: families.size,
      duplicateCandidateFamilies: candidates.length,
      ...recommendationCounts
    },
    candidates
  };
}

function loadPostsFromFile() {
  const raw = fs.readFileSync(POSTS_FILE, "utf8");
  const data = JSON.parse(raw);
  return Array.isArray(data.posts) ? data.posts : [];
}

function writeReport(report) {
  fs.mkdirSync(path.dirname(REPORT_FILE), { recursive: true });
  fs.writeFileSync(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`);
}

function printSummary(report) {
  console.log("Donna duplicate candidate report:");
  console.log(JSON.stringify(report.summary, null, 2));
  console.log("");
  console.log("Top candidates:");
  console.log(
    JSON.stringify(
      report.candidates.slice(0, 20).map((candidate) => ({
        familyKey: candidate.familyKey,
        recommendation: candidate.recommendation,
        confidence: candidate.confidence,
        donna: candidate.donnaPosts.map((post) => post.slug),
        nonDonna: candidate.nonDonnaPosts.map((post) => post.slug)
      })),
      null,
      2
    )
  );
}

function main() {
  const posts = loadPostsFromFile();
  const report = buildDuplicateReport(posts);
  writeReport(report);
  printSummary(report);
}

module.exports = {
  buildDuplicateReport
};

if (require.main === module) {
  main();
}
