const express = require("express");
const crypto = require("crypto");
const path = require("path");
const config = require("../config");
const { requireAdmin } = require("../middleware/auth");
const {
  requireCatalogFileMutationsEnabled
} = require("../middleware/mutationProtection");
const {
  deleteCollectionById,
  deleteCommentsByAuthorId,
  deleteCommentsByPostSlug,
  deleteCommentById,
  deleteUserById,
  deletePostById,
  insertCollection,
  insertPost,
  readAdminAuditLogs,
  readStore,
  renameCommentsForPostSlug,
  replaceCollections,
  replaceComment,
  replaceUser,
  replacePosts,
  runStoreTransaction,
  writeSiteContent
} = require("../data/store");
const { buildArchiveInsights } = require("../services/archiveInsights");
const {
  attachCommentDetails,
  sanitizeUser
} = require("../services/authUserService");
const {
  applyLiveStoreSync,
  previewLiveStoreSync
} = require("../services/liveStoreSync");
const { launchImporter } = require("../services/importerLauncherService");
const {
  buildAssistantFindingDecision,
  getLocalAiStatus,
  reviewCatalogWithLocalAi,
  reviewCatalogFindingWithLocalAi,
  suggestGuidedPathWithLocalAi,
  suggestNewGuidedPathWithLocalAi,
  suggestPostDraftWithLocalAi,
  upsertAssistantFindingDecision
} = require("../services/localAiService");
const {
  getRemoteAiStatus,
  getRemoteAiTunnelStatus,
  startRemoteAiTunnel,
  stopRemoteAiTunnel,
  wakeRemoteOllama
} = require("../services/remoteAiService");
const {
  getPostFileReseedJob,
  startPostFileReseedJob
} = require("../services/reseedLiveSiteService");
const {
  appendSlugHistory,
  applyBulkPostUpdates,
  attachCollectionDetails,
  collectChangedEntries,
  hasBulkPostUpdates,
  isFeaturedReleaseValidForCollection,
  normalizeBulkPostUpdateInput,
  normalizeCollectionInput,
  normalizePostInput,
  reconcileCollections,
  remapPostSlugReferences,
  slugIsReserved
} = require("../services/catalogService");
const {
  normalizeAboutContent,
  normalizeBrandingContent,
  normalizeGuidedPathsInput,
  normalizeHomeContent,
  normalizeThemeProfileInput
} = require("../services/siteContentService");
const {
  listChangedKeys,
  recordAdminAuditEvent
} = require("../services/adminAuditService");
const {
  validateAboutContent,
  validateCollectionDraft,
  validateCommentStatus,
  validatePostDraft,
  validateSiteContent
} = require("../validators/contentValidators");

const router = express.Router();

function getAssistantModelSelection(req) {
  return {
    profile: String(req.query?.profile || req.body?.profile || "").trim(),
    model: String(req.query?.model || req.body?.model || "").trim()
  };
}

router.use(requireAdmin);

router.get("/session", (req, res) => {
  return res.json({
    admin: {
      id: req.admin.sub || "",
      email: req.admin.email,
      role: "admin"
    }
  });
});

router.get("/users", async (req, res, next) => {
  try {
    const store = await readStore();
    const commentCounts = store.comments.reduce((counts, comment) => {
      counts.set(comment.authorId, (counts.get(comment.authorId) || 0) + 1);
      return counts;
    }, new Map());

    const users = store.users
      .map((user) => ({
        ...sanitizeUser(user),
        commentCount: commentCounts.get(user.id) || 0,
        savedReleaseCount: Array.isArray(user.savedReleaseSlugs)
          ? user.savedReleaseSlugs.length
          : 0,
        recentReleaseCount: Array.isArray(user.recentReleaseSlugs)
          ? user.recentReleaseSlugs.length
          : 0,
        reactionCount:
          user.releaseReactions && typeof user.releaseReactions === "object"
            ? Object.keys(user.releaseReactions).length
            : 0
      }))
      .sort((left, right) =>
        String(right.createdAt || "").localeCompare(
          String(left.createdAt || "")
        )
      );

    return res.json({ users });
  } catch (error) {
    next(error);
  }
});

