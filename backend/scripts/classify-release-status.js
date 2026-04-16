const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const POSTS_FILE = path.resolve(__dirname, "../data/posts.json");
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const { slugify } = require("../src/utils/slugify");
const { connectToDatabase, closeDatabase } = require("../src/lib/mongo");
const { readStore, writeStore } = require("../src/data/store");

const VALID_RELEASE_STATUSES = new Set(["canon", "alternate", "working"]);
const TECHNICAL_PATTERNS = [
  /\bsuno[-\s]?safe\b/i,
  /\banti[-\s]?blend\b/i,
  /\brevision\b/i,
  /\bversion\s*[1-9]\b/i,
  /\bv[1-9]\b/i,
  /\bretry\b/i,
  /\btest\b/i,
  /\battempt\b/i,
  /\bworking\b/i,
  /\bstreamlined\b/i
];
const STYLE_ALT_PATTERNS = [
  /\borchestral\b/i,
  /\brock\b/i,
  /\bacoustic\b/i,
  /\benglish\b/i,
  /\bduet\b/i,
  /\bdark\b/i,
  /\bsad\b/i,
  /\bstripped\b/i,
  /\bexpanded\b/i,
  /\bpowerful\b/i,
  /\bfragile\b/i,
  /\bballad\b/i,
  /\blullaby\b/i,
  /\bop\b/i,
  /\bslow\b/i,
  /\bmale.?female\b/i,
  /\bfull english\b/i,
  /\bsingable english\b/i
];
const VERSION_CLEAN_PATTERN =
  /\b(reimagined|version|revision|mix|remix|alternate|streamlined|stripped|expanded|donna generation|full english|orchestral|acoustic|demo|edit|duet)\b/gi;
