export const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
export const tokenKey = "suno-blog-admin-token";
export const themeKey = "suno-blog-theme";

export const emptyPost = {
  title: "",
  videoUrl: "",
  excerpt: "",
  content: "",
  lyrics: "",
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
    itemAction: "Open Release"
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
    itemAction: "Open Entry"
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
    itemAction: "Open Fragment"
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
    itemAction: "Open Act"
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
    itemAction: "Open Signal"
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
    linkedTo: ["F-02", "F-04"],
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
    linkedTo: ["F-01", "F-03"],
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
    linkedTo: ["F-01", "F-02"],
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
    linkedTo: ["F-02", "F-03"],
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
    linkedTo: ["F-02", "F-03", "F-04"],
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

export function getFractureverseMeta(post) {
  return FRACTUREVERSE_METADATA[post?.slug] || null;
}

export function hasVideo(videoUrl) {
  return Boolean(String(videoUrl || "").trim());
}
