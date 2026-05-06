const config = require("../config");

const DEFAULT_REVIEW_RESULT = {
  summary: "",
  risks: [],
  suggestedActions: []
};

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

  try {
    return JSON.parse(text);
  } catch {
    const startIndex = text.indexOf("{");
    const endIndex = text.lastIndexOf("}");

    if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
      throw new Error("The local model did not return valid JSON.");
    }

    return JSON.parse(text.slice(startIndex, endIndex + 1));
  }
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

async function generateJson(prompt) {
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
      options: {
        temperature: 0.2,
        num_ctx: 4096,
        num_predict: 320
      }
    })
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "The local model request failed.");
  }

  return extractJsonObject(data.response);
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

module.exports = {
  getLocalAiStatus,
  reviewCatalogWithLocalAi
};
