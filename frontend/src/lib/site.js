export const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
export const tokenKey = "suno-blog-admin-token";
export const userTokenKey = "suno-blog-user-token";
export const themeKey = "suno-blog-theme";

export const emptyPost = {
  title: "",
  videoUrl: "",
  excerpt: "",
  content: "",
  lyrics: "",
  subCategory: "",
  sourceTag: "",
  worldLayer: "",
  themeTags: [],
  versionFamily: "",
  isPrimaryVersion: false,
  isArchive: false,
  isHomepageEligible: false,
  isPubliclyVisible: true,
  supersededBySlug: "",
  supersededReason: "",
  supersededAt: "",
  releaseStatus: "canon",
  archiveMeta: {
    fragmentId: "",
    state: "",
    perspective: "",
    signalType: "",
    description: "",
    systemNote: "",
    linkedSlugs: [],
    chapterNumber: "",
    entryType: "",
    subtitle: "",
    openingPassage: "",
    coreSituation: "",
    coreTension: "",
    chronicleObservation: "",
    chronicleContradiction: "",
    chronicleConclusion: "",
    emotionalState: "",
    coreConflict: "",
    risk: "",
    anchorQuote: "",
    resolution: "",
    entryStatus: "",
    playerFlavorLine: ""
  },
  createdAt: "",
  published: false,
  collectionSlugs: []
};

export const emptyCollection = {
  title: "",
  description: "",
  featuredReleaseSlug: "",
  theme: "",
  isPublicPrimary: false
};

export const PUBLIC_PRIMARY_COLLECTION_SLUGS = ["fractureverse", "eldoria", "original-personal", "standalone"];
export const RELEASE_STATUSES = ["canon", "alternate", "working"];
export const SOURCE_TAG_OPTIONS = ["", "donna-era", "claude-enhanced"];
export const WORLD_LAYER_OPTIONS = ["", "core", "author-layer", "meta-memory", "proto", "inspired", "villain"];

export const ORIGINAL_PERSONAL_SECTION_CONFIG = [
  {
    key: "identity",
    label: "Identity",
    collectionSlugs: [
      "becoming-identity-emergence",
      "personal-reflection-trans-identity-core",
      "personal-identity-internal-confrontation",
      "identity-survival",
      "tragic-identity-arc",
      "quiet-survivor-arc",
      "emotional-isolation",
      "expression-spectrum"
    ]
  },
  {
    key: "love-vulnerability",
    label: "Love & Vulnerability",
    collectionSlugs: [
      "love-vulnerability",
      "personal-identity-love-and-vulnerability",
      "personal-identity-love-and-vulnerability-sapphic-sub-arc"
    ]
  },
  {
    key: "princess-motif",
    label: "Princess Motif",
    collectionSlugs: ["princess-arc", "personal-identity-princess-arc", "personal-identity-princess-arc-symbolic-layer"]
  },
  {
    key: "empowerment",
    label: "Empowerment",
    collectionSlugs: ["personal-identity-empowerment", "hope-arc"]
  },
  {
    key: "community",
    label: "Community",
    collectionSlugs: ["community-pride", "personal-identity-community-and-pride"]
  },
  {
    key: "quiet-survivor",
    label: "Quiet Survivor",
    collectionSlugs: ["quiet-survivor-arc"]
  },
  {
    key: "kawaii-playful",
    label: "Kawaii / Playful",
    collectionSlugs: ["kawaii-adventure", "kawaii-magical"]
  },
  {
    key: "villain",
    label: "Villain",
    collectionSlugs: [
      "villain-anthology",
      "villain-monologues",
      "villain-monologues-necessary-monsters",
      "necessary-monsters"
    ]
  },
  {
    key: "dnd-campaign",
    label: "D&D / Campaign",
    collectionSlugs: ["campaign-stories-one-shots", "d-and-d-character-arcs", "dnd"]
  },
  {
    key: "archive",
    label: "Archive / Early Works",
    collectionSlugs: ["donna-era"]
  },
  {
    key: "other",
    label: "Other",
    collectionSlugs: []
  }
];

