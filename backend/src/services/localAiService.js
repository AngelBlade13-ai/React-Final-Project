const config = require("../config");
const { slugify } = require("../utils/slugify");

const DEFAULT_REVIEW_RESULT = {
  summary: "",
  risks: [],
  suggestedActions: [],
  findings: []
};
const REVIEW_FINDING_TARGET_TYPES = new Set([
  "post",
  "collection",
  "path",
  "catalog"
]);
const REVIEW_FINDING_SEVERITIES = new Set(["info", "warning", "critical"]);
const VALID_RELEASE_STATUSES = new Set(["canon", "alternate", "working"]);
const ASSISTANT_PATCH_FIELDS = [
  "excerpt",
  "content",
  "subCategory",
  "worldLayer",
  "themeTags",
  "releaseStatus",
  "collectionSlugs"
];
const FIELD_ASSESSMENT_STATUSES = new Set([
  "keep",
  "improve",
  "missing",
  "uncertain"
]);
const ALLOWED_PATH_ALGORITHM_SORTS = new Set([
  "curated",
  "fractureverse",
  "eldoria"
]);
const ALLOWED_PATH_MATCH_MODES = new Set(["any", "all"]);
const MIN_CONTENT_CHANGE_LENGTH = 24;
const DEFAULT_LOCAL_AI_MODEL_PROFILES = [
  {
    key: "fast",
    label: "Fast",
    model: "qwen2.5:7b"
  },
  {
    key: "balanced",
    label: "Balanced",
    model: "qwen3:14b"
  },
  {
    key: "thorough",
    label: "Thorough",
    model: "qwen3:30b"
  }
];
let cachedLocalAiCatalog = null;

function clearLocalAiStatusCache() {
  cachedLocalAiCatalog = null;
}

function normalizeProfileKey(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-");
}

function normalizeModelProfilesInput(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (value && typeof value === "object") {
    return Object.entries(value).map(([key, entry]) => ({
      key,
      ...(entry && typeof entry === "object" ? entry : {})
    }));
  }

  return [];
}

function getConfiguredModelProfiles() {
  const normalizedDefaults = DEFAULT_LOCAL_AI_MODEL_PROFILES.map((profile) => ({
    ...profile,
    key: normalizeProfileKey(profile.key)
  }));

  if (!String(config.localAiModelProfilesRaw || "").trim()) {
    return normalizedDefaults;
  }

  try {
    const parsed = JSON.parse(config.localAiModelProfilesRaw);
    const profiles = normalizeModelProfilesInput(parsed)
      .map((entry, index) => {
        const key = normalizeProfileKey(entry?.key || entry?.id || `profile-${index + 1}`);
        const model = String(entry?.model || "").trim();

        if (!key || !model) {
          return null;
        }

        return {
          key,
          label: String(entry?.label || entry?.name || key).trim(),
          model
        };
      })
      .filter(Boolean);

    if (!profiles.length) {
      return normalizedDefaults;
    }

    const uniqueProfiles = [];
    const seenKeys = new Set();

    for (const profile of profiles) {
      if (seenKeys.has(profile.key)) {
        continue;
      }

      seenKeys.add(profile.key);
      uniqueProfiles.push(profile);
    }

    if (
      !uniqueProfiles.some(
        (profile) =>
          normalizeComparableText(profile.model) ===
          normalizeComparableText(config.localAiModel)
      )
    ) {
      uniqueProfiles.unshift({
        key: "default",
        label: "Default",
        model: config.localAiModel
      });
    }

    return uniqueProfiles;
  } catch {
    return normalizedDefaults;
  }
}

function resolveRequestedModel(options = {}) {
  const profiles = getConfiguredModelProfiles();
  const requestedProfileKey = normalizeProfileKey(
    options.profileKey || options.profile
  );
  const requestedModel = String(options.model || "").trim();
  let selectedProfile = requestedProfileKey
    ? profiles.find((profile) => profile.key === requestedProfileKey) || null
    : null;
  let selectedModel = selectedProfile?.model || requestedModel || "";

  if (!selectedProfile && selectedModel) {
    selectedProfile =
      profiles.find(
        (profile) =>
          normalizeComparableText(profile.model) ===
          normalizeComparableText(selectedModel)
      ) || null;
  }

  if (!selectedProfile && !selectedModel) {
    selectedProfile =
      profiles.find(
        (profile) =>
          normalizeComparableText(profile.model) ===
          normalizeComparableText(config.localAiModel)
      ) ||
      profiles[0] ||
      null;
  }

  if (!selectedModel) {
    selectedModel = selectedProfile?.model || config.localAiModel;
  }

  return {
    model: selectedModel,
    profileKey: selectedProfile?.key || "",
    profileLabel: selectedProfile?.label || "",
    profiles
  };
}

function modelIsInstalled(models = [], model = "") {
  return models.some(
    (entry) =>
      normalizeComparableText(entry) === normalizeComparableText(model)
  );
}

function buildModelProfileStatusList(
  profiles = [],
  installedModels = [],
  selectedModel = ""
) {
  return profiles.map((profile) => ({
    ...profile,
    installed: modelIsInstalled(installedModels, profile.model),
    selected:
      normalizeComparableText(profile.model) ===
      normalizeComparableText(selectedModel)
  }));
}

function buildUnavailableStatus(reason, options = {}) {
  const selection = resolveRequestedModel(options);

  return {
    available: false,
    enabled: Boolean(config.localAiEnabled),
    baseUrl: config.localAiBaseUrl,
    model: selection.model,
    selectedProfileKey: selection.profileKey,
    selectedProfileLabel: selection.profileLabel,
    modelProfiles: buildModelProfileStatusList(
      selection.profiles,
      [],
      selection.model
    ),
    models: [],
    modelInstalled: false,
    message: reason
  };
}

function withTimeout() {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    config.localAiTimeoutMs
  );

  return {
    signal: controller.signal,
    clear() {
      clearTimeout(timeoutId);
    }
  };
}

async function fetchOllama(path, options = {}) {
  const timeout = withTimeout();

  try {
    const response = await fetch(`${config.localAiBaseUrl}${path}`, {
      ...options,
      signal: timeout.signal
    });

    return response;
  } finally {
    timeout.clear();
  }
}

function buildAvailableStatus(models = [], options = {}) {
  const selection = resolveRequestedModel(options);
  const installed = modelIsInstalled(models, selection.model);

  return {
    available: true,
    enabled: true,
    baseUrl: config.localAiBaseUrl,
    model: selection.model,
    selectedProfileKey: selection.profileKey,
    selectedProfileLabel: selection.profileLabel,
    modelProfiles: buildModelProfileStatusList(
      selection.profiles,
      models,
      selection.model
    ),
    models,
    modelInstalled: installed,
    message: installed
      ? "Local AI is available."
      : `Ollama is running, but ${selection.model} is not installed.`
  };
}

