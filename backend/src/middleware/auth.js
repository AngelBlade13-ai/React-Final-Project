const jwt = require("jsonwebtoken");
const config = require("../config");

function getTokenFromRequest(req) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return "";
  }

  return header.slice(7);
}

function authenticate(req, res, next) {
  const token = getTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({ message: "Authentication required." });
  }

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.auth = payload;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

function requireAdmin(req, res, next) {
  const token = getTokenFromRequest(req);

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
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

function requireUser(req, res, next) {
  const token = getTokenFromRequest(req);

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
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

module.exports = {
  authenticate,
  requireAdmin,
  requireUser
};
