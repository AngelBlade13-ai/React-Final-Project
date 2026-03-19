export const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
export const tokenKey = "suno-blog-admin-token";
export const themeKey = "suno-blog-theme";

export const emptyPost = {
  title: "",
  videoUrl: "",
  excerpt: "",
  content: "",
  lyrics: "",
  archiveMeta: {
    fragmentId: "",
    state: "",
    perspective: "",
    signalType: "",
    description: "",
    systemNote: "",
    linkedSlugs: [],
    chapterNumber: "",
    entryType: "",
    subtitle: "",
    openingPassage: "",
    coreSituation: "",
    coreTension: "",
    chronicleObservation: "",
    chronicleContradiction: "",
    chronicleConclusion: "",
    emotionalState: "",
    coreConflict: "",
    risk: "",
    anchorQuote: "",
    resolution: "",
    entryStatus: "",
    playerFlavorLine: ""
  },
  createdAt: "",
  published: false,
  collectionSlugs: []
};

export const emptyCollection = {
  title: "",
  description: "",
  featuredReleaseSlug: "",
  theme: ""
};

export const emptyAbout = {
  heroEyebrow: "About",
  heroTitle: "",
  heroText: "",
  artistEyebrow: "The Artist",
  artistTitle: "",
  artistText: "",
  siteEyebrow: "The Site",
  siteTitle: "",
  siteText: "",
  quoteEyebrow: "Why It Exists",
  quoteTitle: "",
  quoteText: ""
};

export const COLLECTION_THEMES = {
  default: {
    worldEyebrow: "Collection",
    worldTitlePrefix: "",
    worldDescriptionPrefix: "",
    featuredLabel: "Primary Release",
    featuredAction: "View Full Record",
    listLabel: "Latest Releases",
    releaseNote: "Release Note",
    lyrics: "Lyrics",
    noItemsEyebrow: "No Published Releases",
    noItemsTitle: "This collection exists, but nothing is live in it yet.",
    noItemsText: "Add or publish a release to bring this lane of the archive to life.",
    singleItemEyebrow: "Single Release Collection",
    singleItemTitle: "This collection is currently anchored by one release.",
    singleItemText:
      "As more entries are added, they will stack here beneath the spotlight instead of leaving the page feeling unfinished.",
    worldNoteTitle: "A note about this world",
    worldNoteText: "Each collection is a different shelf in the archive, with its own tone and memory.",
    itemName: "Release",
    itemPlural: "Releases",
    itemAction: "Open Release",
    playerLabel: "Now Playing",
    playerUpNextLabel: "Up Next"
  },
  eldoria: {
    worldEyebrow: "Eldoria",
    featuredLabel: "First Chronicle Entry",
    featuredAction: "Enter Chronicle",
    listLabel: "Chronicle",
    releaseNote: "Chronicle Entry",
    lyrics: "Verses",
    noItemsEyebrow: "Empty Chronicle",
    noItemsTitle: "No ballads have been gathered into this chronicle yet.",
    noItemsText: "When the first song is placed here, Eldoria will begin to read like a living tale instead of a waiting shelf.",
    singleItemEyebrow: "First Ballad",
    singleItemTitle: "This chronicle is carried by a single voice - for now.",
    singleItemText:
      "As more entries arrive, they will settle around it like pages in the same long-form tale rather than isolated releases.",
    worldNoteTitle: "A note from Eldoria",
    worldNoteText: "Some songs feel less like records and more like stories remembered beside a fire long after nightfall.",
    itemName: "Ballad",
    itemPlural: "Ballads",
    itemAction: "Enter Chronicle",
    playerLabel: "Now Playing - A Ballad",
    playerUpNextLabel: "Next Ballad"
  },
  "soft-archive": {
    worldEyebrow: "Soft Archive",
    featuredLabel: "Primary Entry",
    featuredAction: "Open Entry",
    listLabel: "Recent Entries",
    releaseNote: "Entry",
    lyrics: "Words",
    worldNoteTitle: "A note about this world",
    worldNoteText: "Quiet songs do not need to be small. They just need enough room to stay gentle.",
    itemName: "Entry",
    itemPlural: "Entries",
    itemAction: "Open Entry",
    playerLabel: "Now Playing",
    playerUpNextLabel: "Up Next"
  },
  fractureverse: {
    worldEyebrow: "Fractureverse",
    featuredLabel: "Primary Timeline Fragment",
    featuredAction: "View Full Record",
    listLabel: "Timeline Fragments",
    releaseNote: "Fragment Record",
    lyrics: "Recovered Dialogue",
    noItemsEyebrow: "No Fragments Detected",
    noItemsTitle: "No fragments detected.",
    noItemsText: "Either this world is newly formed,\nor something erased what came before.",
    singleItemEyebrow: "Single Recorded Fragment",
    singleItemTitle: "This world is currently anchored by one recorded fragment.",
    singleItemText:
      "As more releases enter the Fractureverse, they will appear here as additional observed entries beneath the first fracture.",
    worldNoteTitle: "Echo",
    worldNoteText: "Some timelines collapse.\nSome repeat.\nSome are never meant to be found.",
    itemName: "Fragment",
    itemPlural: "Fragments",
    itemAction: "Open Fragment",
    playerLabel: "Now Playing",
    playerUpNextLabel: "Up Next"
  },
  stage: {
    worldEyebrow: "Stage",
    featuredLabel: "Opening Act",
    featuredAction: "Continue Act",
    listLabel: "Acts",
    releaseNote: "Performance Notes",
    lyrics: "Script",
    worldNoteTitle: "A note about this world",
    worldNoteText: "Some songs are meant to arrive like entrances, spotlights, and final bows.",
    itemName: "Act",
    itemPlural: "Acts",
    itemAction: "Open Act",
    playerLabel: "Now Playing",
    playerUpNextLabel: "Up Next"
  },
  signal: {
    worldEyebrow: "Signal",
    featuredLabel: "Primary Transmission",
    featuredAction: "Open Transmission",
    listLabel: "Signals",
    releaseNote: "Transmission Log",
    lyrics: "Decoded Signal",
    worldNoteTitle: "A note about this world",
    worldNoteText: "What survives here sounds like a message from somewhere distant, imperfect, and still reaching back.",
    itemName: "Signal",
    itemPlural: "Signals",
    itemAction: "Open Signal",
    playerLabel: "Now Playing",
    playerUpNextLabel: "Up Next"
  }
};

