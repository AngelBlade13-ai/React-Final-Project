require("dotenv").config({ quiet: true });
const fs = require("fs/promises");
const path = require("path");
const config = require("../src/config");
const { connectToDatabase, closeDatabase } = require("../src/lib/mongo");
const { readStore } = require("../src/data/store");

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_CATALOG_PATH = path.resolve(
  REPO_ROOT,
  "backend",
  "data",
  "posts.local.json"
);
const DEFAULT_REPORT_PATH = path.resolve(
  REPO_ROOT,
  "docs",
  "catalog-sync-live-store-report.md"
);
const PUBLIC_PRIMARY_COLLECTION_SLUGS = [
  "fractureverse",
  "eldoria",
  "original-personal",
  "standalone"
];
const POST_COMPARE_FIELDS = [
  "title",
  "videoUrl",
  "excerpt",
  "content",
  "lyrics",
  "archiveMeta",
  "createdAt",
  "published",
  "collectionSlugs",
  "isPrimaryVersion",
  "isArchive",
  "isHomepageEligible",
  "versionFamily",
  "releaseStatus",
  "subCategory",
  "sourceTag",
  "worldLayer",
  "themeTags",
  "isPubliclyVisible",
  "supersededBySlug",
  "supersededReason",
  "supersededAt"
];
const COLLECTION_COMPARE_FIELDS = [
  "title",
  "description",
  "featuredReleaseSlug",
  "theme",
  "isPublicPrimary"
];

function parseArgs(argv = []) {
  const options = {
    write: false,
    catalogPath: DEFAULT_CATALOG_PATH,
    reportPath: "",
    snapshotPath: ""
  };

  argv.forEach((arg) => {
    if (arg === "--write") {
      options.write = true;
      return;
    }

    if (arg === "--report") {
      options.reportPath = DEFAULT_REPORT_PATH;
      return;
    }

    if (arg.startsWith("--catalog=")) {
      options.catalogPath = path.resolve(
        process.cwd(),
        arg.slice("--catalog=".length)
      );
      return;
    }

    if (arg.startsWith("--report=")) {
      options.reportPath = path.resolve(
        process.cwd(),
        arg.slice("--report=".length)
      );
      return;
    }

    if (arg.startsWith("--snapshot=")) {
      options.snapshotPath = path.resolve(
        process.cwd(),
        arg.slice("--snapshot=".length)
      );
    }
  });

  return options;
}

function normalizeString(value) {
  return String(value || "").trim();
}

function sortCollectionSlugs(collectionSlugs = []) {
  return [
    ...new Set(
      collectionSlugs.map((slug) => normalizeString(slug)).filter(Boolean)
    )
  ].sort((left, right) => {
    const leftIndex = PUBLIC_PRIMARY_COLLECTION_SLUGS.indexOf(left);
    const rightIndex = PUBLIC_PRIMARY_COLLECTION_SLUGS.indexOf(right);

    if (leftIndex !== rightIndex) {
      return (
        (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) -
        (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex)
      );
    }

    return left.localeCompare(right);
  });
}

function normalizeArchiveMeta(archiveMeta) {
  if (!archiveMeta || typeof archiveMeta !== "object") {
    return null;
  }

  const normalized = {
    fragmentId: normalizeString(archiveMeta.fragmentId),
    state: normalizeString(archiveMeta.state),
    perspective: normalizeString(archiveMeta.perspective),
    signalType: normalizeString(archiveMeta.signalType),
    description: normalizeString(archiveMeta.description),
    systemNote: normalizeString(archiveMeta.systemNote),
    linkedSlugs: [
      ...new Set(
        (Array.isArray(archiveMeta.linkedSlugs) ? archiveMeta.linkedSlugs : [])
          .map((slug) => normalizeString(slug))
          .filter(Boolean)
      )
    ].sort(),
    chapterNumber: normalizeString(archiveMeta.chapterNumber),
    entryType: normalizeString(archiveMeta.entryType),
    subtitle: normalizeString(archiveMeta.subtitle),
    openingPassage: normalizeString(archiveMeta.openingPassage),
    coreSituation: normalizeString(archiveMeta.coreSituation),
    coreTension: normalizeString(archiveMeta.coreTension),
    chronicleObservation: normalizeString(archiveMeta.chronicleObservation),
    chronicleContradiction: normalizeString(archiveMeta.chronicleContradiction),
    chronicleConclusion: normalizeString(archiveMeta.chronicleConclusion),
    emotionalState: normalizeString(archiveMeta.emotionalState),
    coreConflict: normalizeString(archiveMeta.coreConflict),
    risk: normalizeString(archiveMeta.risk),
    anchorQuote: normalizeString(archiveMeta.anchorQuote),
    resolution: normalizeString(archiveMeta.resolution),
    entryStatus: normalizeString(archiveMeta.entryStatus),
    playerFlavorLine: normalizeString(archiveMeta.playerFlavorLine)
  };

  return Object.values(normalized).some((value) =>
    Array.isArray(value) ? value.length : Boolean(value)
  )
    ? normalized
    : null;
}