async function getLocalAiStatus(options = {}) {
  if (!config.localAiEnabled) {
    return buildUnavailableStatus(
      "Local AI is disabled by LOCAL_AI_ENABLED=false.",
      options
    );
  }

  if (
    cachedLocalAiCatalog &&
    Date.now() - cachedLocalAiCatalog.createdAt < config.localAiStatusCacheMs
  ) {
    return buildAvailableStatus(cachedLocalAiCatalog.models, options);
  }

  try {
    const response = await fetchOllama("/api/tags");
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return buildUnavailableStatus(
        data.error || "Ollama did not return a healthy status.",
        options
      );
    }

    const models = Array.isArray(data.models)
      ? data.models.map((model) => model.name).filter(Boolean)
      : [];

    cachedLocalAiCatalog = {
      createdAt: Date.now(),
      models
    };

    return buildAvailableStatus(models, options);
  } catch (error) {
    return buildUnavailableStatus(
      error.name === "AbortError"
        ? "Timed out while contacting Ollama."
        : "Ollama is not running or is not reachable.",
      options
    );
  }
}

async function requestGenerate({
  model,
  prompt,
  keepAlive,
  generationOptions,
  format = "json"
}) {
  const response = await fetchOllama("/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      format,
      think: false,
      keep_alive: keepAlive,
      options: generationOptions
    })
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "The local model request failed.");
  }

  return data;
}

async function assertLocalAiReady(options = {}) {
  const status = await getLocalAiStatus(options);

  if (!status.available || !status.modelInstalled) {
    const error = new Error(status.message);
    error.statusCode = 503;
    error.localAiStatus = status;
    throw error;
  }

  return status;
}

function extractJsonObject(value) {
  const text = String(value || "").trim();

  if (!text) {
    throw new Error("The local model returned an empty response.");
  }

  const candidates = [text];
  const fencedJsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);

  if (fencedJsonMatch?.[1]) {
    candidates.push(fencedJsonMatch[1].trim());
  }

  const startIndex = text.indexOf("{");
  const endIndex = text.lastIndexOf("}");

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    candidates.push(text.slice(startIndex, endIndex + 1));
  }

  let lastError = null;

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (error) {
      lastError = error;
    }
  }

  const error = new Error(
    `The local model did not return valid JSON. ${lastError?.message || ""}`.trim()
  );
  error.modelResponsePreview = text.slice(0, 1200);
  throw error;
}

function normalizeTextList(value, limit = 8) {
  return Array.isArray(value)
    ? value
        .map((entry) => String(entry || "").trim())
        .filter(Boolean)
        .slice(0, limit)
    : [];
}

function normalizeReviewResult(value = {}, allowedTargets = null) {
  const findings = Array.isArray(value.findings)
    ? value.findings
        .map((entry) => {
          const targetType = String(entry?.targetType || "catalog")
            .trim()
            .toLowerCase();
          const severity = String(entry?.severity || "info")
            .trim()
            .toLowerCase();
          const targetSlug = String(entry?.targetSlug || "").trim();
          const field = String(entry?.field || "").trim();
          const issue = String(entry?.issue || "").trim();
          const recommendedAction = String(entry?.recommendedAction || "").trim();

          if (
            !issue ||
            !recommendedAction ||
            !REVIEW_FINDING_TARGET_TYPES.has(targetType) ||
            !REVIEW_FINDING_SEVERITIES.has(severity)
          ) {
            return null;
          }

          if (allowedTargets && targetSlug) {
            if (
              targetType === "post" &&
              !allowedTargets.posts.has(targetSlug)
            ) {
              return null;
            }

            if (
              targetType === "collection" &&
              !allowedTargets.collections.has(targetSlug)
            ) {
              return null;
            }

            if (
              targetType === "path" &&
              !allowedTargets.paths.has(targetSlug)
            ) {
              return null;
            }
          }

          return {
            severity,
            targetType,
            targetSlug,
            field,
            issue,
            recommendedAction
          };
        })
        .filter(Boolean)
        .slice(0, 6)
    : [];

  return {
    summary: String(value.summary || "").trim(),
    risks: normalizeTextList(value.risks),
    suggestedActions: normalizeTextList(value.suggestedActions),
    findings
  };
}

function hasUsableReviewResult(value = {}) {
  const review = normalizeReviewResult(value);

  return Boolean(
      review.summary ||
      review.risks.length ||
      review.suggestedActions.length ||
      review.findings.length
  );
}

function normalizeComparableArray(value) {
  return [
    ...new Set(
      (Array.isArray(value) ? value : [])
        .map((entry) => String(entry || "").trim().toLowerCase())
        .filter(Boolean)
    )
  ].sort();
}

function valuesAreEquivalent(left, right) {
  if (Array.isArray(left) || Array.isArray(right)) {
    const leftValues = normalizeComparableArray(left);
    const rightValues = normalizeComparableArray(right);

    return (
      leftValues.length === rightValues.length &&
      leftValues.every((entry, index) => entry === rightValues[index])
    );
  }

  return normalizeComparableText(left) === normalizeComparableText(right);
}

function normalizeComparableText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function hasMeaningfulTextDiff(nextValue, currentValue, minimumLength = 12) {
  const normalizedNext = normalizeComparableText(nextValue);
  const normalizedCurrent = normalizeComparableText(currentValue);

  if (!normalizedNext || normalizedNext === normalizedCurrent) {
    return false;
  }

  if (!normalizedCurrent) {
    return normalizedNext.length >= minimumLength;
  }

  return (
    Math.abs(normalizedNext.length - normalizedCurrent.length) >= 8 ||
    !normalizedNext.includes(normalizedCurrent) ||
    !normalizedCurrent.includes(normalizedNext)
  );
}

function normalizeFieldAssessments(value = []) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      const field = String(entry?.field || "").trim();
      const status = String(entry?.status || "")
        .trim()
        .toLowerCase();

      if (!ASSISTANT_PATCH_FIELDS.includes(field)) {
        return null;
      }

      return {
        field,
        status: FIELD_ASSESSMENT_STATUSES.has(status) ? status : "uncertain",
        reason: String(entry?.reason || "").trim()
      };
    })
    .filter(Boolean);
}

function isAcceptableExcerpt(value) {
  const excerpt = String(value || "").trim();

  return (
    excerpt.length >= 80 && excerpt.length <= 320 && /[.!?]$/.test(excerpt)
  );
}

function isStrongExcerptPatch(value, currentDraft = {}) {
  return (
    isAcceptableExcerpt(value) &&
    hasMeaningfulTextDiff(value, currentDraft.excerpt, 24)
  );
}

function hasStructuredReleaseNote(value) {
  const content = String(value || "").trim();

  return (
    content.length >= 120 &&
    (/\*\*(Universe|Characters|POV|Version|Theme|Mood|Source|Notes):\*\*/i.test(
      content
    ) ||
      /(Universe|Characters|POV|Version|Theme|Mood|Source|Notes):/i.test(
        content
      ))
  );
}

function isStrongContentPatch(value, currentDraft = {}) {
  const content = String(value || "").trim();

  return (
    hasStructuredReleaseNote(content) &&
    content.length >= 140 &&
    hasMeaningfulTextDiff(content, currentDraft.content, MIN_CONTENT_CHANGE_LENGTH)
  );
}

