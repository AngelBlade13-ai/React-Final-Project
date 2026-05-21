const fs = require("fs/promises");
const crypto = require("crypto");
const { getDb, runWithTransaction } = require("../lib/mongo");
const config = require("../config");
const { slugify } = require("../utils/slugify");
const {
  PUBLIC_LISTENER_COPY,
  applyPublicListenerCopy,
  mapGuidedPathEyebrow,
  siteContentNeedsLegacyUpgrade
} = require("./publicListenerCopy");
const VALID_RELEASE_STATUSES = new Set(["canon", "alternate", "working"]);
const DEFAULT_GUIDED_PATHS = [
  {
    slug: "start-here",
    title: "Start Here",
    eyebrow: "Listening Path",
    intro:
      "A concise first route through the clearest public entry points before the archive starts branching into deeper worlds and alternates.",
    moodNote: "Best for first contact with the site.",
    themeHint: "",
    postSlugs: [],
    algorithm: {
      preset: "homepage",
      maxItems: 5,
      sort: "curated"
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
    postSlugs: [],
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
    postSlugs: [],
    algorithm: {
      collectionSlug: "eldoria",
      sort: "eldoria"
    }
  },
  {
    slug: "identity-becoming",
    title: "Identity / Becoming",
    eyebrow: "Mood Path",
    intro:
      "A route through the songs that feel most tied to emergence, self-recognition, and the slow process of becoming legible to yourself.",
    moodNote: "Best for personal / reflective listening.",
    themeHint: "",
    postSlugs: [],
    algorithm: {
      sectionKeys: ["identity"],
      maxItems: 7,
      sort: "curated"
    }
  },
  {
    slug: "princess-anime",
    title: "Princess / Anime",
    eyebrow: "Mood Path",
    intro:
      "A brighter route through princess-symbolic, kawaii, and high-expression songs where fantasy becomes a way of saying something real.",
    moodNote: "Best for vivid, stylized listening.",
    themeHint: "",
    postSlugs: [],
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
    eyebrow: "Mood Path",
    intro:
      "A harsher route through villain voices, necessary monsters, and the songs where damage, power, or collapse take center stage.",
    moodNote: "Best for darker, confrontational listening.",
    themeHint: "",
    postSlugs: [],
    algorithm: {
      collectionSlugs: [
        "villain-anthology",
        "villain-monologues",
        "villain-monologues-necessary-monsters",
        "necessary-monsters"
      ],
      match: "any",
      maxItems: 7,
      sectionKeys: ["villain"],
      sort: "curated",
      themeTags: ["villain"],
      worldLayers: ["villain"]
    }
  }
];

const seedCollections = [
  {
    id: crypto.randomUUID(),
    slug: "main-verse",
    title: "Main Verse",
    description: "Core releases that define the emotional center of the site.",
    featuredReleaseSlug: "beautiful-and-real-sunshine",
    theme: ""
  },
  {
    id: crypto.randomUUID(),
    slug: "late-night-drafts",
    title: "Late Night Drafts",
    description:
      "Songs that feel like notebook pages, unfinished thoughts, and after-hours sketches.",
    featuredReleaseSlug: "second-window",
    theme: ""
  },
  {
    id: crypto.randomUUID(),
    slug: "cinematic-pop",
    title: "Cinematic Pop",
    description:
      "Big hooks, widescreen emotion, and music built to feel like motion.",
    featuredReleaseSlug: "beautiful-and-real-sunshine",
    theme: ""
  }
];

const seedPosts = [
  {
    id: crypto.randomUUID(),
    title: "Beautiful & Real Sunshine",
    slug: "beautiful-and-real-sunshine",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    excerpt:
      "A first release post with the song video, a short note, and room for the lyrics that shaped it.",
    content:
      "This is the release format going forward: one entry per song, a short written note, and the video at the center of the post.",
    lyrics: "You can add full lyrics here whenever a song needs them.",
    createdAt: "2026-03-17T00:00:00.000Z",
    published: true,
    collectionSlugs: ["main-verse", "cinematic-pop"]
  },
  {
    id: crypto.randomUUID(),
    title: "Second Window",
    slug: "second-window",
    videoUrl: "https://www.w3schools.com/html/movie.mp4",
    excerpt:
      "A quieter draft kept in the dashboard until the post is ready to go live.",
    content:
      "Draft posts stay simple too. Add the video, write the release note, optionally paste lyrics, and publish when it feels finished.",
    lyrics: "",
    createdAt: "2026-03-18T00:00:00.000Z",
    published: false,
    collectionSlugs: ["late-night-drafts"]
  }
];

const seedSiteContent = {
  branding: {
    ...PUBLIC_LISTENER_COPY.branding
  },
  home: {
    ...PUBLIC_LISTENER_COPY.home,
    featuredReleaseSlug: ""
  },
  guidedPaths: DEFAULT_GUIDED_PATHS,
  collectionThemes: [
    {
      key: "default",
      label: "Default",
      kind: "standard",
      palette: {
        light: {
          background: "#f3d7d1",
          surface: "#f8e4df",
          surfaceAlt: "#f2d2cc",
          text: "#3a2327",
          mutedText: "#7a5158",
          border: "#e8bdb7",
          primary: "#df8f8a",
          primaryStrong: "#cb726e",
          secondary: "#f4c9c2"
        },
        dark: {
          background: "#120d14",
          surface: "#1b1320",
          surfaceAlt: "#241826",
          text: "#f8eaf1",
          mutedText: "#c9b2bf",
          border: "#3a2735",
          primary: "#f0a6ca",
          primaryStrong: "#ffb7d5",
          secondary: "#cba6f7"
        }
      }
    },
    {
      key: "eldoria",
      label: "Eldoria",
      kind: "immersive",
      palette: {
        light: {
          background: "#ece4cf",
          surface: "#f6efdf",
          surfaceAlt: "#ebe2cd",
          text: "#2f3124",
          mutedText: "#636550",
          border: "#cdbf9c",
          primary: "#6b7b4a",
          primaryStrong: "#a6884f",
          secondary: "#88a6b3"
        },
        dark: {
          background: "#16201a",
          surface: "#1d2821",
          surfaceAlt: "#273228",
          text: "#f1ead7",
          mutedText: "#c4bca5",
          border: "#56604f",
          primary: "#8ea167",
          primaryStrong: "#c6ab6d",
          secondary: "#7e9eab"
        }
      }
    },
    {
      key: "soft-archive",
      label: "Soft Archive",
      kind: "standard",
      palette: {
        light: {
          background: "#fbf1ee",
          surface: "#fff8f6",
          surfaceAlt: "#f7ebe7",
          text: "#432930",
          mutedText: "#87646d",
          border: "#efd5ce",
          primary: "#dca0ad",
          primaryStrong: "#cb7f93",
          secondary: "#f6ddd7"
        },
        dark: {
          background: "#1a1215",
          surface: "#25181d",
          surfaceAlt: "#302027",
          text: "#f7eef2",
          mutedText: "#ccb8c0",
          border: "#47323a",
          primary: "#e3a4af",
          primaryStrong: "#f2b8c2",
          secondary: "#c8a2b1"
        }
      }
    },
    {
      key: "fractureverse",
      label: "Fractureverse",
      kind: "immersive",
      palette: {
        light: {
          background: "#f4d8df",
          surface: "#f7e5ea",
          surfaceAlt: "#efd2db",
          text: "#421e2a",
          mutedText: "#7b5562",
          border: "#e2afbe",
          primary: "#d94d86",
          primaryStrong: "#b92b66",
          secondary: "#8a4fff"
        },
        dark: {
          background: "#140d12",
          surface: "#1f1419",
          surfaceAlt: "#2a1820",
          text: "#f6eaf0",
          mutedText: "#c6a9b6",
          border: "#4b2233",
          primary: "#ff6fa5",
          primaryStrong: "#ff3f87",
          secondary: "#8a4fff"
        }
      }
    },
    {
      key: "stage",
      label: "Stage",
      kind: "standard",
      palette: {
        light: {
          background: "#f6e3d8",
          surface: "#f9ece4",
          surfaceAlt: "#f1ddd1",
          text: "#44251d",
          mutedText: "#7f5a4d",
          border: "#e2bea7",
          primary: "#b84934",
          primaryStrong: "#c99236",
          secondary: "#8f261d"
        },
        dark: {
          background: "#160d0d",
          surface: "#241313",
          surfaceAlt: "#311818",
          text: "#faefe3",
          mutedText: "#d7b9a6",
          border: "#573126",
          primary: "#c53d2c",
          primaryStrong: "#e0a646",
          secondary: "#8f261d"
        }
      }
    },
    {
      key: "signal",
      label: "Signal",
      kind: "standard",
      palette: {
        light: {
          background: "#e7e5f4",
          surface: "#efedf9",
          surfaceAlt: "#e0dcf3",
          text: "#2e2945",
          mutedText: "#676084",
          border: "#c6bedf",
          primary: "#7764dc",
          primaryStrong: "#4e8ed8",
          secondary: "#8b86c9"
        },
        dark: {
          background: "#12101b",
          surface: "#1b1727",
          surfaceAlt: "#241d35",
          text: "#efeefe",
          mutedText: "#b8b4db",
          border: "#3d345d",
          primary: "#8c72ff",
          primaryStrong: "#66b5ff",
          secondary: "#4b5ec7"
        }
      }
    }
  ],
  about: {
    ...PUBLIC_LISTENER_COPY.about
  }
};

const seedUsers = [];
const seedComments = [];

function normalizeSlugHistory(slugHistory, currentSlug) {
  return Array.isArray(slugHistory)
    ? [
        ...new Set(
          slugHistory
            .map((slug) => String(slug || "").trim())
            .filter((slug) => slug && slug !== currentSlug)
        )
      ]
    : [];
}

function normalizeStringList(value) {
  return Array.isArray(value)
    ? [
        ...new Set(
          value.map((entry) => String(entry || "").trim()).filter(Boolean)
        )
      ]
    : [];
}

function normalizeCollection(collection) {
  if (!collection) {
    return null;
  }

  const fallbackSlug = slugify(collection.title || "");
  const slug = String(collection.slug || fallbackSlug).trim();

  return {
    id: String(
      collection.id ||
        `col-${collection.slug || fallbackSlug}` ||
        crypto.randomUUID()
    ).trim(),
    slug,
    slugHistory: normalizeSlugHistory(collection.slugHistory, slug),
    title: String(collection.title || "").trim(),
    description: String(collection.description || "").trim(),
    featuredReleaseSlug: String(collection.featuredReleaseSlug || "").trim(),
    theme: String(collection.theme || "").trim(),
    themeTags: normalizeStringList(collection.themeTags),
    worldLayers: normalizeStringList(collection.worldLayers),
    isPublicPrimary: Boolean(collection.isPublicPrimary)
  };
}

function extractMarkdownField(content, label) {
  const normalizedContent = String(content || "");
  const pattern = new RegExp(`\\*\\*${label}:\\*\\*\\s*([^\\n]+)`, "i");
  const match = normalizedContent.match(pattern);
  return String(match?.[1] || "").trim();
}

function getUniqueValue(candidates, usedValues, fallbackBase) {
  const normalizedCandidates = [
    ...new Set(
      candidates.map((value) => String(value || "").trim()).filter(Boolean)
    )
  ];

  for (const candidate of normalizedCandidates) {
    if (!usedValues.has(candidate)) {
      usedValues.add(candidate);
      return candidate;
    }
  }

  const baseValue =
    normalizedCandidates[0] ||
    String(fallbackBase || "").trim() ||
    crypto.randomUUID();

  if (!usedValues.has(baseValue)) {
    usedValues.add(baseValue);
    return baseValue;
  }

  let counter = 2;
  let nextValue = `${baseValue}-${counter}`;

  while (usedValues.has(nextValue)) {
    counter += 1;
    nextValue = `${baseValue}-${counter}`;
  }

  usedValues.add(nextValue);
  return nextValue;
}

function normalizeImportedPosts(posts = []) {
  const usedIds = new Set();
  const usedSlugs = new Set();

  return posts.map((post, index) => {
    const title = String(post?.title || "").trim();
    const titleSlug = slugify(title);
    const explicitSlug = String(post?.slug || "").trim();
    const versionLabel = extractMarkdownField(post?.content, "Version");
    const versionSlug = slugify(versionLabel);
    const sourceId = String(post?.sourceId || post?.id || "").trim();
    const sourceSlug = slugify(sourceId);

    const slug = getUniqueValue(
      [
        explicitSlug,
        titleSlug,
        titleSlug && versionSlug ? `${titleSlug}-${versionSlug}` : "",
        titleSlug && sourceSlug ? `${titleSlug}-${sourceSlug}` : "",
        sourceSlug
      ],
      usedSlugs,
      `post-${index + 1}`
    );

    const id = getUniqueValue(
      [
        String(post?.id || "").trim(),
        sourceId,
        sourceId && versionSlug ? `${sourceId}-${versionSlug}` : "",
        slug
      ],
      usedIds,
      `post-${index + 1}`
    );

    return normalizePost({
      ...post,
      id,
      slug
    });
  });
}

function normalizeImportedCollections(collections = []) {
  return collections
    .map((collection) => {
      const slug = String(
        collection?.slug || slugify(collection?.title || "")
      ).trim();

      return normalizeCollection({
        ...collection,
        id: String(collection?.id || `col-${slug}`).trim(),
        slug
      });
    })
    .filter(Boolean);
}

function normalizeArchiveMeta(archiveMeta) {
  if (!archiveMeta || typeof archiveMeta !== "object") {
    return null;
  }

  const fractureMeta = {
    fragmentId: String(archiveMeta.fragmentId || "").trim(),
    state: String(archiveMeta.state || "").trim(),
    perspective: String(archiveMeta.perspective || "").trim(),
    signalType: String(archiveMeta.signalType || "").trim(),
    description: String(archiveMeta.description || "").trim(),
    systemNote: String(archiveMeta.systemNote || "").trim(),
    linkedSlugs: Array.isArray(archiveMeta.linkedSlugs)
      ? [
          ...new Set(
            archiveMeta.linkedSlugs
              .map((slug) => String(slug).trim())
              .filter(Boolean)
          )
        ]
      : []
  };

  const eldoriaMeta = {
    chapterNumber: String(archiveMeta.chapterNumber || "").trim(),
    entryType: String(archiveMeta.entryType || "").trim(),
    subtitle: String(archiveMeta.subtitle || "").trim(),
    openingPassage: String(archiveMeta.openingPassage || "").trim(),
    coreSituation: String(archiveMeta.coreSituation || "").trim(),
    coreTension: String(archiveMeta.coreTension || "").trim(),
    chronicleObservation: String(archiveMeta.chronicleObservation || "").trim(),
    chronicleContradiction: String(
      archiveMeta.chronicleContradiction || ""
    ).trim(),
    chronicleConclusion: String(archiveMeta.chronicleConclusion || "").trim(),
    emotionalState: String(archiveMeta.emotionalState || "").trim(),
    coreConflict: String(archiveMeta.coreConflict || "").trim(),
    risk: String(archiveMeta.risk || "").trim(),
    anchorQuote: String(archiveMeta.anchorQuote || "").trim(),
    resolution: String(archiveMeta.resolution || "").trim(),
    entryStatus: String(archiveMeta.entryStatus || "").trim(),
    playerFlavorLine: String(archiveMeta.playerFlavorLine || "").trim()
  };

  const hasFractureMeta =
    !!fractureMeta.fragmentId ||
    !!fractureMeta.state ||
    !!fractureMeta.perspective ||
    !!fractureMeta.signalType ||
    !!fractureMeta.description ||
    !!fractureMeta.systemNote ||
    fractureMeta.linkedSlugs.length > 0;

  const hasEldoriaMeta =
    !!eldoriaMeta.chapterNumber ||
    !!eldoriaMeta.entryType ||
    !!eldoriaMeta.subtitle ||
    !!eldoriaMeta.openingPassage ||
    !!eldoriaMeta.coreSituation ||
    !!eldoriaMeta.coreTension ||
    !!eldoriaMeta.chronicleObservation ||
    !!eldoriaMeta.chronicleContradiction ||
    !!eldoriaMeta.chronicleConclusion ||
    !!eldoriaMeta.emotionalState ||
    !!eldoriaMeta.coreConflict ||
    !!eldoriaMeta.risk ||
    !!eldoriaMeta.anchorQuote ||
    !!eldoriaMeta.resolution ||
    !!eldoriaMeta.entryStatus ||
    !!eldoriaMeta.playerFlavorLine;

  if (!hasFractureMeta && !hasEldoriaMeta) {
    return null;
  }

  return {
    ...(hasFractureMeta ? fractureMeta : {}),
    ...(hasEldoriaMeta ? eldoriaMeta : {})
  };
}

function normalizePost(post) {
  if (!post) {
    return null;
  }

  const fallbackTitleSlug = slugify(post.title || "");
  const slug = String(post.slug || fallbackTitleSlug).trim();

  return {
    ...post,
    id: String(
      post.id || post.sourceId || fallbackTitleSlug || crypto.randomUUID()
    ).trim(),
    title: String(post.title || "").trim(),
    slug,
    slugHistory: normalizeSlugHistory(post.slugHistory, slug),
    videoUrl: String(post.videoUrl || "").trim(),
    excerpt: String(post.excerpt || "").trim(),
    content: String(post.content || "").trim(),
    lyrics: typeof post.lyrics === "string" ? post.lyrics : "",
    createdAt: post.createdAt || new Date().toISOString(),
    published: Boolean(post.published),
    archiveMeta: normalizeArchiveMeta(post.archiveMeta),
    subCategory: String(post.subCategory || "").trim(),
    sourceTag: String(post.sourceTag || "").trim(),
    worldLayer: String(post.worldLayer || "").trim(),
    themeTags: Array.isArray(post.themeTags)
      ? [
          ...new Set(
            post.themeTags.map((tag) => String(tag).trim()).filter(Boolean)
          )
        ]
      : [],
    versionFamily: String(post.versionFamily || "").trim(),
    isPrimaryVersion: Boolean(post.isPrimaryVersion),
    isArchive: Boolean(post.isArchive),
    isHomepageEligible: Boolean(post.isHomepageEligible),
    isPubliclyVisible:
      typeof post.isPubliclyVisible === "boolean"
        ? post.isPubliclyVisible
        : true,
    supersededBySlug: String(post.supersededBySlug || "").trim(),
    supersededReason: String(post.supersededReason || "").trim(),
    supersededAt: String(post.supersededAt || "").trim(),
    releaseStatus: VALID_RELEASE_STATUSES.has(
      String(post.releaseStatus || "")
        .trim()
        .toLowerCase()
    )
      ? String(post.releaseStatus || "")
          .trim()
          .toLowerCase()
      : "canon",
    collectionSlugs: Array.isArray(post.collectionSlugs)
      ? [
          ...new Set(
            post.collectionSlugs
              .map((slug) => String(slug).trim())
              .filter(Boolean)
          )
        ]
      : []
  };
}

function normalizeSiteContent(siteContent = {}) {
  const assistantFindingDecisions = Array.isArray(
    siteContent.assistantFindingDecisions
  )
    ? siteContent.assistantFindingDecisions
        .map((entry) => ({
          fingerprint: String(entry?.fingerprint || "").trim(),
          status: String(entry?.status || "rejected").trim() || "rejected",
          reasonCode: String(entry?.reasonCode || "other").trim() || "other",
          summary: String(entry?.summary || "").trim(),
          targetType: String(entry?.targetType || "catalog").trim() || "catalog",
          targetSlug: String(entry?.targetSlug || "").trim(),
          field: String(entry?.field || "").trim(),
          issue: String(entry?.issue || "").trim(),
          recommendedAction: String(entry?.recommendedAction || "").trim(),
          targetStateHash: String(entry?.targetStateHash || "").trim(),
          model: String(entry?.model || "").trim(),
          reviewedAt: String(entry?.reviewedAt || "").trim(),
          patchFields: Array.isArray(entry?.patchFields)
            ? entry.patchFields
                .map((field) => String(field || "").trim())
                .filter(Boolean)
            : []
        }))
        .filter((entry) => entry.fingerprint)
        .slice(-100)
    : [];

  const normalized = {
    branding: {
      ...seedSiteContent.branding,
      ...(siteContent.branding || {})
    },
    home: {
      ...seedSiteContent.home,
      ...(siteContent.home || {})
    },
    collectionThemes: Array.isArray(siteContent.collectionThemes)
      ? siteContent.collectionThemes
          .map((theme) => ({
            ...theme,
            key: String(theme?.key || "").trim(),
            label: String(theme?.label || "").trim(),
            kind: String(theme?.kind || "standard").trim() || "standard",
            worldEyebrow: String(theme?.worldEyebrow || "").trim(),
            featuredLabel: String(theme?.featuredLabel || "").trim(),
            featuredAction: String(theme?.featuredAction || "").trim(),
            listLabel: String(theme?.listLabel || "").trim(),
            worldNoteTitle: String(theme?.worldNoteTitle || "").trim(),
            worldNoteText: String(theme?.worldNoteText || "").trim(),
            itemName: String(theme?.itemName || "").trim(),
            itemPlural: String(theme?.itemPlural || "").trim(),
            itemAction: String(theme?.itemAction || "").trim(),
            playerLabel: String(theme?.playerLabel || "").trim(),
            playerUpNextLabel: String(theme?.playerUpNextLabel || "").trim(),
            palette: {
              light: {
                background: String(
                  theme?.palette?.light?.background || ""
                ).trim(),
                surface: String(theme?.palette?.light?.surface || "").trim(),
                surfaceAlt: String(
                  theme?.palette?.light?.surfaceAlt || ""
                ).trim(),
                text: String(theme?.palette?.light?.text || "").trim(),
                mutedText: String(
                  theme?.palette?.light?.mutedText || ""
                ).trim(),
                border: String(theme?.palette?.light?.border || "").trim(),
                primary: String(theme?.palette?.light?.primary || "").trim(),
                primaryStrong: String(
                  theme?.palette?.light?.primaryStrong || ""
                ).trim(),
                secondary: String(theme?.palette?.light?.secondary || "").trim()
              },
              dark: {
                background: String(
                  theme?.palette?.dark?.background || ""
                ).trim(),
                surface: String(theme?.palette?.dark?.surface || "").trim(),
                surfaceAlt: String(
                  theme?.palette?.dark?.surfaceAlt || ""
                ).trim(),
                text: String(theme?.palette?.dark?.text || "").trim(),
                mutedText: String(theme?.palette?.dark?.mutedText || "").trim(),
                border: String(theme?.palette?.dark?.border || "").trim(),
                primary: String(theme?.palette?.dark?.primary || "").trim(),
                primaryStrong: String(
                  theme?.palette?.dark?.primaryStrong || ""
                ).trim(),
                secondary: String(theme?.palette?.dark?.secondary || "").trim()
              }
            }
          }))
          .filter((theme) => theme.key)
      : seedSiteContent.collectionThemes.map((theme) => ({ ...theme })),
    guidedPaths:
      Array.isArray(siteContent.guidedPaths) && siteContent.guidedPaths.length
        ? siteContent.guidedPaths
            .map((path) => ({
              slug: slugify(path?.slug || path?.title || ""),
              title: String(path?.title || "").trim(),
              eyebrow: mapGuidedPathEyebrow(path?.eyebrow || "Listening Path"),
              intro: String(path?.intro || "").trim(),
              moodNote: String(path?.moodNote || "").trim(),
              themeHint: slugify(path?.themeHint || ""),
              postSlugs: Array.isArray(path?.postSlugs)
                ? [
                    ...new Set(
                      path.postSlugs
                        .map((slug) => slugify(slug))
                        .filter(Boolean)
                    )
                  ]
                : [],
              algorithm:
                path?.algorithm &&
                typeof path.algorithm === "object" &&
                !Array.isArray(path.algorithm)
                  ? {
                      ...path.algorithm,
                      preset: String(path.algorithm.preset || "").trim(),
                      collectionSlug: slugify(
                        path.algorithm.collectionSlug || ""
                      ),
                      sort:
                        String(path.algorithm.sort || "curated").trim() ||
                        "curated"
                    }
                  : {}
            }))
            .filter((path) => path.slug && path.title)
        : seedSiteContent.guidedPaths.map((path) => ({
            ...path,
            algorithm: { ...(path.algorithm || {}) },
            postSlugs: [...(path.postSlugs || [])]
          })),
    about: {
      ...seedSiteContent.about,
      ...(siteContent.about || {})
    },
    assistantFindingDecisions
  };

  return applyPublicListenerCopy(normalized);
}

function normalizeUser(user) {
  if (!user) {
    return null;
  }

  const savedReleaseSlugs = Array.isArray(user.savedReleaseSlugs)
    ? [
        ...new Set(
          user.savedReleaseSlugs
            .map((slug) => String(slug || "").trim())
            .filter(Boolean)
        )
      ]
    : [];
  const recentReleaseSlugs = Array.isArray(user.recentReleaseSlugs)
    ? [
        ...new Set(
          user.recentReleaseSlugs
            .map((slug) => String(slug || "").trim())
            .filter(Boolean)
        )
      ].slice(0, 12)
    : [];
  const releaseReactions =
    user.releaseReactions && typeof user.releaseReactions === "object"
      ? Object.fromEntries(
          Object.entries(user.releaseReactions)
            .map(([slug, reaction]) => [
              String(slug || "").trim(),
              String(reaction || "").trim()
            ])
            .filter(([slug, reaction]) => slug && reaction)
        )
      : {};

  return {
    id: user.id || crypto.randomUUID(),
    email: String(user.email || "")
      .trim()
      .toLowerCase(),
    displayName: String(user.displayName || "").trim(),
    passwordHash: String(user.passwordHash || "").trim(),
    role: String(user.role || "user").trim() || "user",
    status: String(user.status || "active").trim() || "active",
    savedReleaseSlugs,
    recentReleaseSlugs,
    releaseReactions,
    createdAt: user.createdAt || new Date().toISOString(),
    updatedAt: user.updatedAt || user.createdAt || new Date().toISOString()
  };
}

function normalizeComment(comment) {
  if (!comment) {
    return null;
  }

  return {
    id: comment.id || crypto.randomUUID(),
    postSlug: String(comment.postSlug || "").trim(),
    authorId: String(comment.authorId || "").trim(),
    body: String(comment.body || "").trim(),
    status: String(comment.status || "visible").trim() || "visible",
    createdAt: comment.createdAt || new Date().toISOString(),
    updatedAt:
      comment.updatedAt || comment.createdAt || new Date().toISOString()
  };
}

function normalizeAdminAuditLog(log) {
  if (!log) {
    return null;
  }

  const details = (() => {
    try {
      return JSON.parse(JSON.stringify(log.details || {}));
    } catch {
      return {};
    }
  })();

  return {
    id: String(log.id || crypto.randomUUID()).trim(),
    actorEmail: String(log.actorEmail || "").trim(),
    actorRole: String(log.actorRole || "admin").trim() || "admin",
    action: String(log.action || "").trim(),
    entityType: String(log.entityType || "").trim(),
    entityId: String(log.entityId || "").trim(),
    entityLabel: String(log.entityLabel || "").trim(),
    requestId: String(log.requestId || "").trim(),
    method: String(log.method || "")
      .trim()
      .toUpperCase(),
    path: String(log.path || "").trim(),
    details,
    createdAt: log.createdAt || new Date().toISOString()
  };
}

function sanitizeDoc(doc) {
  if (!doc) {
    return null;
  }

  const { _id: _ignoredId, ...rest } = doc;
  return rest;
}

async function readLegacySeed() {
  let data;

  try {
    const file = await fs.readFile(config.postsFile, "utf8");
    data = JSON.parse(file);
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return buildDefaultSeed();
    }

    throw error;
  }

  const operationalSeed = await readOperationalSeed();

  return {
    posts: Array.isArray(data.posts)
      ? normalizeImportedPosts(data.posts).map(normalizePost).filter(Boolean)
      : seedPosts.map(normalizePost),
    collections: Array.isArray(data.collections)
      ? normalizeImportedCollections(data.collections)
          .map(normalizeCollection)
          .filter(Boolean)
      : seedCollections.map(normalizeCollection),
    users: Array.isArray(operationalSeed.users)
      ? operationalSeed.users.map(normalizeUser).filter(Boolean)
      : seedUsers.map(normalizeUser),
    comments: Array.isArray(operationalSeed.comments)
      ? operationalSeed.comments.map(normalizeComment).filter(Boolean)
      : seedComments.map(normalizeComment),
    siteContent: normalizeSiteContent(data.siteContent)
  };
}

