const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const POSTS_FILE = path.resolve(__dirname, "../data/posts.json");
dotenv.config({ path: path.resolve(__dirname, "../.env") });
const { slugify } = require("../src/utils/slugify");
const { connectToDatabase, closeDatabase } = require("../src/lib/mongo");
const { readStore, writeStore } = require("../src/data/store");
const VERSION_LABEL_PATTERN =
  /\b(reimagined|version|revision|mix|remix|alternate|streamlined|stripped|expanded|donna generation|full english|orchestral|acoustic|demo|edit|duet)\b/gi;

const CURATION_MAP = [
  {
    matchTitle: "Between Two Worlds (The First Awakening)",
    set: { isPrimaryVersion: true, isArchive: false, isHomepageEligible: true, versionFamily: "between-two-worlds" }
  },
  {
    matchTitle: "Echoes of Aeloria (The Memory That Was Never Mine)",
    set: { isPrimaryVersion: true, isArchive: false, isHomepageEligible: true, versionFamily: "echoes-of-aeloria" }
  },
  {
    matchTitle: "Queen of Borrowed Crowns (The Throne That Was Not Hers)",
    set: { isPrimaryVersion: true, isArchive: false, isHomepageEligible: true, versionFamily: "queen-of-borrowed-crowns" }
  },
  {
    matchTitle: "Wings of Light (The Weapon She Wrote Into Being)",
    set: { isPrimaryVersion: true, isArchive: false, isHomepageEligible: true, versionFamily: "wings-of-light" }
  },
  {
    matchTitle: "Shattered Trust (Reimagined)",
    set: { isPrimaryVersion: true, isArchive: false, isHomepageEligible: true, versionFamily: "shattered-trust" }
  },
  {
    matchTitle: "Still Breathing (In a Dying World) - Reimagined",
    set: { isPrimaryVersion: true, isArchive: false, isHomepageEligible: true, versionFamily: "still-breathing" }
  },
  {
    matchTitle: "We Were Never Meant to Survive - Reimagined (Duet)",
    set: { isPrimaryVersion: true, isArchive: false, isHomepageEligible: true, versionFamily: "we-were-never-meant-to-survive" }
  },
  {
    matchTitle: "The One You Used to Be - Reimagined",
    set: { isPrimaryVersion: true, isArchive: false, isHomepageEligible: true, versionFamily: "the-one-you-used-to-be" }
  },
  {
    matchTitle: "You Were Better Before You Saved the World - Reimagined",
    set: { isPrimaryVersion: true, isArchive: false, isHomepageEligible: true, versionFamily: "you-were-better-before-you-saved-the-world" }
  },
  {
    matchTitle: "What the World Made of Me",
    set: { isPrimaryVersion: true, isArchive: false, isHomepageEligible: false, versionFamily: "what-the-world-made-of-me" }
  },
  {
    matchTitle: "The Cost I Couldn’t Pay",
    set: { isPrimaryVersion: true, isArchive: false, isHomepageEligible: false, versionFamily: "the-cost-i-couldnt-pay" }
  },
  {
    matchTitle: "This Is My Light",
    set: { isPrimaryVersion: true, isArchive: false, isHomepageEligible: true, versionFamily: "this-is-my-light" }
  },
  {
    matchTitle: "Heart Full of Hope",
    set: { isPrimaryVersion: true, isArchive: false, isHomepageEligible: true, versionFamily: "heart-full-of-hope" }
  },
  {
    matchTitle: "Will You See Me?",
    set: { isPrimaryVersion: true, isArchive: false, isHomepageEligible: true, versionFamily: "will-you-see-me" }
  },
  {
    matchTitle: "Holding My Heart Back",
    set: { isPrimaryVersion: true, isArchive: false, isHomepageEligible: true, versionFamily: "holding-my-heart-back" }
  },
  {
    matchTitle: "Princess in Waiting",
    set: { isPrimaryVersion: true, isArchive: false, isHomepageEligible: true, versionFamily: "princess-in-waiting" }
  },
  {
    matchTitle: "Crown of Dreams",
    set: { isPrimaryVersion: true, isArchive: false, isHomepageEligible: true, versionFamily: "crown-of-dreams" }
  },
  {
    matchTitle: "The Girl I Couldn't Kill",
    set: { isPrimaryVersion: true, isArchive: false, isHomepageEligible: true, versionFamily: "the-girl-i-couldnt-kill" }
  },
  {
    matchTitle: "Blooming Forward / わたし、羽ばたく！",
    set: { isPrimaryVersion: true, isArchive: false, isHomepageEligible: true, versionFamily: "blooming-forward" }
  },
  {
    matchTitle: "I Am More Than What They See",
    set: { isPrimaryVersion: true, isArchive: false, isHomepageEligible: true, versionFamily: "i-am-more-than-what-they-see" }
  },
  {
    matchTitle: "Together We Rise",
    set: { isPrimaryVersion: true, isArchive: false, isHomepageEligible: true, versionFamily: "together-we-rise" }
  },
  {
    matchTitle: "Maybe Someday, Baby",
    set: { isPrimaryVersion: true, isArchive: false, isHomepageEligible: false, versionFamily: "maybe-someday-baby" }
  },
  {
    matchTitle: "Porch Light Fading",
    set: { isPrimaryVersion: true, isArchive: false, isHomepageEligible: false, versionFamily: "porch-light-fading" }
  },
  {
    matchTitle: "Rise in the Radiant Storm / 光の嵐を越えて",
    set: { isPrimaryVersion: true, isArchive: false, isHomepageEligible: false, versionFamily: "rise-in-the-radiant-storm" }
  },
  {
    matchTitle: "I’m Shiny Me!",
    set: { isPrimaryVersion: true, isArchive: false, isHomepageEligible: false, versionFamily: "im-shiny-me" }
  },
  {
    matchTitle: "Hidden Identity Ballad",
    set: { isPrimaryVersion: false, isArchive: false, isHomepageEligible: false, versionFamily: "hidden-identity-ballad" }
  },
  {
    matchTitle: "Becoming Angel",
    set: { isPrimaryVersion: false, isArchive: false, isHomepageEligible: false, versionFamily: "becoming-angel" }
  },
  {
    matchTitle: "Between the Name and the Mirror",
    set: { isPrimaryVersion: true, isArchive: false, isHomepageEligible: false, versionFamily: "between-the-name-and-the-mirror" }
  },
  {
    matchTitle: "What I Don’t Say Out Loud",
    set: { isPrimaryVersion: true, isArchive: false, isHomepageEligible: false, versionFamily: "what-i-dont-say-out-loud" }
  },
  {
    matchTitle: "Quiet Kept Me Alive",
    set: { isPrimaryVersion: true, isArchive: false, isHomepageEligible: false, versionFamily: "quiet-kept-me-alive" }
  },
  {
    matchTitle: "The Girl in the Quiet",
    set: { isPrimaryVersion: false, isArchive: false, isHomepageEligible: false, versionFamily: "the-girl-in-the-quiet" }
  },
  {
    matchTitle: "Rooms With No Windows",
    set: { isPrimaryVersion: true, isArchive: false, isHomepageEligible: false, versionFamily: "rooms-with-no-windows" }
  },
  {
    matchTitle: "Angel Made of Quiet Fire",
    set: { isPrimaryVersion: true, isArchive: false, isHomepageEligible: false, versionFamily: "angel-made-of-quiet-fire" }
  },
  {
    matchTitle: "You Wanted a Hero",
    set: { isPrimaryVersion: true, isArchive: false, isHomepageEligible: true, versionFamily: "you-wanted-a-hero" }
  },
  {
    matchTitle: "The Hands That Shield",
    set: { isPrimaryVersion: true, isArchive: false, isHomepageEligible: true, versionFamily: "the-hands-that-shield" }
  },
  {
    matchTitle: "Crown of Thorns",
    set: { isPrimaryVersion: true, isArchive: false, isHomepageEligible: true, versionFamily: "crown-of-thorns" }
  },
  {
    matchTitle: "Last Light of the Faithful",
    set: { isPrimaryVersion: true, isArchive: false, isHomepageEligible: true, versionFamily: "last-light-of-the-faithful" }
  },
  {
    matchTitle: "Necessary Damage",
    set: { isPrimaryVersion: true, isArchive: false, isHomepageEligible: false, versionFamily: "necessary-damage" }
  },
  {
    matchTitle: "A Day to Chill",
    set: { isPrimaryVersion: true, isArchive: false, isHomepageEligible: false, versionFamily: "a-day-to-chill" }
  },
  {
    matchTitle: "Shadows of the Crown",
    set: { isPrimaryVersion: true, isArchive: false, isHomepageEligible: false, versionFamily: "shadows-of-the-crown" }
  },
  {
    matchTitle: "Ionas Resolve",
    set: { isPrimaryVersion: false, isArchive: false, isHomepageEligible: false, versionFamily: "ionas-resolve" }
  }
];

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