function applyDeterministicAssessmentGuards(
  fieldAssessments = [],
  currentDraft = {}
) {
  return fieldAssessments.map((entry) => {
    if (
      entry.field === "excerpt" &&
      isAcceptableExcerpt(currentDraft.excerpt)
    ) {
      return {
        ...entry,
        status: "keep",
        reason: "Excerpt already meets the public-card quality threshold."
      };
    }

    if (
      entry.field === "content" &&
      hasStructuredReleaseNote(currentDraft.content)
    ) {
      return {
        ...entry,
        status: "keep",
        reason: "Content already uses a structured release-note format."
      };
    }

    return entry;
  });
}

function getAllowedPatchFields(fieldAssessments = []) {
  const assessedFields = new Set(fieldAssessments.map((entry) => entry.field));
  const allowedByStatus = new Set(
    fieldAssessments
      .filter(
        (entry) => entry.status === "improve" || entry.status === "missing"
      )
      .map((entry) => entry.field)
  );

  if (!assessedFields.size) {
    return new Set(ASSISTANT_PATCH_FIELDS);
  }

  return allowedByStatus;
}

function normalizeSuggestionPatch(
  value = {},
  collections = [],
  currentDraft = {},
  allowedFields = new Set(ASSISTANT_PATCH_FIELDS)
) {
  const collectionSlugSet = new Set(
    collections.map((collection) => collection.slug)
  );
  const releaseStatus = String(value.releaseStatus || "")
    .trim()
    .toLowerCase();
  const collectionSlugs = Array.isArray(value.collectionSlugs)
    ? [
        ...new Set(
          value.collectionSlugs
            .map((slug) => String(slug || "").trim())
            .filter((slug) => collectionSlugSet.has(slug))
        )
      ]
    : [];
  const patch = {};

  if (
    allowedFields.has("excerpt") &&
    typeof value.excerpt === "string" &&
    isStrongExcerptPatch(value.excerpt, currentDraft)
  ) {
    patch.excerpt = value.excerpt.trim();
  }

  if (
    allowedFields.has("content") &&
    typeof value.content === "string" &&
    isStrongContentPatch(value.content, currentDraft)
  ) {
    patch.content = value.content.trim();
  }

  if (
    allowedFields.has("subCategory") &&
    typeof value.subCategory === "string"
  ) {
    patch.subCategory = value.subCategory.trim();
  }

  if (allowedFields.has("worldLayer") && typeof value.worldLayer === "string") {
    patch.worldLayer = value.worldLayer.trim();
  }

  if (allowedFields.has("themeTags") && Array.isArray(value.themeTags)) {
    patch.themeTags = [
      ...new Set(
        value.themeTags.map((tag) => String(tag || "").trim()).filter(Boolean)
      )
    ].slice(0, 8);
  }

  if (
    allowedFields.has("releaseStatus") &&
    VALID_RELEASE_STATUSES.has(releaseStatus)
  ) {
    patch.releaseStatus = releaseStatus;
  }

  if (allowedFields.has("collectionSlugs") && collectionSlugs.length) {
    patch.collectionSlugs = collectionSlugs;
  }

  return Object.entries(patch).reduce((result, [key, nextValue]) => {
    if (!valuesAreEquivalent(nextValue, currentDraft[key])) {
      result[key] = nextValue;
    }

    return result;
  }, {});
}

function normalizePostSuggestionResult(
  value = {},
  collections = [],
  currentDraft = {}
) {
  const fieldAssessments = applyDeterministicAssessmentGuards(
    normalizeFieldAssessments(value.fieldAssessments),
    currentDraft
  );
  const allowedFields = getAllowedPatchFields(fieldAssessments);

  return {
    summary: String(value.summary || "").trim(),
    fieldAssessments,
    rationale: normalizeTextList(value.rationale, 5),
    warnings: normalizeTextList(value.warnings, 5),
    suggestedPatch: normalizeSuggestionPatch(
      value.suggestedPatch,
      collections,
      currentDraft,
      allowedFields
    )
  };
}

function summarizePostForAssistant(post = {}) {
  return {
    slug: post.slug,
    title: post.title,
    published: Boolean(post.published),
    isPubliclyVisible: post.isPubliclyVisible !== false,
    isHomepageEligible: Boolean(post.isHomepageEligible),
    releaseStatus: post.releaseStatus || "canon",
    collections: Array.isArray(post.collectionSlugs)
      ? post.collectionSlugs
      : [],
    subCategory: post.subCategory || "",
    worldLayer: post.worldLayer || "",
    themeTags: Array.isArray(post.themeTags) ? post.themeTags : [],
    excerpt: String(post.excerpt || "")
      .trim()
      .slice(0, 180),
    contentPreview: String(post.content || "")
      .trim()
      .slice(0, 220)
  };
}

function summarizePostDraftForAssistant(post = {}) {
  const content = String(post.content || "").trim();
  const excerpt = String(post.excerpt || "").trim();

  return {
    title: String(post.title || "").trim(),
    slug: String(post.slug || "").trim(),
    excerpt,
    excerptLength: excerpt.length,
    content: content.slice(0, 1400),
    contentLength: content.length,
    hasStructuredContent:
      /\*\*(Universe|Characters|POV|Version|Theme|Mood|Source|Notes):\*\*/i.test(
        content
      ) ||
      /(Universe|Characters|POV|Version|Theme|Mood|Source|Notes):/i.test(
        content
      ),
    lyrics: String(post.lyrics || "")
      .trim()
      .slice(0, 1400),
    published: Boolean(post.published),
    releaseStatus: post.releaseStatus || "canon",
    collections: Array.isArray(post.collectionSlugs)
      ? post.collectionSlugs
      : [],
    subCategory: String(post.subCategory || "").trim(),
    sourceTag: String(post.sourceTag || "").trim(),
    worldLayer: String(post.worldLayer || "").trim(),
    themeTags: Array.isArray(post.themeTags) ? post.themeTags : [],
    versionFamily: String(post.versionFamily || "").trim(),
    isPrimaryVersion: Boolean(post.isPrimaryVersion),
    isArchive: Boolean(post.isArchive),
    isHomepageEligible: Boolean(post.isHomepageEligible),
    isPubliclyVisible: post.isPubliclyVisible !== false
  };
}

function summarizeCollectionForAssistant(collection = {}) {
  return {
    slug: collection.slug,
    title: collection.title,
    theme: collection.theme || "",
    isPublicPrimary: Boolean(collection.isPublicPrimary),
    featuredReleaseSlug: collection.featuredReleaseSlug || ""
  };
}

function summarizeRelatedPostForAssistant(post = {}) {
  return {
    slug: String(post.slug || "").trim(),
    title: String(post.title || "").trim(),
    releaseStatus: String(post.releaseStatus || "canon").trim(),
    collections: Array.isArray(post.collectionSlugs) ? post.collectionSlugs : [],
    excerpt: String(post.excerpt || "")
      .trim()
      .slice(0, 180),
    contentPreview: String(post.content || "")
      .trim()
      .slice(0, 220)
  };
}

