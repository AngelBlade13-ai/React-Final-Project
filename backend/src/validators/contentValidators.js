function validateRegistrationInput(userInput, password) {
  if (!userInput.displayName || !userInput.email || password.length < 8) {
    return "Display name, email, and a password of at least 8 characters are required.";
  }

  return "";
}

function validateProfileUpdateInput(displayName) {
  if (!displayName) {
    return "Display name is required.";
  }

  return "";
}

function validatePostDraft(post) {
  if (!post.title || !post.excerpt || !post.content) {
    return "Title, excerpt, and content are required.";
  }

  return "";
}

function validateCollectionDraft(collection) {
  if (!collection.title || !collection.description) {
    return "Title and description are required.";
  }

  return "";
}

function validateAboutContent(about) {
  if (!about.heroTitle || !about.heroText || !about.artistTitle || !about.artistText) {
    return "Complete the main About sections before saving.";
  }

  return "";
}

function validateSiteContent(branding, home) {
  if (!branding.siteName || !branding.siteTagline) {
    return "Site name and tagline are required.";
  }

  if (!home.heroTitle || !home.heroText || !home.noteTitle || !home.identityTitle) {
    return "Complete the main homepage sections before saving.";
  }

  return "";
}

function validateCommentBody(body) {
  if (!body || body.length < 2) {
    return "Comment text must be at least 2 characters.";
  }

  return "";
}

function validateCommentStatus(status) {
  if (!["visible", "hidden"].includes(status)) {
    return "Comment status must be either visible or hidden.";
  }

  return "";
}

function validateCommentReportInput(reason, details = "") {
  const allowedReasons = new Set([
    "harassment",
    "hate",
    "spam",
    "explicit",
    "misinformation",
    "other"
  ]);

  if (!allowedReasons.has(reason)) {
    return "Choose a valid report reason.";
  }

  if (details.length > 500) {
    return "Report details must be 500 characters or fewer.";
  }

  return "";
}

module.exports = {
  validateAboutContent,
  validateCollectionDraft,
  validateCommentBody,
  validateCommentReportInput,
  validateCommentStatus,
  validatePostDraft,
  validateProfileUpdateInput,
  validateRegistrationInput,
  validateSiteContent
};
