const { slugify } = require("../utils/slugify");

const PUBLIC_PRIMARY_COLLECTION_SLUGS = ["fractureverse", "eldoria", "original-personal", "standalone"];
const VALID_RELEASE_STATUSES = new Set(["canon", "alternate", "working"]);

function normalizeCollectionInput(input, existingCollection = {}) {
  const explicitSlug = typeof input.slug === "string" ? input.slug.trim() : "";

  return {
    ...existingCollection,
    title: String(input.title || existingCollection.title || "").trim(),
    slug: slugify(explicitSlug || existingCollection.slug || input.title || existingCollection.title || ""),
    description: String(input.description || existingCollection.description || "").trim(),
    featuredReleaseSlug: String(input.featuredReleaseSlug || "").trim(),
    theme: String(input.theme || existingCollection.theme || "").trim(),
    isPublicPrimary:
      typeof input.isPublicPrimary === "boolean"
        ? input.isPublicPrimary
        : typeof existingCollection.isPublicPrimary === "boolean"
          ? existingCollection.isPublicPrimary
          : false
  };
}

function normalizeArchiveMetaInput(input = {}, existingArchiveMeta = null) {
  const normalizedInput = input && typeof input === "object" ? input : {};

  const archiveMeta = {
    ...(existingArchiveMeta || {}),
    fragmentId: String(normalizedInput.fragmentId || existingArchiveMeta?.fragmentId || "").trim(),
    state: String(normalizedInput.state || existingArchiveMeta?.state || "").trim(),
    perspective: String(normalizedInput.perspective || existingArchiveMeta?.perspective || "").trim(),
    signalType: String(normalizedInput.signalType || existingArchiveMeta?.signalType || "").trim(),
    description: String(normalizedInput.description || existingArchiveMeta?.description || "").trim(),
    systemNote: String(normalizedInput.systemNote || existingArchiveMeta?.systemNote || "").trim(),
    linkedSlugs: Array.isArray(normalizedInput.linkedSlugs)
      ? [...new Set(normalizedInput.linkedSlugs.map((slug) => String(slug).trim()).filter(Boolean))]
      : existingArchiveMeta?.linkedSlugs || [],
    chapterNumber: String(normalizedInput.chapterNumber || existingArchiveMeta?.chapterNumber || "").trim(),
    entryType: String(normalizedInput.entryType || existingArchiveMeta?.entryType || "").trim(),
    subtitle: String(normalizedInput.subtitle || existingArchiveMeta?.subtitle || "").trim(),
    openingPassage: String(normalizedInput.openingPassage || existingArchiveMeta?.openingPassage || "").trim(),
    coreSituation: String(normalizedInput.coreSituation || existingArchiveMeta?.coreSituation || "").trim(),
    coreTension: String(normalizedInput.coreTension || existingArchiveMeta?.coreTension || "").trim(),
    chronicleObservation: String(normalizedInput.chronicleObservation || existingArchiveMeta?.chronicleObservation || "").trim(),
    chronicleContradiction: String(normalizedInput.chronicleContradiction || existingArchiveMeta?.chronicleContradiction || "").trim(),
    chronicleConclusion: String(normalizedInput.chronicleConclusion || existingArchiveMeta?.chronicleConclusion || "").trim(),
    emotionalState: String(normalizedInput.emotionalState || existingArchiveMeta?.emotionalState || "").trim(),
    coreConflict: String(normalizedInput.coreConflict || existingArchiveMeta?.coreConflict || "").trim(),
    risk: String(normalizedInput.risk || existingArchiveMeta?.risk || "").trim(),
    anchorQuote: String(normalizedInput.anchorQuote || existingArchiveMeta?.anchorQuote || "").trim(),
    resolution: String(normalizedInput.resolution || existingArchiveMeta?.resolution || "").trim(),
    entryStatus: String(normalizedInput.entryStatus || existingArchiveMeta?.entryStatus || "").trim(),
    playerFlavorLine: String(normalizedInput.playerFlavorLine || existingArchiveMeta?.playerFlavorLine || "").trim()
  };

  if (
    !archiveMeta.fragmentId &&
    !archiveMeta.state &&
    !archiveMeta.perspective &&
    !archiveMeta.signalType &&
    !archiveMeta.description &&
    !archiveMeta.systemNote &&
    archiveMeta.linkedSlugs.length === 0 &&
    !archiveMeta.chapterNumber &&
    !archiveMeta.entryType &&
    !archiveMeta.subtitle &&
    !archiveMeta.openingPassage &&
    !archiveMeta.coreSituation &&
    !archiveMeta.coreTension &&
    !archiveMeta.chronicleObservation &&
    !archiveMeta.chronicleContradiction &&
    !archiveMeta.chronicleConclusion &&
    !archiveMeta.emotionalState &&
    !archiveMeta.coreConflict &&
    !archiveMeta.risk &&
    !archiveMeta.anchorQuote &&
    !archiveMeta.resolution &&
    !archiveMeta.entryStatus &&
    !archiveMeta.playerFlavorLine
  ) {
    return null;
  }

  return archiveMeta;
}

