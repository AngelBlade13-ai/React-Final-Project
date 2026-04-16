const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");
const config = require("./config");
const { authenticate, requireAdmin, requireUser } = require("./middleware/auth");
const { readStore, writeStore } = require("./data/store");
const { buildArchiveInsights } = require("./services/archiveInsights");
const { slugify } = require("./utils/slugify");
const uploadRoutes = require("./routes/upload.routes");

const app = express();
const PUBLIC_PRIMARY_COLLECTION_SLUGS = ["fractureverse", "eldoria", "original-personal", "standalone"];
const VALID_RELEASE_STATUSES = new Set(["canon", "alternate", "working"]);
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts. Try again later." }
});
const userAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many authentication attempts. Try again later." }
});
const commentWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many comment actions. Try again later." }
});

app.disable("x-powered-by");
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(
  cors({
    origin: config.clientUrl
  })
);
app.use(express.json());
app.use("/api/uploads", uploadRoutes);

function normalizeCollectionInput(input, existingCollection = {}) {
  return {
    ...existingCollection,
    title: String(input.title || existingCollection.title || "").trim(),
    slug: slugify(input.slug || input.title || existingCollection.slug || existingCollection.title || ""),
    description: String(input.description || existingCollection.description || "").trim(),
    featuredReleaseSlug: String(input.featuredReleaseSlug || "").trim(),
    theme: String(input.theme || existingCollection.theme || "").trim(),
    isPublicPrimary:
      typeof input.isPublicPrimary === "boolean"
        ? input.isPublicPrimary
        : typeof existingCollection.isPublicPrimary === "boolean"
          ? existingCollection.isPublicPrimary
          : false
  };
}

function normalizeArchiveMetaInput(input = {}, existingArchiveMeta = null) {
  const normalizedInput = input && typeof input === "object" ? input : {};

  const archiveMeta = {
    ...(existingArchiveMeta || {}),
    fragmentId: String(normalizedInput.fragmentId || existingArchiveMeta?.fragmentId || "").trim(),
    state: String(normalizedInput.state || existingArchiveMeta?.state || "").trim(),
    perspective: String(normalizedInput.perspective || existingArchiveMeta?.perspective || "").trim(),
    signalType: String(normalizedInput.signalType || existingArchiveMeta?.signalType || "").trim(),
    description: String(normalizedInput.description || existingArchiveMeta?.description || "").trim(),
    systemNote: String(normalizedInput.systemNote || existingArchiveMeta?.systemNote || "").trim(),
    linkedSlugs: Array.isArray(normalizedInput.linkedSlugs)
      ? [...new Set(normalizedInput.linkedSlugs.map((slug) => String(slug).trim()).filter(Boolean))]
      : existingArchiveMeta?.linkedSlugs || [],
    chapterNumber: String(normalizedInput.chapterNumber || existingArchiveMeta?.chapterNumber || "").trim(),
    entryType: String(normalizedInput.entryType || existingArchiveMeta?.entryType || "").trim(),
    subtitle: String(normalizedInput.subtitle || existingArchiveMeta?.subtitle || "").trim(),
    openingPassage: String(normalizedInput.openingPassage || existingArchiveMeta?.openingPassage || "").trim(),
    coreSituation: String(normalizedInput.coreSituation || existingArchiveMeta?.coreSituation || "").trim(),
    coreTension: String(normalizedInput.coreTension || existingArchiveMeta?.coreTension || "").trim(),
    chronicleObservation: String(normalizedInput.chronicleObservation || existingArchiveMeta?.chronicleObservation || "").trim(),
    chronicleContradiction: String(normalizedInput.chronicleContradiction || existingArchiveMeta?.chronicleContradiction || "").trim(),
    chronicleConclusion: String(normalizedInput.chronicleConclusion || existingArchiveMeta?.chronicleConclusion || "").trim(),
    emotionalState: String(normalizedInput.emotionalState || existingArchiveMeta?.emotionalState || "").trim(),
    coreConflict: String(normalizedInput.coreConflict || existingArchiveMeta?.coreConflict || "").trim(),
    risk: String(normalizedInput.risk || existingArchiveMeta?.risk || "").trim(),
    anchorQuote: String(normalizedInput.anchorQuote || existingArchiveMeta?.anchorQuote || "").trim(),
    resolution: String(normalizedInput.resolution || existingArchiveMeta?.resolution || "").trim(),
    entryStatus: String(normalizedInput.entryStatus || existingArchiveMeta?.entryStatus || "").trim(),
    playerFlavorLine: String(normalizedInput.playerFlavorLine || existingArchiveMeta?.playerFlavorLine || "").trim()
  };

  if (
    !archiveMeta.fragmentId &&
    !archiveMeta.state &&
    !archiveMeta.perspective &&
    !archiveMeta.signalType &&
    !archiveMeta.description &&
    !archiveMeta.systemNote &&
    archiveMeta.linkedSlugs.length === 0 &&
    !archiveMeta.chapterNumber &&
    !archiveMeta.entryType &&
    !archiveMeta.subtitle &&
    !archiveMeta.openingPassage &&
    !archiveMeta.coreSituation &&
    !archiveMeta.coreTension &&
    !archiveMeta.chronicleObservation &&
    !archiveMeta.chronicleContradiction &&
    !archiveMeta.chronicleConclusion &&
    !archiveMeta.emotionalState &&
    !archiveMeta.coreConflict &&
    !archiveMeta.risk &&
    !archiveMeta.anchorQuote &&
    !archiveMeta.resolution &&
    !archiveMeta.entryStatus &&
    !archiveMeta.playerFlavorLine
  ) {
    return null;
  }

  return archiveMeta;
}

