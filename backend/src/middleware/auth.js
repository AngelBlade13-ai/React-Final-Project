const jwt = require("jsonwebtoken");
const config = require("../config");
const { issueAdminToken } = require("../services/authUserService");
const {
  ADMIN_SESSION_COOKIE,
  USER_SESSION_COOKIE,
  clearAdminSessionCookie,
  clearUserSessionCookie
} = require("../services/sessionCookieService");

function getBearerToken(req) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return "";
  }

  return header.slice(7);
}

function getTokenFromRequest(req, { allowAdminCookie = true, allowUserCookie = true } = {}) {
  const bearerToken = getBearerToken(req);

  if (bearerToken) {
    return {
      token: bearerToken,
      source: "header"
    };
  }

  if (allowUserCookie && req.cookies?.[USER_SESSION_COOKIE]) {
    return {
      token: req.cookies[USER_SESSION_COOKIE],
      source: "user_cookie"
    };
  }

  if (allowAdminCookie && req.cookies?.[ADMIN_SESSION_COOKIE]) {
    return {
      token: req.cookies[ADMIN_SESSION_COOKIE],
      source: "admin_cookie"
    };
  }

  return {
    token: "",
    source: ""
  };
}

function clearCookieForSource(res, source) {
  if (source === "admin_cookie") {
    clearAdminSessionCookie(res);
  }

  if (source === "user_cookie") {
    clearUserSessionCookie(res);
  }
}

function refreshAdminCookieForSource(res, source, payload) {
  if (source !== "admin_cookie" || payload?.role !== "admin") {
    return;
  }

  const {
    setAdminSessionCookie
  } = require("../services/sessionCookieService");
  setAdminSessionCookie(res, issueAdminToken());
}

function authenticate(req, res, next) {
  const { token, source } = getTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({ message: "Authentication required." });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.auth = payload;
    refreshAdminCookieForSource(res, source, payload);
    return next();
  } catch {
    clearCookieForSource(res, source);
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

function requireAdmin(req, res, next) {
  const { token, source } = getTokenFromRequest(req, {
    allowAdminCookie: true,
    allowUserCookie: true
  });

  if (!token) {
    return res.status(401).json({ message: "Authentication required." });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);

    if (payload.role !== "admin") {
      return res.status(403).json({ message: "Admin access required." });
    }

    req.admin = payload;
    req.auth = payload;
    refreshAdminCookieForSource(res, source, payload);
    return next();
  } catch {
    clearCookieForSource(res, source);
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

function requireUser(req, res, next) {
  const { token, source } = getTokenFromRequest(req, { allowAdminCookie: true, allowUserCookie: true });

  if (!token) {
    return res.status(401).json({ message: "Authentication required." });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);

    if (payload.role !== "user" && payload.role !== "admin") {
      return res.status(403).json({ message: "User access required." });
    }

    req.user = payload;
    req.auth = payload;
    refreshAdminCookieForSource(res, source, payload);
    return next();
  } catch {
    clearCookieForSource(res, source);
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

module.exports = {
  authenticate,
  requireAdmin,
  requireUser
};
