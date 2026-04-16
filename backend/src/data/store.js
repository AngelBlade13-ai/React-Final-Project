const fs = require("fs/promises");
const crypto = require("crypto");
const { getDb } = require("../lib/mongo");
const config = require("../config");
const { slugify } = require("../utils/slugify");
const VALID_RELEASE_STATUSES = new Set(["canon", "alternate", "working"]);

const seedCollections = [
  {
    id: crypto.randomUUID(),
    slug: "main-verse",
    title: "Main Verse",
    description: "Core releases that define the emotional center of the site.",
    featuredReleaseSlug: "beautiful-and-real-sunshine",
    theme: ""
  },
  {
    id: crypto.randomUUID(),
    slug: "late-night-drafts",
    title: "Late Night Drafts",
    description: "Songs that feel like notebook pages, unfinished thoughts, and after-hours sketches.",
    featuredReleaseSlug: "second-window",
    theme: ""
  },
  {
    id: crypto.randomUUID(),
    slug: "cinematic-pop",
    title: "Cinematic Pop",
    description: "Big hooks, widescreen emotion, and music built to feel like motion.",
    featuredReleaseSlug: "beautiful-and-real-sunshine",
    theme: ""
  }
];

const seedPosts = [
  {
    id: crypto.randomUUID(),
    title: "Beautiful & Real Sunshine",
    slug: "beautiful-and-real-sunshine",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    excerpt: "A first release post with the song video, a short note, and room for the lyrics that shaped it.",
    content:
      "This is the release format going forward: one entry per song, a short written note, and the video at the center of the post.",
    lyrics: "You can add full lyrics here whenever a song needs them.",
    createdAt: "2026-03-17T00:00:00.000Z",
    published: true,
    collectionSlugs: ["main-verse", "cinematic-pop"]
  },
  {
    id: crypto.randomUUID(),
    title: "Second Window",
    slug: "second-window",
    videoUrl: "https://www.w3schools.com/html/movie.mp4",
    excerpt: "A quieter draft kept in the dashboard until the post is ready to go live.",
    content:
      "Draft posts stay simple too. Add the video, write the release note, optionally paste lyrics, and publish when it feels finished.",
    lyrics: "",
    createdAt: "2026-03-18T00:00:00.000Z",
    published: false,
    collectionSlugs: ["late-night-drafts"]
  }
];

const seedSiteContent = {
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
  collectionThemes: [
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
  ],
  about: {
    heroEyebrow: "About",
    heroTitle: "A small artist archive for releases that want more room than a single post can hold.",
    heroText:
      "The site is part release feed, part notebook, part identity statement: a place where the songs, their notes, and the worlds around them can stay connected.",
    artistEyebrow: "The Artist",
    artistTitle: "Emotion first, then atmosphere, then the details that make a release feel lived in.",
    artistText:
      "This archive frames the artist as someone building songs through feeling, imagery, and narrative context. The music leans toward cinematic emotion, reflective notes, and releases that carry a clear inner voice.",
    siteEyebrow: "The Site",
    siteTitle: "Built for listening, reading, and finding connections between songs.",
    siteText:
      "Release pages keep the music close. Collections create repeatable paths through the catalog. Explore turns the written notes into something searchable. Together they make the archive feel intentional instead of accidental.",
    quoteEyebrow: "Why It Exists",
    quoteTitle: "Some songs need a room around them.",
    quoteText:
      "This site gives each release its own atmosphere, then links those atmospheres together into a larger story."
  }
};

const seedUsers = [];
const seedComments = [];

function normalizeCollection(collection) {
  if (!collection) {
    return null;
  }

  const fallbackSlug = slugify(collection.title || "");

  return {
    id: String(collection.id || `col-${collection.slug || fallbackSlug}` || crypto.randomUUID()).trim(),
    slug: String(collection.slug || fallbackSlug).trim(),
    title: String(collection.title || "").trim(),
    description: String(collection.description || "").trim(),
    featuredReleaseSlug: String(collection.featuredReleaseSlug || "").trim(),
    theme: String(collection.theme || "").trim(),
    isPublicPrimary: Boolean(collection.isPublicPrimary)
  };
}

function extractMarkdownField(content, label) {
  const normalizedContent = String(content || "");
  const pattern = new RegExp(`\\*\\*${label}:\\*\\*\\s*([^\\n]+)`, "i");
  const match = normalizedContent.match(pattern);
  return String(match?.[1] || "").trim();
}