function getSubtitleValue(post) {
  return String(post.archiveMeta?.subtitle || "").trim();
}

function isDonnaPost(post) {
  return (
    (post.collectionSlugs || []).includes("donna-era") ||
    /\*\*Version:\*\*\s*Donna Generation/i.test(String(post.content || "")) ||
    /\*\*Source:\*\*\s*Donna/i.test(String(post.content || ""))
  );
}

function getFamilyKeyFromTitle(value = "") {
  const normalizedSource = String(value || "")
    .normalize("NFKD")
    .replace(/[’'`]/g, "")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[♡]/g, " ");
  const preferredSegment =
    normalizedSource
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean)
      .reverse()
      .find((segment) => /[a-z]/i.test(segment)) || normalizedSource;
  const normalized = preferredSegment
    .replace(/\([^)]*\)/g, " ")
    .replace(VERSION_LABEL_PATTERN, " ")
    .replace(/\s+/g, " ")
    .trim();

  return slugify(normalized);
}

function buildPostKeys(post) {
  const title = String(post.title || "").trim();
  const subtitle = getSubtitleValue(post);
  return {
    normalizedTitle: normalizeText(title),
    normalizedComposite: normalizeText(subtitle ? `${title} (${subtitle})` : title),
    familyKey: getFamilyKeyFromTitle(title),
    compositeFamilyKey: getFamilyKeyFromTitle(`${title} ${subtitle}`),
    version: getVersionValue(post)
  };
}