function normalizePostInput(input, collections, existingPost = {}) {
  const collectionSlugSet = new Set(collections.map((collection) => collection.slug));
  const requestedCollections = Array.isArray(input.collectionSlugs)
    ? input.collectionSlugs
    : existingPost.collectionSlugs || [];
  const hasVideoUrlInput = typeof input.videoUrl === "string";
  const normalizedTitle = String(input.title || existingPost.title || "").trim();
  const normalizedSlugSource = String(input.slug || "").trim() || normalizedTitle || existingPost.slug || existingPost.title || "";
  const normalizedReleaseStatus = String(input.releaseStatus || existingPost.releaseStatus || "canon").trim().toLowerCase();

  return {
    ...existingPost,
    title: normalizedTitle,
    slug: slugify(normalizedSlugSource),
    videoUrl: hasVideoUrlInput ? input.videoUrl.trim() : String(existingPost.videoUrl || "").trim(),
    excerpt: String(input.excerpt || existingPost.excerpt || "").trim(),
    content: String(input.content || existingPost.content || "").trim(),
    lyrics:
      typeof input.lyrics === "string"
        ? input.lyrics.trim()
        : typeof existingPost.lyrics === "string"
          ? existingPost.lyrics
          : "",
    archiveMeta: normalizeArchiveMetaInput(input.archiveMeta, existingPost.archiveMeta),
    createdAt: existingPost.createdAt || input.createdAt || new Date().toISOString(),
    published: typeof input.published === "boolean" ? input.published : Boolean(existingPost.published),
    collectionSlugs: [...new Set(requestedCollections.map((slug) => String(slug).trim()).filter((slug) => collectionSlugSet.has(slug)))],
    subCategory:
      typeof input.subCategory === "string"
        ? input.subCategory.trim()
        : typeof existingPost.subCategory === "string"
          ? existingPost.subCategory.trim()
          : "",
    sourceTag:
      typeof input.sourceTag === "string"
        ? input.sourceTag.trim()
        : typeof existingPost.sourceTag === "string"
          ? existingPost.sourceTag.trim()
          : "",
    worldLayer:
      typeof input.worldLayer === "string"
        ? input.worldLayer.trim()
        : typeof existingPost.worldLayer === "string"
          ? existingPost.worldLayer.trim()
          : "",
    themeTags: Array.isArray(input.themeTags)
      ? [...new Set(input.themeTags.map((tag) => String(tag).trim()).filter(Boolean))]
      : Array.isArray(existingPost.themeTags)
        ? [...new Set(existingPost.themeTags.map((tag) => String(tag).trim()).filter(Boolean))]
        : [],
    versionFamily:
      typeof input.versionFamily === "string"
        ? input.versionFamily.trim()
        : typeof existingPost.versionFamily === "string"
          ? existingPost.versionFamily.trim()
          : "",
    isPrimaryVersion:
      typeof input.isPrimaryVersion === "boolean" ? input.isPrimaryVersion : Boolean(existingPost.isPrimaryVersion),
    isArchive: typeof input.isArchive === "boolean" ? input.isArchive : Boolean(existingPost.isArchive),
    isHomepageEligible:
      typeof input.isHomepageEligible === "boolean" ? input.isHomepageEligible : Boolean(existingPost.isHomepageEligible),
    isPubliclyVisible:
      typeof input.isPubliclyVisible === "boolean"
        ? input.isPubliclyVisible
        : typeof existingPost.isPubliclyVisible === "boolean"
          ? existingPost.isPubliclyVisible
          : true,
    supersededBySlug:
      typeof input.supersededBySlug === "string"
        ? input.supersededBySlug.trim()
        : typeof existingPost.supersededBySlug === "string"
          ? existingPost.supersededBySlug.trim()
          : "",
    supersededReason:
      typeof input.supersededReason === "string"
        ? input.supersededReason.trim()
        : typeof existingPost.supersededReason === "string"
          ? existingPost.supersededReason.trim()
          : "",
    supersededAt:
      typeof input.supersededAt === "string"
        ? input.supersededAt.trim()
        : typeof existingPost.supersededAt === "string"
          ? existingPost.supersededAt.trim()
          : "",
    releaseStatus: VALID_RELEASE_STATUSES.has(normalizedReleaseStatus) ? normalizedReleaseStatus : "canon"
  };
}

