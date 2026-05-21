const config = require("../config");

const MUTATION_INTENT_HEADER = "x-suno-intent";
const MUTATION_INTENT_VALUE = "ui";
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function hasBearerToken(req) {
  const authorization = String(req.headers.authorization || "");
  return authorization.startsWith("Bearer ");
}

function hasTrustedMutationHeader(req) {
  return (
    String(req.headers[MUTATION_INTENT_HEADER] || "").trim().toLowerCase() ===
    MUTATION_INTENT_VALUE
  );
}

function requireTrustedMutation(req, res, next) {
  if (!UNSAFE_METHODS.has(String(req.method || "").toUpperCase())) {
    return next();
  }

  if (hasBearerToken(req) || hasTrustedMutationHeader(req)) {
    return next();
  }

  return res.status(403).json({
    message: "Blocked unsafe request. Retry from the application UI."
  });
}

function requireCatalogFileMutationsEnabled(req, res, next) {
  if (config.enableCatalogFileMutations) {
    return next();
  }

  return res.status(403).json({
    message:
      "Catalog file maintenance routes are disabled in this environment."
  });
}

module.exports = {
  MUTATION_INTENT_HEADER,
  MUTATION_INTENT_VALUE,
  requireCatalogFileMutationsEnabled,
  requireTrustedMutation
};