router.put("/users/:id", async (req, res, next) => {
  try {
    const store = await readStore();
    const existingUser = store.users.find((user) => user.id === req.params.id);

    if (!existingUser) {
      return res.status(404).json({ message: "User not found." });
    }

    const nextRole = String(req.body.role || existingUser.role).trim();
    const nextStatus = String(req.body.status || existingUser.status).trim();

    if (!["user", "admin"].includes(nextRole)) {
      return res
        .status(400)
        .json({ message: "User role must be user or admin." });
    }

    if (!["active", "disabled"].includes(nextStatus)) {
      return res
        .status(400)
        .json({ message: "User status must be active or disabled." });
    }

    if (
      existingUser.id === req.admin.sub &&
      (nextRole !== "admin" || nextStatus !== "active")
    ) {
      return res
        .status(400)
        .json({ message: "You cannot remove your own admin access." });
    }

    const nextUser = {
      ...existingUser,
      role: nextRole,
      status: nextStatus,
      updatedAt: new Date().toISOString()
    };

    await replaceUser(nextUser);

    await recordAdminAuditEvent(req, {
      action: "user.updated",
      entityType: "user",
      entityId: nextUser.id,
      entityLabel: nextUser.email,
      details: {
        previousRole: existingUser.role,
        nextRole: nextUser.role,
        previousStatus: existingUser.status,
        nextStatus: nextUser.status
      }
    });

    return res.json({ user: sanitizeUser(nextUser) });
  } catch (error) {
    next(error);
  }
});

router.delete("/users/:id", async (req, res, next) => {
  try {
    const store = await readStore();
    const user = store.users.find((entry) => entry.id === req.params.id);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.id === req.admin.sub) {
      return res.status(400).json({
        message: "You cannot delete your own account while signed in."
      });
    }

    if (user.role === "admin") {
      return res
        .status(400)
        .json({ message: "Demote admin users before deleting them." });
    }

    const deletedCommentCount = store.comments.filter(
      (comment) => comment.authorId === user.id
    ).length;

    await runStoreTransaction(async (session) => {
      await deleteUserById(user.id, { session });
      await deleteCommentsByAuthorId(user.id, { session });
    });

    await recordAdminAuditEvent(req, {
      action: "user.deleted",
      entityType: "user",
      entityId: user.id,
      entityLabel: user.email,
      details: {
        deletedCommentCount
      }
    });

    return res.json({ message: "User deleted." });
  } catch (error) {
    next(error);
  }
});

router.get("/audit-logs", async (req, res, next) => {
  try {
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(String(req.query.limit || "20"), 10) || 20)
    );
    const auditLogs = await readAdminAuditLogs({ limit });
    return res.json({ auditLogs });
  } catch (error) {
    next(error);
  }
});

router.get("/posts", async (req, res, next) => {
  try {
    const store = await readStore();
    return res.json({
      posts: store.posts.map((post) =>
        attachCollectionDetails(post, store.collections)
      ),
      collections: store.collections
    });
  } catch (error) {
    next(error);
  }
});

router.post("/posts", async (req, res, next) => {
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
    const validationMessage = validatePostDraft(newPost);

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    if (slugIsReserved(store.posts, newPost.slug)) {
      return res
        .status(400)
        .json({ message: "A post already uses or reserves that slug." });
    }

    await insertPost(newPost);
    await recordAdminAuditEvent(req, {
      action: "post.created",
      entityType: "post",
      entityId: newPost.id,
      entityLabel: newPost.title,
      details: {
        collectionSlugs: newPost.collectionSlugs,
        published: newPost.published,
        releaseStatus: newPost.releaseStatus,
        slug: newPost.slug
      }
    });

    return res
      .status(201)
      .json({ post: attachCollectionDetails(newPost, store.collections) });
  } catch (error) {
    next(error);
  }
});

router.post("/posts/bulk-update", async (req, res, next) => {
  try {
    const store = await readStore();
    const postIds = Array.isArray(req.body.postIds)
      ? [
          ...new Set(
            req.body.postIds
              .map((id) => String(id || "").trim())
              .filter(Boolean)
          )
        ]
      : [];
    const updates = normalizeBulkPostUpdateInput(
      req.body.updates,
      store.collections
    );

    if (!postIds.length) {
      return res.status(400).json({
        message: "Select at least one post before applying a bulk action."
      });
    }

    if (!hasBulkPostUpdates(updates)) {
      return res.status(400).json({
        message: "Choose at least one bulk change before applying it."
      });
    }

    const postIdSet = new Set(postIds);
    const matchingPosts = store.posts.filter((post) => postIdSet.has(post.id));

    if (matchingPosts.length !== postIds.length) {
      return res
        .status(404)
        .json({ message: "One or more selected posts no longer exist." });
    }

    const nextPosts = store.posts.map((post) =>
      postIdSet.has(post.id) ? applyBulkPostUpdates(post, updates) : post
    );
    const changedPosts = collectChangedEntries(store.posts, nextPosts);
    const nextCollections = reconcileCollections(store.collections, nextPosts);
    const changedCollections = collectChangedEntries(
      store.collections,
      nextCollections
    );

    await runStoreTransaction(async (session) => {
      if (changedPosts.length) {
        await replacePosts(changedPosts, { session });
      }

      if (changedCollections.length) {
        await replaceCollections(changedCollections, { session });
      }
    });
    await recordAdminAuditEvent(req, {
      action: "post.bulk_updated",
      entityType: "catalog",
      entityLabel: "Bulk post update",
      details: {
        postIds,
        unchangedCount: postIds.length - changedPosts.length,
        updatedCount: changedPosts.length,
        updates
      }
    });

    return res.json({
      updatedCount: changedPosts.length,
      unchangedCount: postIds.length - changedPosts.length
    });
  } catch (error) {
    next(error);
  }
});