function normalizePostForCatalog(post) {
  return {
    id: normalizeString(post.id),
    title: normalizeString(post.title),
    slug: normalizeString(post.slug),
    videoUrl: normalizeString(post.videoUrl),
    excerpt: normalizeString(post.excerpt),
    content: normalizeString(post.content),
    lyrics: typeof post.lyrics === "string" ? post.lyrics : "",
    archiveMeta: normalizeArchiveMeta(post.archiveMeta),
    createdAt: normalizeString(post.createdAt),
    published: Boolean(post.published),
    collectionSlugs: sortCollectionSlugs(post.collectionSlugs),
    isPrimaryVersion: Boolean(post.isPrimaryVersion),
    isArchive: Boolean(post.isArchive),
    isHomepageEligible: Boolean(post.isHomepageEligible),
    versionFamily: normalizeString(post.versionFamily),
    releaseStatus: normalizeString(post.releaseStatus) || "canon",
    subCategory: normalizeString(post.subCategory),
    sourceTag: normalizeString(post.sourceTag),
    worldLayer: normalizeString(post.worldLayer),
    themeTags: [
      ...new Set(
        (Array.isArray(post.themeTags) ? post.themeTags : [])
          .map((tag) => normalizeString(tag))
          .filter(Boolean)
      )
    ].sort(),
    isPubliclyVisible: post.isPubliclyVisible !== false,
    supersededBySlug: normalizeString(post.supersededBySlug),
    supersededReason: normalizeString(post.supersededReason),
    supersededAt: normalizeString(post.supersededAt)
  };
}

function normalizeCollectionForCatalog(collection) {
  return {
    id: normalizeString(collection.id),
    slug: normalizeString(collection.slug),
    title: normalizeString(collection.title),
    description: normalizeString(collection.description),
    featuredReleaseSlug: normalizeString(collection.featuredReleaseSlug),
    theme: normalizeString(collection.theme),
    isPublicPrimary: Boolean(collection.isPublicPrimary)
  };
}

function normalizeThemeProfile(themeProfile) {
  return {
    key: normalizeString(themeProfile.key),
    label: normalizeString(themeProfile.label),
    kind: normalizeString(themeProfile.kind) || "standard",
    palette: {
      light: {
        background: normalizeString(themeProfile.palette?.light?.background),
        surface: normalizeString(themeProfile.palette?.light?.surface),
        surfaceAlt: normalizeString(themeProfile.palette?.light?.surfaceAlt),
        text: normalizeString(themeProfile.palette?.light?.text),
        mutedText: normalizeString(themeProfile.palette?.light?.mutedText),
        border: normalizeString(themeProfile.palette?.light?.border),
        primary: normalizeString(themeProfile.palette?.light?.primary),
        primaryStrong: normalizeString(
          themeProfile.palette?.light?.primaryStrong
        ),
        secondary: normalizeString(themeProfile.palette?.light?.secondary)
      },
      dark: {
        background: normalizeString(themeProfile.palette?.dark?.background),
        surface: normalizeString(themeProfile.palette?.dark?.surface),
        surfaceAlt: normalizeString(themeProfile.palette?.dark?.surfaceAlt),
        text: normalizeString(themeProfile.palette?.dark?.text),
        mutedText: normalizeString(themeProfile.palette?.dark?.mutedText),
        border: normalizeString(themeProfile.palette?.dark?.border),
        primary: normalizeString(themeProfile.palette?.dark?.primary),
        primaryStrong: normalizeString(
          themeProfile.palette?.dark?.primaryStrong
        ),
        secondary: normalizeString(themeProfile.palette?.dark?.secondary)
      }
    },
    worldEyebrow: normalizeString(themeProfile.worldEyebrow),
    featuredLabel: normalizeString(themeProfile.featuredLabel),
    featuredAction: normalizeString(themeProfile.featuredAction),
    listLabel: normalizeString(themeProfile.listLabel),
    worldNoteTitle: normalizeString(themeProfile.worldNoteTitle),
    worldNoteText: normalizeString(themeProfile.worldNoteText),
    itemName: normalizeString(themeProfile.itemName),
    itemPlural: normalizeString(themeProfile.itemPlural),
    itemAction: normalizeString(themeProfile.itemAction),
    playerLabel: normalizeString(themeProfile.playerLabel),
    playerUpNextLabel: normalizeString(themeProfile.playerUpNextLabel)
  };
}