async function readOperationalSeed() {
  if (!config.operationalSeedFile) {
    return {};
  }

  try {
    const file = await fs.readFile(config.operationalSeedFile, "utf8");
    const data = JSON.parse(file);

    return data && typeof data === "object" ? data : {};
  } catch (error) {
    if (error && error.code === "ENOENT") {
      return {};
    }

    throw error;
  }
}

function buildDefaultSeed() {
  return {
    posts: seedPosts.map(normalizePost),
    collections: seedCollections.map(normalizeCollection),
    users: seedUsers.map(normalizeUser),
    comments: seedComments.map(normalizeComment),
    siteContent: normalizeSiteContent(seedSiteContent)
  };
}

async function ensureStore() {
  const db = getDb();
  const postsCollection = db.collection("posts");
  const collectionsCollection = db.collection("collections");
  const siteContentCollection = db.collection("siteContent");
  const adminAuditCollection = db.collection("adminAuditLogs");

  await Promise.all([
    postsCollection.createIndex({ id: 1 }, { unique: true }),
    postsCollection.createIndex({ slug: 1 }, { unique: true }),
    collectionsCollection.createIndex({ id: 1 }, { unique: true }),
    collectionsCollection.createIndex({ slug: 1 }, { unique: true }),
    db.collection("users").createIndex({ id: 1 }, { unique: true }),
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("comments").createIndex({ id: 1 }, { unique: true }),
    db
      .collection("comments")
      .createIndex({ postSlug: 1, status: 1, createdAt: -1 }),
    db.collection("comments").createIndex({ authorId: 1, createdAt: -1 }),
    siteContentCollection.createIndex({ key: 1 }, { unique: true }),
    adminAuditCollection.createIndex({ id: 1 }, { unique: true }),
    adminAuditCollection.createIndex({ createdAt: -1, _id: -1 }),
    adminAuditCollection.createIndex({ actorEmail: 1, createdAt: -1 }),
    adminAuditCollection.createIndex({ action: 1, createdAt: -1 })
  ]);

  const [
    postCount,
    collectionCount,
    userCount,
    commentCount,
    siteContentCount,
    auditCount
  ] = await Promise.all([
    postsCollection.countDocuments(),
    collectionsCollection.countDocuments(),
    db.collection("users").countDocuments(),
    db.collection("comments").countDocuments(),
    siteContentCollection.countDocuments(),
    adminAuditCollection.countDocuments()
  ]);

  if (
    postCount ||
    collectionCount ||
    userCount ||
    commentCount ||
    siteContentCount ||
    auditCount
  ) {
    return;
  }

  const seed = await readLegacySeed();

  if (seed.posts.length) {
    await postsCollection.insertMany(seed.posts);
  }

  if (seed.collections.length) {
    await collectionsCollection.insertMany(seed.collections);
  }

  if (seed.users.length) {
    await db.collection("users").insertMany(seed.users);
  }

  if (seed.comments.length) {
    await db.collection("comments").insertMany(seed.comments);
  }

  await siteContentCollection.insertOne({
    key: "siteContent",
    ...normalizeSiteContent(seed.siteContent)
  });
}