function getUniqueValue(candidates, usedValues, fallbackBase) {
  const normalizedCandidates = [...new Set(candidates.map((value) => String(value || "").trim()).filter(Boolean))];

  for (const candidate of normalizedCandidates) {
    if (!usedValues.has(candidate)) {
      usedValues.add(candidate);
      return candidate;
    }
  }

  const baseValue = normalizedCandidates[0] || String(fallbackBase || "").trim() || crypto.randomUUID();

  if (!usedValues.has(baseValue)) {
    usedValues.add(baseValue);
    return baseValue;
  }

  let counter = 2;
  let nextValue = `${baseValue}-${counter}`;

  while (usedValues.has(nextValue)) {
    counter += 1;
    nextValue = `${baseValue}-${counter}`;
  }

  usedValues.add(nextValue);
  return nextValue;
}

function normalizeImportedPosts(posts = []) {
  const usedIds = new Set();
  const usedSlugs = new Set();

  return posts.map((post, index) => {
    const title = String(post?.title || "").trim();
    const titleSlug = slugify(title);
    const explicitSlug = String(post?.slug || "").trim();
    const versionLabel = extractMarkdownField(post?.content, "Version");
    const versionSlug = slugify(versionLabel);
    const sourceId = String(post?.sourceId || post?.id || "").trim();
    const sourceSlug = slugify(sourceId);

    const slug = getUniqueValue(
      [
        explicitSlug,
        titleSlug,
        titleSlug && versionSlug ? `${titleSlug}-${versionSlug}` : "",
        titleSlug && sourceSlug ? `${titleSlug}-${sourceSlug}` : "",
        sourceSlug
      ],
      usedSlugs,
      `post-${index + 1}`
    );

    const id = getUniqueValue(
      [
        String(post?.id || "").trim(),
        sourceId,
        sourceId && versionSlug ? `${sourceId}-${versionSlug}` : "",
        slug
      ],
      usedIds,
      `post-${index + 1}`
    );

    return normalizePost({
      ...post,
      id,
      slug
    });
  });
}

function normalizeImportedCollections(collections = []) {
  return collections.map((collection) => {
    const slug = String(collection?.slug || slugify(collection?.title || "")).trim();

    return normalizeCollection({
      ...collection,
      id: String(collection?.id || `col-${slug}`).trim(),
      slug
    });
  }).filter(Boolean);
}

function normalizeArchiveMeta(archiveMeta) {
  if (!archiveMeta || typeof archiveMeta !== "object") {
    return null;
  }

  const fractureMeta = {
    fragmentId: String(archiveMeta.fragmentId || "").trim(),
    state: String(archiveMeta.state || "").trim(),
    perspective: String(archiveMeta.perspective || "").trim(),
    signalType: String(archiveMeta.signalType || "").trim(),
    description: String(archiveMeta.description || "").trim(),
    systemNote: String(archiveMeta.systemNote || "").trim(),
    linkedSlugs: Array.isArray(archiveMeta.linkedSlugs)
      ? [...new Set(archiveMeta.linkedSlugs.map((slug) => String(slug).trim()).filter(Boolean))]
      : [],
  };

  const eldoriaMeta = {
    chapterNumber: String(archiveMeta.chapterNumber || "").trim(),
    entryType: String(archiveMeta.entryType || "").trim(),
    subtitle: String(archiveMeta.subtitle || "").trim(),
    openingPassage: String(archiveMeta.openingPassage || "").trim(),
    coreSituation: String(archiveMeta.coreSituation || "").trim(),
    coreTension: String(archiveMeta.coreTension || "").trim(),
    chronicleObservation: String(archiveMeta.chronicleObservation || "").trim(),
    chronicleContradiction: String(archiveMeta.chronicleContradiction || "").trim(),
    chronicleConclusion: String(archiveMeta.chronicleConclusion || "").trim(),
    emotionalState: String(archiveMeta.emotionalState || "").trim(),
    coreConflict: String(archiveMeta.coreConflict || "").trim(),
    risk: String(archiveMeta.risk || "").trim(),
    anchorQuote: String(archiveMeta.anchorQuote || "").trim(),
    resolution: String(archiveMeta.resolution || "").trim(),
    entryStatus: String(archiveMeta.entryStatus || "").trim(),
    playerFlavorLine: String(archiveMeta.playerFlavorLine || "").trim()
  };

  const hasFractureMeta =
    !!fractureMeta.fragmentId ||
    !!fractureMeta.state ||
    !!fractureMeta.perspective ||
    !!fractureMeta.signalType ||
    !!fractureMeta.description ||
    !!fractureMeta.systemNote ||
    fractureMeta.linkedSlugs.length > 0;

  const hasEldoriaMeta =
    !!eldoriaMeta.chapterNumber ||
    !!eldoriaMeta.entryType ||
    !!eldoriaMeta.subtitle ||
    !!eldoriaMeta.openingPassage ||
    !!eldoriaMeta.coreSituation ||
    !!eldoriaMeta.coreTension ||
    !!eldoriaMeta.chronicleObservation ||
    !!eldoriaMeta.chronicleContradiction ||
    !!eldoriaMeta.chronicleConclusion ||
    !!eldoriaMeta.emotionalState ||
    !!eldoriaMeta.coreConflict ||
    !!eldoriaMeta.risk ||
    !!eldoriaMeta.anchorQuote ||
    !!eldoriaMeta.resolution ||
    !!eldoriaMeta.entryStatus ||
    !!eldoriaMeta.playerFlavorLine;

  if (!hasFractureMeta && !hasEldoriaMeta) {
    return null;
  }

  return {
    ...(hasFractureMeta ? fractureMeta : {}),
    ...(hasEldoriaMeta ? eldoriaMeta : {})
  };
}