router.put("/posts/:id", async (req, res, next) => {
  try {
    const store = await readStore();
    const previousPost = store.posts.find((post) => post.id === req.params.id);

    if (!previousPost) {
      return res.status(404).json({ message: "Post not found." });
    }

    const normalizedPost = normalizePostInput(
      req.body,
      store.collections,
      previousPost
    );
    const updatedPost =
      previousPost.slug !== normalizedPost.slug
        ? {
            ...normalizedPost,
            slugHistory: appendSlugHistory(
              previousPost.slugHistory,
              previousPost.slug,
              normalizedPost.slug
            )
          }
        : {
            ...normalizedPost,
            slugHistory: Array.isArray(previousPost.slugHistory)
              ? previousPost.slugHistory
              : []
          };
    const slugConflict = slugIsReserved(
      store.posts,
      updatedPost.slug,
      previousPost.id
    );

    if (slugConflict) {
      return res
        .status(400)
        .json({ message: "A post already uses or reserves that slug." });
    }

    let nextPosts = store.posts.map((post) =>
      post.id === previousPost.id ? updatedPost : post
    );
    let nextCollections = store.collections;
    let nextSiteContent = store.siteContent;

    if (previousPost.slug !== updatedPost.slug) {
      const rewritten = remapPostSlugReferences(
        nextPosts,
        nextCollections,
        nextSiteContent,
        previousPost.slug,
        updatedPost.slug,
        updatedPost.id
      );

      nextPosts = rewritten.posts;
      nextCollections = rewritten.collections;
      nextSiteContent = rewritten.siteContent;
    }

    nextCollections = reconcileCollections(nextCollections, nextPosts);
    const changedPosts = collectChangedEntries(store.posts, nextPosts);
    const changedCollections = collectChangedEntries(
      store.collections,
      nextCollections
    );
    const siteContentChanged =
      JSON.stringify(store.siteContent) !== JSON.stringify(nextSiteContent);

    await runStoreTransaction(async (session) => {
      if (changedPosts.length) {
        await replacePosts(changedPosts, { session });
      }

      if (previousPost.slug !== updatedPost.slug) {
        await renameCommentsForPostSlug(previousPost.slug, updatedPost.slug, {
          session
        });
      }

      if (changedCollections.length) {
        await replaceCollections(changedCollections, { session });
      }

      if (siteContentChanged) {
        await writeSiteContent(nextSiteContent, { session });
      }
    });

    const savedPost =
      nextPosts.find((post) => post.id === updatedPost.id) || updatedPost;
    await recordAdminAuditEvent(req, {
      action: "post.updated",
      entityType: "post",
      entityId: savedPost.id,
      entityLabel: savedPost.title,
      details: {
        changedFields: listChangedKeys(previousPost, savedPost, [
          "title",
          "slug",
          "published",
          "videoUrl",
          "excerpt",
          "content",
          "lyrics",
          "collectionSlugs",
          "releaseStatus",
          "versionFamily",
          "isPrimaryVersion",
          "isArchive",
          "isHomepageEligible",
          "isPubliclyVisible",
          "subCategory",
          "sourceTag",
          "worldLayer",
          "themeTags",
          "archiveMeta",
          "supersededBySlug",
          "supersededReason",
          "supersededAt"
        ]),
        previousSlug:
          previousPost.slug !== savedPost.slug ? previousPost.slug : "",
        published: savedPost.published,
        releaseStatus: savedPost.releaseStatus,
        slug: savedPost.slug
      }
    });

    return res.json({
      post: attachCollectionDetails(savedPost, nextCollections)
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/posts/:id", async (req, res, next) => {
  try {
    const store = await readStore();
    const post = store.posts.find((entry) => entry.id === req.params.id);
    const remainingPosts = store.posts.filter(
      (entry) => entry.id !== req.params.id
    );

    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    const nextCollections = reconcileCollections(
      store.collections,
      remainingPosts
    );
    const changedCollections = collectChangedEntries(
      store.collections,
      nextCollections
    );
    const nextSiteContent =
      store.siteContent?.home?.featuredReleaseSlug === post.slug
        ? {
            ...store.siteContent,
            home: {
              ...store.siteContent.home,
              featuredReleaseSlug: ""
            }
          }
        : store.siteContent;
    const siteContentChanged =
      JSON.stringify(store.siteContent) !== JSON.stringify(nextSiteContent);

    await runStoreTransaction(async (session) => {
      await deletePostById(post.id, { session });
      await deleteCommentsByPostSlug(post.slug, { session });

      if (changedCollections.length) {
        await replaceCollections(changedCollections, { session });
      }

      if (siteContentChanged) {
        await writeSiteContent(nextSiteContent, { session });
      }
    });
    await recordAdminAuditEvent(req, {
      action: "post.deleted",
      entityType: "post",
      entityId: post.id,
      entityLabel: post.title,
      details: {
        collectionSlugs: post.collectionSlugs,
        published: post.published,
        releaseStatus: post.releaseStatus,
        slug: post.slug
      }
    });

    return res.json({ message: "Post deleted." });
  } catch (error) {
    next(error);
  }
});

router.get("/collections", async (req, res, next) => {
  try {
    const store = await readStore();
    return res.json({ collections: store.collections, posts: store.posts });
  } catch (error) {
    next(error);
  }
});

router.post("/collections", async (req, res, next) => {
  try {
    const store = await readStore();
    const collection = normalizeCollectionInput(req.body, {
      id: crypto.randomUUID()
    });
    const validationMessage = validateCollectionDraft(collection);

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    if (slugIsReserved(store.collections, collection.slug)) {
      return res
        .status(400)
        .json({ message: "A collection already uses or reserves that slug." });
    }

    if (
      !isFeaturedReleaseValidForCollection(
        store.posts,
        collection.slug,
        collection.featuredReleaseSlug
      )
    ) {
      return res.status(400).json({
        message: "The featured release must already belong to this collection."
      });
    }

    await insertCollection(collection);
    await recordAdminAuditEvent(req, {
      action: "collection.created",
      entityType: "collection",
      entityId: collection.id,
      entityLabel: collection.title,
      details: {
        featuredReleaseSlug: collection.featuredReleaseSlug,
        isPublicPrimary: collection.isPublicPrimary,
        slug: collection.slug,
        theme: collection.theme
      }
    });

    return res.status(201).json({ collection });
  } catch (error) {
    next(error);
  }
});

router.put("/collections/:id", async (req, res, next) => {
  try {
    const store = await readStore();
    const previousCollection = store.collections.find(
      (collection) => collection.id === req.params.id
    );

    if (!previousCollection) {
      return res.status(404).json({ message: "Collection not found." });
    }

    const normalizedCollection = normalizeCollectionInput(
      req.body,
      previousCollection
    );
    const updatedCollection =
      previousCollection.slug !== normalizedCollection.slug
        ? {
            ...normalizedCollection,
            slugHistory: appendSlugHistory(
              previousCollection.slugHistory,
              previousCollection.slug,
              normalizedCollection.slug
            )
          }
        : {
            ...normalizedCollection,
            slugHistory: Array.isArray(previousCollection.slugHistory)
              ? previousCollection.slugHistory
              : []
          };
    const validationMessage = validateCollectionDraft(updatedCollection);

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    if (
      slugIsReserved(
        store.collections,
        updatedCollection.slug,
        previousCollection.id
      )
    ) {
      return res
        .status(400)
        .json({ message: "A collection already uses or reserves that slug." });
    }

    const nextPosts = store.posts.map((post) => ({
      ...post,
      collectionSlugs: post.collectionSlugs.map((slug) =>
        slug === previousCollection.slug ? updatedCollection.slug : slug
      )
    }));

    if (
      !isFeaturedReleaseValidForCollection(
        nextPosts,
        updatedCollection.slug,
        updatedCollection.featuredReleaseSlug
      )
    ) {
      return res.status(400).json({
        message: "The featured release must belong to this collection."
      });
    }

    const changedPosts = collectChangedEntries(store.posts, nextPosts);
    const nextCollections = reconcileCollections(
      store.collections.map((collection) =>
        collection.id === previousCollection.id ? updatedCollection : collection
      ),
      nextPosts
    );
    const changedCollections = collectChangedEntries(
      store.collections,
      nextCollections
    );

    await runStoreTransaction(async (session) => {
      if (changedPosts.length) {
        await replacePosts(changedPosts, { session });
      }

      if (changedCollections.length) {
        await replaceCollections(changedCollections, { session });
      }
    });
    const savedCollection =
      nextCollections.find(
        (collection) => collection.id === updatedCollection.id
      ) || updatedCollection;
    await recordAdminAuditEvent(req, {
      action: "collection.updated",
      entityType: "collection",
      entityId: savedCollection.id,
      entityLabel: savedCollection.title,
      details: {
        changedFields: listChangedKeys(previousCollection, savedCollection, [
          "title",
          "slug",
          "description",
          "featuredReleaseSlug",
          "theme",
          "isPublicPrimary"
        ]),
        featuredReleaseSlug: savedCollection.featuredReleaseSlug,
        previousSlug:
          previousCollection.slug !== savedCollection.slug
            ? previousCollection.slug
            : "",
        slug: savedCollection.slug,
        theme: savedCollection.theme
      }
    });

    return res.json({
      collection: savedCollection
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/collections/:id", async (req, res, next) => {
  try {
    const store = await readStore();
    const collection = store.collections.find(
      (entry) => entry.id === req.params.id
    );

    if (!collection) {
      return res.status(404).json({ message: "Collection not found." });
    }

    const remainingCollections = store.collections.filter(
      (entry) => entry.id !== req.params.id
    );
    const nextPosts = store.posts.map((post) => ({
      ...post,
      collectionSlugs: post.collectionSlugs.filter(
        (slug) => slug !== collection.slug
      )
    }));
    const changedPosts = collectChangedEntries(store.posts, nextPosts);
    const nextCollections = reconcileCollections(
      remainingCollections,
      nextPosts
    );
    const changedCollections = collectChangedEntries(
      remainingCollections,
      nextCollections
    );

    await runStoreTransaction(async (session) => {
      await deleteCollectionById(collection.id, { session });

      if (changedPosts.length) {
        await replacePosts(changedPosts, { session });
      }

      if (changedCollections.length) {
        await replaceCollections(changedCollections, { session });
      }
    });
    await recordAdminAuditEvent(req, {
      action: "collection.deleted",
      entityType: "collection",
      entityId: collection.id,
      entityLabel: collection.title,
      details: {
        featuredReleaseSlug: collection.featuredReleaseSlug,
        slug: collection.slug,
        theme: collection.theme
      }
    });

    return res.json({ message: "Collection deleted." });
  } catch (error) {
    next(error);
  }
});

router.get("/site-content", async (req, res, next) => {
  try {
    const store = await readStore();
    return res.json({ siteContent: store.siteContent });
  } catch (error) {
    next(error);
  }
});

router.put("/site-content/about", async (req, res, next) => {
  try {
    const store = await readStore();
    const about = normalizeAboutContent(req.body, store.siteContent.about);
    const validationMessage = validateAboutContent(about);

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    const nextSiteContent = {
      ...store.siteContent,
      about
    };

    await writeSiteContent(nextSiteContent);
    await recordAdminAuditEvent(req, {
      action: "site.about_updated",
      entityType: "site-content",
      entityId: "about",
      entityLabel: "About content",
      details: {
        changedFields: listChangedKeys(
          store.siteContent.about,
          about,
          Object.keys(about)
        )
      }
    });

    return res.json({ about });
  } catch (error) {
    next(error);
  }
});

router.put("/site-content/site", async (req, res, next) => {
  try {
    const store = await readStore();
    const branding = normalizeBrandingContent(
      req.body.branding,
      store.siteContent.branding
    );
    const home = normalizeHomeContent(req.body.home, store.siteContent.home);
    const existingThemes = Array.isArray(store.siteContent.collectionThemes)
      ? store.siteContent.collectionThemes
      : [];
    const existingGuidedPaths = Array.isArray(store.siteContent.guidedPaths)
      ? store.siteContent.guidedPaths
      : [];
    const collectionThemes = Array.isArray(req.body.collectionThemes)
      ? req.body.collectionThemes
          .map((theme) =>
            normalizeThemeProfileInput(
              theme,
              existingThemes.find((entry) => entry.key === theme.key) || {}
            )
          )
          .filter((theme) => theme.key)
      : existingThemes;
    const guidedPaths = normalizeGuidedPathsInput(
      req.body.guidedPaths,
      existingGuidedPaths
    );
    const validationMessage = validateSiteContent(branding, home);

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    const nextSiteContent = {
      ...store.siteContent,
      branding,
      home,
      collectionThemes,
      guidedPaths
    };

    await writeSiteContent(nextSiteContent);
    await recordAdminAuditEvent(req, {
      action: "site.settings_updated",
      entityType: "site-content",
      entityId: "site",
      entityLabel: branding.siteName || "Site settings",
      details: {
        changedSections: [
          JSON.stringify(store.siteContent.branding) !==
          JSON.stringify(branding)
            ? "branding"
            : "",
          JSON.stringify(store.siteContent.home) !== JSON.stringify(home)
            ? "home"
            : "",
          JSON.stringify(existingThemes) !== JSON.stringify(collectionThemes)
            ? "collectionThemes"
            : "",
          JSON.stringify(existingGuidedPaths) !== JSON.stringify(guidedPaths)
            ? "guidedPaths"
            : ""
        ].filter(Boolean),
        featuredReleaseSlug: home.featuredReleaseSlug,
        guidedPathCount: guidedPaths.length,
        siteName: branding.siteName,
        themeCount: collectionThemes.length
      }
    });

    return res.json({ siteContent: nextSiteContent });
  } catch (error) {
    next(error);
  }
});

router.get("/insights", async (req, res, next) => {
  try {
    const store = await readStore();
    return res.json({ insights: buildArchiveInsights(store) });
  } catch (error) {
    next(error);
  }
});

router.get("/assistant/status", async (req, res, next) => {
  try {
    const assistantSelection = getAssistantModelSelection(req);
    const [status, remoteAi] = await Promise.all([
      getLocalAiStatus(assistantSelection),
      getRemoteAiStatus()
    ]);
    return res.json({
      localAi: status,
      remoteAi,
      remoteTunnel: remoteAi.tunnel
    });
  } catch (error) {
    next(error);
  }
});

router.get("/assistant/remote-tunnel/status", async (req, res) => {
  try {
    const remoteTunnel = await getRemoteAiTunnelStatus();
    return res.json({ remoteTunnel });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Failed to read the remote AI SSH tunnel."
    });
  }
});

router.post("/assistant/remote-tunnel/start", async (req, res) => {
  try {
    const remoteTunnel = await startRemoteAiTunnel();

    await recordAdminAuditEvent(req, {
      action: "assistant.remote_tunnel_started",
      entityType: "assistant",
      entityId: "remote-ai-tunnel",
      entityLabel: "Remote AI SSH tunnel",
      details: {
        localUrl: remoteTunnel.localUrl,
        pid: remoteTunnel.pid || 0,
        sshHost: remoteTunnel.sshHost || "",
        sshPort: remoteTunnel.sshPort || 0
      }
    });

    return res.json({ remoteTunnel });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Failed to start the remote AI SSH tunnel."
    });
  }
});

router.post("/assistant/remote-tunnel/stop", async (req, res) => {
  try {
    const remoteTunnel = await stopRemoteAiTunnel();

    await recordAdminAuditEvent(req, {
      action: "assistant.remote_tunnel_stopped",
      entityType: "assistant",
      entityId: "remote-ai-tunnel",
      entityLabel: "Remote AI SSH tunnel",
      details: {
        localUrl: remoteTunnel.localUrl,
        sshHost: remoteTunnel.sshHost || "",
        sshPort: remoteTunnel.sshPort || 0
      }
    });

    return res.json({ remoteTunnel });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Failed to stop the remote AI SSH tunnel."
    });
  }
});