async function readStore() {
  await ensureStore();
  const db = getDb();

  const [posts, collections, users, comments, siteContentDoc] =
    await Promise.all([
      db
        .collection("posts")
        .find({})
        .sort({ createdAt: -1, _id: -1 })
        .toArray(),
      db
        .collection("collections")
        .find({})
        .sort({ title: 1, _id: 1 })
        .toArray(),
      db.collection("users").find({}).sort({ createdAt: 1, _id: 1 }).toArray(),
      db
        .collection("comments")
        .find({})
        .sort({ createdAt: -1, _id: -1 })
        .toArray(),
      db.collection("siteContent").findOne({ key: "siteContent" })
    ]);

  return {
    posts: posts.map(sanitizeDoc).map(normalizePost).filter(Boolean),
    collections: collections
      .map(sanitizeDoc)
      .map(normalizeCollection)
      .filter(Boolean),
    users: users.map(sanitizeDoc).map(normalizeUser).filter(Boolean),
    comments: comments.map(sanitizeDoc).map(normalizeComment).filter(Boolean),
    siteContent: await resolveSiteContentForRead(sanitizeDoc(siteContentDoc))
  };
}

async function resolveSiteContentForRead(siteContentDoc = {}) {
  const siteContent = normalizeSiteContent(siteContentDoc);

  if (!siteContentNeedsLegacyUpgrade(siteContentDoc)) {
    return siteContent;
  }

  await writeSiteContent(siteContent);
  return siteContent;
}

