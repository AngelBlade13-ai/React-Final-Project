const ISSUE_SAMPLE_LIMIT = 6;
const RECENT_ACTIVITY_LIMIT = 6;
const RELEASE_STATUS_ORDER = ["canon", "alternate", "working"];
const SEVERITY_WEIGHT = {
  critical: 4,
  attention: 3,
  watch: 2,
  info: 1
};

function getReleaseStatus(post) {
  const status = String(post?.releaseStatus || "").trim().toLowerCase();
  return RELEASE_STATUS_ORDER.includes(status) ? status : "canon";
}

function hasVideo(post) {
  return Boolean(String(post?.videoUrl || "").trim());
}

function hasLyrics(post) {
  return Boolean(String(post?.lyrics || "").trim());
}

function isPubliclyVisible(post) {
  return post?.published === true && post?.isPubliclyVisible !== false;
}

function truncateText(value, maxLength = 140) {
  const text = String(value || "").trim().replace(/\s+/g, " ");

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 1).trim()}...`;
}

function summarizeCollection(collection) {
  return {
    id: collection.id,
    slug: collection.slug,
    title: collection.title,
    theme: collection.theme || "",
    isPublicPrimary: Boolean(collection.isPublicPrimary)
  };
}

function summarizePost(post, collectionsBySlug) {
  const collectionSummaries = (post.collectionSlugs || [])
    .map((slug) => collectionsBySlug.get(slug))
    .filter(Boolean)
    .map(summarizeCollection);

  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    createdAt: post.createdAt,
    published: Boolean(post.published),
    isPubliclyVisible: post.isPubliclyVisible !== false,
    releaseStatus: getReleaseStatus(post),
    hasVideo: hasVideo(post),
    hasLyrics: hasLyrics(post),
    isHomepageEligible: Boolean(post.isHomepageEligible),
    collectionCount: collectionSummaries.length,
    collections: collectionSummaries,
    worldLayer: String(post.worldLayer || "").trim(),
    sourceTag: String(post.sourceTag || "").trim()
  };
}

function summarizeComment(comment, postsBySlug, usersById) {
  const post = postsBySlug.get(comment.postSlug);
  const author = usersById.get(comment.authorId);

  return {
    id: comment.id,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    status: String(comment.status || "visible").trim() || "visible",
    bodyPreview: truncateText(comment.body, 180),
    postSlug: comment.postSlug,
    postTitle: post?.title || "Unknown release",
    authorId: comment.authorId,
    authorName: author?.displayName || "Unknown user"
  };
}

function buildSampleItem({ title, meta, note, href }) {
  return {
    title,
    meta,
    note,
    href
  };
}

function buildIssue({ key, label, description, severity, action, items }) {
  return {
    key,
    label,
    description,
    severity,
    action,
    count: items.length,
    sample: items.slice(0, ISSUE_SAMPLE_LIMIT)
  };
}

function getPrimaryThemeKey(post, collectionsBySlug) {
  const themedCollection = (post.collectionSlugs || [])
    .map((slug) => collectionsBySlug.get(slug))
    .filter(Boolean)
    .find((collection) => collection.theme);

  return themedCollection?.theme || "unthemed";
}

function hasRequiredThemeMetadata(post, themeKey) {
  const archiveMeta = post?.archiveMeta || {};

  if (themeKey === "fractureverse") {
    return Boolean(String(archiveMeta.fragmentId || "").trim() && String(archiveMeta.state || "").trim());
  }

  if (themeKey === "eldoria") {
    return Boolean(String(archiveMeta.chapterNumber || "").trim() && String(archiveMeta.entryType || "").trim());
  }

  return true;
}

function calculateReadinessScore(readinessSignals = []) {
  const values = readinessSignals.filter((signal) => Number.isFinite(signal));

  if (!values.length) {
    return 100;
  }

  const sum = values.reduce((total, value) => total + value, 0);
  return Math.round((sum / values.length) * 100);
}

function buildArchiveInsights(store = {}) {
  const posts = Array.isArray(store.posts) ? store.posts : [];
  const collections = Array.isArray(store.collections) ? store.collections : [];
  const comments = Array.isArray(store.comments) ? store.comments : [];
  const users = Array.isArray(store.users) ? store.users : [];
  const siteContent = store.siteContent || {};
  const collectionsBySlug = new Map(collections.map((collection) => [collection.slug, collection]));
  const postsBySlug = new Map(posts.map((post) => [post.slug, post]));
  const usersById = new Map(users.map((user) => [user.id, user]));
  const themeLabels = new Map(
    (Array.isArray(siteContent.collectionThemes) ? siteContent.collectionThemes : []).map((theme) => [theme.key, theme.label || theme.key])
  );
  const publishedPosts = posts.filter((post) => post.published);
  const publicPosts = posts.filter(isPubliclyVisible);
  const visibleComments = comments.filter((comment) => String(comment.status || "visible") === "visible");
  const hiddenComments = comments.filter((comment) => String(comment.status || "visible") === "hidden");
  const immersivePosts = posts.filter((post) => {
    const themeKey = getPrimaryThemeKey(post, collectionsBySlug);
    return themeKey === "fractureverse" || themeKey === "eldoria";
  });
  const immersivePostsWithMetadata = immersivePosts.filter((post) =>
    hasRequiredThemeMetadata(post, getPrimaryThemeKey(post, collectionsBySlug))
  );
  const publicPrimaryCollections = collections.filter((collection) => collection.isPublicPrimary);
  const publicPrimaryCollectionsWithFeatured = publicPrimaryCollections.filter((collection) => {
    if (!collection.featuredReleaseSlug) {
      return false;
    }

    const featuredRelease = postsBySlug.get(collection.featuredReleaseSlug);
    return Boolean(featuredRelease && isPubliclyVisible(featuredRelease));
  });
  const readiness = {
    videoCoverage: {
      ready: publishedPosts.filter(hasVideo).length,
      total: publishedPosts.length,
      ratio: publishedPosts.length ? publishedPosts.filter(hasVideo).length / publishedPosts.length : 1,
      label: "Published releases with playable video"
    },
    lyricCoverage: {
      ready: publishedPosts.filter(hasLyrics).length,
      total: publishedPosts.length,
      ratio: publishedPosts.length ? publishedPosts.filter(hasLyrics).length / publishedPosts.length : 1,
      label: "Published releases with lyrics"
    },
    worldMetadataCoverage: {
      ready: immersivePostsWithMetadata.length,
      total: immersivePosts.length,
      ratio: immersivePosts.length ? immersivePostsWithMetadata.length / immersivePosts.length : 1,
      label: "Immersive-world releases with required metadata"
    },
    featuredCoverage: {
      ready: publicPrimaryCollectionsWithFeatured.length,
      total: publicPrimaryCollections.length,
      ratio: publicPrimaryCollections.length ? publicPrimaryCollectionsWithFeatured.length / publicPrimaryCollections.length : 1,
      label: "Public-primary collections with live featured releases"
    }
  };

  const publishedWithoutVideo = publishedPosts
    .filter((post) => !hasVideo(post))
    .map((post) =>
      buildSampleItem({
        title: post.title,
        meta: `${getReleaseStatus(post)} release | ${post.collectionSlugs?.length || 0} collections`,
        note: "Published without a playable video source.",
        href: "/admin/posts"
      })
    );
  const publishedWithoutLyrics = publishedPosts
    .filter((post) => !hasLyrics(post))
    .map((post) =>
      buildSampleItem({
        title: post.title,
        meta: `${getReleaseStatus(post)} release | ${post.collectionSlugs?.length || 0} collections`,
        note: "Lyrics are still empty on this published release.",
        href: "/admin/posts"
      })
    );
  const postsWithoutCollections = posts
    .filter((post) => !(post.collectionSlugs || []).length)
    .map((post) =>
      buildSampleItem({
        title: post.title,
        meta: `${post.published ? "Published" : "Draft"} | ${getReleaseStatus(post)}`,
        note: "This release is not attached to any collection.",
        href: "/admin/posts"
      })
    );
  const hiddenPublishedPosts = posts
    .filter((post) => post.published && post.isPubliclyVisible === false)
    .map((post) =>
      buildSampleItem({
        title: post.title,
        meta: `${getReleaseStatus(post)} release`,
        note: "Published, but hidden from public surfaces.",
        href: "/admin/posts"
      })
    );
  const homepageEligibilityConflicts = posts
    .filter((post) => post.isHomepageEligible && getReleaseStatus(post) !== "canon")
    .map((post) =>
      buildSampleItem({
        title: post.title,
        meta: `${getReleaseStatus(post)} | homepage eligible`,
        note: "Homepage curation currently favors canon releases, so this flag may not behave as expected.",
        href: "/admin/posts"
      })
    );
  const invalidFractureLinks = posts
    .filter((post) => {
      const themeKey = getPrimaryThemeKey(post, collectionsBySlug);
      return (
        themeKey === "fractureverse" &&
        Array.isArray(post.archiveMeta?.linkedSlugs) &&
        post.archiveMeta.linkedSlugs.some((slug) => !postsBySlug.has(slug))
      );
    })
    .map((post) => {
      const missingLinks = (post.archiveMeta?.linkedSlugs || []).filter((slug) => !postsBySlug.has(slug));
      return buildSampleItem({
        title: post.title,
        meta: `${missingLinks.length} missing linked fragment${missingLinks.length === 1 ? "" : "s"}`,
        note: `Broken linkedSlugs: ${missingLinks.join(", ")}`,
        href: "/admin/posts"
      });
    });
  const eldoriaMissingChronicle = posts
    .filter((post) => getPrimaryThemeKey(post, collectionsBySlug) === "eldoria" && !hasRequiredThemeMetadata(post, "eldoria"))
    .map((post) =>
      buildSampleItem({
        title: post.title,
        meta: `${post.published ? "Published" : "Draft"} | Eldoria`,
        note: "Missing chapter number or entry type metadata.",
        href: "/admin/posts"
      })
    );
  const publicCollectionsWithoutFeatured = publicPrimaryCollections
    .filter((collection) => !collection.featuredReleaseSlug)
    .map((collection) =>
      buildSampleItem({
        title: collection.title,
        meta: collection.theme ? `Theme: ${collection.theme}` : "Standard collection",
        note: "Public-primary collection has no featured release selected.",
        href: "/admin/collections"
      })
    );
  const collectionsWithBrokenFeaturedRelease = collections
    .filter((collection) => collection.featuredReleaseSlug && !postsBySlug.has(collection.featuredReleaseSlug))
    .map((collection) =>
      buildSampleItem({
        title: collection.title,
        meta: `Broken featured slug: ${collection.featuredReleaseSlug}`,
        note: "The featured release slug no longer resolves to a release.",
        href: "/admin/collections"
      })
    );
  const draftsReadyForReview = posts
    .filter((post) => !post.published && (hasVideo(post) || hasLyrics(post) || String(post.excerpt || "").trim()))
    .map((post) =>
      buildSampleItem({
        title: post.title,
        meta: `${hasVideo(post) ? "Video ready" : "No video"} | ${hasLyrics(post) ? "Lyrics ready" : "Lyrics empty"}`,
        note: "Draft has enough material to review for publication.",
        href: "/admin/posts"
      })
    );
  const orphanedComments = comments
    .filter((comment) => !postsBySlug.has(comment.postSlug))
    .map((comment) => {
      const commentSummary = summarizeComment(comment, postsBySlug, usersById);
      return buildSampleItem({
        title: commentSummary.postTitle,
        meta: `${commentSummary.authorName} | ${commentSummary.status}`,
        note: `Comment points at missing post slug "${comment.postSlug}".`,
        href: "/admin/comments"
      });
    });

  const issues = [
    buildIssue({
      key: "broken-featured-release",
      label: "Collections with broken featured releases",
      description: "These collections reference featured slugs that no longer resolve.",
      severity: "critical",
      action: "Open Collections and replace or clear the featured release slug.",
      items: collectionsWithBrokenFeaturedRelease
    }),
    buildIssue({
      key: "invalid-fracture-links",
      label: "Fractureverse entries with broken linked fragments",
      description: "Linked fragment slugs should always resolve to existing releases.",
      severity: "critical",
      action: "Open Posts and repair the broken linked fragment references.",
      items: invalidFractureLinks
    }),
    buildIssue({
      key: "published-without-video",
      label: "Published releases missing video",
      description: "These releases are live but still render with the pending-video state.",
      severity: "attention",
      action: "Upload media or unpublish releases that are not ready to be heard yet.",
      items: publishedWithoutVideo
    }),
    buildIssue({
      key: "posts-without-collections",
      label: "Releases without collections",
      description: "Unassigned releases are harder to discover and easier to forget.",
      severity: "attention",
      action: "Attach these releases to at least one collection so they participate in curation.",
      items: postsWithoutCollections
    }),
    buildIssue({
      key: "eldoria-metadata",
      label: "Eldoria entries missing chronicle metadata",
      description: "Chronicle pages feel best when chapter framing is filled in.",
      severity: "attention",
      action: "Add chapter number and entry type on the post form for each Eldoria release.",
      items: eldoriaMissingChronicle
    }),
    buildIssue({
      key: "collections-without-featured-release",
      label: "Public collections missing a featured release",
      description: "Top-level public collections read stronger when they have a lead record.",
      severity: "attention",
      action: "Choose a featured release for each public-primary collection.",
      items: publicCollectionsWithoutFeatured
    }),
    buildIssue({
      key: "homepage-curation-conflicts",
      label: "Homepage eligibility conflicts",
      description: "Homepage eligibility is set on releases that are not canon.",
      severity: "watch",
      action: "Either promote the intended release to canon or clear the homepage flag.",
      items: homepageEligibilityConflicts
    }),
    buildIssue({
      key: "published-without-lyrics",
      label: "Published releases missing lyrics",
      description: "Optional, but still a good opportunity for richer release pages.",
      severity: "watch",
      action: "Add lyrics where they matter most or leave them intentionally blank.",
      items: publishedWithoutLyrics
    }),
    buildIssue({
      key: "orphaned-comments",
      label: "Comments pointing at missing releases",
      description: "These comments reference slugs that no longer exist in the archive.",
      severity: "watch",
      action: "Review comments and either delete them or restore the intended release record.",
      items: orphanedComments
    }),
    buildIssue({
      key: "hidden-published-posts",
      label: "Published releases hidden from public surfaces",
      description: "Helpful for staging, but easy to forget over time.",
      severity: "info",
      action: "Review whether these should stay hidden or return to public browsing.",
      items: hiddenPublishedPosts
    }),
    buildIssue({
      key: "drafts-ready-for-review",
      label: "Drafts with enough material to review",
      description: "These drafts already have enough structure to revisit in the admin.",
      severity: "info",
      action: "Open Posts and decide whether each draft is ready to publish.",
      items: draftsReadyForReview
    })
  ]
    .filter((issue) => issue.count > 0)
    .sort((left, right) => {
      const severityDelta = (SEVERITY_WEIGHT[right.severity] || 0) - (SEVERITY_WEIGHT[left.severity] || 0);

      if (severityDelta !== 0) {
        return severityDelta;
      }

      return right.count - left.count;
    });

  const themeCoverageMap = new Map();
  const allThemeKeys = new Set(["unthemed"]);

  collections.forEach((collection) => {
    allThemeKeys.add(collection.theme || "unthemed");
  });

  posts.forEach((post) => {
    allThemeKeys.add(getPrimaryThemeKey(post, collectionsBySlug));
  });

  Array.from(allThemeKeys).forEach((themeKey) => {
    themeCoverageMap.set(themeKey, {
      key: themeKey,
      label: themeKey === "unthemed" ? "Unthemed" : themeLabels.get(themeKey) || themeKey,
      collectionCount: collections.filter((collection) => (collection.theme || "unthemed") === themeKey).length,
      releaseCount: 0,
      publishedCount: 0,
      publicCount: 0,
      metadataReadyCount: 0,
      metadataRelevantCount: 0
    });
  });

  posts.forEach((post) => {
    const themeKey = getPrimaryThemeKey(post, collectionsBySlug);
    const entry = themeCoverageMap.get(themeKey);

    if (!entry) {
      return;
    }

    entry.releaseCount += 1;
    entry.publishedCount += post.published ? 1 : 0;
    entry.publicCount += isPubliclyVisible(post) ? 1 : 0;

    if (themeKey === "fractureverse" || themeKey === "eldoria") {
      entry.metadataRelevantCount += 1;
      entry.metadataReadyCount += hasRequiredThemeMetadata(post, themeKey) ? 1 : 0;
    }
  });

  const themeCoverage = Array.from(themeCoverageMap.values())
    .map((entry) => ({
      ...entry,
      metadataCoverage: entry.metadataRelevantCount ? entry.metadataReadyCount / entry.metadataRelevantCount : 1
    }))
    .sort((left, right) => {
      if (left.key === "unthemed") {
        return 1;
      }

      if (right.key === "unthemed") {
        return -1;
      }

      return right.releaseCount - left.releaseCount;
    });

  const collectionHealth = collections
    .map((collection) => {
      const collectionPosts = posts.filter((post) => (post.collectionSlugs || []).includes(collection.slug));
      const publishedCount = collectionPosts.filter((post) => post.published).length;
      const publicCount = collectionPosts.filter(isPubliclyVisible).length;
      const commentCount = comments.filter((comment) => collectionPosts.some((post) => post.slug === comment.postSlug)).length;
      const featuredRelease = collection.featuredReleaseSlug ? postsBySlug.get(collection.featuredReleaseSlug) : null;
      const missingThemeMetadataCount = collectionPosts.filter((post) => !hasRequiredThemeMetadata(post, collection.theme || "")).length;
      const healthIssues = [];
      let healthScore = 100;

      if (!collectionPosts.length) {
        healthIssues.push("No releases assigned yet");
        healthScore -= 50;
      }

      if (collection.isPublicPrimary && !collection.featuredReleaseSlug) {
        healthIssues.push("No featured release selected");
        healthScore -= 18;
      }

      if (collection.featuredReleaseSlug && !featuredRelease) {
        healthIssues.push("Featured release slug no longer resolves");
        healthScore -= 32;
      }

      if (publishedCount === 0) {
        healthIssues.push("No published releases");
        healthScore -= 18;
      }

      if (collection.isPublicPrimary && publicCount === 0 && collectionPosts.length > 0) {
        healthIssues.push("Nothing currently visible on the public surface");
        healthScore -= 22;
      }

      if ((collection.theme === "fractureverse" || collection.theme === "eldoria") && missingThemeMetadataCount > 0) {
        healthIssues.push(`${missingThemeMetadataCount} release${missingThemeMetadataCount === 1 ? "" : "s"} missing world metadata`);
        healthScore -= Math.min(24, missingThemeMetadataCount * 8);
      }

      return {
        id: collection.id,
        slug: collection.slug,
        title: collection.title,
        theme: collection.theme || "",
        isPublicPrimary: Boolean(collection.isPublicPrimary),
        releaseCount: collectionPosts.length,
        publishedCount,
        publicCount,
        commentCount,
        featuredReleaseSlug: collection.featuredReleaseSlug || "",
        featuredReleaseTitle: featuredRelease?.title || "",
        healthScore: Math.max(0, healthScore),
        issues: healthIssues
      };
    })
    .sort((left, right) => {
      const publicPrimaryDelta = Number(Boolean(right.isPublicPrimary)) - Number(Boolean(left.isPublicPrimary));

      if (publicPrimaryDelta !== 0) {
        return publicPrimaryDelta;
      }

      if (left.issues.length !== right.issues.length) {
        return right.issues.length - left.issues.length;
      }

      return left.healthScore - right.healthScore;
    });

  const topCommentedPosts = Array.from(
    comments.reduce((map, comment) => {
      const current = map.get(comment.postSlug) || 0;
      map.set(comment.postSlug, current + 1);
      return map;
    }, new Map())
  )
    .map(([postSlug, count]) => {
      const post = postsBySlug.get(postSlug);

      return {
        postSlug,
        title: post?.title || "Missing release",
        count
      };
    })
    .sort((left, right) => right.count - left.count || left.title.localeCompare(right.title))
    .slice(0, 6);

  const recentActivity = {
    posts: posts
      .slice()
      .sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")))
      .slice(0, RECENT_ACTIVITY_LIMIT)
      .map((post) => summarizePost(post, collectionsBySlug)),
    comments: comments
      .slice()
      .sort((left, right) => String(right.createdAt || "").localeCompare(String(left.createdAt || "")))
      .slice(0, RECENT_ACTIVITY_LIMIT)
      .map((comment) => summarizeComment(comment, postsBySlug, usersById))
  };

  return {
    summary: {
      archiveHealthScore: calculateReadinessScore([
        readiness.videoCoverage.ratio,
        readiness.lyricCoverage.ratio,
        readiness.worldMetadataCoverage.ratio,
        readiness.featuredCoverage.ratio
      ]),
      totalPosts: posts.length,
      publishedPosts: publishedPosts.length,
      publicPosts: publicPosts.length,
      totalCollections: collections.length,
      publicPrimaryCollections: publicPrimaryCollections.length,
      totalComments: comments.length,
      visibleComments: visibleComments.length,
      hiddenComments: hiddenComments.length,
      totalUsers: users.length
    },
    readiness,
    releaseStatusBreakdown: RELEASE_STATUS_ORDER.map((status) => ({
      status,
      count: posts.filter((post) => getReleaseStatus(post) === status).length,
      publishedCount: posts.filter((post) => getReleaseStatus(post) === status && post.published).length,
      publicCount: posts.filter((post) => getReleaseStatus(post) === status && isPubliclyVisible(post)).length
    })),
    themeCoverage,
    issues: issues.slice(0, 8),
    quickWins: issues.slice(0, 4),
    collectionHealth: collectionHealth.slice(0, 10),
    topCommentedPosts,
    recentActivity
  };
}

module.exports = {
  buildArchiveInsights
};
