const jwt = require("jsonwebtoken");
const config = require("../config");

function requireAdmin(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, config.jwtSecret);

    if (payload.role !== "admin") {
      return res.status(403).json({ message: "Admin access required." });
    }

    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

module.exports = {
  requireAdmin
};