function chooseLeader(candidates, familyKey, matchTitle) {
  const normalizedMatchTitle = normalizeText(matchTitle);
  const exactMatches = candidates.filter((entry) => {
    const keys = buildPostKeys(entry);
    return keys.normalizedTitle === normalizedMatchTitle || keys.normalizedComposite === normalizedMatchTitle;
  });
  const rankedCandidates = (exactMatches.length ? exactMatches : candidates).slice().sort((left, right) => {
    const leftIsDonna = isDonnaPost(left);
    const rightIsDonna = isDonnaPost(right);

    if (leftIsDonna !== rightIsDonna) {
      return Number(leftIsDonna) - Number(rightIsDonna);
    }

    const leftSlug = String(left.slug || "");
    const rightSlug = String(right.slug || "");
    const leftSlugScore = leftSlug === familyKey ? 2 : leftSlug.startsWith(`${familyKey}-`) ? 1 : 0;
    const rightSlugScore = rightSlug === familyKey ? 2 : rightSlug.startsWith(`${familyKey}-`) ? 1 : 0;

    if (leftSlugScore !== rightSlugScore) {
      return rightSlugScore - leftSlugScore;
    }

    const leftVersion = normalizeText(getVersionValue(left));
    const rightVersion = normalizeText(getVersionValue(right));
    const leftOriginalScore = leftVersion.includes("original version") ? 2 : leftVersion === "" ? 1 : 0;
    const rightOriginalScore = rightVersion.includes("original version") ? 2 : rightVersion === "" ? 1 : 0;

    if (leftOriginalScore !== rightOriginalScore) {
      return rightOriginalScore - leftOriginalScore;
    }

    return String(right.createdAt || "").localeCompare(String(left.createdAt || ""));
  });

  return rankedCandidates[0] || null;
}