function attachCollectionDetails(post, collections) {
  return {
    ...post,
    collections: collections.filter((collection) => post.collectionSlugs.includes(collection.slug))
  };
}

function buildCollectionSummary(collection, posts) {
  const releases = posts.filter((post) => post.collectionSlugs.includes(collection.slug));
  const featuredRelease = collection.featuredReleaseSlug
    ? releases.find((post) => post.slug === collection.featuredReleaseSlug) || null
    : null;

  return {
    ...collection,
    featuredRelease,
    releaseCount: releases.length
  };
}

function reconcileCollections(collections, posts) {
  return collections.map((collection) => {
    const hasFeaturedRelease =
      collection.featuredReleaseSlug &&
      posts.some((post) => post.collectionSlugs.includes(collection.slug) && post.slug === collection.featuredReleaseSlug);

    return hasFeaturedRelease
      ? collection
      : {
          ...collection,
          featuredReleaseSlug: ""
        };
  });
}

function normalizeAboutContent(input = {}, existingAbout = {}) {
  return {
    heroEyebrow: String(input.heroEyebrow || existingAbout.heroEyebrow || "").trim(),
    heroTitle: String(input.heroTitle || existingAbout.heroTitle || "").trim(),
    heroText: String(input.heroText || existingAbout.heroText || "").trim(),
    artistEyebrow: String(input.artistEyebrow || existingAbout.artistEyebrow || "").trim(),
    artistTitle: String(input.artistTitle || existingAbout.artistTitle || "").trim(),
    artistText: String(input.artistText || existingAbout.artistText || "").trim(),
    siteEyebrow: String(input.siteEyebrow || existingAbout.siteEyebrow || "").trim(),
    siteTitle: String(input.siteTitle || existingAbout.siteTitle || "").trim(),
    siteText: String(input.siteText || existingAbout.siteText || "").trim(),
    quoteEyebrow: String(input.quoteEyebrow || existingAbout.quoteEyebrow || "").trim(),
    quoteTitle: String(input.quoteTitle || existingAbout.quoteTitle || "").trim(),
    quoteText: String(input.quoteText || existingAbout.quoteText || "").trim()
  };
}

function normalizeBrandingContent(input = {}, existingBranding = {}) {
  return {
    siteName: String(input.siteName || existingBranding.siteName || "").trim(),
    siteTagline: String(input.siteTagline || existingBranding.siteTagline || "").trim()
  };
}

function normalizeHomeContent(input = {}, existingHome = {}) {
  return {
    heroEyebrow: String(input.heroEyebrow || existingHome.heroEyebrow || "").trim(),
    heroTitle: String(input.heroTitle || existingHome.heroTitle || "").trim(),
    heroText: String(input.heroText || existingHome.heroText || "").trim(),
    featuredReleaseSlug: String(input.featuredReleaseSlug || existingHome.featuredReleaseSlug || "").trim(),
    featuredCtaLabel: String(input.featuredCtaLabel || existingHome.featuredCtaLabel || "").trim(),
    jumpCtaLabel: String(input.jumpCtaLabel || existingHome.jumpCtaLabel || "").trim(),
    noteEyebrow: String(input.noteEyebrow || existingHome.noteEyebrow || "").trim(),
    noteTitle: String(input.noteTitle || existingHome.noteTitle || "").trim(),
    noteText: String(input.noteText || existingHome.noteText || "").trim(),
    browseEyebrow: String(input.browseEyebrow || existingHome.browseEyebrow || "").trim(),
    browseTitle: String(input.browseTitle || existingHome.browseTitle || "").trim(),
    browseText: String(input.browseText || existingHome.browseText || "").trim(),
    browseLinkLabel: String(input.browseLinkLabel || existingHome.browseLinkLabel || "").trim(),
    exploreEyebrow: String(input.exploreEyebrow || existingHome.exploreEyebrow || "").trim(),
    exploreTitle: String(input.exploreTitle || existingHome.exploreTitle || "").trim(),
    exploreText: String(input.exploreText || existingHome.exploreText || "").trim(),
    exploreLinkLabel: String(input.exploreLinkLabel || existingHome.exploreLinkLabel || "").trim(),
    identityEyebrow: String(input.identityEyebrow || existingHome.identityEyebrow || "").trim(),
    identityTitle: String(input.identityTitle || existingHome.identityTitle || "").trim(),
    identityText: String(input.identityText || existingHome.identityText || "").trim(),
    identityLine: String(input.identityLine || existingHome.identityLine || "").trim()
  };
}