export const FRACTUREVERSE_FEATURED_SLUG = "shattered-trust-reimagined";
export const FRACTUREVERSE_ORDER = [
  "the-one-you-used-to-be-reimagined",
  "still-breathing-in-a-dying-world-reimagined",
  "shattered-trust-reimagined",
  "you-were-better-before-you-saved-the-world-reimagined",
  "we-were-never-meant-to-survive-reimagined-duet"
];

export const ROUTE_THEME_HINTS = {
  collections: {
    eldoria: "eldoria",
    "the-fractureverse": "fractureverse"
  },
  releases: {
    "between-two-worlds-the-first-awakening": "eldoria",
    "the-one-you-used-to-be-reimagined": "fractureverse",
    "still-breathing-in-a-dying-world-reimagined": "fractureverse",
    "shattered-trust-reimagined": "fractureverse",
    "you-were-better-before-you-saved-the-world-reimagined": "fractureverse",
    "we-were-never-meant-to-survive-reimagined-duet": "fractureverse"
  }
};

export const FRACTUREVERSE_WORLD = {
  headerEyebrow: "World / Fractureverse",
  description:
    "A fractured reality where every choice creates a new world, and every version of love carries a different cost.\n\nHere, memory, sacrifice, collapse, obsession, and convergence exist side by side - none of them fully gone, none of them fully resolved.",
  stats: [
    { label: "World Status", value: "Unstable" },
    { label: "Observed Fragments", value: "5" },
    { label: "Primary Subjects", value: "Angel, Grissom" },
    { label: "Current Condition", value: "Active recursion detected" }
  ],
  residualEcho: "Some timelines collapse. Some repeat. Some never stop trying to become real."
};