function getComparablePostsForAssistant(posts = [], postDraft = {}) {
  const draftSlug = String(postDraft.slug || "").trim();
  const draftVersionFamily = String(postDraft.versionFamily || "").trim();
  const draftCollections = Array.isArray(postDraft.collectionSlugs)
    ? postDraft.collectionSlugs
    : [];

  return posts
    .filter((post) => {
      if (!post || post.slug === draftSlug) {
        return false;
      }

      const postCollections = Array.isArray(post.collectionSlugs)
        ? post.collectionSlugs
        : [];

      return (
        (draftVersionFamily &&
          String(post.versionFamily || "").trim() === draftVersionFamily) ||
        (draftCollections.length &&
          postCollections.some((slug) => draftCollections.includes(slug)))
      );
    })
    .slice(0, 5)
    .map(summarizeRelatedPostForAssistant);
}

function summarizePathPostForAssistant(post = {}) {
  return {
    slug: post.slug,
    title: post.title,
    published: Boolean(post.published),
    isPubliclyVisible: post.isPubliclyVisible !== false,
    releaseStatus: post.releaseStatus || "canon",
    collections: Array.isArray(post.collectionSlugs)
      ? post.collectionSlugs
      : [],
    subCategory: String(post.subCategory || "").trim(),
    worldLayer: String(post.worldLayer || "").trim(),
    themeTags: Array.isArray(post.themeTags) ? post.themeTags : [],
    excerpt: String(post.excerpt || "")
      .trim()
      .slice(0, 180)
  };
}

function summarizeGuidedPathForAssistant(path = {}) {
  return {
    slug: String(path.slug || "").trim(),
    title: String(path.title || "").trim(),
    eyebrow: String(path.eyebrow || "").trim(),
    intro: String(path.intro || "").trim(),
    moodNote: String(path.moodNote || "").trim(),
    themeHint: String(path.themeHint || "").trim(),
    postSlugs: Array.isArray(path.postSlugs) ? path.postSlugs : [],
    algorithm:
      path.algorithm && typeof path.algorithm === "object" ? path.algorithm : {}
  };
}

function getPublicPathPosts(posts = []) {
  return posts.filter(
    (post) =>
      post.published &&
      post.isPubliclyVisible !== false &&
      String(post.releaseStatus || "canon").trim().toLowerCase() !== "working"
  );
}

function getHomepagePathCandidatePosts(posts = []) {
  const publicPosts = getPublicPathPosts(posts);
  const seenVersionKeys = new Set();
  const releaseStatusRank = {
    canon: 0,
    alternate: 1,
    working: 2
  };

  return publicPosts
    .filter((post) => Boolean(post?.isHomepageEligible))
    .sort((left, right) => {
      const leftStatus =
        releaseStatusRank[String(left?.releaseStatus || "canon").trim().toLowerCase()] ??
        9;
      const rightStatus =
        releaseStatusRank[String(right?.releaseStatus || "canon").trim().toLowerCase()] ??
        9;

      if (leftStatus !== rightStatus) {
        return leftStatus - rightStatus;
      }

      return String(right?.createdAt || "").localeCompare(
        String(left?.createdAt || "")
      );
    })
    .filter((post) => {
      const versionKey = String(post?.versionFamily || post?.slug || "").trim();

      if (!versionKey) {
        return true;
      }

      if (seenVersionKeys.has(versionKey)) {
        return false;
      }

      seenVersionKeys.add(versionKey);
      return true;
    });
}

function getGuidedPathCandidatePosts(posts = [], guidedPath = {}) {
  const algorithm =
    guidedPath?.algorithm && typeof guidedPath.algorithm === "object"
      ? guidedPath.algorithm
      : {};
  const preset = String(algorithm.preset || "").trim();
  const collectionSlug = String(algorithm.collectionSlug || "").trim();
  const collectionSlugs = Array.isArray(algorithm.collectionSlugs)
    ? algorithm.collectionSlugs
        .map((slug) => String(slug || "").trim())
        .filter(Boolean)
    : [];
  const themeHint = String(guidedPath?.themeHint || "").trim();
  const sectionKeys = Array.isArray(algorithm.sectionKeys)
    ? algorithm.sectionKeys
        .map((key) => String(key || "").trim())
        .filter(Boolean)
    : [];
  const themeTags = Array.isArray(algorithm.themeTags)
    ? algorithm.themeTags.map((tag) => String(tag || "").trim()).filter(Boolean)
    : [];
  const worldLayers = Array.isArray(algorithm.worldLayers)
    ? algorithm.worldLayers
        .map((layer) => String(layer || "").trim())
        .filter(Boolean)
    : [];
  const hasExplicitScope =
    preset ||
    collectionSlug ||
    collectionSlugs.length ||
    themeHint ||
    sectionKeys.length ||
    themeTags.length ||
    worldLayers.length;
  const publicPosts = getPublicPathPosts(posts);

  if (preset === "homepage") {
    return getHomepagePathCandidatePosts(posts);
  }

  if (!hasExplicitScope) {
    return publicPosts;
  }

  return publicPosts.filter((post) => {
    const postCollections = Array.isArray(post.collectionSlugs)
      ? post.collectionSlugs
      : [];

    return (
      (collectionSlug && postCollections.includes(collectionSlug)) ||
      (collectionSlugs.length &&
        postCollections.some((slug) => collectionSlugs.includes(slug))) ||
      (themeHint && postCollections.includes(themeHint)) ||
      (sectionKeys.length &&
        sectionKeys.includes(String(post.subCategory || "").trim())) ||
      (themeTags.length &&
        (post.themeTags || []).some((tag) => themeTags.includes(tag))) ||
      (worldLayers.length &&
        worldLayers.includes(String(post.worldLayer || "").trim()))
    );
  });
}

