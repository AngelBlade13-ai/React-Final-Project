const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const config = require("../config");

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

async function ensureStore() {
  await fs.mkdir(path.dirname(config.postsFile), { recursive: true });
  try {
    await fs.access(config.postsFile);
  } catch {
    await fs.writeFile(
      config.postsFile,
      JSON.stringify({ posts: seedPosts, collections: seedCollections, siteContent: seedSiteContent }, null, 2)
    );
  }
}

function normalizeCollection(collection) {
  if (!collection) {
    return null;
  }

  return {
    id: collection.id || crypto.randomUUID(),
    slug: String(collection.slug || "").trim(),
    title: String(collection.title || "").trim(),
    description: String(collection.description || "").trim(),
    featuredReleaseSlug: String(collection.featuredReleaseSlug || "").trim(),
    theme: String(collection.theme || "").trim()
  };
}

function normalizeArchiveMeta(archiveMeta) {
  if (!archiveMeta || typeof archiveMeta !== "object") {
    return null;
  }

  const normalized = {
    fragmentId: String(archiveMeta.fragmentId || "").trim(),
    state: String(archiveMeta.state || "").trim(),
    perspective: String(archiveMeta.perspective || "").trim(),
    signalType: String(archiveMeta.signalType || "").trim(),
    description: String(archiveMeta.description || "").trim(),
    systemNote: String(archiveMeta.systemNote || "").trim(),
    linkedSlugs: Array.isArray(archiveMeta.linkedSlugs)
      ? [...new Set(archiveMeta.linkedSlugs.map((slug) => String(slug).trim()).filter(Boolean))]
      : [],
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

  if (
    !normalized.fragmentId &&
    !normalized.state &&
    !normalized.perspective &&
    !normalized.signalType &&
    !normalized.description &&
    !normalized.systemNote &&
    normalized.linkedSlugs.length === 0 &&
    !normalized.chapterNumber &&
    !normalized.entryType &&
    !normalized.subtitle &&
    !normalized.openingPassage &&
    !normalized.coreSituation &&
    !normalized.coreTension &&
    !normalized.chronicleObservation &&
    !normalized.chronicleContradiction &&
    !normalized.chronicleConclusion &&
    !normalized.emotionalState &&
    !normalized.coreConflict &&
    !normalized.risk &&
    !normalized.anchorQuote &&
    !normalized.resolution &&
    !normalized.entryStatus &&
    !normalized.playerFlavorLine
  ) {
    return null;
  }

  return normalized;
}

function normalizePost(post) {
  if (!post) {
    return null;
  }

  return {
    ...post,
    lyrics: post.lyrics || "",
    archiveMeta: normalizeArchiveMeta(post.archiveMeta),
    collectionSlugs: Array.isArray(post.collectionSlugs)
      ? [...new Set(post.collectionSlugs.map((slug) => String(slug).trim()).filter(Boolean))]
      : []
  };
}

async function readStore() {
  await ensureStore();
  const file = await fs.readFile(config.postsFile, "utf8");
  const data = JSON.parse(file);

  return {
    posts: Array.isArray(data.posts) ? data.posts.map(normalizePost).filter(Boolean) : [],
    collections: Array.isArray(data.collections)
      ? data.collections.map(normalizeCollection).filter(Boolean)
      : [],
    siteContent: {
      about: {
        ...seedSiteContent.about,
        ...(data.siteContent?.about || {})
      }
    }
  };
}

async function writeStore(store) {
  await ensureStore();

  const nextStore = {
    posts: Array.isArray(store.posts) ? store.posts.map(normalizePost).filter(Boolean) : [],
    collections: Array.isArray(store.collections)
      ? store.collections.map(normalizeCollection).filter(Boolean)
      : [],
    siteContent: {
      about: {
        ...seedSiteContent.about,
        ...(store.siteContent?.about || {})
      }
    }
  };

  await fs.writeFile(config.postsFile, JSON.stringify(nextStore, null, 2));
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

module.exports = {
  readStore,
  writeStore,
  readPosts,
  writePosts,
  readCollections,
  writeCollections
};