function getSessionOptions(options = {}) {
  return options.session ? { session: options.session } : {};
}

function normalizeDocuments(documents, normalizer) {
  return Array.isArray(documents)
    ? documents.map(normalizer).filter(Boolean)
    : [];
}

async function upsertDocumentsById(collectionName, documents, options = {}) {
  if (!documents.length) {
    return documents;
  }

  const db = getDb();
  const collection = db.collection(collectionName);
  const sessionOptions = getSessionOptions(options);

  await collection.bulkWrite(
    documents.map((document) => ({
      replaceOne: {
        filter: { id: document.id },
        replacement: document,
        upsert: true
      }
    })),
    {
      ordered: true,
      ...sessionOptions
    }
  );

  return documents;
}

async function syncDocumentsById(collectionName, documents, options = {}) {
  const db = getDb();
  const collection = db.collection(collectionName);
  const sessionOptions = getSessionOptions(options);
  const nextIds = new Set(documents.map((document) => document.id));
  const existingIds = (
    await collection
      .find({}, { projection: { id: 1, _id: 0 }, ...sessionOptions })
      .toArray()
  )
    .map((entry) => String(entry.id || "").trim())
    .filter(Boolean);
  const idsToDelete = existingIds.filter((id) => !nextIds.has(id));

  if (idsToDelete.length) {
    await collection.deleteMany({ id: { $in: idsToDelete } }, sessionOptions);
  }

  return upsertDocumentsById(collectionName, documents, options);
}