function normalizeGuidedPathAlgorithmPatch(value = {}, collections = []) {
  const collectionSlugSet = new Set(
    collections.map((collection) => collection.slug)
  );
  const algorithm =
    value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const releaseStatuses = Array.isArray(algorithm.releaseStatuses)
    ? [
        ...new Set(
          algorithm.releaseStatuses
            .map((status) =>
              String(status || "")
                .trim()
                .toLowerCase()
            )
            .filter((status) => VALID_RELEASE_STATUSES.has(status))
        )
      ]
    : [];
  const collectionSlugs = Array.isArray(algorithm.collectionSlugs)
    ? [
        ...new Set(
          algorithm.collectionSlugs
            .map((slug) => String(slug || "").trim())
            .filter((slug) => collectionSlugSet.has(slug))
        )
      ]
    : [];
  const patch = {};
  const collectionSlug = String(algorithm.collectionSlug || "").trim();
  const sort = String(algorithm.sort || "").trim();
  const match = String(algorithm.match || "").trim();
  const maxItems = Number.parseInt(String(algorithm.maxItems || ""), 10);

  if (String(algorithm.preset || "").trim()) {
    patch.preset = String(algorithm.preset || "").trim();
  }

  if (collectionSlugSet.has(collectionSlug)) {
    patch.collectionSlug = collectionSlug;
  }

  if (collectionSlugs.length) {
    patch.collectionSlugs = collectionSlugs;
  }

  if (Array.isArray(algorithm.sectionKeys)) {
    patch.sectionKeys = [
      ...new Set(
        algorithm.sectionKeys
          .map((entry) => String(entry || "").trim())
          .filter(Boolean)
      )
    ];
  }

  if (Array.isArray(algorithm.themeTags)) {
    patch.themeTags = [
      ...new Set(
        algorithm.themeTags
          .map((entry) => String(entry || "").trim())
          .filter(Boolean)
      )
    ];
  }

  if (Array.isArray(algorithm.worldLayers)) {
    patch.worldLayers = [
      ...new Set(
        algorithm.worldLayers
          .map((entry) => String(entry || "").trim())
          .filter(Boolean)
      )
    ];
  }

  if (releaseStatuses.length) {
    patch.releaseStatuses = releaseStatuses;
  }

  if (ALLOWED_PATH_MATCH_MODES.has(match)) {
    patch.match = match;
  }

  if (Number.isFinite(maxItems) && maxItems > 0) {
    patch.maxItems = Math.min(maxItems, 25);
  }

  if (ALLOWED_PATH_ALGORITHM_SORTS.has(sort)) {
    patch.sort = sort;
  }

  return patch;
}

function getWorldSignalMap() {
  return {
    fractureverse: {
      collectionSlug: "fractureverse",
      worldLayer: "fractureverse"
    },
    eldoria: {
      collectionSlug: "eldoria",
      worldLayer: "eldoria"
    },
    villain: {
      worldLayer: "villain"
    }
  };
}

function titleFitsSuggestedMembership(title = "", suggestedPatch = {}, posts = []) {
  const normalizedTitle = String(title || "").trim().toLowerCase();

  if (!normalizedTitle) {
    return true;
  }

  const mentionedWorldKeys = Object.keys(getWorldSignalMap()).filter((key) =>
    normalizedTitle.includes(key)
  );

  if (!mentionedWorldKeys.length) {
    return true;
  }

  const postSlugSet = new Set(
    Array.isArray(suggestedPatch.postSlugs) ? suggestedPatch.postSlugs : []
  );
  const selectedPosts = posts.filter((post) => postSlugSet.has(post.slug));
  const algorithm =
    suggestedPatch.algorithm && typeof suggestedPatch.algorithm === "object"
      ? suggestedPatch.algorithm
      : {};
  const algorithmCollectionSlug = String(algorithm.collectionSlug || "")
    .trim()
    .toLowerCase();
  const algorithmCollectionSlugs = Array.isArray(algorithm.collectionSlugs)
    ? algorithm.collectionSlugs.map((slug) => String(slug || "").trim().toLowerCase())
    : [];
  const algorithmWorldLayers = Array.isArray(algorithm.worldLayers)
    ? algorithm.worldLayers.map((layer) => String(layer || "").trim().toLowerCase())
    : [];

  return mentionedWorldKeys.every((worldKey) => {
    const signal = getWorldSignalMap()[worldKey];
    const hasManualMembershipMatch = selectedPosts.some((post) => {
      const postCollections = Array.isArray(post.collectionSlugs)
        ? post.collectionSlugs.map((slug) => String(slug || "").trim().toLowerCase())
        : [];
      const postWorldLayer = String(post.worldLayer || "").trim().toLowerCase();

      return (
        (signal.collectionSlug && postCollections.includes(signal.collectionSlug)) ||
        (signal.worldLayer && postWorldLayer === signal.worldLayer)
      );
    });
    const hasAlgorithmMatch =
      (signal.collectionSlug &&
        (algorithmCollectionSlug === signal.collectionSlug ||
          algorithmCollectionSlugs.includes(signal.collectionSlug))) ||
      (signal.worldLayer && algorithmWorldLayers.includes(signal.worldLayer));

    return hasManualMembershipMatch || hasAlgorithmMatch;
  });
}

function normalizeGuidedPathSuggestionResult(
  value = {},
  store = {},
  guidedPath = {}
) {
  const posts = Array.isArray(store.posts) ? store.posts : [];
  const collections = Array.isArray(store.collections) ? store.collections : [];
  const postSlugSet = new Set(
    getGuidedPathCandidatePosts(posts, guidedPath).map((post) => post.slug)
  );
  const rawPatch =
    value.suggestedPatch && typeof value.suggestedPatch === "object"
      ? value.suggestedPatch
      : {};
  const suggestedPatch = {};
  const currentAlgorithm =
    guidedPath?.algorithm && typeof guidedPath.algorithm === "object"
      ? guidedPath.algorithm
      : {};
  const pathIsAlgorithmBacked =
    Boolean(String(currentAlgorithm.collectionSlug || "").trim()) &&
    !(Array.isArray(guidedPath?.postSlugs) && guidedPath.postSlugs.length);

  if (typeof rawPatch.title === "string" && rawPatch.title.trim()) {
    suggestedPatch.title = rawPatch.title.trim();
  }

  if (typeof rawPatch.eyebrow === "string" && rawPatch.eyebrow.trim()) {
    suggestedPatch.eyebrow = rawPatch.eyebrow.trim();
  }

  if (typeof rawPatch.intro === "string" && rawPatch.intro.trim()) {
    suggestedPatch.intro = rawPatch.intro.trim();
  }

  if (typeof rawPatch.moodNote === "string" && rawPatch.moodNote.trim()) {
    suggestedPatch.moodNote = rawPatch.moodNote.trim();
  }

  if (typeof rawPatch.themeHint === "string") {
    suggestedPatch.themeHint = rawPatch.themeHint.trim();
  }

  if (!pathIsAlgorithmBacked && Array.isArray(rawPatch.postSlugs)) {
    suggestedPatch.postSlugs = [
      ...new Set(
        rawPatch.postSlugs
          .map((slug) => String(slug || "").trim())
          .filter((slug) => postSlugSet.has(slug))
      )
    ].slice(0, 25);
  }

  if (rawPatch.algorithm && typeof rawPatch.algorithm === "object") {
    const algorithmPatch = normalizeGuidedPathAlgorithmPatch(
      rawPatch.algorithm,
      collections
    );

    if (Object.keys(algorithmPatch).length) {
      suggestedPatch.algorithm = algorithmPatch;
    }
  }

  return {
    summary: String(value.summary || "").trim(),
    mode: ["manual", "algorithm", "hybrid"].includes(String(value.mode || ""))
      ? String(value.mode)
      : "manual",
    rationale: normalizeTextList(value.rationale, 6),
    warnings: normalizeTextList(value.warnings, 5),
    suggestedPatch
  };
}

