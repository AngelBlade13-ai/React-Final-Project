import {
  getCanonicalCollectionSurfacePosts,
  getHomepageCuratedPosts,
  getOriginalPersonalSection,
  getPrimaryCollectionSurfacePosts,
  getPublicCollectionPosts,
  getReleaseStatus,
  sortCuratedPosts,
  sortEldoriaPosts,
  sortFractureversePosts
} from "./site";

const VILLAIN_COLLECTION_SLUGS = [
  "villain-anthology",
  "villain-monologues",
  "villain-monologues-necessary-monsters",
  "necessary-monsters"
];

export const DEFAULT_GUIDED_PATHS = [
  {
    slug: "start-here",
    title: "Start Here",
    eyebrow: "Guided Path",
    intro:
      "A concise first route through the clearest public entry points before the archive starts branching into deeper worlds and alternates.",
    moodNote: "Best for first contact with the site.",
    themeHint: "",
    algorithm: {
      preset: "homepage",
      maxItems: 5
    }
  },
  {
    slug: "fractureverse",
    title: "Fractureverse",
    eyebrow: "World Path",
    intro:
      "Follow the fracture from its first stable anchor through collapse, divergence, and the edges where love and consequence stop agreeing with each other.",
    moodNote: "Best for sequence-first listening.",
    themeHint: "fractureverse",
    algorithm: {
      collectionSlug: "fractureverse",
      releaseStatuses: ["canon"],
      sort: "fractureverse"
    }
  },
  {
    slug: "eldoria",
    title: "Eldoria",
    eyebrow: "World Path",
    intro:
      "Enter the chronicle in order, starting with awakening and moving deeper into role, memory, pressure, and the burden of belonging to a world that should not know you.",
    moodNote: "Best for story-first listening.",
    themeHint: "eldoria",
    algorithm: {
      collectionSlug: "eldoria",
      sort: "eldoria"
    }
  },
  {
    slug: "identity-becoming",
    title: "Identity / Becoming",
    eyebrow: "Authored Path",
    intro:
      "A route through the songs that feel most tied to emergence, self-recognition, and the slow process of becoming legible to yourself.",
    moodNote: "Best for personal / reflective listening.",
    themeHint: "",
    algorithm: {
      sectionKeys: ["identity"],
      maxItems: 7,
      sort: "curated"
    }
  },
  {
    slug: "princess-anime",
    title: "Princess / Anime",
    eyebrow: "Authored Path",
    intro:
      "A brighter route through princess-symbolic, kawaii, and high-expression tracks where fantasy becomes a way of saying something real.",
    moodNote: "Best for vivid, stylized listening.",
    themeHint: "",
    algorithm: {
      collectionSlugs: ["kawaii-adventure", "kawaii-magical"],
      match: "any",
      maxItems: 7,
      sectionKeys: ["princess-motif"],
      sort: "curated"
    }
  },
  {
    slug: "villain-catastrophe",
    title: "Villain / Catastrophe",
    eyebrow: "Authored Path",
    intro:
      "A harsher route through villain voices, necessary monsters, and the songs where damage, power, or collapse take center stage.",
    moodNote: "Best for darker, confrontational listening.",
    themeHint: "",
    algorithm: {
      collectionSlugs: VILLAIN_COLLECTION_SLUGS,
      match: "any",
      maxItems: 7,
      sectionKeys: ["villain"],
      sort: "curated",
      themeTags: ["villain"],
      worldLayers: ["villain"]
    }
  }
];

function normalizeList(value) {
  const values = Array.isArray(value) ? value : [value];

  return values.map((entry) => String(entry || "").trim()).filter(Boolean);
}

function normalizePathConfig(path = {}) {
  return {
    slug: String(path.slug || "").trim(),
    title: String(path.title || "").trim(),
    eyebrow: String(path.eyebrow || "Guided Path").trim(),
    intro: String(path.intro || "").trim(),
    moodNote: String(path.moodNote || "").trim(),
    themeHint: String(path.themeHint || "").trim(),
    postSlugs: normalizeList(path.postSlugs),
    algorithm: path.algorithm && typeof path.algorithm === "object" ? path.algorithm : {}
  };
}