function normalizeThemeProfileInput(input = {}, existingTheme = {}) {
  return {
    ...existingTheme,
    key: slugify(input.key || existingTheme.key || ""),
    label: String(input.label || existingTheme.label || "").trim(),
    kind: String(input.kind || existingTheme.kind || "standard").trim() || "standard",
    worldEyebrow: String(input.worldEyebrow || existingTheme.worldEyebrow || "").trim(),
    featuredLabel: String(input.featuredLabel || existingTheme.featuredLabel || "").trim(),
    featuredAction: String(input.featuredAction || existingTheme.featuredAction || "").trim(),
    listLabel: String(input.listLabel || existingTheme.listLabel || "").trim(),
    worldNoteTitle: String(input.worldNoteTitle || existingTheme.worldNoteTitle || "").trim(),
    worldNoteText: String(input.worldNoteText || existingTheme.worldNoteText || "").trim(),
    itemName: String(input.itemName || existingTheme.itemName || "").trim(),
    itemPlural: String(input.itemPlural || existingTheme.itemPlural || "").trim(),
    itemAction: String(input.itemAction || existingTheme.itemAction || "").trim(),
    playerLabel: String(input.playerLabel || existingTheme.playerLabel || "").trim(),
    playerUpNextLabel: String(input.playerUpNextLabel || existingTheme.playerUpNextLabel || "").trim(),
    palette: {
      light: {
        background: String(input.palette?.light?.background || existingTheme.palette?.light?.background || "").trim(),
        surface: String(input.palette?.light?.surface || existingTheme.palette?.light?.surface || "").trim(),
        surfaceAlt: String(input.palette?.light?.surfaceAlt || existingTheme.palette?.light?.surfaceAlt || "").trim(),
        text: String(input.palette?.light?.text || existingTheme.palette?.light?.text || "").trim(),
        mutedText: String(input.palette?.light?.mutedText || existingTheme.palette?.light?.mutedText || "").trim(),
        border: String(input.palette?.light?.border || existingTheme.palette?.light?.border || "").trim(),
        primary: String(input.palette?.light?.primary || existingTheme.palette?.light?.primary || "").trim(),
        primaryStrong: String(input.palette?.light?.primaryStrong || existingTheme.palette?.light?.primaryStrong || "").trim(),
        secondary: String(input.palette?.light?.secondary || existingTheme.palette?.light?.secondary || "").trim()
      },
      dark: {
        background: String(input.palette?.dark?.background || existingTheme.palette?.dark?.background || "").trim(),
        surface: String(input.palette?.dark?.surface || existingTheme.palette?.dark?.surface || "").trim(),
        surfaceAlt: String(input.palette?.dark?.surfaceAlt || existingTheme.palette?.dark?.surfaceAlt || "").trim(),
        text: String(input.palette?.dark?.text || existingTheme.palette?.dark?.text || "").trim(),
        mutedText: String(input.palette?.dark?.mutedText || existingTheme.palette?.dark?.mutedText || "").trim(),
        border: String(input.palette?.dark?.border || existingTheme.palette?.dark?.border || "").trim(),
        primary: String(input.palette?.dark?.primary || existingTheme.palette?.dark?.primary || "").trim(),
        primaryStrong: String(input.palette?.dark?.primaryStrong || existingTheme.palette?.dark?.primaryStrong || "").trim(),
        secondary: String(input.palette?.dark?.secondary || existingTheme.palette?.dark?.secondary || "").trim()
      }
    }
  };
}

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function issueAuthToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role
    },
    config.jwtSecret,
    { expiresIn: "7d" }
  );
}