function normalizeNewGuidedPathSuggestionResult(
  value = {},
  store = {},
  existingPaths = []
) {
  const posts = Array.isArray(store.posts) ? store.posts : [];
  const collections = Array.isArray(store.collections) ? store.collections : [];
  const publicPostSlugSet = new Set(
    getPublicPathPosts(posts).map((post) => post.slug)
  );
  const existingSlugSet = new Set(
    existingPaths.map((path) => String(path?.slug || "").trim()).filter(Boolean)
  );
  const rawPatch =
    value.suggestedPatch && typeof value.suggestedPatch === "object"
      ? value.suggestedPatch
      : {};
  const suggestedPatch = {};
  const rawSlug = String(
    rawPatch.slug || value.slug || rawPatch.title || ""
  ).trim();
  const nextSlug = slugify(rawSlug);

  if (nextSlug && !existingSlugSet.has(nextSlug)) {
    suggestedPatch.slug = nextSlug;
  }

  if (typeof rawPatch.title === "string" && rawPatch.title.trim()) {
    suggestedPatch.title = rawPatch.title.trim();
  }

  if (typeof rawPatch.eyebrow === "string" && rawPatch.eyebrow.trim()) {
    suggestedPatch.eyebrow = rawPatch.eyebrow.trim();
  }

  if (typeof rawPatch.intro === "string" && rawPatch.intro.trim()) {
    suggestedPatch.intro = rawPatch.intro.trim();
  }

  if (typeof rawPatch.moodNote === "string" && rawPatch.moodNote.trim()) {
    suggestedPatch.moodNote = rawPatch.moodNote.trim();
  }

  if (typeof rawPatch.themeHint === "string" && rawPatch.themeHint.trim()) {
    suggestedPatch.themeHint = rawPatch.themeHint.trim();
  }

  if (Array.isArray(rawPatch.postSlugs)) {
    suggestedPatch.postSlugs = [
      ...new Set(
        rawPatch.postSlugs
          .map((entry) => String(entry || "").trim())
          .filter((slug) => publicPostSlugSet.has(slug))
      )
    ].slice(0, 12);
  }

  if (rawPatch.algorithm && typeof rawPatch.algorithm === "object") {
    const algorithmPatch = normalizeGuidedPathAlgorithmPatch(
      rawPatch.algorithm,
      collections
    );

    if (Object.keys(algorithmPatch).length) {
      suggestedPatch.algorithm = algorithmPatch;
    }
  }

  const warnings = normalizeTextList(value.warnings, 5);

  if (
    suggestedPatch.title &&
    !titleFitsSuggestedMembership(suggestedPatch.title, suggestedPatch, posts)
  ) {
    warnings.push(
      "The assistant title did not match the suggested path membership, so it was cleared."
    );
    delete suggestedPatch.title;
  }

  if (!suggestedPatch.slug) {
    warnings.push("The assistant did not provide a unique usable slug.");
  }

  if (!suggestedPatch.title) {
    warnings.push("The assistant did not provide a title.");
  }

  if (
    !suggestedPatch.postSlugs?.length &&
    !Object.keys(suggestedPatch.algorithm || {}).length
  ) {
    warnings.push("The assistant did not provide usable path membership.");
  }

  return {
    summary: String(value.summary || "").trim(),
    mode: ["manual", "algorithm", "hybrid"].includes(String(value.mode || ""))
      ? String(value.mode)
      : "manual",
    isNewPath: true,
    rationale: normalizeTextList(value.rationale, 6),
    warnings: [...new Set(warnings)].slice(0, 6),
    suggestedPatch
  };
}

function buildCatalogContext(store = {}) {
  const posts = Array.isArray(store.posts) ? store.posts : [];
  const collections = Array.isArray(store.collections) ? store.collections : [];
  const guidedPaths = Array.isArray(store.siteContent?.guidedPaths)
    ? store.siteContent.guidedPaths
    : [];
  const postsNeedingReview = posts
    .filter((post) => {
      const hasCollection =
        Array.isArray(post.collectionSlugs) && post.collectionSlugs.length > 0;
      const hasTags =
        Array.isArray(post.themeTags) && post.themeTags.length > 0;
      const isImmersive =
        (post.collectionSlugs || []).includes("fractureverse") ||
        (post.collectionSlugs || []).includes("eldoria") ||
        ["fractureverse", "eldoria", "villain"].includes(
          String(post.worldLayer || "")
        );

      return (
        !hasCollection ||
        !hasTags ||
        isImmersive ||
        post.isPubliclyVisible === false
      );
    })
    .slice(0, 8);

  return {
    counts: {
      posts: posts.length,
      collections: collections.length,
      guidedPaths: guidedPaths.length,
      publishedPosts: posts.filter((post) => post.published).length
    },
    collections: collections
      .filter((collection) => collection.isPublicPrimary || collection.theme)
      .slice(0, 12)
      .map(summarizeCollectionForAssistant),
    guidedPaths: guidedPaths.map((path) => ({
      slug: path.slug,
      title: path.title,
      count: Array.isArray(path.postSlugs) ? path.postSlugs.length : 0,
      algorithm: path.algorithm || {}
    })),
    samplePosts: postsNeedingReview.map(summarizePostForAssistant)
  };
}

async function generateJson(prompt, options = {}) {
  const selection = resolveRequestedModel(options);
  const generationOptions = {
    temperature: options.temperature ?? 0.2,
    num_ctx: options.num_ctx || config.localAiDefaultNumCtx,
    num_predict: options.num_predict || config.localAiDefaultNumPredict
  };

  if (config.localAiNumThread > 0) {
    generationOptions.num_thread = config.localAiNumThread;
  }

  clearLocalAiStatusCache();
  let data = await requestGenerate({
    model: selection.model,
    prompt,
    keepAlive: config.localAiKeepAlive,
    generationOptions
  });

  if (!String(data.response || "").trim()) {
    data = await requestGenerate({
      model: selection.model,
      prompt: [
        "Return valid compact JSON only.",
        "Do not leave the response empty.",
        "",
        prompt
      ].join("\n"),
      keepAlive: config.localAiKeepAlive,
      generationOptions: {
        ...generationOptions,
        temperature: 0.1
      }
    });
  }

  try {
    return extractJsonObject(data.response);
  } catch (error) {
    const repairPrompt = [
      "Repair this into valid compact JSON only.",
      "Do not add markdown or commentary.",
      "Keep the same meaning and return one JSON object.",
      "",
      String(data.response || "")
    ].join("\n");
    const repairData = await requestGenerate({
      model: selection.model,
      prompt: repairPrompt,
      keepAlive: config.localAiKeepAlive,
      generationOptions: {
        temperature: 0,
        num_ctx: Math.max(2048, generationOptions.num_ctx),
        num_predict: Math.max(500, generationOptions.num_predict),
        ...(config.localAiNumThread > 0
          ? { num_thread: config.localAiNumThread }
          : {})
      }
    });

    try {
      return extractJsonObject(repairData.response);
    } catch {
      throw error;
    }
  }
}