function normalizePost(post) {
  if (!post) {
    return null;
  }

  const fallbackTitleSlug = slugify(post.title || "");

  return {
    ...post,
    id: String(post.id || post.sourceId || fallbackTitleSlug || crypto.randomUUID()).trim(),
    title: String(post.title || "").trim(),
    slug: String(post.slug || fallbackTitleSlug).trim(),
    videoUrl: String(post.videoUrl || "").trim(),
    excerpt: String(post.excerpt || "").trim(),
    content: String(post.content || "").trim(),
    lyrics: typeof post.lyrics === "string" ? post.lyrics : "",
    createdAt: post.createdAt || new Date().toISOString(),
    published: Boolean(post.published),
    archiveMeta: normalizeArchiveMeta(post.archiveMeta),
    subCategory: String(post.subCategory || "").trim(),
    sourceTag: String(post.sourceTag || "").trim(),
    worldLayer: String(post.worldLayer || "").trim(),
    themeTags: Array.isArray(post.themeTags)
      ? [...new Set(post.themeTags.map((tag) => String(tag).trim()).filter(Boolean))]
      : [],
    versionFamily: String(post.versionFamily || "").trim(),
    isPrimaryVersion: Boolean(post.isPrimaryVersion),
    isArchive: Boolean(post.isArchive),
    isHomepageEligible: Boolean(post.isHomepageEligible),
    isPubliclyVisible: typeof post.isPubliclyVisible === "boolean" ? post.isPubliclyVisible : true,
    supersededBySlug: String(post.supersededBySlug || "").trim(),
    supersededReason: String(post.supersededReason || "").trim(),
    supersededAt: String(post.supersededAt || "").trim(),
    releaseStatus: VALID_RELEASE_STATUSES.has(String(post.releaseStatus || "").trim().toLowerCase())
      ? String(post.releaseStatus || "").trim().toLowerCase()
      : "canon",
    collectionSlugs: Array.isArray(post.collectionSlugs)
      ? [...new Set(post.collectionSlugs.map((slug) => String(slug).trim()).filter(Boolean))]
      : []
  };
}