function normalizeUserInput(input, existingUser = {}) {
  return {
    ...existingUser,
    displayName: String(input.displayName || existingUser.displayName || "").trim(),
    email: String(input.email || existingUser.email || "").trim().toLowerCase()
  };
}

function normalizeCommentInput(input, existingComment = {}) {
  return {
    ...existingComment,
    body: String(input.body || existingComment.body || "").trim(),
    status: String(input.status || existingComment.status || "visible").trim() || "visible",
    updatedAt: new Date().toISOString()
  };
}

function attachCommentDetails(comment, users) {
  const author = users.find((user) => user.id === comment.authorId);

  return {
    ...comment,
    author: author
      ? {
          id: author.id,
          displayName: author.displayName,
          role: author.role
        }
      : {
          id: comment.authorId,
          displayName: "Unknown User",
          role: "user"
        }
  };
}

function canManageComment(actor, comment) {
  return actor?.role === "admin" || actor?.sub === comment.authorId;
}

function isPostPubliclyVisible(post) {
  return post?.published === true && post?.isPubliclyVisible !== false;
}

function findPublishedPost(store, slug) {
  return store.posts.find((entry) => entry.slug === slug && isPostPubliclyVisible(entry));
}

app.get("/", (req, res) => {
  res.redirect("/api/posts");
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/admin/login", loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = String(email || "").trim();
  const suppliedPassword = String(password || "");
  const isEmailMatch = normalizedEmail === config.adminEmail;
  const isPasswordMatch = config.adminPasswordHash
    ? await bcrypt.compare(suppliedPassword, config.adminPasswordHash)
    : suppliedPassword === config.adminPassword;

  if (!isEmailMatch || !isPasswordMatch) {
    return res.status(401).json({ message: "Invalid admin credentials." });
  }

  const token = jwt.sign(
    {
      email: config.adminEmail,
      role: "admin"
    },
    config.jwtSecret,
    { expiresIn: "2h" }
  );

  return res.json({
    token,
    admin: {
      email: config.adminEmail,
      role: "admin"
    }
  });
});