function normalizeSiteContent(siteContent = {}) {
  return {
    branding: {
      siteName: normalizeString(siteContent.branding?.siteName),
      siteTagline: normalizeString(siteContent.branding?.siteTagline)
    },
    home: {
      heroEyebrow: normalizeString(siteContent.home?.heroEyebrow),
      heroTitle: normalizeString(siteContent.home?.heroTitle),
      heroText: normalizeString(siteContent.home?.heroText),
      featuredReleaseSlug: normalizeString(
        siteContent.home?.featuredReleaseSlug
      ),
      featuredCtaLabel: normalizeString(siteContent.home?.featuredCtaLabel),
      jumpCtaLabel: normalizeString(siteContent.home?.jumpCtaLabel),
      noteEyebrow: normalizeString(siteContent.home?.noteEyebrow),
      noteTitle: normalizeString(siteContent.home?.noteTitle),
      noteText: normalizeString(siteContent.home?.noteText),
      browseEyebrow: normalizeString(siteContent.home?.browseEyebrow),
      browseTitle: normalizeString(siteContent.home?.browseTitle),
      browseText: normalizeString(siteContent.home?.browseText),
      browseLinkLabel: normalizeString(siteContent.home?.browseLinkLabel),
      exploreEyebrow: normalizeString(siteContent.home?.exploreEyebrow),
      exploreTitle: normalizeString(siteContent.home?.exploreTitle),
      exploreText: normalizeString(siteContent.home?.exploreText),
      exploreLinkLabel: normalizeString(siteContent.home?.exploreLinkLabel),
      identityEyebrow: normalizeString(siteContent.home?.identityEyebrow),
      identityTitle: normalizeString(siteContent.home?.identityTitle),
      identityText: normalizeString(siteContent.home?.identityText),
      identityLine: normalizeString(siteContent.home?.identityLine)
    },
    collectionThemes: Array.isArray(siteContent.collectionThemes)
      ? siteContent.collectionThemes.map(normalizeThemeProfile)
      : [],
    about: {
      heroEyebrow: normalizeString(siteContent.about?.heroEyebrow),
      heroTitle: normalizeString(siteContent.about?.heroTitle),
      heroText: normalizeString(siteContent.about?.heroText),
      artistEyebrow: normalizeString(siteContent.about?.artistEyebrow),
      artistTitle: normalizeString(siteContent.about?.artistTitle),
      artistText: normalizeString(siteContent.about?.artistText),
      siteEyebrow: normalizeString(siteContent.about?.siteEyebrow),
      siteTitle: normalizeString(siteContent.about?.siteTitle),
      siteText: normalizeString(siteContent.about?.siteText),
      quoteEyebrow: normalizeString(siteContent.about?.quoteEyebrow),
      quoteTitle: normalizeString(siteContent.about?.quoteTitle),
      quoteText: normalizeString(siteContent.about?.quoteText)
    }
  };
}

function sortCollections(collections = []) {
  return [...collections].sort((left, right) => {
    const leftIndex = PUBLIC_PRIMARY_COLLECTION_SLUGS.indexOf(left.slug);
    const rightIndex = PUBLIC_PRIMARY_COLLECTION_SLUGS.indexOf(right.slug);

    if (leftIndex !== rightIndex) {
      return (
        (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) -
        (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex)
      );
    }

    return left.title.localeCompare(right.title);
  });
}

function sortPosts(posts = []) {
  return [...posts].sort((left, right) => {
    const dateDelta = String(right.createdAt || "").localeCompare(
      String(left.createdAt || "")
    );

    if (dateDelta !== 0) {
      return dateDelta;
    }

    return String(left.slug || "").localeCompare(String(right.slug || ""));
  });
}

function buildCatalogFromStore(store) {
  return {
    posts: sortPosts(
      (Array.isArray(store.posts) ? store.posts : []).map(
        normalizePostForCatalog
      )
    ),
    collections: sortCollections(
      (Array.isArray(store.collections) ? store.collections : []).map(
        normalizeCollectionForCatalog
      )
    ),
    siteContent: normalizeSiteContent(store.siteContent || {})
  };
}