function normalizePostInput(input, collections, existingPost = {}) {
  const collectionSlugSet = new Set(collections.map((collection) => collection.slug));
  const requestedCollections = Array.isArray(input.collectionSlugs)
    ? input.collectionSlugs
    : existingPost.collectionSlugs || [];
  const hasVideoUrlInput = typeof input.videoUrl === "string";
  const normalizedTitle = String(input.title || existingPost.title || "").trim();
  const explicitSlug = typeof input.slug === "string" ? input.slug.trim() : "";
  const normalizedSlugSource = explicitSlug || existingPost.slug || normalizedTitle || existingPost.title || "";
  const normalizedReleaseStatus = String(input.releaseStatus || existingPost.releaseStatus || "canon").trim().toLowerCase();

  return {
    ...existingPost,
    title: normalizedTitle,
    slug: slugify(normalizedSlugSource),
    videoUrl: hasVideoUrlInput ? input.videoUrl.trim() : String(existingPost.videoUrl || "").trim(),
    excerpt: String(input.excerpt || existingPost.excerpt || "").trim(),
    content: String(input.content || existingPost.content || "").trim(),
    lyrics:
      typeof input.lyrics === "string"
        ? input.lyrics.trim()
        : typeof existingPost.lyrics === "string"
          ? existingPost.lyrics
          : "",
    archiveMeta: normalizeArchiveMetaInput(input.archiveMeta, existingPost.archiveMeta),
    createdAt: existingPost.createdAt || input.createdAt || new Date().toISOString(),
    published: typeof input.published === "boolean" ? input.published : Boolean(existingPost.published),
    collectionSlugs: [...new Set(requestedCollections.map((slug) => String(slug).trim()).filter((slug) => collectionSlugSet.has(slug)))],
    subCategory:
      typeof input.subCategory === "string"
        ? input.subCategory.trim()
        : typeof existingPost.subCategory === "string"
          ? existingPost.subCategory.trim()
          : "",
    sourceTag:
      typeof input.sourceTag === "string"
        ? input.sourceTag.trim()
        : typeof existingPost.sourceTag === "string"
          ? existingPost.sourceTag.trim()
          : "",
    worldLayer:
      typeof input.worldLayer === "string"
        ? input.worldLayer.trim()
        : typeof existingPost.worldLayer === "string"
          ? existingPost.worldLayer.trim()
          : "",
    themeTags: Array.isArray(input.themeTags)
      ? [...new Set(input.themeTags.map((tag) => String(tag).trim()).filter(Boolean))]
      : Array.isArray(existingPost.themeTags)
        ? [...new Set(existingPost.themeTags.map((tag) => String(tag).trim()).filter(Boolean))]
        : [],
    versionFamily:
      typeof input.versionFamily === "string"
        ? input.versionFamily.trim()
        : typeof existingPost.versionFamily === "string"
          ? existingPost.versionFamily.trim()
          : "",
    isPrimaryVersion:
      typeof input.isPrimaryVersion === "boolean" ? input.isPrimaryVersion : Boolean(existingPost.isPrimaryVersion),
    isArchive: typeof input.isArchive === "boolean" ? input.isArchive : Boolean(existingPost.isArchive),
    isHomepageEligible:
      typeof input.isHomepageEligible === "boolean" ? input.isHomepageEligible : Boolean(existingPost.isHomepageEligible),
    isPubliclyVisible:
      typeof input.isPubliclyVisible === "boolean"
        ? input.isPubliclyVisible
        : typeof existingPost.isPubliclyVisible === "boolean"
          ? existingPost.isPubliclyVisible
          : true,
    supersededBySlug:
      typeof input.supersededBySlug === "string"
        ? input.supersededBySlug.trim()
        : typeof existingPost.supersededBySlug === "string"
          ? existingPost.supersededBySlug.trim()
          : "",
    supersededReason:
      typeof input.supersededReason === "string"
        ? input.supersededReason.trim()
        : typeof existingPost.supersededReason === "string"
          ? existingPost.supersededReason.trim()
          : "",
    supersededAt:
      typeof input.supersededAt === "string"
        ? input.supersededAt.trim()
        : typeof existingPost.supersededAt === "string"
          ? existingPost.supersededAt.trim()
          : "",
    releaseStatus: VALID_RELEASE_STATUSES.has(normalizedReleaseStatus) ? normalizedReleaseStatus : "canon"
  };
}