function normalizeSiteContent(siteContent = {}) {
  return {
    branding: {
      ...seedSiteContent.branding,
      ...(siteContent.branding || {})
    },
    home: {
      ...seedSiteContent.home,
      ...(siteContent.home || {})
    },
    collectionThemes: Array.isArray(siteContent.collectionThemes)
      ? siteContent.collectionThemes.map((theme) => ({
          ...theme,
          key: String(theme?.key || "").trim(),
          label: String(theme?.label || "").trim(),
          kind: String(theme?.kind || "standard").trim() || "standard",
          worldEyebrow: String(theme?.worldEyebrow || "").trim(),
          featuredLabel: String(theme?.featuredLabel || "").trim(),
          featuredAction: String(theme?.featuredAction || "").trim(),
          listLabel: String(theme?.listLabel || "").trim(),
          worldNoteTitle: String(theme?.worldNoteTitle || "").trim(),
          worldNoteText: String(theme?.worldNoteText || "").trim(),
          itemName: String(theme?.itemName || "").trim(),
          itemPlural: String(theme?.itemPlural || "").trim(),
          itemAction: String(theme?.itemAction || "").trim(),
          playerLabel: String(theme?.playerLabel || "").trim(),
          playerUpNextLabel: String(theme?.playerUpNextLabel || "").trim(),
          palette: {
            light: {
              background: String(theme?.palette?.light?.background || "").trim(),
              surface: String(theme?.palette?.light?.surface || "").trim(),
              surfaceAlt: String(theme?.palette?.light?.surfaceAlt || "").trim(),
              text: String(theme?.palette?.light?.text || "").trim(),
              mutedText: String(theme?.palette?.light?.mutedText || "").trim(),
              border: String(theme?.palette?.light?.border || "").trim(),
              primary: String(theme?.palette?.light?.primary || "").trim(),
              primaryStrong: String(theme?.palette?.light?.primaryStrong || "").trim(),
              secondary: String(theme?.palette?.light?.secondary || "").trim()
            },
            dark: {
              background: String(theme?.palette?.dark?.background || "").trim(),
              surface: String(theme?.palette?.dark?.surface || "").trim(),
              surfaceAlt: String(theme?.palette?.dark?.surfaceAlt || "").trim(),
              text: String(theme?.palette?.dark?.text || "").trim(),
              mutedText: String(theme?.palette?.dark?.mutedText || "").trim(),
              border: String(theme?.palette?.dark?.border || "").trim(),
              primary: String(theme?.palette?.dark?.primary || "").trim(),
              primaryStrong: String(theme?.palette?.dark?.primaryStrong || "").trim(),
              secondary: String(theme?.palette?.dark?.secondary || "").trim()
            }
          }
        })).filter((theme) => theme.key)
      : seedSiteContent.collectionThemes.map((theme) => ({ ...theme })),
    about: {
      ...seedSiteContent.about,
      ...(siteContent.about || {})
    }
  };
}

function normalizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id || crypto.randomUUID(),
    email: String(user.email || "").trim().toLowerCase(),
    displayName: String(user.displayName || "").trim(),
    passwordHash: String(user.passwordHash || "").trim(),
    role: String(user.role || "user").trim() || "user",
    status: String(user.status || "active").trim() || "active",
    createdAt: user.createdAt || new Date().toISOString(),
    updatedAt: user.updatedAt || user.createdAt || new Date().toISOString()
  };
}

function normalizeComment(comment) {
  if (!comment) {
    return null;
  }

  return {
    id: comment.id || crypto.randomUUID(),
    postSlug: String(comment.postSlug || "").trim(),
    authorId: String(comment.authorId || "").trim(),
    body: String(comment.body || "").trim(),
    status: String(comment.status || "visible").trim() || "visible",
    createdAt: comment.createdAt || new Date().toISOString(),
    updatedAt: comment.updatedAt || comment.createdAt || new Date().toISOString()
  };
}

function sanitizeDoc(doc) {
  if (!doc) {
    return null;
  }

  const { _id, ...rest } = doc;
  return rest;
}

async function readLegacySeed() {
  try {
    const file = await fs.readFile(config.postsFile, "utf8");
    const data = JSON.parse(file);

    return {
      posts: Array.isArray(data.posts) ? normalizeImportedPosts(data.posts) : seedPosts.map(normalizePost),
      collections: Array.isArray(data.collections)
        ? normalizeImportedCollections(data.collections)
        : seedCollections.map(normalizeCollection),
      users: Array.isArray(data.users) ? data.users.map(normalizeUser).filter(Boolean) : seedUsers.map(normalizeUser),
      comments: Array.isArray(data.comments) ? data.comments.map(normalizeComment).filter(Boolean) : seedComments.map(normalizeComment),
      siteContent: normalizeSiteContent(data.siteContent)
    };
  } catch {
    return {
      posts: seedPosts.map(normalizePost),
      collections: seedCollections.map(normalizeCollection),
      users: seedUsers.map(normalizeUser),
      comments: seedComments.map(normalizeComment),
      siteContent: normalizeSiteContent(seedSiteContent)
    };
  }
}