async function readTrackedCatalog(catalogPath) {
  try {
    const file = await fs.readFile(catalogPath, "utf8");
    const parsed = JSON.parse(file);
    return {
      posts: Array.isArray(parsed.posts)
        ? parsed.posts.map(normalizePostForCatalog)
        : [],
      collections: Array.isArray(parsed.collections)
        ? parsed.collections.map(normalizeCollectionForCatalog)
        : [],
      siteContent: normalizeSiteContent(parsed.siteContent || {})
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      return {
        posts: [],
        collections: [],
        siteContent: normalizeSiteContent({})
      };
    }

    throw error;
  }
}

function getChangedFields(left, right, fields) {
  return fields.filter(
    (field) =>
      JSON.stringify(left?.[field] ?? null) !==
      JSON.stringify(right?.[field] ?? null)
  );
}

function buildReconciliationSummary(trackedCatalog, nextCatalog, liveStore) {
  const trackedPostsBySlug = new Map(
    trackedCatalog.posts.map((post) => [post.slug, post])
  );
  const nextPostsBySlug = new Map(
    nextCatalog.posts.map((post) => [post.slug, post])
  );
  const trackedCollectionsBySlug = new Map(
    trackedCatalog.collections.map((collection) => [
      collection.slug,
      collection
    ])
  );
  const nextCollectionsBySlug = new Map(
    nextCatalog.collections.map((collection) => [collection.slug, collection])
  );

  const liveOnlyPosts = nextCatalog.posts.filter(
    (post) => !trackedPostsBySlug.has(post.slug)
  );
  const trackedOnlyPosts = trackedCatalog.posts.filter(
    (post) => !nextPostsBySlug.has(post.slug)
  );
  const changedPosts = nextCatalog.posts
    .filter((post) => trackedPostsBySlug.has(post.slug))
    .map((post) => ({
      slug: post.slug,
      title: post.title,
      fields: getChangedFields(
        trackedPostsBySlug.get(post.slug),
        post,
        POST_COMPARE_FIELDS
      )
    }))
    .filter((entry) => entry.fields.length);

  const fieldDriftCounts = changedPosts.reduce((accumulator, entry) => {
    entry.fields.forEach((field) => {
      accumulator[field] = (accumulator[field] || 0) + 1;
    });
    return accumulator;
  }, {});

  const changedCollections = nextCatalog.collections
    .filter((collection) => trackedCollectionsBySlug.has(collection.slug))
    .map((collection) => ({
      slug: collection.slug,
      title: collection.title,
      fields: getChangedFields(
        trackedCollectionsBySlug.get(collection.slug),
        collection,
        COLLECTION_COMPARE_FIELDS
      )
    }))
    .filter((entry) => entry.fields.length);
  const liveOnlyCollections = nextCatalog.collections.filter(
    (collection) => !trackedCollectionsBySlug.has(collection.slug)
  );
  const trackedOnlyCollections = trackedCatalog.collections.filter(
    (collection) => !nextCollectionsBySlug.has(collection.slug)
  );

  const siteContentChanges = [
    "branding",
    "home",
    "collectionThemes",
    "about"
  ].filter(
    (section) =>
      JSON.stringify(trackedCatalog.siteContent?.[section] ?? null) !==
      JSON.stringify(nextCatalog.siteContent?.[section] ?? null)
  );

  const invalidCollectionFeatured = nextCatalog.collections
    .filter(
      (collection) =>
        collection.featuredReleaseSlug &&
        !nextPostsBySlug.has(collection.featuredReleaseSlug)
    )
    .map((collection) => ({
      collectionSlug: collection.slug,
      featuredReleaseSlug: collection.featuredReleaseSlug
    }));
  const hiddenCollectionFeatured = nextCatalog.collections
    .filter((collection) => {
      const featuredPost = nextPostsBySlug.get(collection.featuredReleaseSlug);
      return (
        featuredPost &&
        (!featuredPost.published || featuredPost.isPubliclyVisible === false)
      );
    })
    .map((collection) => ({
      collectionSlug: collection.slug,
      featuredReleaseSlug: collection.featuredReleaseSlug
    }));
  const homeFeaturedSlug = nextCatalog.siteContent.home.featuredReleaseSlug;
  const homeFeaturedPost = homeFeaturedSlug
    ? nextPostsBySlug.get(homeFeaturedSlug)
    : null;

  return {
    trackedPostCount: trackedCatalog.posts.length,
    nextPostCount: nextCatalog.posts.length,
    liveOnlyPosts,
    trackedOnlyPosts,
    changedPosts,
    fieldDriftCounts,
    trackedCollectionCount: trackedCatalog.collections.length,
    nextCollectionCount: nextCatalog.collections.length,
    liveOnlyCollections,
    trackedOnlyCollections,
    changedCollections,
    siteContentChanges,
    invalidCollectionFeatured,
    hiddenCollectionFeatured,
    homeFeaturedSlug,
    homeFeaturedState: homeFeaturedPost
      ? {
          exists: true,
          published: Boolean(homeFeaturedPost.published),
          visible: homeFeaturedPost.isPubliclyVisible !== false
        }
      : {
          exists: false,
          published: false,
          visible: false
        },
    liveUserCount: Array.isArray(liveStore.users) ? liveStore.users.length : 0,
    liveCommentCount: Array.isArray(liveStore.comments)
      ? liveStore.comments.length
      : 0
  };
}