function normalizeBulkPostUpdateInput(input = {}, collections = []) {
  const normalizedInput = input && typeof input === "object" ? input : {};
  const collectionSlugSet = new Set(collections.map((collection) => collection.slug));
  const requestedReleaseStatus = String(normalizedInput.releaseStatus || "").trim().toLowerCase();
  const requestedCollectionOperation = String(normalizedInput.collectionOperation || "").trim().toLowerCase();
  const requestedCollectionSlug = String(normalizedInput.collectionSlug || "").trim();

  return {
    isPubliclyVisible:
      normalizedInput.isPubliclyVisible === "true"
        ? true
        : normalizedInput.isPubliclyVisible === "false"
          ? false
          : undefined,
    isArchive:
      normalizedInput.isArchive === "true"
        ? true
        : normalizedInput.isArchive === "false"
          ? false
          : undefined,
    isHomepageEligible:
      normalizedInput.isHomepageEligible === "true"
        ? true
        : normalizedInput.isHomepageEligible === "false"
          ? false
          : undefined,
    releaseStatus: VALID_RELEASE_STATUSES.has(requestedReleaseStatus) ? requestedReleaseStatus : undefined,
    sourceTag:
      typeof normalizedInput.sourceTag === "string" && normalizedInput.sourceTag !== "__keep__"
        ? normalizedInput.sourceTag.trim()
        : undefined,
    worldLayer:
      typeof normalizedInput.worldLayer === "string" && normalizedInput.worldLayer !== "__keep__"
        ? normalizedInput.worldLayer.trim()
        : undefined,
    collectionOperation: ["add", "remove"].includes(requestedCollectionOperation) ? requestedCollectionOperation : "",
    collectionSlug: collectionSlugSet.has(requestedCollectionSlug) ? requestedCollectionSlug : ""
  };
}

function hasBulkPostUpdates(updates = {}) {
  return (
    typeof updates.isPubliclyVisible === "boolean" ||
    typeof updates.isArchive === "boolean" ||
    typeof updates.isHomepageEligible === "boolean" ||
    typeof updates.releaseStatus === "string" ||
    typeof updates.sourceTag === "string" ||
    typeof updates.worldLayer === "string" ||
    (updates.collectionOperation && updates.collectionSlug)
  );
}