router.post("/assistant/remote-ollama/wake", async (req, res) => {
  try {
    const remoteOllama = await wakeRemoteOllama();

    await recordAdminAuditEvent(req, {
      action: "assistant.remote_ollama_woken",
      entityType: "assistant",
      entityId: "remote-ollama",
      entityLabel: "Remote Ollama",
      details: {
        startedNow: Boolean(remoteOllama.startedNow),
        alreadyRunning: Boolean(remoteOllama.alreadyRunning),
        modelInstalled: Boolean(remoteOllama.modelInstalled),
        sshHost: remoteOllama.sshHost || "",
        sshPort: remoteOllama.sshPort || 0
      }
    });

    return res.json({ remoteOllama });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      message: error.message || "Failed to wake remote Ollama."
    });
  }
});

router.post("/assistant/catalog-review", async (req, res, next) => {
  try {
    const store = await readStore();
    const assistantSelection = getAssistantModelSelection(req);
    const review = await reviewCatalogWithLocalAi(store, assistantSelection);

    await recordAdminAuditEvent(req, {
      action: "assistant.catalog_reviewed",
      entityType: "assistant",
      entityId: "local-ai",
      entityLabel: "Local AI catalog review",
      details: {
        model: review.model,
        selectedProfileKey: assistantSelection.profile || "",
        riskCount: review.risks.length,
        suggestedActionCount: review.suggestedActions.length
      }
    });

    return res.json({ review });
  } catch (error) {
    if (error.localAiStatus) {
      return res.status(error.statusCode || 503).json({
        message: error.message,
        localAi: error.localAiStatus
      });
    }

    next(error);
  }
});