async function insertNormalizedDocument(
  collectionName,
  document,
  options = {}
) {
  if (!document) {
    return null;
  }

  const db = getDb();
  await db
    .collection(collectionName)
    .insertOne(document, getSessionOptions(options));
  return document;
}

async function replaceNormalizedDocumentById(
  collectionName,
  document,
  options = {}
) {
  if (!document) {
    return null;
  }

  const db = getDb();
  await db
    .collection(collectionName)
    .replaceOne({ id: document.id }, document, getSessionOptions(options));
  return document;
}

async function deleteDocuments(collectionName, filter, options = {}) {
  const db = getDb();
  return db
    .collection(collectionName)
    .deleteMany(filter, getSessionOptions(options));
}

async function deleteDocumentById(collectionName, id, options = {}) {
  const db = getDb();
  return db
    .collection(collectionName)
    .deleteOne({ id }, getSessionOptions(options));
}

async function updateDocuments(collectionName, filter, update, options = {}) {
  const db = getDb();
  return db
    .collection(collectionName)
    .updateMany(filter, update, getSessionOptions(options));
}

async function runStoreTransaction(work) {
  await ensureStore();
  return runWithTransaction((session) => work(session));
}

async function writeSiteContent(siteContent, options = {}) {
  await ensureStore();
  const db = getDb();
  const normalizedSiteContent = normalizeSiteContent(siteContent);

  await db.collection("siteContent").updateOne(
    { key: "siteContent" },
    { $set: { key: "siteContent", ...normalizedSiteContent } },
    {
      upsert: true,
      ...getSessionOptions(options)
    }
  );

  return normalizedSiteContent;
}

