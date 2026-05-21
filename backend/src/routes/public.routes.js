const express = require("express");
const crypto = require("crypto");
const { readStore, insertComment, deleteCommentById, replaceComment } = require("../data/store");
const { requireUser } = require("../middleware/auth");
const { commentWriteLimiter } = require("../middleware/rateLimiters");
const {
  attachCommentDetails,
  canManageComment,
  normalizeCommentInput
} = require("../services/authUserService");
const {
  attachCollectionDetails,
  buildCollectionSummary,
  isPostPubliclyVisible,
  listPublicCollections,
  resolveCollectionBySlug,
  resolvePublishedPost
} = require("../services/catalogService");
const { validateCommentBody } = require("../validators/contentValidators");

const router = express.Router();

router.get("/posts", async (req, res, next) => {
  try {
    const store = await readStore();
    const publishedPosts = store.posts
      .filter((post) => isPostPubliclyVisible(post))
      .map((post) => attachCollectionDetails(post, store.collections));

    return res.json({ posts: publishedPosts });
  } catch (error) {
    next(error);
  }
});

router.get("/posts/:slug", async (req, res, next) => {
  try {
    const store = await readStore();
    const { entry: post, redirectSlug } = resolvePublishedPost(store, req.params.slug);

    if (!post) {
      return res.status(404).json({ message: "Release not found." });
    }

    return res.json({
      post: attachCollectionDetails(post, store.collections),
      redirectSlug
    });
  } catch (error) {
    next(error);
  }
});

router.get("/posts/:slug/comments", async (req, res, next) => {
  try {
    const store = await readStore();
    const { entry: post, redirectSlug } = resolvePublishedPost(store, req.params.slug);

    if (!post) {
      return res.status(404).json({ message: "Release not found." });
    }

    const comments = store.comments
      .filter((comment) => comment.postSlug === post.slug && comment.status === "visible")
      .sort((left, right) => String(left.createdAt).localeCompare(String(right.createdAt)))
      .map((comment) => attachCommentDetails(comment, store.users));

    return res.json({ comments, redirectSlug });
  } catch (error) {
    next(error);
  }
});

router.post("/posts/:slug/comments", commentWriteLimiter, requireUser, async (req, res, next) => {
  try {
    const store = await readStore();
    const { entry: post, redirectSlug } = resolvePublishedPost(store, req.params.slug);

    if (!post) {
      return res.status(404).json({ message: "Release not found." });
    }

    const body = String(req.body.body || "").trim();
    const validationMessage = validateCommentBody(body);

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    const user = store.users.find((entry) => entry.id === req.user.sub && entry.status === "active");

    if (!user) {
      return res.status(401).json({ message: "User session is no longer valid." });
    }

    const timestamp = new Date().toISOString();
    const comment = {
      id: crypto.randomUUID(),
      postSlug: post.slug,
      authorId: user.id,
      body,
      status: "visible",
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await insertComment(comment);

    return res.status(201).json({
      comment: attachCommentDetails(comment, store.users),
      redirectSlug
    });
  } catch (error) {
    next(error);
  }
});

router.put("/comments/:id", commentWriteLimiter, requireUser, async (req, res, next) => {
  try {
    const store = await readStore();
    const existingComment = store.comments.find((entry) => entry.id === req.params.id);

    if (!existingComment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    if (!canManageComment(req.user, existingComment)) {
      return res.status(403).json({ message: "You do not have permission to edit this comment." });
    }

    const nextComment = normalizeCommentInput(req.body, existingComment);
    const validationMessage = validateCommentBody(nextComment.body);

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    await replaceComment(nextComment);

    return res.json({ comment: attachCommentDetails(nextComment, store.users) });
  } catch (error) {
    next(error);
  }
});

router.delete("/comments/:id", commentWriteLimiter, requireUser, async (req, res, next) => {
  try {
    const store = await readStore();
    const comment = store.comments.find((entry) => entry.id === req.params.id);

    if (!comment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    if (!canManageComment(req.user, comment)) {
      return res.status(403).json({ message: "You do not have permission to delete this comment." });
    }

    await deleteCommentById(req.params.id);

    return res.json({ message: "Comment deleted." });
  } catch (error) {
    next(error);
  }
});

router.get("/collections", async (req, res, next) => {
  try {
    const store = await readStore();
    const collections = listPublicCollections(store, req.query.scope);

    return res.json({ collections });
  } catch (error) {
    next(error);
  }
});

router.get("/collections/:slug", async (req, res, next) => {
  try {
    const store = await readStore();
    const { entry: collection, redirectSlug } = resolveCollectionBySlug(store, req.params.slug);

    if (!collection) {
      return res.status(404).json({ message: "Collection not found." });
    }

    const releases = store.posts
      .filter((post) => isPostPubliclyVisible(post) && post.collectionSlugs.includes(collection.slug))
      .map((post) => attachCollectionDetails(post, store.collections));

    return res.json({
      collection: buildCollectionSummary(collection, releases),
      releases,
      redirectSlug
    });
  } catch (error) {
    next(error);
  }
});

router.get("/about", async (req, res, next) => {
  try {
    const store = await readStore();
    return res.json({ about: store.siteContent.about });
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

module.exports = router;