router.post("/assistant/catalog-finding-review", async (req, res, next) => {
  try {
    const store = await readStore();
    const assistantSelection = getAssistantModelSelection(req);
    const review = await reviewCatalogFindingWithLocalAi(
      store,
      req.body?.finding || {},
      assistantSelection
    );
    const nextDecisions = upsertAssistantFindingDecision(
      store.siteContent?.assistantFindingDecisions,
      review.decision
    );
    const nextSiteContent = {
      ...store.siteContent,
      assistantFindingDecisions: nextDecisions
    };

    await writeSiteContent(nextSiteContent);
    await recordAdminAuditEvent(req, {
      action: "assistant.catalog_finding_reviewed",
      entityType: "assistant",
      entityId: review.finding?.fingerprint || "catalog-finding",
      entityLabel:
        review.finding?.targetSlug ||
        req.body?.finding?.targetSlug ||
        "Finding",
      details: {
        changedFields: Object.keys(review.suggestedPatch || {}),
        model: review.model,
        reasonCode: review.reasonCode,
        selectedProfileKey: assistantSelection.profile || "",
        targetSlug: review.finding?.targetSlug || "",
        verdict: review.verdict
      }
    });

    return res.json({ review, decision: review.decision });
  } catch (error) {
    if (error.localAiStatus) {
      return res.status(error.statusCode || 503).json({
        message: error.message,
        localAi: error.localAiStatus
      });
    }

    if (error.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    next(error);
  }
});

router.post("/assistant/catalog-finding-dismiss", async (req, res, next) => {
  try {
    const store = await readStore();
    const decision = buildAssistantFindingDecision(
      store,
      req.body?.finding || {},
      {
        status: "dismissed",
        reasonCode: "manual-dismissal",
        summary:
          String(req.body?.summary || "").trim() ||
          "Finding dismissed by admin."
      }
    );
    const nextDecisions = upsertAssistantFindingDecision(
      store.siteContent?.assistantFindingDecisions,
      decision
    );
    const nextSiteContent = {
      ...store.siteContent,
      assistantFindingDecisions: nextDecisions
    };

    await writeSiteContent(nextSiteContent);
    await recordAdminAuditEvent(req, {
      action: "assistant.catalog_finding_dismissed",
      entityType: "assistant",
      entityId: decision.fingerprint,
      entityLabel: decision.targetSlug || "Catalog finding",
      details: {
        field: decision.field,
        reasonCode: decision.reasonCode,
        targetSlug: decision.targetSlug
      }
    });

    return res.json({ decision });
  } catch (error) {
    next(error);
  }
});

router.post("/assistant/post-suggestions", async (req, res, next) => {
  try {
    const store = await readStore();
    const assistantSelection = getAssistantModelSelection(req);
    const suggestion = await suggestPostDraftWithLocalAi(
      store,
      req.body?.postDraft || {},
      assistantSelection
    );

    await recordAdminAuditEvent(req, {
      action: "assistant.post_suggested",
      entityType: "assistant",
      entityId: "local-ai",
      entityLabel: req.body?.postDraft?.title || "Post assistant suggestion",
      details: {
        changedFields: Object.keys(suggestion.suggestedPatch || {}),
        model: suggestion.model,
        selectedProfileKey: assistantSelection.profile || "",
        warningCount: suggestion.warnings.length
      }
    });

    return res.json({ suggestion });
  } catch (error) {
    if (error.localAiStatus) {
      return res.status(error.statusCode || 503).json({
        message: error.message,
        localAi: error.localAiStatus
      });
    }

    next(error);
  }
});

router.post("/assistant/guided-path-suggestions", async (req, res, next) => {
  try {
    const store = await readStore();
    const assistantSelection = getAssistantModelSelection(req);
    const suggestion = await suggestGuidedPathWithLocalAi(
      store,
      req.body?.guidedPath || {},
      assistantSelection
    );

    await recordAdminAuditEvent(req, {
      action: "assistant.guided_path_suggested",
      entityType: "assistant",
      entityId: "local-ai",
      entityLabel:
        req.body?.guidedPath?.title || "Guided path assistant suggestion",
      details: {
        changedFields: Object.keys(suggestion.suggestedPatch || {}),
        mode: suggestion.mode,
        model: suggestion.model,
        selectedProfileKey: assistantSelection.profile || "",
        warningCount: suggestion.warnings.length
      }
    });

    return res.json({ suggestion });
  } catch (error) {
    if (error.localAiStatus) {
      return res.status(error.statusCode || 503).json({
        message: error.message,
        localAi: error.localAiStatus
      });
    }

    next(error);
  }
});

router.post("/assistant/guided-path-new-suggestion", async (req, res, next) => {
  try {
    const store = await readStore();
    const assistantSelection = getAssistantModelSelection(req);
    const existingPaths = Array.isArray(req.body?.guidedPaths)
      ? req.body.guidedPaths
      : store.siteContent?.guidedPaths || [];
    const suggestion = await suggestNewGuidedPathWithLocalAi(
      store,
      existingPaths,
      assistantSelection
    );

    await recordAdminAuditEvent(req, {
      action: "assistant.guided_path_new_suggested",
      entityType: "assistant",
      entityId: "local-ai",
      entityLabel:
        suggestion.suggestedPatch?.title || "New guided path suggestion",
      details: {
        mode: suggestion.mode,
        model: suggestion.model,
        selectedProfileKey: assistantSelection.profile || "",
        slug: suggestion.suggestedPatch?.slug || "",
        warningCount: suggestion.warnings.length
      }
    });

    return res.json({ suggestion });
  } catch (error) {
    if (error.localAiStatus) {
      return res.status(error.statusCode || 503).json({
        message: error.message,
        localAi: error.localAiStatus
      });
    }

    next(error);
  }
});

router.post("/importer/launch", async (req, res, next) => {
  try {
    const result = await launchImporter();
    await recordAdminAuditEvent(req, {
      action: result.alreadyRunning ? "importer.opened" : "importer.launched",
      entityType: "tool",
      entityId: "song-importer",
      entityLabel: "Song importer",
      details: {
        alreadyRunning: result.alreadyRunning,
        logPath: result.logPath || "",
        started: result.started,
        url: result.url
      }
    });

    return res.json({
      message: result.external
        ? "Importer URL is configured."
        : result.alreadyRunning
          ? "Importer is already running."
          : "Importer launched.",
      importer: result
    });
  } catch (error) {
    next(error);
  }
});

router.get("/live-store-sync", async (req, res, next) => {
  try {
    const preview = await previewLiveStoreSync();
    return res.json({
      preview: {
        generatedAt: preview.report.generatedAt,
        postsFile: preview.report.postsFile,
        report: preview.report,
        artifactPaths: {
          liveSnapshotPath: preview.liveSnapshotPath,
          reportPath: preview.reportPath
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/live-store-sync",
  requireCatalogFileMutationsEnabled,
  async (req, res, next) => {
    try {
      const result = await applyLiveStoreSync();
      await recordAdminAuditEvent(req, {
        action: "catalog.live_store_synced_to_file",
        entityType: "catalog",
        entityId: path.basename(result.report.postsFile || ""),
        entityLabel: "Tracked catalog sync",
        details: {
          backupPath: result.backupPath,
          postsFile: result.report.postsFile,
          reportPath: result.reportPath
        }
      });
      return res.json({
        message: `Live admin data was written back into ${path.basename(result.report.postsFile || "the catalog file")}.`,
        sync: {
          generatedAt: result.report.generatedAt,
          postsFile: result.report.postsFile,
          report: result.report,
          artifactPaths: {
            liveSnapshotPath: result.liveSnapshotPath,
            reportPath: result.reportPath,
            backupPath: result.backupPath
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/reseed-live-site",
  requireCatalogFileMutationsEnabled,
  async (req, res) => {
    try {
      const job = startPostFileReseedJob();
      await recordAdminAuditEvent(req, {
        action: "site.reseed_started",
        entityType: "site",
        entityId: path.basename(config.postsFile || ""),
        entityLabel: "Live site reseed",
        details: {
          jobId: job.jobId,
          postsFile: config.postsFile || ""
        }
      });

      return res.status(202).json({
        message:
          "Live site reseed started. Progress will update automatically.",
        reseedJob: job
      });
    } catch (error) {
      return res.status(500).json({
        message: error.message || "Failed to start live site reseed."
      });
    }
  }
);

router.get("/reseed-live-site/jobs/:jobId", async (req, res) => {
  const job = getPostFileReseedJob(req.params.jobId);
  if (!job) {
    return res.status(404).json({ message: "Unknown reseed job." });
  }

  return res.json({ reseedJob: job });
});

router.get("/comments", async (req, res, next) => {
  try {
    const store = await readStore();
    const requestedStatus = String(req.query.status || "").trim();
    const comments = store.comments
      .filter((comment) => {
        if (!requestedStatus) {
          return true;
        }

        if (requestedStatus === "reported") {
          return (Array.isArray(comment.reports) ? comment.reports : []).some(
            (report) => String(report?.status || "open") !== "dismissed"
          );
        }

        return comment.status === requestedStatus;
      })
      .map((comment) =>
        attachCommentDetails(comment, store.users, { includeModeration: true })
      );

    return res.json({ comments });
  } catch (error) {
    next(error);
  }
});

router.put("/comments/:id", async (req, res, next) => {
  try {
    const store = await readStore();
    const existingComment = store.comments.find(
      (entry) => entry.id === req.params.id
    );

    if (!existingComment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    const status = String(req.body.status || "").trim();
    const validationMessage = validateCommentStatus(status);

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    const nextComment = {
      ...existingComment,
      status,
      updatedAt: new Date().toISOString()
    };

    await replaceComment(nextComment);
    await recordAdminAuditEvent(req, {
      action: "comment.moderated",
      entityType: "comment",
      entityId: nextComment.id,
      entityLabel: existingComment.postSlug,
      details: {
        authorId: existingComment.authorId,
        nextStatus: nextComment.status,
        postSlug: existingComment.postSlug,
        previousStatus: existingComment.status
      }
    });

    return res.json({
      comment: attachCommentDetails(nextComment, store.users, {
        includeModeration: true
      })
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/comments/:id", async (req, res, next) => {
  try {
    const store = await readStore();
    const existingComment = store.comments.find(
      (entry) => entry.id === req.params.id
    );

    if (!existingComment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    await deleteCommentById(existingComment.id);
    await recordAdminAuditEvent(req, {
      action: "comment.deleted",
      entityType: "comment",
      entityId: existingComment.id,
      entityLabel: existingComment.postSlug,
      details: {
        authorId: existingComment.authorId,
        postSlug: existingComment.postSlug,
        previousStatus: existingComment.status
      }
    });

    return res.json({ message: "Comment deleted." });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