function buildReportMarkdown(summary, options) {
  const relativeCatalogPath = path.relative(REPO_ROOT, options.catalogPath);
  const catalogLabel =
    path.isAbsolute(relativeCatalogPath) || relativeCatalogPath.startsWith("..")
      ? "backend/data/posts.local.json (baseline override)"
      : relativeCatalogPath;
  const lines = [
    "# Catalog Sync Report",
    "",
    `- Catalog file: \`${catalogLabel}\``,
    `- Generated: \`${new Date().toISOString()}\``,
    "",
    "## Summary",
    "",
    `- Tracked posts before sync: \`${summary.trackedPostCount}\``,
    `- Live posts exported: \`${summary.nextPostCount}\``,
    `- Live-only posts added to tracked catalog: \`${summary.liveOnlyPosts.length}\``,
    `- Tracked-only posts missing from live store: \`${summary.trackedOnlyPosts.length}\``,
    `- Matching posts with field drift: \`${summary.changedPosts.length}\``,
    `- Tracked collections before sync: \`${summary.trackedCollectionCount}\``,
    `- Live collections exported: \`${summary.nextCollectionCount}\``,
    `- Collections with field drift: \`${summary.changedCollections.length}\``,
    `- Site content sections changed: \`${summary.siteContentChanges.length}\``,
    `- Live users excluded from tracked catalog: \`${summary.liveUserCount}\``,
    `- Live comments excluded from tracked catalog: \`${summary.liveCommentCount}\``,
    "",
    "## Canonical Scope",
    "",
    "- Repo-tracked catalog now covers authored content only: `posts`, `collections`, and `siteContent`.",
    "- `users` and `comments` remain live operational data and are intentionally excluded from the tracked catalog file.",
    "- `backend/data/posts.local.json` is the local authored catalog restore source.",
    "",
    "## Post Drift",
    ""
  ];

  if (summary.liveOnlyPosts.length) {
    lines.push("### Added From Live", "");
    summary.liveOnlyPosts.forEach((post) => {
      lines.push(`- \`${post.slug}\` - ${post.title}`);
    });
    lines.push("");
  }

  if (summary.trackedOnlyPosts.length) {
    lines.push("### Missing From Live", "");
    summary.trackedOnlyPosts.forEach((post) => {
      lines.push(`- \`${post.slug}\` - ${post.title}`);
    });
    lines.push("");
  }

  if (summary.changedPosts.length) {
    lines.push("### Matching Posts With Field Drift", "");
    summary.changedPosts.slice(0, 40).forEach((post) => {
      lines.push(`- \`${post.slug}\` changed: ${post.fields.join(", ")}`);
    });
    lines.push("");
    lines.push("### Field Drift Totals", "");
    Object.entries(summary.fieldDriftCounts)
      .sort(
        (left, right) => right[1] - left[1] || left[0].localeCompare(right[0])
      )
      .forEach(([field, count]) => {
        lines.push(`- \`${field}\`: ${count}`);
      });
    lines.push("");
  }

  lines.push("## Collection Drift", "");

  if (summary.changedCollections.length) {
    summary.changedCollections.forEach((collection) => {
      lines.push(
        `- \`${collection.slug}\` changed: ${collection.fields.join(", ")}`
      );
    });
    lines.push("");
  } else {
    lines.push("- No collection field drift detected.", "");
  }

  if (summary.liveOnlyCollections.length) {
    lines.push("### Added Collections", "");
    summary.liveOnlyCollections.forEach((collection) => {
      lines.push(`- \`${collection.slug}\` - ${collection.title}`);
    });
    lines.push("");
  }

  if (summary.trackedOnlyCollections.length) {
    lines.push("### Missing Collections", "");
    summary.trackedOnlyCollections.forEach((collection) => {
      lines.push(`- \`${collection.slug}\` - ${collection.title}`);
    });
    lines.push("");
  }

  lines.push("## Site Content Drift", "");

  if (summary.siteContentChanges.length) {
    summary.siteContentChanges.forEach((section) => {
      lines.push(`- \`${section}\``);
    });
  } else {
    lines.push("- No site content drift detected.");
  }

  lines.push("", "## Anchor Validation", "");

  if (summary.invalidCollectionFeatured.length) {
    summary.invalidCollectionFeatured.forEach((entry) => {
      lines.push(
        `- Invalid collection feature: \`${entry.collectionSlug}\` -> \`${entry.featuredReleaseSlug}\``
      );
    });
  } else {
    lines.push("- All collection featured slugs point to valid posts.");
  }

  if (summary.hiddenCollectionFeatured.length) {
    summary.hiddenCollectionFeatured.forEach((entry) => {
      lines.push(
        `- Hidden collection feature: \`${entry.collectionSlug}\` -> \`${entry.featuredReleaseSlug}\``
      );
    });
  } else {
    lines.push(
      "- All collection featured slugs point to published, visible posts."
    );
  }

  if (summary.homeFeaturedSlug) {
    lines.push(
      `- Home featured slug: \`${summary.homeFeaturedSlug}\` (${summary.homeFeaturedState.exists ? "exists" : "missing"}, ${
        summary.homeFeaturedState.published ? "published" : "not published"
      }, ${summary.homeFeaturedState.visible ? "visible" : "hidden"})`
    );
  } else {
    lines.push("- Home featured slug is empty.");
  }

  lines.push(
    "",
    "## Recommended Follow-Up",
    "",
    "- Merge this reconciliation before any data-layer refactor work.",
    "- Build safe partial updates against the reconciled catalog so future live changes do not drift silently."
  );

  return `${lines.join("\n")}\n`;
}