function buildCatalogReviewTargets(store = {}) {
  const posts = Array.isArray(store.posts) ? store.posts : [];
  const collections = Array.isArray(store.collections) ? store.collections : [];
  const guidedPaths = Array.isArray(store.siteContent?.guidedPaths)
    ? store.siteContent.guidedPaths
    : [];

  return {
    posts: new Set(
      posts.map((post) => String(post?.slug || "").trim()).filter(Boolean)
    ),
    collections: new Set(
      collections
        .map((collection) => String(collection?.slug || "").trim())
        .filter(Boolean)
    ),
    paths: new Set(
      guidedPaths.map((path) => String(path?.slug || "").trim()).filter(Boolean)
    )
  };
}

async function reviewCatalogWithLocalAi(store, options = {}) {
  const status = await assertLocalAiReady(options);

  const context = buildCatalogContext(store);
  const allowedTargets = buildCatalogReviewTargets(store);
  const prompt = [
    "Return only compact JSON for this music archive admin review.",
    "Do not invent slugs. No code advice.",
    "Be conservative about editorial taxonomy changes.",
    "Do not recommend adding themeTags solely because a title, subCategory, or worldLayer sounds related to a motif.",
    "Do not treat the absence of a literal matching tag as a problem when the current tags are already coherent with the excerpt and content preview.",
    "Prefer structural issues over subjective metadata expansion: empty or contradictory fields, public visibility mismatches, broken collection/path relationships, and obvious categorization drift.",
    "If a post appears publication-ready and internally coherent, leave it out of findings.",
    'Shape: {"summary":"one sentence","risks":["risk"],"suggestedActions":["action"],"findings":[{"severity":"warning","targetType":"post|collection|path|catalog","targetSlug":"existing-slug-or-empty","field":"fieldName-or-empty","issue":"what is wrong","recommendedAction":"what to do next"}]}.',
    "Use at most 3 risks and 3 actions.",
    "Use at most 5 findings.",
    "Only use targetSlug values that already exist in the JSON context.",
    "Findings should be concrete and actionable, not vague observations.",
    "",
    JSON.stringify(context)
  ].join("\n");
  const firstPass = normalizeReviewResult(
    await generateJson(prompt, options),
    allowedTargets
  );

  if (hasUsableReviewResult(firstPass)) {
    return {
      ...DEFAULT_REVIEW_RESULT,
      ...firstPass,
      generatedAt: new Date().toISOString(),
      model: status.model
    };
  }

  const retryPrompt = [
    "Return only compact JSON for this music archive admin review.",
    "Your previous response was empty or unusable.",
    "You must return at least one non-empty field.",
    "Be conservative about editorial taxonomy changes.",
    "Do not recommend adding themeTags solely because a title, subCategory, or worldLayer sounds related to a motif.",
    "Do not treat the absence of a literal matching tag as a problem when the current tags are already coherent with the excerpt and content preview.",
    "Prefer structural issues over subjective metadata expansion: empty or contradictory fields, public visibility mismatches, broken collection/path relationships, and obvious categorization drift.",
    'Shape: {"summary":"one sentence","risks":["risk"],"suggestedActions":["action"],"findings":[{"severity":"warning","targetType":"post|collection|path|catalog","targetSlug":"existing-slug-or-empty","field":"fieldName-or-empty","issue":"what is wrong","recommendedAction":"what to do next"}]}.',
    "Use at most 3 risks and 3 actions.",
    "Use at most 5 findings.",
    "Only use targetSlug values that already exist in the JSON context.",
    "If the catalog looks broadly healthy, still provide a concise summary and at least one concrete suggestedAction.",
    "",
    JSON.stringify(context)
  ].join("\n");
  const retryResult = normalizeReviewResult(
    await generateJson(retryPrompt, {
      ...options,
      temperature: 0.1
    }),
    allowedTargets
  );

  if (!hasUsableReviewResult(retryResult)) {
    const error = new Error(
      "The selected model returned no usable catalog review content."
    );
    error.statusCode = 502;
    throw error;
  }

  return {
    ...DEFAULT_REVIEW_RESULT,
    ...retryResult,
    generatedAt: new Date().toISOString(),
    model: status.model
  };
}

async function suggestPostDraftWithLocalAi(store, postDraft = {}, options = {}) {
  const status = await assertLocalAiReady(options);

  const collections = Array.isArray(store.collections) ? store.collections : [];
  const posts = Array.isArray(store.posts) ? store.posts : [];
  const context = {
    allowedReleaseStatuses: Array.from(VALID_RELEASE_STATUSES),
    collections: collections.map(summarizeCollectionForAssistant),
    currentDraft: summarizePostDraftForAssistant(postDraft),
    comparablePosts: getComparablePostsForAssistant(posts, postDraft)
  };
  const prompt = [
    "Return only compact JSON for one music archive post draft.",
    "First assess each field as keep, improve, missing, or uncertain.",
    "Only patch fields marked improve or missing.",
    "Be decisive and avoid churn: if a field is already clear, coherent, and publication-ready, mark it keep.",
    "If content already uses a structured release-note format with fields like Universe, Characters, POV, Version, Theme, Mood, Source, or Notes, mark content keep unless it is inaccurate or broken.",
    "If excerpt is already specific, public-facing, and under 280 characters, mark excerpt keep.",
    "Do not rewrite a field just to change wording or style. Patch only when the new value is materially better.",
    "Your main job is to improve authoring fields when needed: excerpt and content.",
    "Rewrite excerpt as sharper public card copy only when it needs improvement.",
    "Rewrite content as a stronger release note only when it needs improvement, preserving the draft's meaning.",
    "When you improve excerpt or content, make the replacement materially better, not just paraphrased.",
    "Use comparablePosts only as style or canon context reference. Do not copy their wording or merge their facts into the current draft.",
    "Do not invent collection slugs. Use only provided collection slugs.",
    "For metadata fields, suggest a field only if it improves or changes the current value. Do not repeat existing values.",
    'Shape: {"summary":"one sentence","fieldAssessments":[{"field":"excerpt","status":"keep","reason":"why"}],"suggestedPatch":{"excerpt":"","content":"","subCategory":"","worldLayer":"","themeTags":[""],"releaseStatus":"canon","collectionSlugs":[""]},"rationale":["reason"],"warnings":["warning"]}.',
    "Omit fields that should not change. Use at most 5 themeTags, 4 rationale items, and 3 warnings. Keep content under 140 words.",
    "",
    JSON.stringify(context)
  ].join("\n");
  const result = normalizePostSuggestionResult(
    await generateJson(prompt, {
      ...options,
      num_ctx: 4096,
      num_predict: config.localAiPostNumPredict
    }),
    collections,
    postDraft
  );

  const shouldRetryForPatch =
    !Object.keys(result.suggestedPatch || {}).length &&
    result.fieldAssessments?.some(
      (entry) => entry.status === "improve" || entry.status === "missing"
    );

  if (shouldRetryForPatch) {
    const retryPrompt = [
      "Return only compact JSON for one music archive post draft.",
      "Your previous answer assessed fields as improve or missing but did not produce a usable patch.",
      "Retry with stronger, more decisive suggestions only for fields that genuinely need change.",
      "If you suggest excerpt, it must be publication-ready and materially different from the current excerpt.",
      "If you suggest content, it must be a structured release note and materially better than the current content.",
      "If no field truly needs change, mark every field keep and return an empty suggestedPatch.",
      "Shape: {\"summary\":\"one sentence\",\"fieldAssessments\":[{\"field\":\"excerpt\",\"status\":\"keep\",\"reason\":\"why\"}],\"suggestedPatch\":{\"excerpt\":\"\",\"content\":\"\",\"subCategory\":\"\",\"worldLayer\":\"\",\"themeTags\":[\"\"],\"releaseStatus\":\"canon\",\"collectionSlugs\":[\"\"]},\"rationale\":[\"reason\"],\"warnings\":[\"warning\"]}.",
      "",
      JSON.stringify({
        ...context,
        previousFieldAssessments: result.fieldAssessments,
        previousWarnings: result.warnings
      })
    ].join("\n");
    const retryResult = normalizePostSuggestionResult(
      await generateJson(retryPrompt, {
        ...options,
        num_ctx: 4096,
        num_predict: config.localAiPostNumPredict,
        temperature: 0.1
      }),
      collections,
      postDraft
    );

    if (Object.keys(retryResult.suggestedPatch || {}).length) {
      return {
        ...retryResult,
        generatedAt: new Date().toISOString(),
        model: status.model
      };
    }
  }

  return {
    ...result,
    generatedAt: new Date().toISOString(),
    model: status.model
  };
}

