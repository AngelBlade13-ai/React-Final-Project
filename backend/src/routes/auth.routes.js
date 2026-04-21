const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const config = require("../config");
const { readStore, insertUser, replaceUser } = require("../data/store");
const { authenticate, requireUser } = require("../middleware/auth");
const { loginLimiter, userAuthLimiter } = require("../middleware/rateLimiters");
const {
  issueAdminToken,
  issueAuthToken,
  normalizeUserInput,
  sanitizeUser
} = require("../services/authUserService");
const {
  validateProfileUpdateInput,
  validateRegistrationInput
} = require("../validators/contentValidators");

const router = express.Router();

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

    return res.json({
      token: issueAdminToken(),
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

    await insertUser(user);

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

router.get("/auth/me", authenticate, async (req, res, next) => {
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

router.put("/auth/me", requireUser, async (req, res, next) => {
  try {
    if (req.user.role === "admin") {
      return res.status(403).json({ message: "Admin accounts are managed separately." });
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
      passwordHash: nextPassword ? await bcrypt.hash(nextPassword, 12) : existingUser.passwordHash,
      updatedAt: new Date().toISOString()
    };

    await replaceUser(nextUser);

    return res.json({
      token: issueAuthToken(nextUser),
      user: sanitizeUser(nextUser)
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