export const FRACTUREVERSE_METADATA = {
  "the-one-you-used-to-be-reimagined": {
    fragmentId: "F-01",
    state: "Stable",
    perspective: "Grissom",
    signalType: "Origin",
    title: "The One You Used to Be",
    description: "A preserved fragment from before the fracture - where love existed without cost.",
    linkedSlugs: ["still-breathing-in-a-dying-world-reimagined", "you-were-better-before-you-saved-the-world-reimagined"],
    systemNote: "Reference timeline detected. Emotional imprint preserved."
  },
  "still-breathing-in-a-dying-world-reimagined": {
    fragmentId: "F-02",
    state: "Divergent",
    perspective: "Angel",
    signalType: "Conflict",
    title: "Still Breathing (In a Dying World)",
    description:
      "The moment she chose everything, knowing it would cost her the one thing she wanted to keep.",
    linkedSlugs: ["the-one-you-used-to-be-reimagined", "shattered-trust-reimagined"],
    systemNote: "Critical divergence detected. Global stability prioritized over personal attachment."
  },
  "shattered-trust-reimagined": {
    fragmentId: "F-03",
    state: "Collapsed",
    perspective: "Angel",
    signalType: "Primary",
    title: "Shattered Trust (Reimagined)",
    description:
      "A post-collapse fragment where trust failed, and the cost of saving everything became permanent.",
    linkedSlugs: ["the-one-you-used-to-be-reimagined", "still-breathing-in-a-dying-world-reimagined"],
    systemNote: "Collapse event stabilized through force of will. Structural integrity compromised."
  },
  "you-were-better-before-you-saved-the-world-reimagined": {
    fragmentId: "F-04",
    state: "Divergent",
    perspective: "Grissom",
    signalType: "Conflict",
    title: "You Were Better Before You Saved the World",
    description:
      "A hostile fragment where loss becomes obsession, and one version of him refuses to accept the world she chose.",
    linkedSlugs: ["still-breathing-in-a-dying-world-reimagined", "shattered-trust-reimagined"],
    systemNote: "Hostile recursion detected. Subject actively destabilizing timelines."
  },
  "we-were-never-meant-to-survive-reimagined-duet": {
    fragmentId: "F-05",
    state: "Unstable",
    perspective: "Both",
    signalType: "Convergence",
    title: "We Were Never Meant to Survive",
    description:
      "A convergence event where opposing truths collide, and the timeline can no longer resolve itself.",
    linkedSlugs: [
      "still-breathing-in-a-dying-world-reimagined",
      "shattered-trust-reimagined",
      "you-were-better-before-you-saved-the-world-reimagined"
    ],
    systemNote: "Convergence detected. Conflicting directives unresolved."
  }
};

export function getThemeConfig(theme) {
  return COLLECTION_THEMES[theme] || COLLECTION_THEMES.default;
}

export function getPrimaryThemeForPost(post) {
  const themedCollection = (post?.collections || []).find((collection) => collection.theme);
  return themedCollection?.theme || "default";
}

export function getCollectionThemeHint(slug) {
  return ROUTE_THEME_HINTS.collections[slug] || "";
}

export function getReleaseThemeHint(slug) {
  return ROUTE_THEME_HINTS.releases[slug] || "";
}

export function sortFractureversePosts(posts = []) {
  return [...posts].sort((left, right) => {
    const leftMeta = getFractureverseMeta(left, posts);
    const rightMeta = getFractureverseMeta(right, posts);
    const leftIndex = leftMeta?.fragmentId ? Number(leftMeta.fragmentId.replace("F-", "")) : FRACTUREVERSE_ORDER.indexOf(left.slug) + 1 || 99;
    const rightIndex = rightMeta?.fragmentId ? Number(rightMeta.fragmentId.replace("F-", "")) : FRACTUREVERSE_ORDER.indexOf(right.slug) + 1 || 99;

    return leftIndex - rightIndex;
  });
}

