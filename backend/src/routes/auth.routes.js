const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const config = require("../config");
const { readStore, insertUser, replaceUser } = require("../data/store");
const { requireUser } = require("../middleware/auth");
const { loginLimiter, userAuthLimiter } = require("../middleware/rateLimiters");
const {
  issueAdminToken,
  issueAuthToken,
  normalizeUserInput,
  sanitizeUser
} = require("../services/authUserService");
const {
  clearAdminSessionCookie,
  clearUserSessionCookie,
  setAdminSessionCookie,
  setUserSessionCookie
} = require("../services/sessionCookieService");
const { recordAdminAuditEvent } = require("../services/adminAuditService");
const {
  validateProfileUpdateInput,
  validateRegistrationInput
} = require("../validators/contentValidators");
const {
  attachCollectionDetails,
  isPostPubliclyVisible,
  resolvePublishedPost
} = require("../services/catalogService");

const router = express.Router();
const VALID_REACTIONS = new Set([
  "haunted-me",
  "made-me-cry",
  "on-repeat",
  "cinematic",
  "soft-place"
]);

router.post("/admin/login", loginLimiter, async (req, res, next) => {
  try {
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

    const token = issueAdminToken();
    clearUserSessionCookie(res);
    setAdminSessionCookie(res, token);
    await recordAdminAuditEvent(req, {
      action: "session.login",
      actorEmail: config.adminEmail,
      entityType: "session",
      entityId: config.adminEmail,
      entityLabel: "Admin session",
      details: {
        source: "admin_login"
      }
    });

    return res.json({
      token,
      admin: {
        email: config.adminEmail,
        role: "admin"
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post("/auth/register", userAuthLimiter, async (req, res, next) => {
  try {
    const store = await readStore();
    const userInput = normalizeUserInput(req.body);
    const password = String(req.body.password || "");
    const validationMessage = validateRegistrationInput(userInput, password);

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    if (store.users.some((entry) => entry.email === userInput.email)) {
      return res
        .status(400)
        .json({ message: "An account with that email already exists." });
    }

    const timestamp = new Date().toISOString();
    const user = {
      id: crypto.randomUUID(),
      displayName: userInput.displayName,
      email: userInput.email,
      passwordHash: await bcrypt.hash(password, 12),
      role: "user",
      status: "active",
      savedReleaseSlugs: [],
      recentReleaseSlugs: [],
      releaseReactions: {},
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await insertUser(user);
    clearAdminSessionCookie(res);
    setUserSessionCookie(res, issueAuthToken(user));

    return res.status(201).json({
      token: issueAuthToken(user),
      user: sanitizeUser(user)
    });
  } catch (error) {
    next(error);
  }
});

router.post("/auth/login", userAuthLimiter, async (req, res, next) => {
  try {
    const store = await readStore();
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const password = String(req.body.password || "");
    const user = store.users.find((entry) => entry.email === email);

    if (!user || user.status !== "active") {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    clearAdminSessionCookie(res);
    setUserSessionCookie(res, issueAuthToken(user));

    return res.json({
      token: issueAuthToken(user),
      user: sanitizeUser(user)
    });
  } catch (error) {
    next(error);
  }
});

router.post("/auth/logout", (req, res) => {
  clearUserSessionCookie(res);
  return res.json({ message: "Signed out." });
});

router.post("/admin/logout", (req, res) => {
  clearAdminSessionCookie(res);
  return res.json({ message: "Signed out." });
});

router.get("/auth/me", requireUser, async (req, res, next) => {
  try {
    if (req.auth.role === "admin") {
      return res
        .status(403)
        .json({ message: "Admin sessions are managed separately." });
    }

    const store = await readStore();
    const user = store.users.find((entry) => entry.id === req.auth.sub);

    if (!user || user.status !== "active") {
      return res
        .status(401)
        .json({ message: "User session is no longer valid." });
    }

    return res.json({ user: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
});

router.put("/auth/me", requireUser, async (req, res, next) => {
  try {
    if (req.user.role === "admin") {
      return res
        .status(403)
        .json({ message: "Admin accounts are managed separately." });
    }

    const store = await readStore();
    const existingUser = store.users.find((entry) => entry.id === req.user.sub);

    if (!existingUser) {
      return res.status(404).json({ message: "User not found." });
    }

    const nextDisplayName = String(req.body.displayName || "").trim();
    const nextPassword = String(req.body.password || "");
    const validationMessage = validateProfileUpdateInput(nextDisplayName);

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    const nextUser = {
      ...existingUser,
      displayName: nextDisplayName,
      passwordHash: nextPassword
        ? await bcrypt.hash(nextPassword, 12)
        : existingUser.passwordHash,
      updatedAt: new Date().toISOString()
    };

    await replaceUser(nextUser);
    clearAdminSessionCookie(res);
    setUserSessionCookie(res, issueAuthToken(nextUser));

    return res.json({
      token: issueAuthToken(nextUser),
      user: sanitizeUser(nextUser)
    });
  } catch (error) {
    next(error);
  }
});

function getActivePublicUser(store, req) {
  return store.users.find(
    (entry) => entry.id === req.user.sub && entry.status === "active"
  );
}

function resolveLibraryPosts(store, slugs = []) {
  const postsBySlug = new Map(
    store.posts
      .filter((post) => isPostPubliclyVisible(post))
      .map((post) => [post.slug, attachCollectionDetails(post, store.collections)])
  );

  return slugs.map((slug) => postsBySlug.get(slug)).filter(Boolean);
}

router.get("/auth/library", requireUser, async (req, res, next) => {
  try {
    const store = await readStore();
    const user = getActivePublicUser(store, req);

    if (!user) {
      return res.status(401).json({ message: "User session is no longer valid." });
    }

    return res.json({
      savedReleases: resolveLibraryPosts(store, user.savedReleaseSlugs),
      recentReleases: resolveLibraryPosts(store, user.recentReleaseSlugs),
      releaseReactions: user.releaseReactions || {}
    });
  } catch (error) {
    next(error);
  }
});

router.put("/auth/library/releases/:slug/save", requireUser, async (req, res, next) => {
  try {
    const store = await readStore();
    const user = getActivePublicUser(store, req);
    const { entry: post } = resolvePublishedPost(store, req.params.slug);

    if (!user) {
      return res.status(401).json({ message: "User session is no longer valid." });
    }

    if (!post) {
      return res.status(404).json({ message: "Release not found." });
    }

    const shouldSave = req.body.saved !== false;
    const currentSlugs = Array.isArray(user.savedReleaseSlugs)
      ? user.savedReleaseSlugs
      : [];
    const nextSavedReleaseSlugs = shouldSave
      ? [post.slug, ...currentSlugs.filter((slug) => slug !== post.slug)]
      : currentSlugs.filter((slug) => slug !== post.slug);
    const nextUser = {
      ...user,
      savedReleaseSlugs: nextSavedReleaseSlugs,
      updatedAt: new Date().toISOString()
    };

    await replaceUser(nextUser);

    return res.json({
      user: sanitizeUser(nextUser),
      saved: shouldSave,
      savedReleaseSlugs: nextSavedReleaseSlugs
    });
  } catch (error) {
    next(error);
  }
});

router.put("/auth/library/releases/:slug/reaction", requireUser, async (req, res, next) => {
  try {
    const store = await readStore();
    const user = getActivePublicUser(store, req);
    const { entry: post } = resolvePublishedPost(store, req.params.slug);
    const reaction = String(req.body.reaction || "").trim();

    if (!user) {
      return res.status(401).json({ message: "User session is no longer valid." });
    }

    if (!post) {
      return res.status(404).json({ message: "Release not found." });
    }

    if (reaction && !VALID_REACTIONS.has(reaction)) {
      return res.status(400).json({ message: "Choose a supported reaction." });
    }

    const releaseReactions = { ...(user.releaseReactions || {}) };

    if (reaction) {
      releaseReactions[post.slug] = reaction;
    } else {
      delete releaseReactions[post.slug];
    }

    const nextUser = {
      ...user,
      releaseReactions,
      updatedAt: new Date().toISOString()
    };

    await replaceUser(nextUser);

    return res.json({
      user: sanitizeUser(nextUser),
      releaseReactions
    });
  } catch (error) {
    next(error);
  }
});

router.post("/auth/library/releases/:slug/listen", requireUser, async (req, res, next) => {
  try {
    const store = await readStore();
    const user = getActivePublicUser(store, req);
    const { entry: post } = resolvePublishedPost(store, req.params.slug);

    if (!user) {
      return res.status(401).json({ message: "User session is no longer valid." });
    }

    if (!post) {
      return res.status(404).json({ message: "Release not found." });
    }

    const recentReleaseSlugs = [
      post.slug,
      ...(Array.isArray(user.recentReleaseSlugs)
        ? user.recentReleaseSlugs.filter((slug) => slug !== post.slug)
        : [])
    ].slice(0, 12);
    const nextUser = {
      ...user,
      recentReleaseSlugs,
      updatedAt: new Date().toISOString()
    };

    await replaceUser(nextUser);

    return res.json({
      user: sanitizeUser(nextUser),
      recentReleaseSlugs
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
