const jwt = require("jsonwebtoken");
const config = require("../config");

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

function issueAdminToken() {
  return jwt.sign(
    {
      email: config.adminEmail,
      role: "admin"
    },
    config.jwtSecret,
    { expiresIn: "2h" }
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

module.exports = {
  attachCommentDetails,
  canManageComment,
  issueAdminToken,
  issueAuthToken,
  normalizeCommentInput,
  normalizeUserInput,
  sanitizeUser
};