function updatePost(post, updates) {
  return {
    ...post,
    isPrimaryVersion:
      typeof updates.isPrimaryVersion === "boolean" ? updates.isPrimaryVersion : Boolean(post.isPrimaryVersion),
    isArchive: typeof updates.isArchive === "boolean" ? updates.isArchive : Boolean(post.isArchive),
    isHomepageEligible:
      typeof updates.isHomepageEligible === "boolean" ? updates.isHomepageEligible : Boolean(post.isHomepageEligible),
    versionFamily:
      typeof updates.versionFamily === "string" ? updates.versionFamily : String(post.versionFamily || "")
  };
}

function applyCurationToPosts(posts = []) {
  const explicitProtectedSlugs = new Set();
  const familyLeadBySlug = new Map();
  const unmatched = [];
  const ambiguous = [];

  let nextPosts = posts.map((post) =>
    updatePost(post, {
      isPrimaryVersion: typeof post.isPrimaryVersion === "boolean" ? post.isPrimaryVersion : false,
      isArchive: typeof post.isArchive === "boolean" ? post.isArchive : false,
      isHomepageEligible: typeof post.isHomepageEligible === "boolean" ? post.isHomepageEligible : false,
      versionFamily: typeof post.versionFamily === "string" ? post.versionFamily : ""
    })
  );

  CURATION_MAP.forEach((entry) => {
    const familyKey = entry.set.versionFamily;
    const normalizedMatchTitle = normalizeText(entry.matchTitle);
    const familyMembers = nextPosts.filter((post) => {
      const keys = buildPostKeys(post);
      return (
        keys.familyKey === familyKey ||
        keys.compositeFamilyKey === familyKey ||
        keys.normalizedTitle === normalizedMatchTitle ||
        keys.normalizedComposite === normalizedMatchTitle
      );
    });

    if (!familyMembers.length) {
      unmatched.push(entry.matchTitle);
      return;
    }

    const leader = chooseLeader(familyMembers, familyKey, entry.matchTitle);

    if (familyMembers.length > 1) {
      ambiguous.push({
        matchTitle: entry.matchTitle,
        versionFamily: familyKey,
        chosenSlug: leader?.slug || "",
        candidates: familyMembers.map((post) => ({
          title: post.title,
          slug: post.slug,
          donna: isDonnaPost(post),
          version: getVersionValue(post)
        }))
      });
    }

    familyMembers.forEach((member) => {
      const isLeader = leader && member.slug === leader.slug;
      const shouldApplyLeaderValues = isLeader && (entry.set.isPrimaryVersion || entry.set.isHomepageEligible || !familyMembers.some((post) => !isDonnaPost(post)));

      nextPosts = nextPosts.map((post) => {
        if (post.id !== member.id) {
          return post;
        }

        if (shouldApplyLeaderValues) {
          explicitProtectedSlugs.add(post.slug);
          familyLeadBySlug.set(post.slug, familyKey);
          return updatePost(post, entry.set);
        }

        return updatePost(post, {
          versionFamily: familyKey,
          isPrimaryVersion: false,
          isHomepageEligible: false,
          isArchive: isDonnaPost(post) ? post.isArchive : false
        });
      });
    });
  });

  nextPosts = nextPosts.map((post) => {
    if (!isDonnaPost(post)) {
      return post;
    }

    if (explicitProtectedSlugs.has(post.slug)) {
      return post;
    }

    const familyKey = String(post.versionFamily || "");
    const familyHasExplicitNonDonnaLeader = nextPosts.some(
      (entry) => entry.versionFamily === familyKey && familyKey && !isDonnaPost(entry) && explicitProtectedSlugs.has(entry.slug)
    );

    if (familyHasExplicitNonDonnaLeader || !familyKey || !explicitProtectedSlugs.has(post.slug)) {
      return updatePost(post, {
        isArchive: true,
        isHomepageEligible: false,
        isPrimaryVersion: familyHasExplicitNonDonnaLeader ? false : post.isPrimaryVersion
      });
    }

    return post;
  });

  const homepageLeaderByFamily = new Map();
  nextPosts.forEach((post) => {
    const familyKey = String(post.versionFamily || "");
    if (!familyKey || !post.isHomepageEligible) {
      return;
    }

    if (!homepageLeaderByFamily.has(familyKey)) {
      homepageLeaderByFamily.set(familyKey, []);
    }

    homepageLeaderByFamily.get(familyKey).push(post);
  });

  const homepageDuplicates = [];
  homepageLeaderByFamily.forEach((familyPosts, familyKey) => {
    if (familyPosts.length <= 1) {
      return;
    }

    const leader = chooseLeader(familyPosts, familyKey, familyPosts[0].title);
    homepageDuplicates.push({
      familyKey,
      chosenSlug: leader?.slug || "",
      candidates: familyPosts.map((post) => post.slug)
    });

    nextPosts = nextPosts.map((post) => {
      if (post.versionFamily !== familyKey) {
        return post;
      }

      return updatePost(post, {
        isHomepageEligible: leader ? post.slug === leader.slug : false,
        isPrimaryVersion: leader && post.slug === leader.slug ? post.isPrimaryVersion : false
      });
    });
  });

  const exactTitleGroups = new Map();
  nextPosts.forEach((post) => {
    const key = normalizeText(post.title);
    if (!exactTitleGroups.has(key)) {
      exactTitleGroups.set(key, []);
    }
    exactTitleGroups.get(key).push(post);
  });

  const duplicateTitleReview = Array.from(exactTitleGroups.values())
    .filter((group) => group.length > 1)
    .map((group) => ({
      title: group[0].title,
      count: group.length,
      slugs: group.map((post) => post.slug)
    }))
    .sort((left, right) => right.count - left.count || left.title.localeCompare(right.title));

  const summary = {
    totalPosts: nextPosts.length,
    primaryTrue: nextPosts.filter((post) => post.isPrimaryVersion).length,
    archiveTrue: nextPosts.filter((post) => post.isArchive).length,
    homepageEligibleTrue: nextPosts.filter((post) => post.isHomepageEligible).length,
    versionFamilyAssigned: nextPosts.filter((post) => String(post.versionFamily || "").trim()).length
  };

  return {
    posts: nextPosts,
    summary,
    unmatched,
    ambiguous,
    homepageDuplicates,
    duplicateTitleReview
  };
}