const MANUAL_FAMILY_RULES = {
  "between-two-worlds": {
    canon: ["between-two-worlds-the-first-awakening"],
    working: ["between-two-worlds"],
    transferHomepageEligibility: true
  },
  "echoes-of-aeloria": {
    canon: ["echoes-of-aeloria-the-memory-that-was-never-mine"],
    working: ["echoes-of-aeloria"],
    transferHomepageEligibility: true
  },
  "queen-of-borrowed-crowns": {
    canon: ["queen-of-borrowed-crowns-the-throne-that-was-not-hers"],
    working: ["queen-of-borrowed-crowns"],
    transferHomepageEligibility: true
  },
  "wings-of-light": {
    canon: ["wings-of-light-the-weapon-she-wrote-into-being"],
    working: ["wings-of-light"],
    transferHomepageEligibility: true
  },
  "shattered-trust": {
    canon: ["shattered-trust-reimagined"],
    transferHomepageEligibility: true
  },
  "still-breathing": {
    canon: ["still-breathing-in-a-dying-world-reimagined"],
    working: ["still-breathing-in-a-dying-world"],
    transferHomepageEligibility: true
  },
  "the-one-you-used-to-be": {
    canon: ["the-one-you-used-to-be-reimagined"],
    transferHomepageEligibility: true
  },
  "you-were-better-before-you-saved-the-world": {
    canon: ["you-were-better-before-you-saved-the-world-reimagined"],
    transferHomepageEligibility: true
  },
  "we-were-never-meant-to-survive": {
    canon: ["we-were-never-meant-to-survive-reimagined-duet"],
    alternate: ["we-were-never-meant-to-survive"],
    transferHomepageEligibility: true
  },
  "this-is-my-light": {
    canon: ["this-is-my-light"],
    transferHomepageEligibility: true
  },
  "will-you-see-me": {
    canon: ["will-you-see-me-streamlined"],
    alternate: ["will-you-see-me"],
    transferHomepageEligibility: true
  },
  "holding-my-heart-back": {
    canon: ["holding-my-heart-back"],
    transferHomepageEligibility: true
  },
  "heart-full-of-hope": {
    canon: ["heart-full-of-hope-original-version"],
    working: ["heart-full-of-hope"],
    transferHomepageEligibility: true
  },
  "princess-in-waiting": {
    canon: ["princess-in-waiting-original-version"],
    working: ["princess-in-waiting", "princess-in-waiting-donna-generation"],
    transferHomepageEligibility: true
  },
  "crown-of-dreams": {
    canon: ["crown-of-dreams-original-version"],
    working: ["crown-of-dreams", "crown-of-dreams-donna-generation"],
    transferHomepageEligibility: true
  },
  "the-girl-i-couldnt-kill": {
    canon: ["the-girl-i-couldnt-kill"],
    alternate: ["the-girl-i-couldnt-kill-dark-cinematic-powerful-version"],
    working: ["the-girl-i-couldn-t-kill"],
    transferHomepageEligibility: true
  },
  "blooming-forward": {
    canon: ["blooming-forward", "blooming-forward-"],
    transferHomepageEligibility: true
  },
  "i-am-more-than-what-they-see": {
    canon: ["i-am-more-than-what-they-see"],
    alternate: ["i-am-more-than-what-they-see-dark-orchestral-rock-version"],
    working: ["i-am-more-than-what-they-see-darker-version", "i-am-more-than-what-they-see-darker-version-no-fear-revision"],
    transferHomepageEligibility: true
  },
  "together-we-rise": {
    canon: ["together-we-rise"],
    transferHomepageEligibility: true
  },
  "becoming-angel": {
    alternate: ["becoming-angel-dark-cinematic-male-female-version", "becoming-angel-dark-cinematic-malefemale-version"],
    working: ["becoming-angel"]
  },
  "hidden-identity-ballad": {
    alternate: ["hidden-identity-ballad-wounded-hope-version"],
    working: ["hidden-identity-ballad", "hidden-identity-ballad-extended-heavy-devastating-version", "hidden-identity-ballad-extended-heavydevastating-version"]
  },
  "you-wanted-a-hero": {
    canon: ["you-wanted-a-hero"],
    transferHomepageEligibility: true
  },
  "the-hands-that-shield": {
    canon: ["the-hands-that-shield"],
    transferHomepageEligibility: true
  },
  "crown-of-thorns": {
    canon: ["crown-of-thorns"],
    transferHomepageEligibility: true
  },
  "last-light-of-the-faithful": {
    canon: ["last-light-of-the-faithful"],
    transferHomepageEligibility: true
  },
  "shadows-of-the-crown": {
    canon: ["shadows-of-the-crown-version-1"],
    working: ["shadows-of-the-crown"]
  },
  "a-day-to-chill": {
    alternate: ["a-day-to-chill"]
  }
};
const MANUAL_SINGLE_OVERRIDES = {
  "ashes-and-allies": { releaseStatus: "alternate" },
  "between-the-name-and-the-mirror": { releaseStatus: "alternate" },
  "where-the-wings-remember": { releaseStatus: "alternate" },
  "what-the-world-made-of-me": { releaseStatus: "alternate" },
  "the-cost-i-couldnt-pay": { releaseStatus: "alternate" },
  "rise-in-the-radiant-storm": { releaseStatus: "alternate", versionFamily: "rise-in-the-radiant-storm" },
  "rise-in-the-radiant-storm-": { releaseStatus: "alternate", versionFamily: "rise-in-the-radiant-storm" },
  "im-shiny-me": { releaseStatus: "alternate" },
  "-im-shiny-me": { releaseStatus: "alternate" },
  "angel-made-of-quiet-fire": { releaseStatus: "alternate" },
  "quiet-kept-me-alive": { releaseStatus: "alternate" },
  "rooms-with-no-windows": { releaseStatus: "alternate" },
  "cauterize-the-world": { releaseStatus: "alternate" },
  "lost-in-the-black": { releaseStatus: "alternate" },
  "moonlight-magic-lullaby": { releaseStatus: "alternate" },
  "the-light-that-learned-to-die": { releaseStatus: "alternate" },
  "the-wounded-hope-ballad": { releaseStatus: "alternate" },
  "you-remember-me-now": { releaseStatus: "alternate" },
  "what-i-dont-say-out-loud": { releaseStatus: "alternate" },
  "necessary-damage": { releaseStatus: "alternate" },
  "the-girl-in-the-quiet": { releaseStatus: "working" },
  "maybe-someday-baby": { releaseStatus: "alternate" },
  "porch-light-fading": { releaseStatus: "alternate" },
  "true-colors": { releaseStatus: "alternate" },
  "awakening-in-magic": { releaseStatus: "working" },
  "dreaming-of-love": { releaseStatus: "working" },
  "dreams-beneath-the-stars": { releaseStatus: "working" },
  "dreams-in-the-fields": { releaseStatus: "working" },
  "echoes-of-endless-pain": { releaseStatus: "working" },
  "empty-connections": { releaseStatus: "working" },
  "heartbeats-in-the-night": { releaseStatus: "working" },
  "in-shadows-to-light": { releaseStatus: "working" },
  "journey-of-a-thousand-dreams": { releaseStatus: "working" },
  "lost-in-the-silence": { releaseStatus: "working" },
  "rise-above-the-shadows": { releaseStatus: "working" },
  "symphony-of-silence": { releaseStatus: "working" },
  "trapped-in-a-boys-skin": { releaseStatus: "working" },
  "the-warmth-of-friendship": { releaseStatus: "working" },
  "embracing-trans-rights": { releaseStatus: "working" },
  "stand-up-for-trans-rights": { releaseStatus: "working" },
  "ionas-resolve": { releaseStatus: "working" },
  "stream-of-colors": { releaseStatus: "working" },
  "will-you-see-me-streamlined": { releaseStatus: "canon", isHomepageEligible: true },
  "will-you-see-me": { releaseStatus: "alternate", isHomepageEligible: false },
  "we-were-never-meant-to-survive-reimagined-duet": { releaseStatus: "canon", isHomepageEligible: true },
  "we-were-never-meant-to-survive": { releaseStatus: "alternate", isHomepageEligible: false },
  "princess-in-waiting-original-version": { releaseStatus: "canon", isHomepageEligible: true },
  "crown-of-dreams-original-version": { releaseStatus: "canon", isHomepageEligible: true },
  "heart-full-of-hope-original-version": { releaseStatus: "canon", isHomepageEligible: true },
  "the-girl-i-couldnt-kill": { releaseStatus: "canon", isHomepageEligible: true },
  "the-girl-i-couldnt-kill-dark-cinematic-powerful-version": { releaseStatus: "alternate", isHomepageEligible: false },
  "magical-transformation-slow-magical-lullaby-jp-version": {
    releaseStatus: "alternate",
    versionFamily: "magical-transformation"
  },
  "twinkle-heartdreaming": { releaseStatus: "alternate", versionFamily: "twinkle-heart-dreaming" },
  "starlightadventure-full-english-version": { releaseStatus: "alternate", versionFamily: "starlight-adventure" },
  "hopes-song-orchestral-op-version": { releaseStatus: "alternate", versionFamily: "hopes-song" },
  "untitled-sadness-version": { releaseStatus: "alternate", versionFamily: "untitled-sadness" },
  "queen-reclaimed-donna-generation": { releaseStatus: "working", versionFamily: "queen-reclaimed" },
  "queen-reclaimed": { releaseStatus: "working", versionFamily: "queen-reclaimed" },
  "shadows-of-the-crown-version-1": { releaseStatus: "canon", versionFamily: "shadows-of-the-crown" }
};
const MANUAL_WORKING_SLUGS = new Set([
  "searching-for-love",
  "searching-for-love-donna-generation",
  "searching-for-love-donna-generation-2",
  "searching-for-love-pr-018",
  "searching-for-true-love",
  "finding-true-love",
  "love-me-for-me",
  "holding-out-for-love",
  "finding-her-heart",
  "finding-her-way-to-love",
  "finding-love-in-colors",
  "finding-loves-embrace"
]);
const MANUAL_ALTERNATE_SLUGS = new Set(["so-i-chose-the-fire", "so-i-chose-the-fire-stripped-unsettling-version"]);
const PRIORITY_MANUAL_REVIEW_FAMILIES = [
  "we-were-never-meant-to-survive",
  "i-am-more-than-what-they-see",
  "princess-in-waiting",
  "crown-of-dreams",
  "heart-full-of-hope",
  "will-you-see-me",
  "the-girl-i-couldnt-kill"
];