async function writeStore(store) {
  await ensureStore();
  const posts = normalizeDocuments(store.posts, normalizePost);
  const collections = normalizeDocuments(
    store.collections,
    normalizeCollection
  );
  const users = normalizeDocuments(store.users, normalizeUser);
  const comments = normalizeDocuments(store.comments, normalizeComment);
  const siteContent = normalizeSiteContent(store.siteContent);

  await runStoreTransaction(async (session) => {
    await syncDocumentsById("posts", posts, { session });
    await syncDocumentsById("collections", collections, { session });
    await syncDocumentsById("users", users, { session });
    await syncDocumentsById("comments", comments, { session });
    await writeSiteContent(siteContent, { session });
  });
}

async function readPosts() {
  const store = await readStore();
  return store.posts;
}

async function writePosts(posts, options = {}) {
  await ensureStore();
  return syncDocumentsById(
    "posts",
    normalizeDocuments(posts, normalizePost),
    options
  );
}

async function readCollections() {
  const store = await readStore();
  return store.collections;
}

async function writeCollections(collections, options = {}) {
  await ensureStore();
  return syncDocumentsById(
    "collections",
    normalizeDocuments(collections, normalizeCollection),
    options
  );
}

async function readUsers() {
  const store = await readStore();
  return store.users;
}