async function writeJsonFile(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  config.assertSecureConfig();
  await connectToDatabase();

  try {
    const [trackedCatalog, liveStore] = await Promise.all([
      readTrackedCatalog(options.catalogPath),
      readStore()
    ]);
    const nextCatalog = buildCatalogFromStore(liveStore);
    const summary = buildReconciliationSummary(
      trackedCatalog,
      nextCatalog,
      liveStore
    );

    if (options.write) {
      await writeJsonFile(options.catalogPath, nextCatalog);
    }

    if (options.reportPath) {
      await fs.mkdir(path.dirname(options.reportPath), { recursive: true });
      await fs.writeFile(
        options.reportPath,
        buildReportMarkdown(summary, options),
        "utf8"
      );
    }

    if (options.snapshotPath) {
      await writeJsonFile(options.snapshotPath, liveStore);
    }

    console.log("Catalog sync summary");
    console.log(`Tracked posts before sync: ${summary.trackedPostCount}`);
    console.log(`Live posts exported: ${summary.nextPostCount}`);
    console.log(`Live-only posts: ${summary.liveOnlyPosts.length}`);
    console.log(`Tracked-only posts: ${summary.trackedOnlyPosts.length}`);
    console.log(`Posts with field drift: ${summary.changedPosts.length}`);
    console.log(
      `Collections with field drift: ${summary.changedCollections.length}`
    );
    console.log(
      `Site content sections changed: ${summary.siteContentChanges.length}`
    );
    console.log(
      `Collection featured slug issues: ${summary.invalidCollectionFeatured.length + summary.hiddenCollectionFeatured.length}`
    );
    console.log(`Home featured slug: ${summary.homeFeaturedSlug || "(empty)"}`);

    if (!options.write) {
      console.log(
        "Catalog file was not modified. Re-run with --write to update the tracked catalog."
      );
    }

    if (!options.reportPath) {
      console.log(
        "No report was written. Re-run with --report to capture the reconciliation summary."
      );
    }
  } finally {
    await closeDatabase();
  }
}

main().catch((error) => {
  console.error("Failed to sync tracked catalog from live store.", error);
  process.exit(1);
});
