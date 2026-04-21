const express = require("express");
const crypto = require("crypto");
const { requireAdmin } = require("../middleware/auth");
const {
  deleteCollectionById,
  deleteCommentsByPostSlug,
  deletePostById,
  insertCollection,
  insertPost,
  readStore,
  renameCommentsForPostSlug,
  replaceCollections,
  replaceComment,
  replacePosts,
  runStoreTransaction,
  writeSiteContent
} = require("../data/store");
const { buildArchiveInsights } = require("../services/archiveInsights");
const { attachCommentDetails } = require("../services/authUserService");
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
  normalizeHomeContent,
  normalizeThemeProfileInput
} = require("../services/siteContentService");
const {
  validateAboutContent,
  validateCollectionDraft,
  validateCommentStatus,
  validatePostDraft,
  validateSiteContent
} = require("../validators/contentValidators");

const router = express.Router();

router.use(requireAdmin);

router.get("/session", (req, res) => {
  return res.json({
    admin: {
      email: req.admin.email,
      role: "admin"
    }
  });
});

router.get("/posts", async (req, res, next) => {
  try {
    const store = await readStore();
    return res.json({
      posts: store.posts.map((post) => attachCollectionDetails(post, store.collections)),
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
      return res.status(400).json({ message: "A post already uses or reserves that slug." });
    }

    await insertPost(newPost);

    return res.status(201).json({ post: attachCollectionDetails(newPost, store.collections) });
  } catch (error) {
    next(error);
  }
});

router.post("/posts/bulk-update", async (req, res, next) => {
  try {
    const store = await readStore();
    const postIds = Array.isArray(req.body.postIds)
      ? [...new Set(req.body.postIds.map((id) => String(id || "").trim()).filter(Boolean))]
      : [];
    const updates = normalizeBulkPostUpdateInput(req.body.updates, store.collections);

    if (!postIds.length) {
      return res.status(400).json({ message: "Select at least one post before applying a bulk action." });
    }

    if (!hasBulkPostUpdates(updates)) {
      return res.status(400).json({ message: "Choose at least one bulk change before applying it." });
    }

    const postIdSet = new Set(postIds);
    const matchingPosts = store.posts.filter((post) => postIdSet.has(post.id));

    if (matchingPosts.length !== postIds.length) {
      return res.status(404).json({ message: "One or more selected posts no longer exist." });
    }

    const nextPosts = store.posts.map((post) => (postIdSet.has(post.id) ? applyBulkPostUpdates(post, updates) : post));
    const changedPosts = collectChangedEntries(store.posts, nextPosts);
    const nextCollections = reconcileCollections(store.collections, nextPosts);
    const changedCollections = collectChangedEntries(store.collections, nextCollections);

    await runStoreTransaction(async (session) => {
      if (changedPosts.length) {
        await replacePosts(changedPosts, { session });
      }

      if (changedCollections.length) {
        await replaceCollections(changedCollections, { session });
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

    const normalizedPost = normalizePostInput(req.body, store.collections, previousPost);
    const updatedPost =
      previousPost.slug !== normalizedPost.slug
        ? {
            ...normalizedPost,
            slugHistory: appendSlugHistory(previousPost.slugHistory, previousPost.slug, normalizedPost.slug)
          }
        : {
            ...normalizedPost,
            slugHistory: Array.isArray(previousPost.slugHistory) ? previousPost.slugHistory : []
          };
    const slugConflict = slugIsReserved(store.posts, updatedPost.slug, previousPost.id);

    if (slugConflict) {
      return res.status(400).json({ message: "A post already uses or reserves that slug." });
    }

    let nextPosts = store.posts.map((post) => (post.id === previousPost.id ? updatedPost : post));
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
    const changedCollections = collectChangedEntries(store.collections, nextCollections);
    const siteContentChanged = JSON.stringify(store.siteContent) !== JSON.stringify(nextSiteContent);

    await runStoreTransaction(async (session) => {
      if (changedPosts.length) {
        await replacePosts(changedPosts, { session });
      }

      if (previousPost.slug !== updatedPost.slug) {
        await renameCommentsForPostSlug(previousPost.slug, updatedPost.slug, { session });
      }

      if (changedCollections.length) {
        await replaceCollections(changedCollections, { session });
      }

      if (siteContentChanged) {
        await writeSiteContent(nextSiteContent, { session });
      }
    });

    const savedPost = nextPosts.find((post) => post.id === updatedPost.id) || updatedPost;

    return res.json({ post: attachCollectionDetails(savedPost, nextCollections) });
  } catch (error) {
    next(error);
  }
});

router.delete("/posts/:id", async (req, res, next) => {
  try {
    const store = await readStore();
    const post = store.posts.find((entry) => entry.id === req.params.id);
    const remainingPosts = store.posts.filter((entry) => entry.id !== req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found." });
    }

    const nextCollections = reconcileCollections(store.collections, remainingPosts);
    const changedCollections = collectChangedEntries(store.collections, nextCollections);
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
    const siteContentChanged = JSON.stringify(store.siteContent) !== JSON.stringify(nextSiteContent);

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
    const collection = normalizeCollectionInput(req.body, { id: crypto.randomUUID() });
    const validationMessage = validateCollectionDraft(collection);

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    if (slugIsReserved(store.collections, collection.slug)) {
      return res.status(400).json({ message: "A collection already uses or reserves that slug." });
    }

    if (!isFeaturedReleaseValidForCollection(store.posts, collection.slug, collection.featuredReleaseSlug)) {
      return res.status(400).json({ message: "The featured release must already belong to this collection." });
    }

    await insertCollection(collection);

    return res.status(201).json({ collection });
  } catch (error) {
    next(error);
  }
});

router.put("/collections/:id", async (req, res, next) => {
  try {
    const store = await readStore();
    const previousCollection = store.collections.find((collection) => collection.id === req.params.id);

    if (!previousCollection) {
      return res.status(404).json({ message: "Collection not found." });
    }

    const normalizedCollection = normalizeCollectionInput(req.body, previousCollection);
    const updatedCollection =
      previousCollection.slug !== normalizedCollection.slug
        ? {
            ...normalizedCollection,
            slugHistory: appendSlugHistory(previousCollection.slugHistory, previousCollection.slug, normalizedCollection.slug)
          }
        : {
            ...normalizedCollection,
            slugHistory: Array.isArray(previousCollection.slugHistory) ? previousCollection.slugHistory : []
          };
    const validationMessage = validateCollectionDraft(updatedCollection);

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    if (slugIsReserved(store.collections, updatedCollection.slug, previousCollection.id)) {
      return res.status(400).json({ message: "A collection already uses or reserves that slug." });
    }

    const nextPosts = store.posts.map((post) => ({
      ...post,
      collectionSlugs: post.collectionSlugs.map((slug) => (slug === previousCollection.slug ? updatedCollection.slug : slug))
    }));

    if (!isFeaturedReleaseValidForCollection(nextPosts, updatedCollection.slug, updatedCollection.featuredReleaseSlug)) {
      return res.status(400).json({ message: "The featured release must belong to this collection." });
    }

    const changedPosts = collectChangedEntries(store.posts, nextPosts);
    const nextCollections = reconcileCollections(
      store.collections.map((collection) => (collection.id === previousCollection.id ? updatedCollection : collection)),
      nextPosts
    );
    const changedCollections = collectChangedEntries(store.collections, nextCollections);

    await runStoreTransaction(async (session) => {
      if (changedPosts.length) {
        await replacePosts(changedPosts, { session });
      }

      if (changedCollections.length) {
        await replaceCollections(changedCollections, { session });
      }
    });

    return res.json({
      collection: nextCollections.find((collection) => collection.id === updatedCollection.id) || updatedCollection
    });
  } catch (error) {
    next(error);
  }
});

router.delete("/collections/:id", async (req, res, next) => {
  try {
    const store = await readStore();
    const collection = store.collections.find((entry) => entry.id === req.params.id);

    if (!collection) {
      return res.status(404).json({ message: "Collection not found." });
    }

    const remainingCollections = store.collections.filter((entry) => entry.id !== req.params.id);
    const nextPosts = store.posts.map((post) => ({
      ...post,
      collectionSlugs: post.collectionSlugs.filter((slug) => slug !== collection.slug)
    }));
    const changedPosts = collectChangedEntries(store.posts, nextPosts);
    const nextCollections = reconcileCollections(remainingCollections, nextPosts);
    const changedCollections = collectChangedEntries(remainingCollections, nextCollections);

    await runStoreTransaction(async (session) => {
      await deleteCollectionById(collection.id, { session });

      if (changedPosts.length) {
        await replacePosts(changedPosts, { session });
      }

      if (changedCollections.length) {
        await replaceCollections(changedCollections, { session });
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

    return res.json({ about });
  } catch (error) {
    next(error);
  }
});

router.put("/site-content/site", async (req, res, next) => {
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
    const validationMessage = validateSiteContent(branding, home);

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    const nextSiteContent = {
      ...store.siteContent,
      branding,
      home,
      collectionThemes
    };

    await writeSiteContent(nextSiteContent);

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

router.get("/comments", async (req, res, next) => {
  try {
    const store = await readStore();
    const requestedStatus = String(req.query.status || "").trim();
    const comments = store.comments
      .filter((comment) => (!requestedStatus ? true : comment.status === requestedStatus))
      .map((comment) => attachCommentDetails(comment, store.users));

    return res.json({ comments });
  } catch (error) {
    next(error);
  }
});

router.put("/comments/:id", async (req, res, next) => {
  try {
    const store = await readStore();
    const existingComment = store.comments.find((entry) => entry.id === req.params.id);

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

    return res.json({ comment: attachCommentDetails(nextComment, store.users) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