const ORIGINAL_PERSONAL_SECTION_PRECEDENCE = [
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
const ORIGINAL_PERSONAL_SECTION_ALIASES = {
  princess: "princess-motif"
};

const CURATED_DEPRIORITIZED_TERMS = [
  "version",
  "reimagined",
  "revision",
  "mix",
  "streamlined",
  "stripped",
  "expanded",
  "full english",
  "donna generation",
  "alternate"
];

const VERSION_LABEL_PATTERN =
  /\b(reimagined|version|revision|mix|remix|alternate|streamlined|stripped|expanded|donna generation|full english|orchestral|acoustic|demo|edit)\b/gi;
const VERSION_LABEL_TEST_PATTERN =
  /\b(reimagined|version|revision|mix|remix|alternate|streamlined|stripped|expanded|donna generation|full english|orchestral|acoustic|demo|edit)\b/i;

export function isPublicPrimaryCollection(collectionOrSlug) {
  if (!collectionOrSlug) {
    return false;
  }

  if (typeof collectionOrSlug === "string") {
    return PUBLIC_PRIMARY_COLLECTION_SLUGS.includes(collectionOrSlug);
  }

  if (typeof collectionOrSlug.isPublicPrimary === "boolean") {
    return collectionOrSlug.isPublicPrimary;
  }

  return PUBLIC_PRIMARY_COLLECTION_SLUGS.includes(String(collectionOrSlug.slug || "").trim());
}

export function sortCollectionsForPublicNavigation(collections = []) {
  return [...collections].sort((left, right) => {
    const leftIndex = PUBLIC_PRIMARY_COLLECTION_SLUGS.indexOf(left.slug);
    const rightIndex = PUBLIC_PRIMARY_COLLECTION_SLUGS.indexOf(right.slug);

    if (leftIndex !== rightIndex) {
      return (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex);
    }

    return String(left.title || "").localeCompare(String(right.title || ""));
  });
}

export function partitionCollectionsForExplore(collections = []) {
  const orderedCollections = sortCollectionsForPublicNavigation(collections);

  return {
    primaryCollections: orderedCollections.filter((collection) => isPublicPrimaryCollection(collection)),
    internalCollections: orderedCollections.filter((collection) => !isPublicPrimaryCollection(collection))
  };
}

export function getVisibleCollectionsForPost(post) {
  return (post?.collections || []).filter((collection) => isPublicPrimaryCollection(collection));
}

export function getPreferredCollectionForPost(post) {
  return getVisibleCollectionsForPost(post)[0] || post?.collections?.[0] || null;
}

export function inferOriginalPersonalSubCategoryFromCollections(collectionSlugs = []) {
  const normalizedSlugs = Array.isArray(collectionSlugs) ? collectionSlugs.map((slug) => String(slug).trim()) : [];

  for (const sectionKey of ORIGINAL_PERSONAL_SECTION_PRECEDENCE) {
    const section = ORIGINAL_PERSONAL_SECTION_CONFIG.find((entry) => entry.key === sectionKey);

    if (section?.collectionSlugs.some((slug) => normalizedSlugs.includes(slug))) {
      return section.key;
    }
  }

  return "other";
}

export function getOriginalPersonalSection(post) {
  const normalizedSubCategory =
    ORIGINAL_PERSONAL_SECTION_ALIASES[String(post?.subCategory || "").trim()] || String(post?.subCategory || "").trim();
  const configuredSection =
    ORIGINAL_PERSONAL_SECTION_CONFIG.find((section) => section.key === normalizedSubCategory) || null;

  if (configuredSection && configuredSection.key !== "other") {
    return configuredSection;
  }

  const fallbackKey = inferOriginalPersonalSubCategoryFromCollections(post?.collectionSlugs || []);
  return ORIGINAL_PERSONAL_SECTION_CONFIG.find((section) => section.key === fallbackKey) || ORIGINAL_PERSONAL_SECTION_CONFIG.at(-1);
}

export function groupOriginalPersonalPosts(posts = []) {
  return ORIGINAL_PERSONAL_SECTION_CONFIG.map((section) => ({
    ...section,
    posts: posts.filter((post) => getOriginalPersonalSection(post)?.key === section.key)
  })).filter((section) => section.posts.length > 0);
}

function normalizeSongGroupingTitle(title = "") {
  return String(title || "")
    .replace(/\([^)]*\)/g, " ")
    .split(/[-:]/)
    .filter((part) => !VERSION_LABEL_TEST_PATTERN.test(part))
    .join(" ")
    .replace(VERSION_LABEL_PATTERN, " ")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function getPostVersionKey(post) {
  const explicitFamily = String(post?.versionFamily || "").trim().toLowerCase();

  if (explicitFamily) {
    return explicitFamily;
  }

  return normalizeSongGroupingTitle(post?.title || "") || String(post?.slug || post?.id || "").trim().toLowerCase();
}

export function getReleaseStatus(post) {
  const status = String(post?.releaseStatus || "").trim().toLowerCase();
  return RELEASE_STATUSES.includes(status) ? status : "canon";
}

export function isPostPubliclyVisible(post) {
  return post?.isPubliclyVisible !== false;
}

function getPrimarySurfaceStatusRank(post, { allowAlternateFallback = true, includeWorking = false } = {}) {
  const status = getReleaseStatus(post);

  if (status === "canon") {
    return 3;
  }

  if (status === "alternate") {
    return allowAlternateFallback ? 2 : 0;
  }

  if (status === "working") {
    return includeWorking ? 1 : 0;
  }

  return 0;
}

function pickPreferredVersion(posts = []) {
  return [...posts].sort((left, right) => {
    if (Boolean(right?.isPrimaryVersion) !== Boolean(left?.isPrimaryVersion)) {
      return Number(Boolean(right?.isPrimaryVersion)) - Number(Boolean(left?.isPrimaryVersion));
    }

    return String(right?.createdAt || "").localeCompare(String(left?.createdAt || ""));
  })[0] || null;
}

export function getHomepageEligiblePosts(posts = []) {
  return posts.filter(
    (post) =>
      isPostPubliclyVisible(post) &&
      post?.isHomepageEligible === true &&
      post?.isArchive !== true &&
      getReleaseStatus(post) === "canon"
  );
}

export function dedupePostsByVersionKey(posts = []) {
  const groupedPosts = new Map();

  posts.forEach((post) => {
    const key = getPostVersionKey(post);

    if (!groupedPosts.has(key)) {
      groupedPosts.set(key, []);
    }

    groupedPosts.get(key).push(post);
  });

  return Array.from(groupedPosts.values())
    .map((entries) => pickPreferredVersion(entries))
    .filter(Boolean);
}

function pickPrimarySurfaceVersion(posts = [], options = {}) {
  return [...posts].sort((left, right) => {
    const statusDelta = getPrimarySurfaceStatusRank(right, options) - getPrimarySurfaceStatusRank(left, options);

    if (statusDelta !== 0) {
      return statusDelta;
    }

    if (Boolean(right?.isPrimaryVersion) !== Boolean(left?.isPrimaryVersion)) {
      return Number(Boolean(right?.isPrimaryVersion)) - Number(Boolean(left?.isPrimaryVersion));
    }

    const scoreDelta = getCuratedPostScore(right, options) - getCuratedPostScore(left, options);

    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    return String(right?.createdAt || "").localeCompare(String(left?.createdAt || ""));
  })[0] || null;
}

export function collapsePostsByVersionFamily(posts = [], options = {}) {
  const groupedPosts = new Map();

  posts.forEach((post) => {
    if (!post) {
      return;
    }

    if (getPrimarySurfaceStatusRank(post, options) <= 0) {
      return;
    }

    const key = getPostVersionKey(post);

    if (!groupedPosts.has(key)) {
      groupedPosts.set(key, []);
    }

    groupedPosts.get(key).push(post);
  });

  return Array.from(groupedPosts.values())
    .map((entries) => pickPrimarySurfaceVersion(entries, options))
    .filter(Boolean);
}

function getCuratedPostScore(post, options = {}) {
  const featuredReleaseSlug = String(options.featuredReleaseSlug || options.collection?.featuredReleaseSlug || "").trim();
  const normalizedText = [post?.title, post?.excerpt, post?.content, post?.lyrics].join(" ").toLowerCase();
  const hasPrimaryCollection = (post?.collections || []).some((collection) => isPublicPrimaryCollection(collection));
  const hasDonnaCollection = (post?.collectionSlugs || []).includes("donna-era");
  const sectionKey = getOriginalPersonalSection(post)?.key || "";
  let score = 0;

  if (featuredReleaseSlug && post?.slug === featuredReleaseSlug) {
    score += 160;
  }

  if (post?.isPrimaryVersion) {
    score += 90;
  }

  if (post?.isHomepageEligible) {
    score += 28;
  }

  if (post?.isArchive) {
    score -= 36;
  }

  if (hasPrimaryCollection) {
    score += 40;
  }

  if (options.surface === "home") {
    score += hasVideo(post?.videoUrl) ? 12 : 0;
  }

  if (sectionKey === "archive") {
    score -= 18;
  }

  if (hasDonnaCollection) {
    score -= 20;
  }

  CURATED_DEPRIORITIZED_TERMS.forEach((term) => {
    if (normalizedText.includes(term)) {
      score -= 8;
    }
  });

  return score;
}

export function sortCuratedPosts(posts = [], options = {}) {
  return [...posts].sort((left, right) => {
    const scoreDelta = getCuratedPostScore(right, options) - getCuratedPostScore(left, options);

    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    return String(right?.createdAt || "").localeCompare(String(left?.createdAt || ""));
  });
}

export function sortCollectionPostsForDisplay(posts = [], options = {}) {
  return [...posts].sort((left, right) => {
    const releaseStatusOrder = { canon: 0, alternate: 1, working: 2 };
    const statusDelta = releaseStatusOrder[getReleaseStatus(left)] - releaseStatusOrder[getReleaseStatus(right)];

    if (statusDelta !== 0) {
      return statusDelta;
    }

    if (Boolean(right?.isPrimaryVersion) !== Boolean(left?.isPrimaryVersion)) {
      return Number(Boolean(right?.isPrimaryVersion)) - Number(Boolean(left?.isPrimaryVersion));
    }

    if (Boolean(left?.isArchive) !== Boolean(right?.isArchive)) {
      return Number(Boolean(left?.isArchive)) - Number(Boolean(right?.isArchive));
    }

    const scoreDelta = getCuratedPostScore(right, options) - getCuratedPostScore(left, options);

    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    return String(right?.createdAt || "").localeCompare(String(left?.createdAt || ""));
  });
}

export function getHomepageCuratedPosts(posts = [], options = {}) {
  const dedupedPosts = collapsePostsByVersionFamily(getHomepageEligiblePosts(posts), {
    ...options,
    allowAlternateFallback: false,
    includeWorking: false
  });
  return sortCuratedPosts(dedupedPosts, { ...options, surface: "home" });
}

export function getPublicCollectionPosts(posts = []) {
  return posts.filter((post) => isPostPubliclyVisible(post) && getReleaseStatus(post) !== "working");
}

export function getPrimaryCollectionSurfacePosts(posts = [], options = {}) {
  return sortCollectionPostsForDisplay(
    collapsePostsByVersionFamily(getPublicCollectionPosts(posts), {
      ...options,
      allowAlternateFallback: true,
      includeWorking: false
    }),
    options
  );
}

export function getCanonicalCollectionSurfacePosts(posts = [], options = {}) {
  return sortCollectionPostsForDisplay(
    collapsePostsByVersionFamily(
      posts.filter((post) => getReleaseStatus(post) === "canon"),
      {
        ...options,
        allowAlternateFallback: false,
        includeWorking: false
      }
    ),
    options
  );
}

export function getSecondaryVersionPosts(posts = [], primaryPosts = [], options = {}) {
  const primaryByFamily = new Map(
    primaryPosts
      .filter(Boolean)
      .map((post) => [getPostVersionKey(post), post.slug])
  );

  return sortCollectionPostsForDisplay(
    getPublicCollectionPosts(posts).filter((post) => {
      const key = getPostVersionKey(post);
      const primarySlug = primaryByFamily.get(key);
      return Boolean(primarySlug) && post.slug !== primarySlug;
    }),
    options
  );
}

export function getSiblingVersionPosts(posts = [], currentPost, options = {}) {
  const currentKey = getPostVersionKey(currentPost);

  if (!currentKey) {
    return [];
  }

  return sortCollectionPostsForDisplay(
    getPublicCollectionPosts(posts).filter(
      (post) => post?.slug !== currentPost?.slug && getPostVersionKey(post) === currentKey
    ),
    options
  );
}

export const emptyAbout = {
  heroEyebrow: "About",
  heroTitle: "",
  heroText: "",
  artistEyebrow: "The Artist",
  artistTitle: "",
  artistText: "",
  siteEyebrow: "The Site",
  siteTitle: "",
  siteText: "",
  quoteEyebrow: "Why It Exists",
  quoteTitle: "",
  quoteText: ""
};

export const DEFAULT_COLLECTION_THEME_PROFILES = [
  {
    key: "default",
    label: "Default",
    kind: "standard",
    palette: {
      light: {
        background: "#f3d7d1",
        surface: "#f8e4df",
        surfaceAlt: "#f2d2cc",
        text: "#3a2327",
        mutedText: "#7a5158",
        border: "#e8bdb7",
        primary: "#df8f8a",
        primaryStrong: "#cb726e",
        secondary: "#f4c9c2"
      },
      dark: {
        background: "#120d14",
        surface: "#1b1320",
        surfaceAlt: "#241826",
        text: "#f8eaf1",
        mutedText: "#c9b2bf",
        border: "#3a2735",
        primary: "#f0a6ca",
        primaryStrong: "#ffb7d5",
        secondary: "#cba6f7"
      }
    }
  },
  {
    key: "eldoria",
    label: "Eldoria",
    kind: "immersive",
    palette: {
      light: {
        background: "#ece4cf",
        surface: "#f6efdf",
        surfaceAlt: "#ebe2cd",
        text: "#2f3124",
        mutedText: "#636550",
        border: "#cdbf9c",
        primary: "#6b7b4a",
        primaryStrong: "#a6884f",
        secondary: "#88a6b3"
      },
      dark: {
        background: "#16201a",
        surface: "#1d2821",
        surfaceAlt: "#273228",
        text: "#f1ead7",
        mutedText: "#c4bca5",
        border: "#56604f",
        primary: "#8ea167",
        primaryStrong: "#c6ab6d",
        secondary: "#7e9eab"
      }
    }
  },
  {
    key: "soft-archive",
    label: "Soft Archive",
    kind: "standard",
    palette: {
      light: {
        background: "#fbf1ee",
        surface: "#fff8f6",
        surfaceAlt: "#f7ebe7",
        text: "#432930",
        mutedText: "#87646d",
        border: "#efd5ce",
        primary: "#dca0ad",
        primaryStrong: "#cb7f93",
        secondary: "#f6ddd7"
      },
      dark: {
        background: "#1a1215",
        surface: "#25181d",
        surfaceAlt: "#302027",
        text: "#f7eef2",
        mutedText: "#ccb8c0",
        border: "#47323a",
        primary: "#e3a4af",
        primaryStrong: "#f2b8c2",
        secondary: "#c8a2b1"
      }
    }
  },
  {
    key: "fractureverse",
    label: "Fractureverse",
    kind: "immersive",
    palette: {
      light: {
        background: "#f4d8df",
        surface: "#f7e5ea",
        surfaceAlt: "#efd2db",
        text: "#421e2a",
        mutedText: "#7b5562",
        border: "#e2afbe",
        primary: "#d94d86",
        primaryStrong: "#b92b66",
        secondary: "#8a4fff"
      },
      dark: {
        background: "#140d12",
        surface: "#1f1419",
        surfaceAlt: "#2a1820",
        text: "#f6eaf0",
        mutedText: "#c6a9b6",
        border: "#4b2233",
        primary: "#ff6fa5",
        primaryStrong: "#ff3f87",
        secondary: "#8a4fff"
      }
    }
  },
  {
    key: "stage",
    label: "Stage",
    kind: "standard",
    palette: {
      light: {
        background: "#f6e3d8",
        surface: "#f9ece4",
        surfaceAlt: "#f1ddd1",
        text: "#44251d",
        mutedText: "#7f5a4d",
        border: "#e2bea7",
        primary: "#b84934",
        primaryStrong: "#c99236",
        secondary: "#8f261d"
      },
      dark: {
        background: "#160d0d",
        surface: "#241313",
        surfaceAlt: "#311818",
        text: "#faefe3",
        mutedText: "#d7b9a6",
        border: "#573126",
        primary: "#c53d2c",
        primaryStrong: "#e0a646",
        secondary: "#8f261d"
      }
    }
  },
  {
    key: "signal",
    label: "Signal",
    kind: "standard",
    palette: {
      light: {
        background: "#e7e5f4",
        surface: "#efedf9",
        surfaceAlt: "#e0dcf3",
        text: "#2e2945",
        mutedText: "#676084",
        border: "#c6bedf",
        primary: "#7764dc",
        primaryStrong: "#4e8ed8",
        secondary: "#8b86c9"
      },
      dark: {
        background: "#12101b",
        surface: "#1b1727",
        surfaceAlt: "#241d35",
        text: "#efeefe",
        mutedText: "#b8b4db",
        border: "#3d345d",
        primary: "#8c72ff",
        primaryStrong: "#66b5ff",
        secondary: "#4b5ec7"
      }
    }
  }
];

export const emptyThemeProfile = {
  key: "",
  label: "",
  kind: "standard",
  worldEyebrow: "",
  featuredLabel: "",
  featuredAction: "",
  listLabel: "",
  worldNoteTitle: "",
  worldNoteText: "",
  itemName: "",
  itemPlural: "",
  itemAction: "",
  playerLabel: "",
  playerUpNextLabel: "",
  palette: {
    light: {
      background: "",
      surface: "",
      surfaceAlt: "",
      text: "",
      mutedText: "",
      border: "",
      primary: "",
      primaryStrong: "",
      secondary: ""
    },
    dark: {
      background: "",
      surface: "",
      surfaceAlt: "",
      text: "",
      mutedText: "",
      border: "",
      primary: "",
      primaryStrong: "",
      secondary: ""
    }
  }
};

export const emptySiteSettings = {
  branding: {
    siteName: "Suno Diary",
    siteTagline: "Releases, collections, and notes in one place."
  },
  home: {
    heroEyebrow: "Suno Diary",
    heroTitle: "A soft archive for releases, collections, and the stories that let each song keep breathing.",
    heroText:
      "Browse curated groupings, move through release notes with more context, and treat the site less like a feed and more like a small world of connected songs.",
    featuredReleaseSlug: "",
    featuredCtaLabel: "Play Featured Release",
    jumpCtaLabel: "Jump to Latest Releases",
    noteEyebrow: "What Changed",
    noteTitle: "Discovery is part of the identity now, not just a homepage feed.",
    noteText:
      "Collections organize releases into verses, moods, and projects. Explore lets you search by title and written notes. About frames the artist, the site, and the reason this archive exists.",
    browseEyebrow: "Browse",
    browseTitle: "Move through the archive by collection instead of only by chronology.",
    browseText:
      "Collections turn the catalog into verses, projects, moods, and small emotional shelves rather than one uninterrupted stream.",
    browseLinkLabel: "See the collection shelves",
    exploreEyebrow: "Find",
    exploreTitle: "Search inside release notes, titles, and lyrics when you know the feeling but not the page.",
    exploreText:
      "The explore view is built for rediscovery: search by phrase, narrow by collection, and jump straight into the release that fits.",
    exploreLinkLabel: "Open explore",
    identityEyebrow: "Site Identity",
    identityTitle: "A personal home for releases, track stories, and the discovery paths between them",
    identityText:
      "Each page still keeps the music close, but now the archive has a stronger structure: releases can live in more than one collection, search can surface them by title or text, and the site has space to explain the artist voice behind the catalog.",
    identityLine: "A collection of songs, stories, and moments in motion."
  },
  collectionThemes: DEFAULT_COLLECTION_THEME_PROFILES.map((profile) => JSON.parse(JSON.stringify(profile)))
};

export const COLLECTION_THEMES = {
  default: {
    worldEyebrow: "Collection",
    worldTitlePrefix: "",
    worldDescriptionPrefix: "",
    featuredLabel: "Primary Release",
    featuredAction: "View Full Record",
    listLabel: "Latest Releases",
    releaseNote: "Release Note",
    lyrics: "Lyrics",
    noItemsEyebrow: "No Published Releases",
    noItemsTitle: "This collection exists, but nothing is live in it yet.",
    noItemsText: "Add or publish a release to bring this lane of the archive to life.",
    singleItemEyebrow: "Single Release Collection",
    singleItemTitle: "This collection is currently anchored by one release.",
    singleItemText:
      "As more entries are added, they will stack here beneath the spotlight instead of leaving the page feeling unfinished.",
    worldNoteTitle: "A note about this world",
    worldNoteText: "Each collection is a different shelf in the archive, with its own tone and memory.",
    itemName: "Release",
    itemPlural: "Releases",
    itemAction: "Open Release",
    playerLabel: "Now Playing",
    playerUpNextLabel: "Up Next"
  },
  eldoria: {
    worldEyebrow: "Eldoria",
    featuredLabel: "First Chronicle Entry",
    featuredAction: "Enter Chronicle",
    listLabel: "Chronicle",
    releaseNote: "Chronicle Entry",
    lyrics: "Verses",
    noItemsEyebrow: "Empty Chronicle",
    noItemsTitle: "No ballads have been gathered into this chronicle yet.",
    noItemsText: "When the first song is placed here, Eldoria will begin to read like a living tale instead of a waiting shelf.",
    singleItemEyebrow: "First Ballad",
    singleItemTitle: "This chronicle is carried by a single voice - for now.",
    singleItemText:
      "As more entries arrive, they will settle around it like pages in the same long-form tale rather than isolated releases.",
    worldNoteTitle: "A note from Eldoria",
    worldNoteText: "Some songs feel less like records and more like stories remembered beside a fire long after nightfall.",
    itemName: "Ballad",
    itemPlural: "Ballads",
    itemAction: "Enter Chronicle",
    playerLabel: "Now Playing - A Ballad",
    playerUpNextLabel: "Next Ballad"
  },
  "soft-archive": {
    worldEyebrow: "Soft Archive",
    featuredLabel: "Primary Entry",
    featuredAction: "Open Entry",
    listLabel: "Recent Entries",
    releaseNote: "Entry",
    lyrics: "Words",
    worldNoteTitle: "A note about this world",
    worldNoteText: "Quiet songs do not need to be small. They just need enough room to stay gentle.",
    itemName: "Entry",
    itemPlural: "Entries",
    itemAction: "Open Entry",
    playerLabel: "Now Playing",
    playerUpNextLabel: "Up Next"
  },
  fractureverse: {
    worldEyebrow: "Fractureverse",
    featuredLabel: "Primary Timeline Fragment",
    featuredAction: "View Full Record",
    listLabel: "Timeline Fragments",
    releaseNote: "Fragment Record",
    lyrics: "Recovered Dialogue",
    noItemsEyebrow: "No Fragments Detected",
    noItemsTitle: "No fragments detected.",
    noItemsText: "Either this world is newly formed,\nor something erased what came before.",
    singleItemEyebrow: "Single Recorded Fragment",
    singleItemTitle: "This world is currently anchored by one recorded fragment.",
    singleItemText:
      "As more releases enter the Fractureverse, they will appear here as additional observed entries beneath the first fracture.",
    worldNoteTitle: "Echo",
    worldNoteText: "Some timelines collapse.\nSome repeat.\nSome are never meant to be found.",
    itemName: "Fragment",
    itemPlural: "Fragments",
    itemAction: "Open Fragment",
    playerLabel: "Now Playing",
    playerUpNextLabel: "Up Next"
  },
  stage: {
    worldEyebrow: "Stage",
    featuredLabel: "Opening Act",
    featuredAction: "Continue Act",
    listLabel: "Acts",
    releaseNote: "Performance Notes",
    lyrics: "Script",
    worldNoteTitle: "A note about this world",
    worldNoteText: "Some songs are meant to arrive like entrances, spotlights, and final bows.",
    itemName: "Act",
    itemPlural: "Acts",
    itemAction: "Open Act",
    playerLabel: "Now Playing",
    playerUpNextLabel: "Up Next"
  },
  signal: {
    worldEyebrow: "Signal",
    featuredLabel: "Primary Transmission",
    featuredAction: "Open Transmission",
    listLabel: "Signals",
    releaseNote: "Transmission Log",
    lyrics: "Decoded Signal",
    worldNoteTitle: "A note about this world",
    worldNoteText: "What survives here sounds like a message from somewhere distant, imperfect, and still reaching back.",
    itemName: "Signal",
    itemPlural: "Signals",
    itemAction: "Open Signal",
    playerLabel: "Now Playing",
    playerUpNextLabel: "Up Next"
  }
};

export const FRACTUREVERSE_FEATURED_SLUG = "shattered-trust-reimagined";
export const FRACTUREVERSE_ORDER = [
  "the-one-you-used-to-be-reimagined",
  "still-breathing-in-a-dying-world-reimagined",
  "shattered-trust-reimagined",
  "you-were-better-before-you-saved-the-world-reimagined",
  "we-were-never-meant-to-survive-reimagined-duet"
];

export const ROUTE_THEME_HINTS = {
  collections: {
    eldoria: "eldoria",
    "the-fractureverse": "fractureverse"
  },
  releases: {
    "between-two-worlds-the-first-awakening": "eldoria",
    "echoes-of-aeloria-the-memory-that-was-never-mine": "eldoria",
    "queen-of-borrowed-crowns-the-throne-that-was-not-hers": "eldoria",
    "wings-of-light-the-weapon-she-wrote-into-being": "eldoria",
    "the-one-you-used-to-be-reimagined": "fractureverse",
    "still-breathing-in-a-dying-world-reimagined": "fractureverse",
    "shattered-trust-reimagined": "fractureverse",
    "you-were-better-before-you-saved-the-world-reimagined": "fractureverse",
    "we-were-never-meant-to-survive-reimagined-duet": "fractureverse"
  }
};

export const FRACTUREVERSE_WORLD = {
  headerEyebrow: "World / Fractureverse",
  description:
    "A fractured reality where every choice creates a new world, and every version of love carries a different cost.\n\nHere, memory, sacrifice, collapse, obsession, and convergence exist side by side - none of them fully gone, none of them fully resolved.",
  stats: [
    { label: "World Status", value: "Unstable" },
    { label: "Observed Fragments", value: "5" },
    { label: "Primary Subjects", value: "Angel, Grissom" },
    { label: "Current Condition", value: "Active recursion detected" }
  ],
  residualEcho: "Some timelines collapse. Some repeat. Some never stop trying to become real."
};

export const ELDORIA_MAP_LAYOUT = {
  "1": {
    x: 22,
    y: 60,
    svgX: 220,
    svgY: 420,
    region: "fracture-field",
    mapTitle: "Threshold Field",
    mapSubtitle: "Arrival Point",
    stateLabel: "Spawn / fracture point",
    type: "origin"
  },
  "2": {
    x: 50,
    y: 19,
    svgX: 500,
    svgY: 130,
    region: "aeloria-echo-zone",
    mapTitle: "Aeloria Echo Grove",
    mapSubtitle: "Memory Bleed",
    stateLabel: "Echo grove / unstable region",
    type: "echo"
  },
  "3": {
    x: 78,
    y: 40,
    svgX: 780,
    svgY: 280,
    region: "eldoria-capital",
    mapTitle: "Eldoria Capital",
    mapSubtitle: "Throne / Stability",
    stateLabel: "Castle hub / sovereign center",
    type: "ascension"
  },
  "4": {
    x: 58,
    y: 77,
    svgX: 580,
    svgY: 540,
    region: "eastern-warfront",
    mapTitle: "Eastern Warfront",
    mapSubtitle: "Consequence",
    stateLabel: "Burning battlefield / manifestation zone",
    type: "manifestation"
  }
};

export const ELDORIA_MAP_PATHS = [
  ["1", "2"],
  ["2", "3"],
  ["3", "4"]
];

export const FRACTUREVERSE_METADATA = {
  "the-one-you-used-to-be-reimagined": {
    fragmentId: "F-01",
    state: "Stable",
    perspective: "Grissom",
    signalType: "Origin",
    title: "The One You Used to Be",
    description: "A preserved fragment from before the fracture - where love existed without cost.",
    linkedSlugs: ["still-breathing-in-a-dying-world-reimagined", "you-were-better-before-you-saved-the-world-reimagined"],
    systemNote: "Reference timeline detected. Emotional imprint preserved."
  },
  "still-breathing-in-a-dying-world-reimagined": {
    fragmentId: "F-02",
    state: "Divergent",
    perspective: "Angel",
    signalType: "Conflict",
    title: "Still Breathing (In a Dying World)",
    description:
      "The moment she chose everything, knowing it would cost her the one thing she wanted to keep.",
    linkedSlugs: ["the-one-you-used-to-be-reimagined", "shattered-trust-reimagined"],
    systemNote: "Critical divergence detected. Global stability prioritized over personal attachment."
  },
  "shattered-trust-reimagined": {
    fragmentId: "F-03",
    state: "Collapsed",
    perspective: "Angel",
    signalType: "Primary",
    title: "Shattered Trust (Reimagined)",
    description:
      "A post-collapse fragment where trust failed, and the cost of saving everything became permanent.",
    linkedSlugs: ["the-one-you-used-to-be-reimagined", "still-breathing-in-a-dying-world-reimagined"],
    systemNote: "Collapse event stabilized through force of will. Structural integrity compromised."
  },
  "you-were-better-before-you-saved-the-world-reimagined": {
    fragmentId: "F-04",
    state: "Divergent",
    perspective: "Grissom",
    signalType: "Conflict",
    title: "You Were Better Before You Saved the World",
    description:
      "A hostile fragment where loss becomes obsession, and one version of him refuses to accept the world she chose.",
    linkedSlugs: ["still-breathing-in-a-dying-world-reimagined", "shattered-trust-reimagined"],
    systemNote: "Hostile recursion detected. Subject actively destabilizing timelines."
  },
  "we-were-never-meant-to-survive-reimagined-duet": {
    fragmentId: "F-05",
    state: "Unstable",
    perspective: "Both",
    signalType: "Convergence",
    title: "We Were Never Meant to Survive",
    description:
      "A convergence event where opposing truths collide, and the timeline can no longer resolve itself.",
    linkedSlugs: [
      "still-breathing-in-a-dying-world-reimagined",
      "shattered-trust-reimagined",
      "you-were-better-before-you-saved-the-world-reimagined"
    ],
    systemNote: "Convergence detected. Conflicting directives unresolved."
  }
};

export function getThemeProfiles(siteContent) {
  const storedProfiles = Array.isArray(siteContent?.collectionThemes) ? siteContent.collectionThemes : [];
  const mergedProfiles = DEFAULT_COLLECTION_THEME_PROFILES.map((profile) => {
    const override = storedProfiles.find((entry) => entry?.key === profile.key);
    return {
      ...profile,
      ...(override || {}),
      palette: {
        light: {
          ...profile.palette.light,
          ...(override?.palette?.light || {})
        },
        dark: {
          ...profile.palette.dark,
          ...(override?.palette?.dark || {})
        }
      }
    };
  });

  const customProfiles = storedProfiles.filter(
    (profile) => profile?.key && !mergedProfiles.some((entry) => entry.key === profile.key)
  );

  return [...mergedProfiles, ...customProfiles];
}

export function getThemeProfile(theme, siteContent) {
  return getThemeProfiles(siteContent).find((entry) => entry.key === theme) || null;
}

export function getThemeConfig(theme, siteContent) {
  const baseConfig = COLLECTION_THEMES[theme] || COLLECTION_THEMES.default;
  const profile = getThemeProfile(theme, siteContent);

  if (!profile) {
    return baseConfig;
  }

  return {
    ...baseConfig,
    worldEyebrow: profile.worldEyebrow || baseConfig.worldEyebrow,
    featuredLabel: profile.featuredLabel || baseConfig.featuredLabel,
    featuredAction: profile.featuredAction || baseConfig.featuredAction,
    listLabel: profile.listLabel || baseConfig.listLabel,
    worldNoteTitle: profile.worldNoteTitle || baseConfig.worldNoteTitle,
    worldNoteText: profile.worldNoteText || baseConfig.worldNoteText,
    itemName: profile.itemName || baseConfig.itemName,
    itemPlural: profile.itemPlural || baseConfig.itemPlural,
    itemAction: profile.itemAction || baseConfig.itemAction,
    playerLabel: profile.playerLabel || baseConfig.playerLabel,
    playerUpNextLabel: profile.playerUpNextLabel || baseConfig.playerUpNextLabel
  };
}

export function getThemeCssVariables(theme, mode, siteContent) {
  const profile = getThemeProfile(theme, siteContent);
  const palette = profile?.palette?.[mode];

  if (!palette) {
    return {};
  }

  return {
    "--background": palette.background,
    "--surface": palette.surface,
    "--surface-alt": palette.surfaceAlt,
    "--text": palette.text,
    "--muted-text": palette.mutedText,
    "--border": palette.border,
    "--primary": palette.primary,
    "--primary-strong": palette.primaryStrong,
    "--secondary": palette.secondary,
    "--player-progress-start": palette.primary,
    "--player-progress-mid": palette.primaryStrong,
    "--player-progress-end": palette.secondary,
    "--player-progress-glow": palette.primary,
    "--player-progress-glow-strong": palette.primaryStrong,
    "--player-thumb": palette.primaryStrong,
    "--player-track": palette.surfaceAlt,
    "--player-volume-track": palette.surfaceAlt,
    "--player-volume-fill-start": palette.primary,
    "--player-volume-fill-end": palette.secondary,
    "--player-volume-thumb": palette.primaryStrong,
    "--player-volume-thumb-glow": palette.primary
  };
}

export function getPrimaryThemeForPost(post) {
  const themedCollection = [getPreferredCollectionForPost(post), ...(post?.collections || [])]
    .filter(Boolean)
    .find((collection) => collection.theme);
  return themedCollection?.theme || "default";
}

export function getCollectionThemeHint(slug) {
  return ROUTE_THEME_HINTS.collections[slug] || "";
}

export function getReleaseThemeHint(slug) {
  return ROUTE_THEME_HINTS.releases[slug] || "";
}

export function sortFractureversePosts(posts = []) {
  return [...posts].sort((left, right) => {
    const leftMeta = getFractureverseMeta(left, posts);
    const rightMeta = getFractureverseMeta(right, posts);
    const leftIndex = leftMeta?.fragmentId ? Number(leftMeta.fragmentId.replace("F-", "")) : FRACTUREVERSE_ORDER.indexOf(left.slug) + 1 || 99;
    const rightIndex = rightMeta?.fragmentId ? Number(rightMeta.fragmentId.replace("F-", "")) : FRACTUREVERSE_ORDER.indexOf(right.slug) + 1 || 99;

    return leftIndex - rightIndex;
  });
}

export function getFractureverseMeta(post, allPosts = []) {
  const fallbackMeta = FRACTUREVERSE_METADATA[post?.slug] || null;
  const archiveMeta = post?.archiveMeta || fallbackMeta;

  if (!archiveMeta) {
    return null;
  }

  const linkedSlugs = Array.isArray(archiveMeta.linkedSlugs)
    ? archiveMeta.linkedSlugs
    : Array.isArray(fallbackMeta?.linkedSlugs)
      ? fallbackMeta.linkedSlugs
      : [];
  const linkedPosts = allPosts.filter((entry) => linkedSlugs.includes(entry.slug));
  const linkedTo = linkedPosts
    .map((entry) => {
      const linkedFallback = FRACTUREVERSE_METADATA[entry.slug] || null;
      const linkedArchiveMeta = entry.archiveMeta || linkedFallback;
      return linkedArchiveMeta?.fragmentId || "";
    })
    .filter(Boolean);

  return {
    fragmentId: archiveMeta.fragmentId || fallbackMeta?.fragmentId || "",
    state: archiveMeta.state || fallbackMeta?.state || "",
    perspective: archiveMeta.perspective || fallbackMeta?.perspective || "",
    signalType: archiveMeta.signalType || fallbackMeta?.signalType || "",
    title: fallbackMeta?.title || post?.title || "",
    description: archiveMeta.description || fallbackMeta?.description || post?.excerpt || "",
    systemNote: archiveMeta.systemNote || fallbackMeta?.systemNote || "",
    linkedSlugs,
    linkedPosts,
    linkedTo
  };
}

export function hasVideo(videoUrl) {
  return Boolean(String(videoUrl || "").trim());
}

export function getVideoPosterUrl(videoUrl) {
  const normalizedUrl = String(videoUrl || "").trim();

  if (!normalizedUrl) {
    return "";
  }

  if (!normalizedUrl.includes("res.cloudinary.com") || !normalizedUrl.includes("/video/upload/")) {
    return "";
  }

  const [baseUrl, query = ""] = normalizedUrl.split("?");
  const posterBaseUrl = baseUrl
    .replace("/video/upload/", "/video/upload/so_0,f_jpg,q_auto/")
    .replace(/\.[^./?#]+$/, ".jpg");

  return query ? `${posterBaseUrl}?${query}` : posterBaseUrl;
}

function toRoman(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    return "";
  }

  const numerals = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"]
  ];

  let remainder = number;
  let result = "";

  numerals.forEach(([amount, symbol]) => {
    while (remainder >= amount) {
      result += symbol;
      remainder -= amount;
    }
  });

  return result;
}

function formatCountLabel(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function getCollectionDerivedContent(collection, releases = [], siteContent) {
  const theme = collection?.theme || "default";
  const themeConfig = getThemeConfig(theme, siteContent);
  const count = releases.length;
  const featuredRelease = collection?.featuredRelease || null;
  const itemName = themeConfig.itemName || "Release";
  const itemPlural = themeConfig.itemPlural || `${itemName}s`;

  if (theme === "eldoria") {
    return {
      stats: [
        { label: "Realm", value: collection?.title || "Eldoria" },
        { label: "Chronicle Entries", value: formatCountLabel(count, "ballad", "ballads") },
        {
          label: "Featured Ballad",
          value: featuredRelease?.title || (count === 0 ? "Awaiting a first telling" : count === 1 ? "A single tale remains" : "No leading ballad chosen")
        },
        {
          label: "Current Season",
          value: count === 0 ? "Quiet before the telling" : count === 1 ? "Opening chapter" : count < 4 ? "Stories gathering" : "World in full song"
        }
      ],
      featuredContext:
        count <= 1
          ? "This royal record carries the chronicle on its own for now. As more entries arrive, it will shift from lone voice to remembered beginning."
          : "This ballad acts as the first doorway into the wider chronicle, giving the world a clear emotional entry point before the other songs continue the tale.",
      collectionCountLabel: formatCountLabel(count, "entry recorded", "entries recorded"),
      releaseSequenceLabel: formatCountLabel(count, "ballad in this chronicle", "ballads in this chronicle"),
      companionLabel: formatCountLabel(Math.max(count - 1, 0), "nearby entry", "nearby entries"),
      worldNote:
        count === 0
          ? "A world can still feel present before its first ballad arrives."
          : count === 1
            ? "Even one voice can awaken a forgotten world."
            : "Some songs feel less like records and more like stories remembered beside a fire long after nightfall."
    };
  }

  if (theme === "fractureverse") {
    return {
      collectionCountLabel: formatCountLabel(fractureverseVisibleCount(releases), "linked fragment", "linked fragments"),
      releaseSequenceLabel: formatCountLabel(releases.length, "fragment in this sequence", "fragments in this sequence"),
      companionLabel: formatCountLabel(Math.max(releases.length - 1, 0), "connected fragment", "connected fragments")
    };
  }

  return {
    featuredContext:
      count <= 1
        ? `This ${itemName.toLowerCase()} is currently carrying the collection on its own.`
        : `The featured ${itemName.toLowerCase()} acts as the clearest entry point into this collection before the rest of the archive opens beneath it.`,
    collectionCountLabel: formatCountLabel(count, `${itemName.toLowerCase()} entry`, `${itemName.toLowerCase()} entries`),
    releaseSequenceLabel: formatCountLabel(count, itemName.toLowerCase(), itemPlural.toLowerCase()),
    companionLabel: formatCountLabel(Math.max(count - 1, 0), `${itemName.toLowerCase()} nearby`, `${itemPlural.toLowerCase()} nearby`),
    worldNote:
      count === 0
        ? `This ${itemName.toLowerCase()} world is still waiting for its first entry.`
        : count === 1
          ? `A single ${itemName.toLowerCase()} can still define the tone of a whole collection.`
          : themeConfig.worldNoteText
  };
}

function fractureverseVisibleCount(releases = []) {
  return Math.max(releases.length - 1, 0);
}

export function sortEldoriaPosts(posts = []) {
  return [...posts].sort((left, right) => {
    const leftMeta = getEldoriaMeta(left);
    const rightMeta = getEldoriaMeta(right);
    const leftIndex = Number(leftMeta?.chapterNumber || 999);
    const rightIndex = Number(rightMeta?.chapterNumber || 999);

    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }

    return String(left?.createdAt || "").localeCompare(String(right?.createdAt || ""));
  });
}

export function getEldoriaMeta(post) {
  const archiveMeta = post?.archiveMeta;

  if (!archiveMeta) {
    return null;
  }

  const chapterNumber = String(archiveMeta.chapterNumber || "").trim();
  const entryType = String(archiveMeta.entryType || "").trim();
  const subtitle = String(archiveMeta.subtitle || "").trim();
  const openingPassage = String(archiveMeta.openingPassage || "").trim();
  const coreSituation = String(archiveMeta.coreSituation || "").trim();
  const coreTension = String(archiveMeta.coreTension || "").trim();
  const chronicleObservation = String(archiveMeta.chronicleObservation || "").trim();
  const chronicleContradiction = String(archiveMeta.chronicleContradiction || "").trim();
  const chronicleConclusion = String(archiveMeta.chronicleConclusion || "").trim();
  const emotionalState = String(archiveMeta.emotionalState || "").trim();
  const coreConflict = String(archiveMeta.coreConflict || "").trim();
  const risk = String(archiveMeta.risk || "").trim();
  const anchorQuote = String(archiveMeta.anchorQuote || "").trim();
  const resolution = String(archiveMeta.resolution || "").trim();
  const entryStatus = String(archiveMeta.entryStatus || "").trim();
  const playerFlavorLine = String(archiveMeta.playerFlavorLine || "").trim();
  const hasEldoriaData = [
    chapterNumber,
    entryType,
    subtitle,
    openingPassage,
    coreSituation,
    coreTension,
    chronicleObservation,
    chronicleContradiction,
    chronicleConclusion,
    emotionalState,
    coreConflict,
    risk,
    anchorQuote,
    resolution,
    entryStatus,
    playerFlavorLine
  ].some(Boolean);

  if (!hasEldoriaData) {
    return null;
  }

  const chapterNumeral = toRoman(chapterNumber);

  return {
    chapterNumber,
    chapterNumeral,
    chapterLabel: chapterNumeral ? `Chapter ${chapterNumeral}` : "",
    identityLine: [chapterNumeral ? `CHAPTER ${chapterNumeral}` : "", entryType.toUpperCase(), "ELDORIA"].filter(Boolean).join(" / "),
    entryType,
    subtitle,
    openingPassage,
    coreSituation,
    coreTension,
    chronicleObservation,
    chronicleContradiction,
    chronicleConclusion,
    emotionalState,
    coreConflict,
    risk,
    anchorQuote,
    resolution,
    entryStatus,
    playerFlavorLine
  };
}

export function getEldoriaMapEntries(posts = [], currentSlug = "") {
  const sortedPosts = sortEldoriaPosts(posts);
  const unlockedCount = Math.max(sortedPosts.length, 1);

  return Object.entries(ELDORIA_MAP_LAYOUT).map(([chapterNumber, layout]) => {
    const post = sortedPosts.find((entry) => String(getEldoriaMeta(entry)?.chapterNumber || "") === chapterNumber) || null;
    const meta = getEldoriaMeta(post);
    const chapterIndex = Number(chapterNumber);
    const isUnlocked = chapterIndex <= unlockedCount;
    const isActive = currentSlug
      ? post?.slug === currentSlug
      : chapterIndex === 1 || post?.slug === sortedPosts[0]?.slug;

    return {
      id: post?.id || `eldoria-map-${chapterNumber}`,
      route: post ? `/release/${post.slug}` : "",
      slug: post?.slug || "",
      chapterNumber,
      chapterLabel: meta?.chapterLabel || `Chapter ${toRoman(chapterNumber)}`,
      title: post?.title || layout.mapTitle,
      subtitle: meta?.subtitle || layout.mapSubtitle,
      mapTitle: layout.mapTitle,
      mapSubtitle: layout.mapSubtitle,
      emotionalState: meta?.emotionalState || (isUnlocked ? "World state still forming" : "Yet to be revealed"),
      status: isActive ? "active" : isUnlocked ? "unlocked" : "locked",
      type: layout.type,
      region: layout.region,
      stateLabel: layout.stateLabel,
      x: layout.x,
      y: layout.y,
      svgX: layout.svgX,
      svgY: layout.svgY,
      post,
      meta
    };
  });
}