async function suggestGuidedPathWithLocalAi(
  store,
  guidedPath = {},
  options = {}
) {
  const status = await assertLocalAiReady(options);

  const posts = Array.isArray(store.posts) ? store.posts : [];
  const collections = Array.isArray(store.collections) ? store.collections : [];
  const publicPosts = getGuidedPathCandidatePosts(posts, guidedPath).map(
    summarizePathPostForAssistant
  );
  const context = {
    allowedReleaseStatuses: Array.from(VALID_RELEASE_STATUSES),
    allowedSorts: Array.from(ALLOWED_PATH_ALGORITHM_SORTS),
    collections: collections.map(summarizeCollectionForAssistant),
    currentPath: summarizeGuidedPathForAssistant(guidedPath),
    publicPosts
  };
  const prompt = [
    "Return only compact JSON for one guided listening path in a music archive.",
    "Improve path membership and rules for the currentPath.",
    "Use exact post slugs only from publicPosts. Do not invent slugs.",
    "If currentPath uses algorithm.preset=homepage, keep the path broad, newcomer-friendly, and representative of the site's actual public entry points.",
    "For homepage-style paths, do not rename or frame the path as a single-world route unless the selected posts genuinely justify that scope.",
    "If the path needs a carefully curated sequence, use suggestedPatch.postSlugs.",
    "If the path should stay dynamic, use suggestedPatch.algorithm with only provided collection slugs, release statuses, and sort values.",
    "If currentPath already has algorithm.collectionSlug and no postSlugs, preserve the algorithm approach and do not return postSlugs.",
    "Do not include unrelated or merely adjacent songs. Prefer precision over count.",
    'Shape: {"summary":"one sentence","mode":"manual|algorithm|hybrid","suggestedPatch":{"title":"","eyebrow":"","intro":"","moodNote":"","themeHint":"","postSlugs":[""],"algorithm":{}},"rationale":["reason"],"warnings":["warning"]}.',
    "Omit patch fields that should not change. Use at most 12 postSlugs, 5 rationale items, and 3 warnings.",
    "",
    JSON.stringify(context)
  ].join("\n");
  const result = normalizeGuidedPathSuggestionResult(
    await generateJson(prompt, {
      ...options,
      num_ctx: 8192,
      num_predict: config.localAiPathNumPredict
    }),
    store,
    guidedPath
  );

  return {
    ...result,
    generatedAt: new Date().toISOString(),
    model: status.model
  };
}

async function suggestNewGuidedPathWithLocalAi(
  store,
  existingPaths = [],
  options = {}
) {
  const status = await assertLocalAiReady(options);

  const posts = Array.isArray(store.posts) ? store.posts : [];
  const collections = Array.isArray(store.collections) ? store.collections : [];
  const paths = Array.isArray(existingPaths)
    ? existingPaths
    : Array.isArray(store.siteContent?.guidedPaths)
      ? store.siteContent.guidedPaths
      : [];
  const context = {
    allowedReleaseStatuses: Array.from(VALID_RELEASE_STATUSES),
    allowedSorts: Array.from(ALLOWED_PATH_ALGORITHM_SORTS),
    collections: collections.map(summarizeCollectionForAssistant),
    existingPaths: paths.map(summarizeGuidedPathForAssistant),
    publicPosts: getPublicPathPosts(posts).map(summarizePathPostForAssistant)
  };
  const prompt = [
    "Return only compact JSON for one NEW guided listening path in a music archive.",
    "Find a meaningful catalog gap using publicPosts and collections.",
    "The new path must be clearly distinct from existingPaths. Do not make a minor rename, mood variant, or near-duplicate sequence.",
    "Use exact post slugs only from publicPosts. Do not invent slugs.",
    "The title must describe the actual selected path, not a mashup of existing path names or world titles.",
    "Only mention a world like Eldoria or Fractureverse in the title if the suggested membership is genuinely centered on that world.",
    "Prefer 4 to 10 postSlugs for a manual curated sequence unless a validated algorithm is clearly better.",
    "Use suggestedPatch.slug as a short unique lowercase kebab-case slug not present in existingPaths.",
    'Shape: {"summary":"one sentence","mode":"manual|algorithm|hybrid","isNewPath":true,"suggestedPatch":{"slug":"","title":"","eyebrow":"","intro":"","moodNote":"","themeHint":"","postSlugs":[""],"algorithm":{}},"rationale":["reason"],"warnings":["warning"]}.',
    "Omit algorithm if using manual postSlugs. Use at most 6 rationale items and 3 warnings.",
    "",
    JSON.stringify(context)
  ].join("\n");
  const result = normalizeNewGuidedPathSuggestionResult(
    await generateJson(prompt, {
      ...options,
      num_ctx: 8192,
      num_predict: config.localAiNewPathNumPredict
    }),
    store,
    paths
  );

  return {
    ...result,
    generatedAt: new Date().toISOString(),
    model: status.model
  };
}

module.exports = {
  getLocalAiStatus,
  reviewCatalogWithLocalAi,
  suggestGuidedPathWithLocalAi,
  suggestNewGuidedPathWithLocalAi,
  suggestPostDraftWithLocalAi,
  __test: {
    isAcceptableExcerpt,
    getGuidedPathCandidatePosts,
    hasStructuredReleaseNote,
    isStrongExcerptPatch,
    isStrongContentPatch,
    getConfiguredModelProfiles,
    hasUsableReviewResult,
    normalizePostSuggestionResult,
    normalizeNewGuidedPathSuggestionResult,
    resolveRequestedModel,
    summarizePostForAssistant,
    titleFitsSuggestedMembership
  }
};