function getReleaseStatus(post) {
  const status = String(post?.releaseStatus || "").trim().toLowerCase();
  return VALID_RELEASE_STATUSES.has(status) ? status : "";
}

function normalizeText(value = "") {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getVersionValue(post) {
  const match = String(post.content || "").match(/\*\*Version:\*\*\s*([^\n]+)/i);
  return String(match?.[1] || "").trim();
}

function isDonnaPost(post) {
  return (
    (post.collectionSlugs || []).includes("donna-era") ||
    /\*\*Version:\*\*\s*Donna Generation/i.test(String(post.content || "")) ||
    /\*\*Source:\*\*\s*Donna/i.test(String(post.content || ""))
  );
}

function getFallbackFamilyKey(post) {
  const normalized = String(post.title || "")
    .normalize("NFKD")
    .replace(/[’'`]/g, "")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/[♡]/g, " ")
    .replace(VERSION_CLEAN_PATTERN, " ")
    .replace(/\s+/g, " ")
    .trim();

  return slugify(normalized) || slugify(String(post.slug || post.id || "")) || String(post.id || "");
}

function getFamilyKey(post) {
  return String(post.versionFamily || "").trim() || getFallbackFamilyKey(post);
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function buildSlugSet(values = []) {
  return new Set(unique(values.map((value) => String(value || "").trim())));
}

function getManualSingleOverride(post) {
  const slug = String(post.slug || "").trim();

  if (MANUAL_WORKING_SLUGS.has(slug)) {
    return { releaseStatus: "working" };
  }

  if (MANUAL_ALTERNATE_SLUGS.has(slug)) {
    return { releaseStatus: "alternate" };
  }

  return MANUAL_SINGLE_OVERRIDES[slug] || null;
}

function applyManualFamilyRule(familyKey, familyPosts) {
  const rule = MANUAL_FAMILY_RULES[familyKey];

  if (!rule) {
    return {
      applied: false,
      posts: familyPosts
    };
  }

  const canonSlugs = buildSlugSet(rule.canon);
  const alternateSlugs = buildSlugSet(rule.alternate);
  const workingSlugs = buildSlugSet(rule.working);
  const transferHomepageEligibility = Boolean(rule.transferHomepageEligibility);
  const hasCanonTarget = canonSlugs.size > 0 && familyPosts.some((post) => canonSlugs.has(String(post.slug || "").trim()));

  return {
    applied: true,
    posts: familyPosts.map((post) => {
      const slug = String(post.slug || "").trim();
      let releaseStatus = post.releaseStatus;

      if (canonSlugs.has(slug)) {
        releaseStatus = "canon";
      } else if (alternateSlugs.has(slug)) {
        releaseStatus = "alternate";
      } else if (workingSlugs.has(slug)) {
        releaseStatus = "working";
      } else if (hasCanonTarget && (rule.working?.length || rule.alternate?.length)) {
        releaseStatus = "working";
      }

      const shouldBeHomepageEligible = transferHomepageEligibility && canonSlugs.has(slug);
      const shouldDisableHomepageEligibility =
        transferHomepageEligibility && hasCanonTarget && (alternateSlugs.has(slug) || workingSlugs.has(slug) || !canonSlugs.has(slug));

      return {
        ...post,
        releaseStatus,
        isHomepageEligible: shouldBeHomepageEligible ? true : shouldDisableHomepageEligibility ? false : post.isHomepageEligible
      };
    })
  };
}

function buildFamilySummary(posts = []) {
  const families = new Map();

  posts.forEach((post) => {
    const familyKey = getFamilyKey(post);

    if (!families.has(familyKey)) {
      families.set(familyKey, []);
    }

    families.get(familyKey).push(post);
  });

  return [...families.entries()]
    .map(([familyKey, members]) => {
      const canon = members.filter((post) => post.releaseStatus === "canon");
      const alternate = members.filter((post) => post.releaseStatus === "alternate");
      const working = members.filter((post) => post.releaseStatus === "working");
      return {
        familyKey,
        canon: canon.map((post) => post.slug),
        alternate: alternate.map((post) => post.slug),
        working: working.map((post) => post.slug),
        members: members.map((post) => ({
          title: post.title,
          slug: post.slug,
          releaseStatus: post.releaseStatus,
          isHomepageEligible: Boolean(post.isHomepageEligible),
          isPrimaryVersion: Boolean(post.isPrimaryVersion),
          isArchive: Boolean(post.isArchive),
          version: getVersionValue(post),
          source: isDonnaPost(post) ? "Donna" : "Non-Donna"
        }))
      };
    })
    .sort((left, right) => left.familyKey.localeCompare(right.familyKey));
}

function isTechnicalWorking(post, familyPosts) {
  const haystack = [post.title, post.slug, getVersionValue(post), post.excerpt, post.content].join(" ");

  if (TECHNICAL_PATTERNS.some((pattern) => pattern.test(haystack))) {
    return true;
  }

  if (isDonnaPost(post) && familyPosts.some((entry) => !isDonnaPost(entry))) {
    return true;
  }

  return false;
}

function isMeaningfulAlternate(post) {
  const haystack = [post.title, post.slug, getVersionValue(post), post.excerpt].join(" ");
  return STYLE_ALT_PATTERNS.some((pattern) => pattern.test(haystack));
}

function chooseCanonCandidate(familyPosts) {
  const explicitCanon = familyPosts.filter((post) => getReleaseStatus(post) === "canon");
  if (explicitCanon.length === 1) {
    return { candidate: explicitCanon[0], ambiguous: false, reason: "existing-canon" };
  }

  if (explicitCanon.length > 1) {
    const chosen = explicitCanon
      .slice()
      .sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")))[0];
    return { candidate: chosen, ambiguous: true, reason: "multiple-existing-canon" };
  }

  const primaryVersions = familyPosts.filter((post) => post.isPrimaryVersion);
  if (primaryVersions.length === 1) {
    return { candidate: primaryVersions[0], ambiguous: false, reason: "primary-version" };
  }

  if (primaryVersions.length > 1) {
    const chosen = primaryVersions
      .slice()
      .sort((left, right) => {
        if (Boolean(right.isHomepageEligible) !== Boolean(left.isHomepageEligible)) {
          return Number(Boolean(right.isHomepageEligible)) - Number(Boolean(left.isHomepageEligible));
        }

        if (Boolean(left.isArchive) !== Boolean(right.isArchive)) {
          return Number(Boolean(left.isArchive)) - Number(Boolean(right.isArchive));
        }

        return String(right.createdAt || "").localeCompare(String(left.createdAt || ""));
      })[0];
    return { candidate: chosen, ambiguous: true, reason: "multiple-primary-version" };
  }

  const homepageCandidates = familyPosts.filter((post) => post.isHomepageEligible);
  if (homepageCandidates.length === 1) {
    return { candidate: homepageCandidates[0], ambiguous: false, reason: "homepage-eligible" };
  }

  if (homepageCandidates.length > 1) {
    const chosen = homepageCandidates
      .slice()
      .sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")))[0];
    return { candidate: chosen, ambiguous: true, reason: "multiple-homepage-eligible" };
  }

  if (familyPosts.length === 1) {
    return { candidate: familyPosts[0], ambiguous: false, reason: "single-entry" };
  }

  const nonWorkingCandidates = familyPosts.filter((post) => !isTechnicalWorking(post, familyPosts));
  if (nonWorkingCandidates.length === 1) {
    return { candidate: nonWorkingCandidates[0], ambiguous: false, reason: "sole-non-working" };
  }

  return { candidate: null, ambiguous: nonWorkingCandidates.length > 1, reason: "no-clear-canon" };
}

function classifyFamily(familyPosts, options = {}) {
  const force = Boolean(options.force);
  const { candidate, ambiguous, reason } = chooseCanonCandidate(familyPosts);
  const classified = familyPosts.map((post) => {
    const existingStatus = getReleaseStatus(post);

    if (existingStatus && !force) {
      return {
        ...post,
        releaseStatus: existingStatus
      };
    }

    if (isTechnicalWorking(post, familyPosts)) {
      return {
        ...post,
        releaseStatus: "working"
      };
    }

    if (candidate && post.slug === candidate.slug) {
      return {
        ...post,
        releaseStatus: "canon"
      };
    }

    if (familyPosts.length > 1 || isMeaningfulAlternate(post)) {
      return {
        ...post,
        releaseStatus: "alternate"
      };
    }

    return {
      ...post,
      releaseStatus: "canon"
    };
  });

  return {
    posts: classified,
    ambiguous:
      ambiguous || (familyPosts.length > 1 && !candidate)
        ? {
            familyKey: getFamilyKey(familyPosts[0]),
            reason,
            chosenCanon: candidate?.slug || "",
            members: classified.map((post) => ({
              title: post.title,
              slug: post.slug,
              isPrimaryVersion: Boolean(post.isPrimaryVersion),
              isHomepageEligible: Boolean(post.isHomepageEligible),
              isArchive: Boolean(post.isArchive),
              releaseStatus: post.releaseStatus,
              version: getVersionValue(post),
              donna: isDonnaPost(post)
            }))
          }
        : null
  };
}

function applyClassification(posts = [], options = {}) {
  const families = new Map();

  posts.forEach((post) => {
    const familyKey = getFamilyKey(post);
    if (!families.has(familyKey)) {
      families.set(familyKey, []);
    }
    families.get(familyKey).push(post);
  });

  const nextPosts = [];
  const ambiguousFamilies = [];

  families.forEach((familyPosts) => {
    const result = classifyFamily(familyPosts, options);
    const manualFamilyResult = applyManualFamilyRule(getFamilyKey(familyPosts[0]), result.posts);
    nextPosts.push(...manualFamilyResult.posts);
    if (result.ambiguous) {
      ambiguousFamilies.push(result.ambiguous);
    }
  });

  const manuallyAdjustedPosts = nextPosts.map((post) => {
    const singleOverride = getManualSingleOverride(post);

    if (!singleOverride) {
      return post;
    }

    return {
      ...post,
      ...singleOverride
    };
  });

  const summary = {
    canon: manuallyAdjustedPosts.filter((post) => post.releaseStatus === "canon").length,
    alternate: manuallyAdjustedPosts.filter((post) => post.releaseStatus === "alternate").length,
    working: manuallyAdjustedPosts.filter((post) => post.releaseStatus === "working").length
  };

  const familySummary = buildFamilySummary(manuallyAdjustedPosts);
  const familyConflicts = familySummary.filter((family) => family.canon.length > 1 || family.alternate.length > 2);
  const ambiguousManualReviewFamilies = familySummary.filter((family) => PRIORITY_MANUAL_REVIEW_FAMILIES.includes(family.familyKey));

  return {
    posts: manuallyAdjustedPosts,
    summary,
    ambiguousFamilies: ambiguousFamilies.sort((left, right) => left.familyKey.localeCompare(right.familyKey)),
    familyConflicts,
    ambiguousManualReviewFamilies
  };
}

function printReport(label, result) {
  console.log(`Target: ${label}`);
  console.log("Summary:");
  console.log(JSON.stringify(result.summary, null, 2));
  console.log("");
  console.log("Ambiguous families:");
  console.log(JSON.stringify(result.ambiguousFamilies, null, 2));
  console.log("");
  console.log("Family conflicts (>1 canon or >2 alternates):");
  console.log(JSON.stringify(result.familyConflicts, null, 2));
  console.log("");
  console.log("Priority manual review families:");
  console.log(JSON.stringify(result.ambiguousManualReviewFamilies, null, 2));
  console.log("");
}

async function updateFileTarget(options = {}) {
  const raw = fs.readFileSync(POSTS_FILE, "utf8");
  const data = JSON.parse(raw);
  const result = applyClassification(Array.isArray(data.posts) ? data.posts : [], options);
  data.posts = result.posts;
  fs.writeFileSync(POSTS_FILE, `${JSON.stringify(data, null, 2)}\n`);
  printReport("file", result);
  return result;
}

async function updateDbTarget(options = {}) {
  await connectToDatabase();
  const store = await readStore();
  const result = applyClassification(store.posts || [], options);
  await writeStore({ ...store, posts: result.posts });
  printReport("db", result);
  return result;
}

async function main() {
  const targetArg = process.argv.find((argument) => argument.startsWith("--target="));
  const target = targetArg ? targetArg.split("=")[1] : "both";
  const force = process.argv.includes("--force");

  if (target === "file") {
    await updateFileTarget({ force });
    return;
  }

  if (target === "db") {
    await updateDbTarget({ force });
    return;
  }

  await updateFileTarget({ force });
  await updateDbTarget({ force });
}

module.exports = {
  applyClassification,
  buildFamilySummary,
  getFamilyKey,
  getFallbackFamilyKey,
  getReleaseStatus,
  getVersionValue,
  isDonnaPost,
  isMeaningfulAlternate,
  normalizeText
};

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
