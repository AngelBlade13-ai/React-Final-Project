const fs = require("fs/promises");
const crypto = require("crypto");
const { getDb } = require("../lib/mongo");
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

const seedUsers = [];
const seedComments = [];

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

  return {
    ...post,
    id: post.id || crypto.randomUUID(),
    title: String(post.title || "").trim(),
    slug: String(post.slug || "").trim(),
    videoUrl: String(post.videoUrl || "").trim(),
    excerpt: String(post.excerpt || "").trim(),
    content: String(post.content || "").trim(),
    lyrics: typeof post.lyrics === "string" ? post.lyrics : "",
    createdAt: post.createdAt || new Date().toISOString(),
    published: Boolean(post.published),
    archiveMeta: normalizeArchiveMeta(post.archiveMeta),
    collectionSlugs: Array.isArray(post.collectionSlugs)
      ? [...new Set(post.collectionSlugs.map((slug) => String(slug).trim()).filter(Boolean))]
      : []
  };
}

function normalizeSiteContent(siteContent = {}) {
  return {
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
      posts: Array.isArray(data.posts) ? data.posts.map(normalizePost).filter(Boolean) : seedPosts.map(normalizePost),
      collections: Array.isArray(data.collections)
        ? data.collections.map(normalizeCollection).filter(Boolean)
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