async function writeUsers(users, options = {}) {
  await ensureStore();
  return syncDocumentsById(
    "users",
    normalizeDocuments(users, normalizeUser),
    options
  );
}

async function readComments() {
  const store = await readStore();
  return store.comments;
}

async function readAdminAuditLogs(options = {}) {
  await ensureStore();
  const db = getDb();
  const numericLimit = Number(options.limit);
  const cursor = db
    .collection("adminAuditLogs")
    .find({})
    .sort({ createdAt: -1, _id: -1 });

  if (Number.isFinite(numericLimit) && numericLimit > 0) {
    cursor.limit(numericLimit);
  }

  const auditLogs = await cursor.toArray();
  return auditLogs.map(sanitizeDoc).map(normalizeAdminAuditLog).filter(Boolean);
}

async function writeComments(comments, options = {}) {
  await ensureStore();
  return syncDocumentsById(
    "comments",
    normalizeDocuments(comments, normalizeComment),
    options
  );
}

async function insertUser(user, options = {}) {
  await ensureStore();
  return insertNormalizedDocument("users", normalizeUser(user), options);
}

async function replaceUser(user, options = {}) {
  await ensureStore();
  return replaceNormalizedDocumentById("users", normalizeUser(user), options);
}

async function deleteUserById(id, options = {}) {
  await ensureStore();
  return deleteDocumentById("users", String(id || "").trim(), options);
}