app.post("/api/auth/register", userAuthLimiter, async (req, res, next) => {
  try {
    const store = await readStore();
    const userInput = normalizeUserInput(req.body);
    const password = String(req.body.password || "");

    if (!userInput.displayName || !userInput.email || password.length < 8) {
      return res.status(400).json({ message: "Display name, email, and a password of at least 8 characters are required." });
    }

    if (store.users.some((entry) => entry.email === userInput.email)) {
      return res.status(400).json({ message: "An account with that email already exists." });
    }

    const timestamp = new Date().toISOString();
    const user = {
      id: crypto.randomUUID(),
      displayName: userInput.displayName,
      email: userInput.email,
      passwordHash: await bcrypt.hash(password, 12),
      role: "user",
      status: "active",
      createdAt: timestamp,
      updatedAt: timestamp
    };

    store.users.unshift(user);
    await writeStore(store);

    return res.status(201).json({
      token: issueAuthToken(user),
      user: sanitizeUser(user)
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", userAuthLimiter, async (req, res, next) => {
  try {
    const store = await readStore();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const user = store.users.find((entry) => entry.email === email);

    if (!user || user.status !== "active") {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    return res.json({
      token: issueAuthToken(user),
      user: sanitizeUser(user)
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/me", authenticate, async (req, res, next) => {
  try {
    if (req.auth.role === "admin") {
      return res.json({
        user: {
          id: "admin",
          email: req.auth.email,
          displayName: req.auth.displayName || "Admin",
          role: "admin",
          status: "active"
        }
      });
    }

    const store = await readStore();
    const user = store.users.find((entry) => entry.id === req.auth.sub);

    if (!user || user.status !== "active") {
      return res.status(401).json({ message: "User session is no longer valid." });
    }

    return res.json({ user: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
});

app.put("/api/auth/me", requireUser, async (req, res, next) => {
  try {
    if (req.user.role === "admin") {
      return res.status(403).json({ message: "Admin accounts are managed separately." });
    }

    const store = await readStore();
    const index = store.users.findIndex((entry) => entry.id === req.user.sub);

    if (index === -1) {
      return res.status(404).json({ message: "User not found." });
    }

    const nextDisplayName = String(req.body.displayName || "").trim();
    const nextPassword = String(req.body.password || "");

    if (!nextDisplayName) {
      return res.status(400).json({ message: "Display name is required." });
    }

    store.users[index] = {
      ...store.users[index],
      displayName: nextDisplayName,
      passwordHash: nextPassword ? await bcrypt.hash(nextPassword, 12) : store.users[index].passwordHash,
      updatedAt: new Date().toISOString()
    };

    await writeStore(store);

    return res.json({
      token: issueAuthToken(store.users[index]),
      user: sanitizeUser(store.users[index])
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/posts", async (req, res, next) => {
  try {
    const store = await readStore();
    const publishedPosts = store.posts
      .filter((post) => isPostPubliclyVisible(post))
      .map((post) => attachCollectionDetails(post, store.collections));

    res.json({ posts: publishedPosts });
  } catch (error) {
    next(error);
  }
});

app.get("/api/posts/:slug", async (req, res, next) => {
  try {
    const store = await readStore();
    const post = store.posts.find((entry) => entry.slug === req.params.slug && isPostPubliclyVisible(entry));

    if (!post) {
      return res.status(404).json({ message: "Release not found." });
    }

    return res.json({ post: attachCollectionDetails(post, store.collections) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/posts/:slug/comments", async (req, res, next) => {
  try {
    const store = await readStore();
    const post = findPublishedPost(store, req.params.slug);

    if (!post) {
      return res.status(404).json({ message: "Release not found." });
    }

    const comments = store.comments
      .filter((comment) => comment.postSlug === req.params.slug && comment.status === "visible")
      .sort((left, right) => String(left.createdAt).localeCompare(String(right.createdAt)))
      .map((comment) => attachCommentDetails(comment, store.users));

    return res.json({ comments });
  } catch (error) {
    next(error);
  }
});

app.post("/api/posts/:slug/comments", commentWriteLimiter, requireUser, async (req, res, next) => {
  try {
    if (req.user.role === "admin") {
      return res.status(403).json({ message: "Use a user account to comment publicly." });
    }

    const store = await readStore();
    const post = findPublishedPost(store, req.params.slug);

    if (!post) {
      return res.status(404).json({ message: "Release not found." });
    }

    const body = String(req.body.body || "").trim();

    if (!body || body.length < 2) {
      return res.status(400).json({ message: "Comment text must be at least 2 characters." });
    }

    const user = store.users.find((entry) => entry.id === req.user.sub && entry.status === "active");

    if (!user) {
      return res.status(401).json({ message: "User session is no longer valid." });
    }

    const timestamp = new Date().toISOString();
    const comment = {
      id: crypto.randomUUID(),
      postSlug: req.params.slug,
      authorId: user.id,
      body,
      status: "visible",
      createdAt: timestamp,
      updatedAt: timestamp
    };

    store.comments.push(comment);
    await writeStore(store);

    return res.status(201).json({ comment: attachCommentDetails(comment, store.users) });
  } catch (error) {
    next(error);
  }
});

app.put("/api/comments/:id", commentWriteLimiter, requireUser, async (req, res, next) => {
  try {
    const store = await readStore();
    const index = store.comments.findIndex((entry) => entry.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ message: "Comment not found." });
    }

    const existingComment = store.comments[index];

    if (!canManageComment(req.user, existingComment)) {
      return res.status(403).json({ message: "You do not have permission to edit this comment." });
    }

    const nextComment = normalizeCommentInput(req.body, existingComment);

    if (!nextComment.body || nextComment.body.length < 2) {
      return res.status(400).json({ message: "Comment text must be at least 2 characters." });
    }

    store.comments[index] = nextComment;
    await writeStore(store);

    return res.json({ comment: attachCommentDetails(nextComment, store.users) });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/comments/:id", commentWriteLimiter, requireUser, async (req, res, next) => {
  try {
    const store = await readStore();
    const comment = store.comments.find((entry) => entry.id === req.params.id);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    if (!canManageComment(req.user, comment)) {
      return res.status(403).json({ message: "You do not have permission to delete this comment." });
    }

    store.comments = store.comments.filter((entry) => entry.id !== req.params.id);
    await writeStore(store);

    return res.json({ message: "Comment deleted." });
  } catch (error) {
    next(error);
  }
});

app.get("/api/collections", async (req, res, next) => {
  try {
    const store = await readStore();
    const publishedPosts = store.posts.filter((post) => isPostPubliclyVisible(post));
    const scope = String(req.query.scope || "").trim().toLowerCase();
    const collections = store.collections
      .filter((collection) => (scope === "all" ? true : collection.isPublicPrimary))
      .sort((left, right) => {
        const leftIndex = PUBLIC_PRIMARY_COLLECTION_SLUGS.indexOf(left.slug);
        const rightIndex = PUBLIC_PRIMARY_COLLECTION_SLUGS.indexOf(right.slug);

        if (leftIndex !== rightIndex) {
          return (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex);
        }

        return left.title.localeCompare(right.title);
      })
      .map((collection) => buildCollectionSummary(collection, publishedPosts));

    res.json({ collections });
  } catch (error) {
    next(error);
  }
});

app.get("/api/collections/:slug", async (req, res, next) => {
  try {
    const store = await readStore();
    const collection = store.collections.find((entry) => entry.slug === req.params.slug);

    if (!collection) {
      return res.status(404).json({ message: "Collection not found." });
    }

    const releases = store.posts
      .filter((post) => isPostPubliclyVisible(post) && post.collectionSlugs.includes(collection.slug))
      .map((post) => attachCollectionDetails(post, store.collections));

    res.json({
      collection: buildCollectionSummary(collection, releases),
      releases
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/about", async (req, res, next) => {
  try {
    const store = await readStore();
    res.json({ about: store.siteContent.about });
  } catch (error) {
    next(error);
  }
});

app.get("/api/site-content", async (req, res, next) => {
  try {
    const store = await readStore();
    res.json({ siteContent: store.siteContent });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/posts", requireAdmin, async (req, res, next) => {
  try {
    const store = await readStore();
    res.json({
      posts: store.posts.map((post) => attachCollectionDetails(post, store.collections)),
      collections: store.collections
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/posts", requireAdmin, async (req, res, next) => {
  try {
    const store = await readStore();
    const newPost = normalizePostInput(
      {
        ...req.body,
        createdAt: req.body.createdAt || new Date().toISOString(),
        published: Boolean(req.body.published)
      },
      store.collections,
      { id: crypto.randomUUID() }
    );

    if (!newPost.title || !newPost.excerpt || !newPost.content) {
      return res.status(400).json({ message: "Title, excerpt, and content are required." });
    }

    store.posts.unshift(newPost);
    store.collections = reconcileCollections(store.collections, store.posts);
    await writeStore(store);
    res.status(201).json({ post: attachCollectionDetails(newPost, store.collections) });
  } catch (error) {
    next(error);
  }
});

app.put("/api/admin/posts/:id", requireAdmin, async (req, res, next) => {
  try {
    const store = await readStore();
    const index = store.posts.findIndex((post) => post.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ message: "Post not found." });
    }

    const previousPost = store.posts[index];
    const updatedPost = normalizePostInput(req.body, store.collections, previousPost);

    store.posts[index] = updatedPost;
    store.comments = store.comments.map((comment) => ({
      ...comment,
      postSlug: comment.postSlug === previousPost.slug ? updatedPost.slug : comment.postSlug
    }));
    store.collections = reconcileCollections(store.collections, store.posts);
    await writeStore(store);
    res.json({ post: attachCollectionDetails(updatedPost, store.collections) });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/admin/posts/:id", requireAdmin, async (req, res, next) => {
  try {
    const store = await readStore();
    const post = store.posts.find((entry) => entry.id === req.params.id);
    const remaining = store.posts.filter((post) => post.id !== req.params.id);

    if (remaining.length === store.posts.length) {
      return res.status(404).json({ message: "Post not found." });
    }

    store.posts = remaining;
    store.comments = store.comments.filter((comment) => comment.postSlug !== post.slug);
    store.collections = reconcileCollections(store.collections, store.posts);
    await writeStore(store);
    res.json({ message: "Post deleted." });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/collections", requireAdmin, async (req, res, next) => {
  try {
    const store = await readStore();
    res.json({ collections: store.collections, posts: store.posts });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/site-content", requireAdmin, async (req, res, next) => {
  try {
    const store = await readStore();
    res.json({ siteContent: store.siteContent });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/insights", requireAdmin, async (req, res, next) => {
  try {
    const store = await readStore();
    res.json({ insights: buildArchiveInsights(store) });
  } catch (error) {
    next(error);
  }
});

app.put("/api/admin/site-content/about", requireAdmin, async (req, res, next) => {
  try {
    const store = await readStore();
    const about = normalizeAboutContent(req.body, store.siteContent.about);

    if (!about.heroTitle || !about.heroText || !about.artistTitle || !about.artistText) {
      return res.status(400).json({ message: "Complete the main About sections before saving." });
    }

    store.siteContent = {
      ...store.siteContent,
      about
    };

    await writeStore(store);
    res.json({ about });
  } catch (error) {
    next(error);
  }
});

app.put("/api/admin/site-content/site", requireAdmin, async (req, res, next) => {
  try {
    const store = await readStore();
    const branding = normalizeBrandingContent(req.body.branding, store.siteContent.branding);
    const home = normalizeHomeContent(req.body.home, store.siteContent.home);
    const existingThemes = Array.isArray(store.siteContent.collectionThemes) ? store.siteContent.collectionThemes : [];
    const collectionThemes = Array.isArray(req.body.collectionThemes)
      ? req.body.collectionThemes
          .map((theme) => normalizeThemeProfileInput(theme, existingThemes.find((entry) => entry.key === theme.key) || {}))
          .filter((theme) => theme.key)
      : existingThemes;

    if (!branding.siteName || !branding.siteTagline) {
      return res.status(400).json({ message: "Site name and tagline are required." });
    }

    if (!home.heroTitle || !home.heroText || !home.noteTitle || !home.identityTitle) {
      return res.status(400).json({ message: "Complete the main homepage sections before saving." });
    }

    store.siteContent = {
      ...store.siteContent,
      branding,
      home,
      collectionThemes
    };

    await writeStore(store);
    res.json({ siteContent: store.siteContent });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/comments", requireAdmin, async (req, res, next) => {
  try {
    const store = await readStore();
    const requestedStatus = String(req.query.status || "").trim();
    const comments = store.comments
      .filter((comment) => (!requestedStatus ? true : comment.status === requestedStatus))
      .map((comment) => attachCommentDetails(comment, store.users));

    res.json({ comments });
  } catch (error) {
    next(error);
  }
});

app.put("/api/admin/comments/:id", requireAdmin, async (req, res, next) => {
  try {
    const store = await readStore();
    const index = store.comments.findIndex((entry) => entry.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ message: "Comment not found." });
    }

    const status = String(req.body.status || "").trim();

    if (!["visible", "hidden"].includes(status)) {
      return res.status(400).json({ message: "Comment status must be either visible or hidden." });
    }

    store.comments[index] = {
      ...store.comments[index],
      status,
      updatedAt: new Date().toISOString()
    };

    await writeStore(store);
    res.json({ comment: attachCommentDetails(store.comments[index], store.users) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/collections", requireAdmin, async (req, res, next) => {
  try {
    const store = await readStore();
    const collection = normalizeCollectionInput(req.body, { id: crypto.randomUUID() });

    if (!collection.title || !collection.description) {
      return res.status(400).json({ message: "Title and description are required." });
    }

    if (store.collections.some((entry) => entry.slug === collection.slug)) {
      return res.status(400).json({ message: "A collection with that title already exists." });
    }

    store.collections.unshift(collection);
    await writeStore(store);
    res.status(201).json({ collection });
  } catch (error) {
    next(error);
  }
});

app.put("/api/admin/collections/:id", requireAdmin, async (req, res, next) => {
  try {
    const store = await readStore();
    const index = store.collections.findIndex((collection) => collection.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ message: "Collection not found." });
    }

    const previousCollection = store.collections[index];
    const updatedCollection = normalizeCollectionInput(req.body, previousCollection);

    if (!updatedCollection.title || !updatedCollection.description) {
      return res.status(400).json({ message: "Title and description are required." });
    }

    const slugConflict = store.collections.some(
      (collection) => collection.id !== previousCollection.id && collection.slug === updatedCollection.slug
    );

    if (slugConflict) {
      return res.status(400).json({ message: "A collection with that title already exists." });
    }

    store.collections[index] = updatedCollection;
    store.posts = store.posts.map((post) => ({
      ...post,
      collectionSlugs: post.collectionSlugs.map((slug) =>
        slug === previousCollection.slug ? updatedCollection.slug : slug
      )
    }));
    store.collections = reconcileCollections(store.collections, store.posts);

    await writeStore(store);
    res.json({ collection: updatedCollection });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/admin/collections/:id", requireAdmin, async (req, res, next) => {
  try {
    const store = await readStore();
    const collection = store.collections.find((entry) => entry.id === req.params.id);

    if (!collection) {
      return res.status(404).json({ message: "Collection not found." });
    }

    store.collections = store.collections.filter((entry) => entry.id !== req.params.id);
    store.posts = store.posts.map((post) => ({
      ...post,
      collectionSlugs: post.collectionSlugs.filter((slug) => slug !== collection.slug)
    }));
    store.collections = reconcileCollections(store.collections, store.posts);

    await writeStore(store);
    res.json({ message: "Collection deleted." });
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: "Internal server error." });
});

module.exports = app;
