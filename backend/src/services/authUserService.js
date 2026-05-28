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
    avatarUrl: user.avatarUrl || "",
    role: user.role,
    status: user.status,
    savedReleaseSlugs: Array.isArray(user.savedReleaseSlugs)
      ? user.savedReleaseSlugs
      : [],
    recentReleaseSlugs: Array.isArray(user.recentReleaseSlugs)
      ? user.recentReleaseSlugs
      : [],
    releaseReactions:
      user.releaseReactions && typeof user.releaseReactions === "object"
        ? user.releaseReactions
        : {},
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function sanitizePublicUserProfile(user, store = {}) {
  if (!user || user.status !== "active") {
    return null;
  }

  const visibleComments = (Array.isArray(store.comments) ? store.comments : [])
    .filter(
      (comment) =>
        comment.authorId === user.id &&
        String(comment.status || "visible") === "visible"
    )
    .sort((left, right) =>
      String(right.createdAt || "").localeCompare(String(left.createdAt || ""))
    );
  const postsBySlug = new Map(
    (Array.isArray(store.posts) ? store.posts : []).map((post) => [
      post.slug,
      post
    ])
  );

  return {
    id: user.id,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl || "",
    role: user.role === "admin" ? "admin" : "user",
    createdAt: user.createdAt,
    stats: {
      visibleCommentCount: visibleComments.length
    },
    recentComments: visibleComments.slice(0, 8).map((comment) => {
      const post = postsBySlug.get(comment.postSlug);

      return {
        id: comment.id,
        body: comment.body,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        postSlug: comment.postSlug,
        postTitle: post?.title || comment.postSlug
      };
    })
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
    displayName: String(
      input.displayName || existingUser.displayName || ""
    ).trim(),
    email: String(input.email || existingUser.email || "")
      .trim()
      .toLowerCase()
  };
}

function normalizeCommentInput(input, existingComment = {}) {
  return {
    ...existingComment,
    body: String(input.body || existingComment.body || "").trim(),
    status:
      String(input.status || existingComment.status || "visible").trim() ||
      "visible",
    updatedAt: new Date().toISOString()
  };
}

function sanitizeCommentReport(report = {}, users = []) {
  const reporter = users.find((user) => user.id === report.reporterId);

  return {
    id: report.id,
    reason: report.reason,
    details: report.details || "",
    status: report.status || "open",
    createdAt: report.createdAt,
    reporter: reporter
      ? {
          id: reporter.id,
          displayName: reporter.displayName,
          avatarUrl: reporter.avatarUrl || ""
        }
      : {
          id: report.reporterId,
          displayName: "Unknown User",
          avatarUrl: ""
        }
  };
}

function attachCommentDetails(comment, users, options = {}) {
  const author = users.find((user) => user.id === comment.authorId);
  const reports = Array.isArray(comment.reports) ? comment.reports : [];
  const visibleReportCount = reports.filter(
    (report) => String(report?.status || "open") !== "dismissed"
  ).length;
  const responseComment = {
    id: comment.id,
    postSlug: comment.postSlug,
    parentCommentId: comment.parentCommentId || "",
    authorId: comment.authorId,
    body: comment.body,
    status: comment.status || "visible",
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    author: author
      ? {
          id: author.id,
          displayName: author.displayName,
          avatarUrl: author.avatarUrl || "",
          role: author.role
        }
      : {
          id: comment.authorId,
          displayName: "Unknown User",
          avatarUrl: "",
          role: "user"
        }
  };

  if (options.includeModeration) {
    responseComment.reportCount = visibleReportCount;
    responseComment.reports = reports.map((report) =>
      sanitizeCommentReport(report, users)
    );
  }

  return responseComment;
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
  sanitizePublicUserProfile,
  sanitizeUser
};