async function insertComment(comment, options = {}) {
  await ensureStore();
  return insertNormalizedDocument(
    "comments",
    normalizeComment(comment),
    options
  );
}

async function insertAdminAuditLog(log, options = {}) {
  await ensureStore();
  return insertNormalizedDocument(
    "adminAuditLogs",
    normalizeAdminAuditLog(log),
    options
  );
}

async function replaceComment(comment, options = {}) {
  await ensureStore();
  return replaceNormalizedDocumentById(
    "comments",
    normalizeComment(comment),
    options
  );
}

async function deleteCommentById(id, options = {}) {
  await ensureStore();
  return deleteDocumentById("comments", String(id || "").trim(), options);
}

async function renameCommentsForPostSlug(previousSlug, nextSlug, options = {}) {
  await ensureStore();

  if (!previousSlug || previousSlug === nextSlug) {
    return null;
  }

  return updateDocuments(
    "comments",
    { postSlug: String(previousSlug).trim() },
    { $set: { postSlug: String(nextSlug || "").trim() } },
    options
  );
}

async function deleteCommentsByPostSlug(postSlug, options = {}) {
  await ensureStore();
  return deleteDocuments(
    "comments",
    { postSlug: String(postSlug || "").trim() },
    options
  );
}

async function deleteCommentsByAuthorId(authorId, options = {}) {
  await ensureStore();
  return deleteDocuments(
    "comments",
    { authorId: String(authorId || "").trim() },
    options
  );
}

async function insertPost(post, options = {}) {
  await ensureStore();
  return insertNormalizedDocument("posts", normalizePost(post), options);
}

async function replacePosts(posts, options = {}) {
  await ensureStore();
  return upsertDocumentsById(
    "posts",
    normalizeDocuments(posts, normalizePost),
    options
  );
}

async function deletePostById(id, options = {}) {
  await ensureStore();
  return deleteDocumentById("posts", String(id || "").trim(), options);
}

async function insertCollection(collection, options = {}) {
  await ensureStore();
  return insertNormalizedDocument(
    "collections",
    normalizeCollection(collection),
    options
  );
}

async function replaceCollections(collections, options = {}) {
  await ensureStore();
  return upsertDocumentsById(
    "collections",
    normalizeDocuments(collections, normalizeCollection),
    options
  );
}

async function deleteCollectionById(id, options = {}) {
  await ensureStore();
  return deleteDocumentById("collections", String(id || "").trim(), options);
}

module.exports = {
  ensureStore,
  readLegacySeed,
  readStore,
  runStoreTransaction,
  writeStore,
  readPosts,
  writePosts,
  readCollections,
  writeCollections,
  readUsers,
  writeUsers,
  readComments,
  readAdminAuditLogs,
  writeComments,
  writeSiteContent,
  insertUser,
  replaceUser,
  deleteUserById,
  insertComment,
  insertAdminAuditLog,
  replaceComment,
  deleteCommentById,
  renameCommentsForPostSlug,
  deleteCommentsByPostSlug,
  deleteCommentsByAuthorId,
  insertPost,
  replacePosts,
  deletePostById,
  insertCollection,
  replaceCollections,
  deleteCollectionById
};