export function getFractureverseMeta(post, allPosts = []) {
  const fallbackMeta = FRACTUREVERSE_METADATA[post?.slug] || null;
  const archiveMeta = post?.archiveMeta || fallbackMeta;

  if (!archiveMeta) {
    return null;
  }

  const linkedSlugs = Array.isArray(archiveMeta.linkedSlugs)
    ? archiveMeta.linkedSlugs
    : Array.isArray(fallbackMeta?.linkedSlugs)
      ? fallbackMeta.linkedSlugs
      : [];
  const linkedPosts = allPosts.filter((entry) => linkedSlugs.includes(entry.slug));
  const linkedTo = linkedPosts
    .map((entry) => {
      const linkedFallback = FRACTUREVERSE_METADATA[entry.slug] || null;
      const linkedArchiveMeta = entry.archiveMeta || linkedFallback;
      return linkedArchiveMeta?.fragmentId || "";
    })
    .filter(Boolean);

  return {
    fragmentId: archiveMeta.fragmentId || fallbackMeta?.fragmentId || "",
    state: archiveMeta.state || fallbackMeta?.state || "",
    perspective: archiveMeta.perspective || fallbackMeta?.perspective || "",
    signalType: archiveMeta.signalType || fallbackMeta?.signalType || "",
    title: fallbackMeta?.title || post?.title || "",
    description: archiveMeta.description || fallbackMeta?.description || post?.excerpt || "",
    systemNote: archiveMeta.systemNote || fallbackMeta?.systemNote || "",
    linkedSlugs,
    linkedPosts,
    linkedTo
  };
}

export function hasVideo(videoUrl) {
  return Boolean(String(videoUrl || "").trim());
}

function toRoman(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    return "";
  }

  const numerals = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"]
  ];

  let remainder = number;
  let result = "";

  numerals.forEach(([amount, symbol]) => {
    while (remainder >= amount) {
      result += symbol;
      remainder -= amount;
    }
  });

  return result;
}

function formatCountLabel(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function getCollectionDerivedContent(collection, releases = []) {
  const theme = collection?.theme || "default";
  const themeConfig = getThemeConfig(theme);
  const count = releases.length;
  const featuredRelease = collection?.featuredRelease || null;
  const itemName = themeConfig.itemName || "Release";
  const itemPlural = themeConfig.itemPlural || `${itemName}s`;

  if (theme === "eldoria") {
    return {
      stats: [
        { label: "Realm", value: collection?.title || "Eldoria" },
        { label: "Chronicle Entries", value: formatCountLabel(count, "ballad", "ballads") },
        {
          label: "Featured Ballad",
          value: featuredRelease?.title || (count === 0 ? "Awaiting a first telling" : count === 1 ? "A single tale remains" : "No leading ballad chosen")
        },
        {
          label: "Current Season",
          value: count === 0 ? "Quiet before the telling" : count === 1 ? "Opening chapter" : count < 4 ? "Stories gathering" : "World in full song"
        }
      ],
      featuredContext:
        count <= 1
          ? "This royal record carries the chronicle on its own for now. As more entries arrive, it will shift from lone voice to remembered beginning."
          : "This ballad acts as the first doorway into the wider chronicle, giving the world a clear emotional entry point before the other songs continue the tale.",
      collectionCountLabel: formatCountLabel(count, "entry recorded", "entries recorded"),
      releaseSequenceLabel: formatCountLabel(count, "ballad in this chronicle", "ballads in this chronicle"),
      companionLabel: formatCountLabel(Math.max(count - 1, 0), "nearby entry", "nearby entries"),
      worldNote:
        count === 0
          ? "A world can still feel present before its first ballad arrives."
          : count === 1
            ? "Even one voice can awaken a forgotten world."
            : "Some songs feel less like records and more like stories remembered beside a fire long after nightfall."
    };
  }

  if (theme === "fractureverse") {
    return {
      collectionCountLabel: formatCountLabel(fractureverseVisibleCount(releases), "linked fragment", "linked fragments"),
      releaseSequenceLabel: formatCountLabel(releases.length, "fragment in this sequence", "fragments in this sequence"),
      companionLabel: formatCountLabel(Math.max(releases.length - 1, 0), "connected fragment", "connected fragments")
    };
  }

  return {
    featuredContext:
      count <= 1
        ? `This ${itemName.toLowerCase()} is currently carrying the collection on its own.`
        : `The featured ${itemName.toLowerCase()} acts as the clearest entry point into this collection before the rest of the archive opens beneath it.`,
    collectionCountLabel: formatCountLabel(count, `${itemName.toLowerCase()} entry`, `${itemName.toLowerCase()} entries`),
    releaseSequenceLabel: formatCountLabel(count, itemName.toLowerCase(), itemPlural.toLowerCase()),
    companionLabel: formatCountLabel(Math.max(count - 1, 0), `${itemName.toLowerCase()} nearby`, `${itemPlural.toLowerCase()} nearby`),
    worldNote:
      count === 0
        ? `This ${itemName.toLowerCase()} world is still waiting for its first entry.`
        : count === 1
          ? `A single ${itemName.toLowerCase()} can still define the tone of a whole collection.`
          : themeConfig.worldNoteText
  };
}

function fractureverseVisibleCount(releases = []) {
  return Math.max(releases.length - 1, 0);
}

export function sortEldoriaPosts(posts = []) {
  return [...posts].sort((left, right) => {
    const leftMeta = getEldoriaMeta(left);
    const rightMeta = getEldoriaMeta(right);
    const leftIndex = Number(leftMeta?.chapterNumber || 999);
    const rightIndex = Number(rightMeta?.chapterNumber || 999);

    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }

    return String(left?.createdAt || "").localeCompare(String(right?.createdAt || ""));
  });
}

