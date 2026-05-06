const config = require("../config");

const DEFAULT_REVIEW_RESULT = {
  summary: "",
  risks: [],
  suggestedActions: []
};
const VALID_RELEASE_STATUSES = new Set(["canon", "alternate", "working"]);

function buildUnavailableStatus(reason) {
  return {
    available: false,
    enabled: Boolean(config.localAiEnabled),
    baseUrl: config.localAiBaseUrl,
    model: config.localAiModel,
    models: [],
    message: reason
  };
}

function withTimeout() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.localAiTimeoutMs);

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

async function getLocalAiStatus() {
  if (!config.localAiEnabled) {
    return buildUnavailableStatus("Local AI is disabled by LOCAL_AI_ENABLED=false.");
  }

  try {
    const response = await fetchOllama("/api/tags");
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return buildUnavailableStatus(data.error || "Ollama did not return a healthy status.");
    }

    const models = Array.isArray(data.models)
      ? data.models.map((model) => model.name).filter(Boolean)
      : [];

    return {
      available: true,
      enabled: true,
      baseUrl: config.localAiBaseUrl,
      model: config.localAiModel,
      models,
      modelInstalled: models.includes(config.localAiModel),
      message: models.includes(config.localAiModel)
        ? "Local AI is available."
        : `Ollama is running, but ${config.localAiModel} is not installed.`
    };
  } catch (error) {
    return buildUnavailableStatus(
      error.name === "AbortError"
        ? "Timed out while contacting Ollama."
        : "Ollama is not running or is not reachable."
    );
  }
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

function normalizeReviewResult(value = {}) {
  return {
    summary: String(value.summary || "").trim(),
    risks: normalizeTextList(value.risks),
    suggestedActions: normalizeTextList(value.suggestedActions)
  };
}

function valuesAreEquivalent(left, right) {
  if (Array.isArray(left) || Array.isArray(right)) {
    const leftValues = Array.isArray(left) ? left : [];
    const rightValues = Array.isArray(right) ? right : [];

    return (
      leftValues.length === rightValues.length &&
      leftValues.every((entry, index) => entry === rightValues[index])
    );
  }

  return String(left || "").trim() === String(right || "").trim();
}

function normalizeSuggestionPatch(value = {}, collections = [], currentDraft = {}) {
  const collectionSlugSet = new Set(collections.map((collection) => collection.slug));
  const releaseStatus = String(value.releaseStatus || "").trim().toLowerCase();
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

  if (typeof value.excerpt === "string" && value.excerpt.trim()) {
    patch.excerpt = value.excerpt.trim();
  }

  if (typeof value.content === "string" && value.content.trim()) {
    patch.content = value.content.trim();
  }

  if (typeof value.subCategory === "string") {
    patch.subCategory = value.subCategory.trim();
  }

  if (typeof value.worldLayer === "string") {
    patch.worldLayer = value.worldLayer.trim();
  }

  if (Array.isArray(value.themeTags)) {
    patch.themeTags = [
      ...new Set(
        value.themeTags
          .map((tag) => String(tag || "").trim())
          .filter(Boolean)
      )
    ].slice(0, 8);
  }

  if (VALID_RELEASE_STATUSES.has(releaseStatus)) {
    patch.releaseStatus = releaseStatus;
  }

  if (collectionSlugs.length) {
    patch.collectionSlugs = collectionSlugs;
  }

  return Object.entries(patch).reduce((result, [key, nextValue]) => {
    if (!valuesAreEquivalent(nextValue, currentDraft[key])) {
      result[key] = nextValue;
    }

    return result;
  }, {});
}

function normalizePostSuggestionResult(value = {}, collections = [], currentDraft = {}) {
  return {
    summary: String(value.summary || "").trim(),
    rationale: normalizeTextList(value.rationale, 5),
    warnings: normalizeTextList(value.warnings, 5),
    suggestedPatch: normalizeSuggestionPatch(value.suggestedPatch, collections, currentDraft)
  };
}

function summarizePostForAssistant(post = {}) {
  return {
    slug: post.slug,
    title: post.title,
    published: Boolean(post.published),
    releaseStatus: post.releaseStatus || "canon",
    collections: Array.isArray(post.collectionSlugs) ? post.collectionSlugs : [],
    subCategory: post.subCategory || "",
    worldLayer: post.worldLayer || "",
    themeTags: Array.isArray(post.themeTags) ? post.themeTags : []
  };
}