function getConfiguredPaths(siteContent = {}) {
  const configuredPaths = Array.isArray(siteContent?.guidedPaths)
    ? siteContent.guidedPaths.map(normalizePathConfig).filter((path) => path.slug && path.title)
    : [];

  return {
    paths: configuredPaths.length ? configuredPaths : DEFAULT_GUIDED_PATHS,
    usesConfiguredPaths: configuredPaths.length > 0
  };
}

function dedupeBySlug(posts = []) {
  const seen = new Set();

  return posts.filter((post) => {
    const slug = String(post?.slug || "").trim();

    if (!slug || seen.has(slug)) {
      return false;
    }

    seen.add(slug);
    return true;
  });
}

function buildCollectionMap(collections = []) {
  return new Map(collections.map((collection) => [collection.slug, collection]));
}

function getPostsBySlug(posts = []) {
  return new Map(posts.map((post) => [post.slug, post]));
}

function hasAnyMatch(postValues = [], configuredValues = []) {
  if (!configuredValues.length) {
    return false;
  }

  return normalizeList(postValues).some((entry) => configuredValues.includes(entry));
}

function filterCollectionPosts(posts, collectionSlug, collectionsBySlug) {
  const collection = collectionsBySlug.get(collectionSlug);
  const scopedPosts = posts.filter((post) => (post.collectionSlugs || []).includes(collectionSlug));

  if (!collection) {
    return scopedPosts;
  }

  if (collectionSlug === "fractureverse") {
    return getCanonicalCollectionSurfacePosts(scopedPosts, { collection, surface: "path" });
  }

  return getPrimaryCollectionSurfacePosts(scopedPosts, { collection, surface: "path" });
}

function postMatchesAlgorithm(post, algorithm = {}) {
  const sectionKeys = normalizeList(algorithm.sectionKeys || algorithm.sectionKey);
  const collectionSlugs = normalizeList(algorithm.collectionSlugs);
  const themeTags = normalizeList(algorithm.themeTags);
  const worldLayers = normalizeList(algorithm.worldLayers || algorithm.worldLayer);
  const releaseStatuses = normalizeList(algorithm.releaseStatuses || algorithm.releaseStatus);
  const criteria = [];

  if (sectionKeys.length) {
    criteria.push(sectionKeys.includes(getOriginalPersonalSection(post)?.key));
  }

  if (collectionSlugs.length) {
    criteria.push(hasAnyMatch(post.collectionSlugs, collectionSlugs));
  }

  if (themeTags.length) {
    criteria.push(hasAnyMatch(post.themeTags, themeTags));
  }

  if (worldLayers.length) {
    criteria.push(worldLayers.includes(String(post.worldLayer || "").trim()));
  }

  if (releaseStatuses.length) {
    criteria.push(releaseStatuses.includes(getReleaseStatus(post)));
  }

  if (!criteria.length) {
    return true;
  }

  return algorithm.match === "all" ? criteria.every(Boolean) : criteria.some(Boolean);
}

function algorithmHasScopedCriteria(algorithm = {}) {
  return Boolean(
    String(algorithm.collectionSlug || "").trim() ||
      normalizeList(algorithm.collectionSlugs).length ||
      normalizeList(algorithm.sectionKeys || algorithm.sectionKey).length ||
      normalizeList(algorithm.themeTags).length ||
      normalizeList(algorithm.worldLayers || algorithm.worldLayer).length
  );
}