export function getEldoriaMeta(post) {
  const archiveMeta = post?.archiveMeta;

  if (!archiveMeta) {
    return null;
  }

  const chapterNumber = String(archiveMeta.chapterNumber || "").trim();
  const entryType = String(archiveMeta.entryType || "").trim();
  const subtitle = String(archiveMeta.subtitle || "").trim();
  const openingPassage = String(archiveMeta.openingPassage || "").trim();
  const coreSituation = String(archiveMeta.coreSituation || "").trim();
  const coreTension = String(archiveMeta.coreTension || "").trim();
  const chronicleObservation = String(archiveMeta.chronicleObservation || "").trim();
  const chronicleContradiction = String(archiveMeta.chronicleContradiction || "").trim();
  const chronicleConclusion = String(archiveMeta.chronicleConclusion || "").trim();
  const emotionalState = String(archiveMeta.emotionalState || "").trim();
  const coreConflict = String(archiveMeta.coreConflict || "").trim();
  const risk = String(archiveMeta.risk || "").trim();
  const anchorQuote = String(archiveMeta.anchorQuote || "").trim();
  const resolution = String(archiveMeta.resolution || "").trim();
  const entryStatus = String(archiveMeta.entryStatus || "").trim();
  const playerFlavorLine = String(archiveMeta.playerFlavorLine || "").trim();
  const hasEldoriaData = [
    chapterNumber,
    entryType,
    subtitle,
    openingPassage,
    coreSituation,
    coreTension,
    chronicleObservation,
    chronicleContradiction,
    chronicleConclusion,
    emotionalState,
    coreConflict,
    risk,
    anchorQuote,
    resolution,
    entryStatus,
    playerFlavorLine
  ].some(Boolean);

  if (!hasEldoriaData) {
    return null;
  }

  const chapterNumeral = toRoman(chapterNumber);

  return {
    chapterNumber,
    chapterNumeral,
    chapterLabel: chapterNumeral ? `Chapter ${chapterNumeral}` : "",
    identityLine: [chapterNumeral ? `CHAPTER ${chapterNumeral}` : "", entryType.toUpperCase(), "ELDORIA"].filter(Boolean).join(" / "),
    entryType,
    subtitle,
    openingPassage,
    coreSituation,
    coreTension,
    chronicleObservation,
    chronicleContradiction,
    chronicleConclusion,
    emotionalState,
    coreConflict,
    risk,
    anchorQuote,
    resolution,
    entryStatus,
    playerFlavorLine
  };
}
