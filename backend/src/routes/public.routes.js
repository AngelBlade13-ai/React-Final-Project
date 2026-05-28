const express = require("express");
const crypto = require("crypto");
const {
  readStore,
  insertComment,
  deleteCommentById,
  replaceComment
} = require("../data/store");
const { requireUser } = require("../middleware/auth");
const { commentWriteLimiter } = require("../middleware/rateLimiters");
const {
  attachCommentDetails,
  canManageComment,
  normalizeCommentInput,
  sanitizePublicUserProfile
} = require("../services/authUserService");
const {
  attachCollectionDetails,
  buildCollectionSummary,
  isPostPubliclyVisible,
  listPublicCollections,
  resolveCollectionBySlug,
  resolvePublishedPost
} = require("../services/catalogService");
const {
  validateCommentBody,
  validateCommentReportInput
} = require("../validators/contentValidators");

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
    const parentCommentId = String(req.body.parentCommentId || "").trim();
    const validationMessage = validateCommentBody(body);

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    const user = store.users.find((entry) => entry.id === req.user.sub && entry.status === "active");

    if (!user) {
      return res.status(401).json({ message: "User session is no longer valid." });
    }

    if (parentCommentId) {
      const parentComment = store.comments.find(
        (entry) =>
          entry.id === parentCommentId &&
          entry.postSlug === post.slug &&
          String(entry.status || "visible") === "visible"
      );

      if (!parentComment) {
        return res.status(400).json({ message: "Reply target is not available." });
      }
    }

    const timestamp = new Date().toISOString();
    const comment = {
      id: crypto.randomUUID(),
      postSlug: post.slug,
      parentCommentId,
      authorId: user.id,
      body,
      status: "visible",
      reports: [],
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

router.post("/comments/:id/report", commentWriteLimiter, requireUser, async (req, res, next) => {
  try {
    const store = await readStore();
    const existingComment = store.comments.find((entry) => entry.id === req.params.id);

    if (!existingComment || String(existingComment.status || "visible") !== "visible") {
      return res.status(404).json({ message: "Comment not found." });
    }

    const reporter = store.users.find((entry) => entry.id === req.user.sub && entry.status === "active");

    if (!reporter) {
      return res.status(401).json({ message: "User session is no longer valid." });
    }

    if (existingComment.authorId === reporter.id) {
      return res.status(400).json({ message: "You cannot report your own comment." });
    }

    const reason = String(req.body.reason || "").trim();
    const details = String(req.body.details || "").trim();
    const validationMessage = validateCommentReportInput(reason, details);

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    const reports = Array.isArray(existingComment.reports)
      ? existingComment.reports
      : [];
    const existingOpenReport = reports.find(
      (report) =>
        report.reporterId === reporter.id &&
        String(report.status || "open") !== "dismissed"
    );

    if (existingOpenReport) {
      return res.status(409).json({ message: "You already reported this comment." });
    }

    const timestamp = new Date().toISOString();
    const nextComment = {
      ...existingComment,
      reports: [
        ...reports,
        {
          id: crypto.randomUUID(),
          reporterId: reporter.id,
          reason,
          details,
          status: "open",
          createdAt: timestamp,
          updatedAt: timestamp
        }
      ],
      updatedAt: timestamp
    };

    await replaceComment(nextComment);

    return res.status(201).json({
      comment: attachCommentDetails(nextComment, store.users),
      message: "Comment reported."
    });
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

router.get("/users/:id/profile", async (req, res, next) => {
  try {
    const store = await readStore();
    const user = store.users.find((entry) => entry.id === req.params.id);
    const profile = sanitizePublicUserProfile(user, store);

    if (!profile) {
      return res.status(404).json({ message: "Profile not found." });
    }

    return res.json({ profile });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