function normalizeSignal(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function postMatchesThemeHint(post = {}, themeHint = "") {
  const normalizedHint = normalizeSignal(themeHint);

  if (!normalizedHint) {
    return false;
  }

  const values = [
    post.worldLayer,
    post.subCategory,
    ...(Array.isArray(post.collectionSlugs) ? post.collectionSlugs : []),
    ...(Array.isArray(post.themeTags) ? post.themeTags : [])
  ].map(normalizeSignal);

  return values.some((value) => value === normalizedHint || value.includes(normalizedHint));
}

function themeHintConflictsWithCollectionScope(themeHint = "", collectionSlugs = []) {
  const normalizedHint = normalizeSignal(themeHint);

  if (!normalizedHint || !collectionSlugs.length) {
    return false;
  }

  return !collectionSlugs.map(normalizeSignal).includes(normalizedHint);
}

function sortPathPosts(posts, algorithm = {}) {
  if (algorithm.sort === "fractureverse") {
    return sortFractureversePosts(posts);
  }

  if (algorithm.sort === "eldoria") {
    return sortEldoriaPosts(posts);
  }

  return sortCuratedPosts(posts, { surface: "path" });
}

function resolveAlgorithmPath(path, posts, collectionsBySlug) {
  const algorithm = path.algorithm || {};
  const themeHint = String(path.themeHint || "").trim();
  const hasScopedCriteria = algorithmHasScopedCriteria(algorithm);

  if (algorithm.preset === "homepage" && !hasScopedCriteria && !themeHint) {
    return getHomepageCuratedPosts(posts).slice(0, Number(algorithm.maxItems) || 5);
  }

  const publicPosts = getPublicCollectionPosts(posts);
  const collectionSlug = String(algorithm.collectionSlug || "").trim();
  const collectionSlugs = [
    collectionSlug,
    ...normalizeList(algorithm.collectionSlugs)
  ].filter(Boolean);
  const collectionScopeConflicts = themeHintConflictsWithCollectionScope(
    themeHint,
    collectionSlugs
  );
  const shouldApplyThemeHintScope =
    themeHint && (!hasScopedCriteria || collectionScopeConflicts);
  const effectiveAlgorithm = collectionScopeConflicts
    ? { ...algorithm, collectionSlug: "", collectionSlugs: [] }
    : algorithm;
  const basePosts =
    collectionSlug && !collectionScopeConflicts
      ? filterCollectionPosts(publicPosts, collectionSlug, collectionsBySlug)
      : publicPosts;
  const releaseStatuses = normalizeList(algorithm.releaseStatuses || algorithm.releaseStatus);
  const matchingPosts = basePosts.filter((post) => {
    const matchesAlgorithm = postMatchesAlgorithm(post, effectiveAlgorithm);
    const matchesStatus = releaseStatuses.length ? releaseStatuses.includes(getReleaseStatus(post)) : true;
    const matchesThemeHint = shouldApplyThemeHintScope
      ? postMatchesThemeHint(post, themeHint)
      : true;

    return matchesAlgorithm && matchesStatus && matchesThemeHint;
  });
  const maxItems = Number(algorithm.maxItems) || 0;
  const sortedPosts = sortPathPosts(matchingPosts, algorithm);

  return maxItems > 0 ? sortedPosts.slice(0, maxItems) : sortedPosts;
}

function resolvePathPosts(path, posts, collectionsBySlug) {
  const postSlugs = normalizeList(path.postSlugs);

  if (postSlugs.length) {
    const postsBySlug = getPostsBySlug(getPublicCollectionPosts(posts));
    return postSlugs.map((slug) => postsBySlug.get(slug)).filter(Boolean);
  }

  return resolveAlgorithmPath(path, posts, collectionsBySlug);
}

export function resolveGuidedListeningPaths(posts = [], collections = [], siteContent = {}) {
  const collectionsBySlug = buildCollectionMap(collections);
  const { paths, usesConfiguredPaths } = getConfiguredPaths(siteContent);

  return paths
    .map(normalizePathConfig)
    .map((path) => {
      const resolvedPosts = dedupeBySlug(resolvePathPosts(path, posts, collectionsBySlug));

      return {
        ...path,
        posts: resolvedPosts,
        count: resolvedPosts.length
      };
    })
    .filter((path) => usesConfiguredPaths || path.posts.length > 0);
}

export function resolveGuidedListeningPath(pathSlug, posts = [], collections = [], siteContent = {}) {
  return resolveGuidedListeningPaths(posts, collections, siteContent).find((path) => path.slug === pathSlug) || null;
}