function applyBulkPostUpdates(post, updates = {}) {
  let nextPost = { ...post };
  let changed = false;

  if (typeof updates.isPubliclyVisible === "boolean" && post.isPubliclyVisible !== updates.isPubliclyVisible) {
    nextPost.isPubliclyVisible = updates.isPubliclyVisible;
    changed = true;
  }

  if (typeof updates.isArchive === "boolean" && post.isArchive !== updates.isArchive) {
    nextPost.isArchive = updates.isArchive;
    changed = true;
  }

  if (typeof updates.isHomepageEligible === "boolean" && post.isHomepageEligible !== updates.isHomepageEligible) {
    nextPost.isHomepageEligible = updates.isHomepageEligible;
    changed = true;
  }

  if (typeof updates.releaseStatus === "string" && post.releaseStatus !== updates.releaseStatus) {
    nextPost.releaseStatus = updates.releaseStatus;
    changed = true;
  }

  if (typeof updates.sourceTag === "string" && String(post.sourceTag || "") !== updates.sourceTag) {
    nextPost.sourceTag = updates.sourceTag;
    changed = true;
  }

  if (typeof updates.worldLayer === "string" && String(post.worldLayer || "") !== updates.worldLayer) {
    nextPost.worldLayer = updates.worldLayer;
    changed = true;
  }

  if (updates.collectionOperation && updates.collectionSlug) {
    const currentCollectionSlugs = Array.isArray(nextPost.collectionSlugs) ? nextPost.collectionSlugs : [];
    const hasCollection = currentCollectionSlugs.includes(updates.collectionSlug);

    if (updates.collectionOperation === "add" && !hasCollection) {
      nextPost.collectionSlugs = [...currentCollectionSlugs, updates.collectionSlug];
      changed = true;
    }

    if (updates.collectionOperation === "remove" && hasCollection) {
      nextPost.collectionSlugs = currentCollectionSlugs.filter((slug) => slug !== updates.collectionSlug);
      changed = true;
    }
  }

  return changed ? nextPost : post;
}

function attachCollectionDetails(post, collections) {
  return {
    ...post,
    collections: collections.filter((collection) => post.collectionSlugs.includes(collection.slug))
  };
}

function buildCollectionSummary(collection, posts) {
  const releases = posts.filter((post) => post.collectionSlugs.includes(collection.slug));
  const publicSurfaceReleases = releases.filter(isPostPublicCollectionSurfaceVisible);
  const featuredRelease = collection.featuredReleaseSlug
    ? publicSurfaceReleases.find((post) => post.slug === collection.featuredReleaseSlug) || null
    : null;

  return {
    ...collection,
    featuredRelease,
    releaseCount: publicSurfaceReleases.length
  };
}

function reconcileCollections(collections, posts) {
  return collections.map((collection) => {
    const hasFeaturedRelease =
      collection.featuredReleaseSlug &&
      posts.some((post) => post.collectionSlugs.includes(collection.slug) && post.slug === collection.featuredReleaseSlug);

    return hasFeaturedRelease
      ? collection
      : {
          ...collection,
          featuredReleaseSlug: ""
        };
  });
}

function collectChangedEntries(previousEntries, nextEntries) {
  const previousById = new Map(previousEntries.map((entry) => [entry.id, JSON.stringify(entry)]));

  return nextEntries.filter((entry) => previousById.get(entry.id) !== JSON.stringify(entry));
}

function findEntryBySlugOrHistory(entries, slug, predicate = () => true) {
  const requestedSlug = String(slug || "").trim();

  if (!requestedSlug) {
    return {
      entry: null,
      redirectSlug: ""
    };
  }

  const directMatch = entries.find((entry) => predicate(entry) && entry.slug === requestedSlug);

  if (directMatch) {
    return {
      entry: directMatch,
      redirectSlug: ""
    };
  }

  const redirectMatch = entries.find(
    (entry) => predicate(entry) && Array.isArray(entry.slugHistory) && entry.slugHistory.includes(requestedSlug)
  );

  return {
    entry: redirectMatch || null,
    redirectSlug: redirectMatch ? redirectMatch.slug : ""
  };
}

function appendSlugHistory(existingHistory, previousSlug, nextSlug) {
  return [
    ...new Set(
      [...(Array.isArray(existingHistory) ? existingHistory : []), String(previousSlug || "").trim()]
        .map((slug) => String(slug || "").trim())
        .filter((slug) => slug && slug !== nextSlug)
    )
  ];
}

function slugIsReserved(entries, nextSlug, currentId = "") {
  const candidateSlug = String(nextSlug || "").trim();

  if (!candidateSlug) {
    return false;
  }

  return entries.some(
    (entry) =>
      entry.id !== currentId &&
      (entry.slug === candidateSlug || (Array.isArray(entry.slugHistory) && entry.slugHistory.includes(candidateSlug)))
  );
}

function remapSlugList(values, previousSlug, nextSlug) {
  return [
    ...new Set(
      (Array.isArray(values) ? values : [])
        .map((slug) => (slug === previousSlug ? nextSlug : slug))
        .map((slug) => String(slug || "").trim())
        .filter(Boolean)
    )
  ];
}