function summarizePostDraftForAssistant(post = {}) {
  return {
    title: String(post.title || "").trim(),
    slug: String(post.slug || "").trim(),
    excerpt: String(post.excerpt || "").trim(),
    content: String(post.content || "").trim().slice(0, 1400),
    lyrics: String(post.lyrics || "").trim().slice(0, 1400),
    published: Boolean(post.published),
    releaseStatus: post.releaseStatus || "canon",
    collections: Array.isArray(post.collectionSlugs) ? post.collectionSlugs : [],
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

function buildCatalogContext(store = {}) {
  const posts = Array.isArray(store.posts) ? store.posts : [];
  const collections = Array.isArray(store.collections) ? store.collections : [];
  const guidedPaths = Array.isArray(store.siteContent?.guidedPaths) ? store.siteContent.guidedPaths : [];
  const postsNeedingReview = posts
    .filter((post) => {
      const hasCollection = Array.isArray(post.collectionSlugs) && post.collectionSlugs.length > 0;
      const hasTags = Array.isArray(post.themeTags) && post.themeTags.length > 0;
      const isImmersive =
        (post.collectionSlugs || []).includes("fractureverse") ||
        (post.collectionSlugs || []).includes("eldoria") ||
        ["fractureverse", "eldoria", "villain"].includes(String(post.worldLayer || ""));

      return !hasCollection || !hasTags || isImmersive || post.isPubliclyVisible === false;
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
  const generationOptions = {
    temperature: options.temperature ?? 0.2,
    num_ctx: options.num_ctx || 4096,
    num_predict: options.num_predict || 320
  };
  const response = await fetchOllama("/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.localAiModel,
      prompt,
      stream: false,
      format: "json",
      options: generationOptions
    })
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "The local model request failed.");
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
    const repairResponse = await fetchOllama("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: config.localAiModel,
        prompt: repairPrompt,
        stream: false,
        format: "json",
        options: {
          temperature: 0,
          num_ctx: Math.max(2048, generationOptions.num_ctx),
          num_predict: Math.max(500, generationOptions.num_predict)
        }
      })
    });
    const repairData = await repairResponse.json().catch(() => ({}));

    if (!repairResponse.ok) {
      throw error;
    }

    try {
      return extractJsonObject(repairData.response);
    } catch {
      throw error;
    }
  }
}

async function reviewCatalogWithLocalAi(store) {
  const status = await getLocalAiStatus();

  if (!status.available) {
    const error = new Error(status.message);
    error.statusCode = 503;
    error.localAiStatus = status;
    throw error;
  }

  if (!status.modelInstalled) {
    const error = new Error(status.message);
    error.statusCode = 503;
    error.localAiStatus = status;
    throw error;
  }

  const context = buildCatalogContext(store);
  const prompt = [
    "Return only compact JSON for this music archive admin review.",
    "Do not invent slugs. No code advice.",
    "Shape: {\"summary\":\"one sentence\",\"risks\":[\"risk\"],\"suggestedActions\":[\"action\"]}.",
    "Use at most 3 risks and 3 actions.",
    "",
    JSON.stringify(context)
  ].join("\n");
  const result = normalizeReviewResult(await generateJson(prompt));

  return {
    ...DEFAULT_REVIEW_RESULT,
    ...result,
    generatedAt: new Date().toISOString(),
    model: config.localAiModel
  };
}

async function suggestPostDraftWithLocalAi(store, postDraft = {}) {
  const status = await getLocalAiStatus();

  if (!status.available) {
    const error = new Error(status.message);
    error.statusCode = 503;
    error.localAiStatus = status;
    throw error;
  }

  if (!status.modelInstalled) {
    const error = new Error(status.message);
    error.statusCode = 503;
    error.localAiStatus = status;
    throw error;
  }

  const collections = Array.isArray(store.collections) ? store.collections : [];
  const context = {
    allowedReleaseStatuses: Array.from(VALID_RELEASE_STATUSES),
    collections: collections.map(summarizeCollectionForAssistant),
    currentDraft: summarizePostDraftForAssistant(postDraft)
  };
  const prompt = [
    "Return only compact JSON for one music archive post draft.",
    "Your main job is to improve the authoring fields: excerpt and content.",
    "Rewrite excerpt as sharper public card copy when useful.",
    "Rewrite content as a stronger release note when useful while preserving the draft's meaning.",
    "Do not invent collection slugs. Use only provided collection slugs.",
    "For metadata fields, suggest a field only if it improves or changes the current value. Do not repeat existing values.",
    "Shape: {\"summary\":\"one sentence\",\"suggestedPatch\":{\"excerpt\":\"\",\"content\":\"\",\"subCategory\":\"\",\"worldLayer\":\"\",\"themeTags\":[\"\"],\"releaseStatus\":\"canon\",\"collectionSlugs\":[\"\"]},\"rationale\":[\"reason\"],\"warnings\":[\"warning\"]}.",
    "Omit fields that should not change. Use at most 5 themeTags, 4 rationale items, and 3 warnings. Keep content under 140 words.",
    "",
    JSON.stringify(context)
  ].join("\n");
  const result = normalizePostSuggestionResult(
    await generateJson(prompt, {
      num_ctx: 4096,
      num_predict: 900
    }),
    collections,
    postDraft
  );

  return {
    ...result,
    generatedAt: new Date().toISOString(),
    model: config.localAiModel
  };
}

module.exports = {
  getLocalAiStatus,
  reviewCatalogWithLocalAi,
  suggestPostDraftWithLocalAi
};