function printReport(result) {
  const { summary, unmatched, ambiguous, homepageDuplicates, duplicateTitleReview } = result;

  console.log("Summary:");
  console.log(JSON.stringify(summary, null, 2));
  console.log("");
  console.log("Unmatched explicit mappings:");
  console.log(JSON.stringify(unmatched, null, 2));
  console.log("");
  console.log("Ambiguous families resolved:");
  console.log(JSON.stringify(ambiguous, null, 2));
  console.log("");
  console.log("Homepage duplicate families normalized:");
  console.log(JSON.stringify(homepageDuplicates, null, 2));
  console.log("");
  console.log("Duplicate titles for manual review:");
  console.log(JSON.stringify(duplicateTitleReview, null, 2));
}

async function main() {
  const target = process.argv.includes("--target=db") ? "db" : "file";

  if (target === "db") {
    await connectToDatabase();
    const store = await readStore();
    const result = applyCurationToPosts(store.posts || []);
    await writeStore({ ...store, posts: result.posts });
    printReport(result);
    return;
  }

  const raw = fs.readFileSync(POSTS_FILE, "utf8");
  const data = JSON.parse(raw);
  const result = applyCurationToPosts(Array.isArray(data.posts) ? data.posts : []);
  data.posts = result.posts;
  fs.writeFileSync(POSTS_FILE, `${JSON.stringify(data, null, 2)}\n`);
  printReport(result);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