function remapPostSlugReferences(posts, collections, siteContent, previousSlug, nextSlug, updatedPostId) {
  if (!previousSlug || previousSlug === nextSlug) {
    return {
      posts,
      collections,
      siteContent
    };
  }

  const nextPosts = posts.map((post) => {
    if (post.id === updatedPostId) {
      return post;
    }

    const nextArchiveMeta = post.archiveMeta
      ? {
          ...post.archiveMeta,
          linkedSlugs: remapSlugList(post.archiveMeta.linkedSlugs, previousSlug, nextSlug)
        }
      : post.archiveMeta;
    const nextSupersededBySlug = post.supersededBySlug === previousSlug ? nextSlug : post.supersededBySlug;
    const archiveMetaChanged = JSON.stringify(nextArchiveMeta) !== JSON.stringify(post.archiveMeta || null);

    if (!archiveMetaChanged && nextSupersededBySlug === post.supersededBySlug) {
      return post;
    }

    return {
      ...post,
      archiveMeta: nextArchiveMeta,
      supersededBySlug: nextSupersededBySlug
    };
  });

  const nextCollections = collections.map((collection) =>
    collection.featuredReleaseSlug === previousSlug
      ? {
          ...collection,
          featuredReleaseSlug: nextSlug
        }
      : collection
  );
  const nextSiteContent =
    siteContent?.home?.featuredReleaseSlug === previousSlug
      ? {
          ...siteContent,
          home: {
            ...siteContent.home,
            featuredReleaseSlug: nextSlug
          }
        }
      : siteContent;

  return {
    posts: nextPosts,
    collections: nextCollections,
    siteContent: nextSiteContent
  };
}

function isFeaturedReleaseValidForCollection(posts, collectionSlug, featuredReleaseSlug) {
  const normalizedCollectionSlug = String(collectionSlug || "").trim();
  const normalizedFeaturedReleaseSlug = String(featuredReleaseSlug || "").trim();

  if (!normalizedFeaturedReleaseSlug) {
    return true;
  }

  return posts.some(
    (post) =>
      post.slug === normalizedFeaturedReleaseSlug &&
      Array.isArray(post.collectionSlugs) &&
      post.collectionSlugs.includes(normalizedCollectionSlug)
  );
}

function isPostPubliclyVisible(post) {
  return post?.published === true && post?.isPubliclyVisible !== false;
}

function isPostPublicCollectionSurfaceVisible(post) {
  return isPostPubliclyVisible(post) && post.releaseStatus !== "working";
}

function resolvePublishedPost(store, slug) {
  return findEntryBySlugOrHistory(store.posts, slug, isPostPubliclyVisible);
}

function resolveCollectionBySlug(store, slug) {
  return findEntryBySlugOrHistory(store.collections, slug);
}

function listPublicCollections(store, scope = "") {
  const publishedPosts = store.posts.filter((post) => isPostPubliclyVisible(post));
  const normalizedScope = String(scope || "").trim().toLowerCase();

  return store.collections
    .filter((collection) => (normalizedScope === "all" ? true : collection.isPublicPrimary))
    .sort((left, right) => {
      const leftIndex = PUBLIC_PRIMARY_COLLECTION_SLUGS.indexOf(left.slug);
      const rightIndex = PUBLIC_PRIMARY_COLLECTION_SLUGS.indexOf(right.slug);

      if (leftIndex !== rightIndex) {
        return (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex);
      }

      return left.title.localeCompare(right.title);
    })
    .map((collection) => buildCollectionSummary(collection, publishedPosts));
}

module.exports = {
  appendSlugHistory,
  applyBulkPostUpdates,
  attachCollectionDetails,
  buildCollectionSummary,
  collectChangedEntries,
  hasBulkPostUpdates,
  isFeaturedReleaseValidForCollection,
  isPostPublicCollectionSurfaceVisible,
  isPostPubliclyVisible,
  listPublicCollections,
  normalizeBulkPostUpdateInput,
  normalizeCollectionInput,
  normalizePostInput,
  reconcileCollections,
  remapPostSlugReferences,
  resolveCollectionBySlug,
  resolvePublishedPost,
  slugIsReserved
};