async function ensureStore() {
  const db = getDb();
  const postsCollection = db.collection("posts");
  const collectionsCollection = db.collection("collections");
  const siteContentCollection = db.collection("siteContent");

  await Promise.all([
    postsCollection.createIndex({ id: 1 }, { unique: true }),
    postsCollection.createIndex({ slug: 1 }, { unique: true }),
    collectionsCollection.createIndex({ id: 1 }, { unique: true }),
    collectionsCollection.createIndex({ slug: 1 }, { unique: true }),
    db.collection("users").createIndex({ id: 1 }, { unique: true }),
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("comments").createIndex({ id: 1 }, { unique: true }),
    db.collection("comments").createIndex({ postSlug: 1, status: 1, createdAt: -1 }),
    db.collection("comments").createIndex({ authorId: 1, createdAt: -1 }),
    siteContentCollection.createIndex({ key: 1 }, { unique: true })
  ]);

  const [postCount, collectionCount, userCount, commentCount, siteContentCount] = await Promise.all([
    postsCollection.countDocuments(),
    collectionsCollection.countDocuments(),
    db.collection("users").countDocuments(),
    db.collection("comments").countDocuments(),
    siteContentCollection.countDocuments()
  ]);

  if (postCount || collectionCount || userCount || commentCount || siteContentCount) {
    return;
  }

  const seed = await readLegacySeed();

  if (seed.posts.length) {
    await postsCollection.insertMany(seed.posts);
  }

  if (seed.collections.length) {
    await collectionsCollection.insertMany(seed.collections);
  }

  if (seed.users.length) {
    await db.collection("users").insertMany(seed.users);
  }

  if (seed.comments.length) {
    await db.collection("comments").insertMany(seed.comments);
  }

  await siteContentCollection.insertOne({
    key: "siteContent",
    ...normalizeSiteContent(seed.siteContent)
  });
}

async function readStore() {
  await ensureStore();
  const db = getDb();

  const [posts, collections, users, comments, siteContentDoc] = await Promise.all([
    db.collection("posts").find({}).sort({ createdAt: -1, _id: -1 }).toArray(),
    db.collection("collections").find({}).sort({ title: 1, _id: 1 }).toArray(),
    db.collection("users").find({}).sort({ createdAt: 1, _id: 1 }).toArray(),
    db.collection("comments").find({}).sort({ createdAt: -1, _id: -1 }).toArray(),
    db.collection("siteContent").findOne({ key: "siteContent" })
  ]);

  return {
    posts: posts.map(sanitizeDoc).map(normalizePost).filter(Boolean),
    collections: collections.map(sanitizeDoc).map(normalizeCollection).filter(Boolean),
    users: users.map(sanitizeDoc).map(normalizeUser).filter(Boolean),
    comments: comments.map(sanitizeDoc).map(normalizeComment).filter(Boolean),
    siteContent: normalizeSiteContent(sanitizeDoc(siteContentDoc))
  };
}

async function writeStore(store) {
  await ensureStore();
  const db = getDb();
  const posts = Array.isArray(store.posts) ? store.posts.map(normalizePost).filter(Boolean) : [];
  const collections = Array.isArray(store.collections) ? store.collections.map(normalizeCollection).filter(Boolean) : [];
  const users = Array.isArray(store.users) ? store.users.map(normalizeUser).filter(Boolean) : [];
  const comments = Array.isArray(store.comments) ? store.comments.map(normalizeComment).filter(Boolean) : [];
  const siteContent = normalizeSiteContent(store.siteContent);

  await Promise.all([
    db.collection("posts").deleteMany({}),
    db.collection("collections").deleteMany({})
  ]);

  if (posts.length) {
    await db.collection("posts").insertMany(posts);
  }

  if (collections.length) {
    await db.collection("collections").insertMany(collections);
  }

  await Promise.all([
    db.collection("users").deleteMany({}),
    db.collection("comments").deleteMany({})
  ]);

  if (users.length) {
    await db.collection("users").insertMany(users);
  }

  if (comments.length) {
    await db.collection("comments").insertMany(comments);
  }

  await db.collection("siteContent").updateOne(
    { key: "siteContent" },
    { $set: { key: "siteContent", ...siteContent } },
    { upsert: true }
  );
}

async function readPosts() {
  const store = await readStore();
  return store.posts;
}

async function writePosts(posts) {
  const store = await readStore();
  await writeStore({ ...store, posts });
}

async function readCollections() {
  const store = await readStore();
  return store.collections;
}

async function writeCollections(collections) {
  const store = await readStore();
  await writeStore({ ...store, collections });
}

async function readUsers() {
  const store = await readStore();
  return store.users;
}

async function writeUsers(users) {
  const store = await readStore();
  await writeStore({ ...store, users });
}

async function readComments() {
  const store = await readStore();
  return store.comments;
}

async function writeComments(comments) {
  const store = await readStore();
  await writeStore({ ...store, comments });
}

module.exports = {
  ensureStore,
  readLegacySeed,
  readStore,
  writeStore,
  readPosts,
  writePosts,
  readCollections,
  writeCollections,
  readUsers,
  writeUsers,
  readComments,
  writeComments
};
