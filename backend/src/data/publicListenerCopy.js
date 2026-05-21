/** Canonical public-facing site copy (listener language, not admin/design-system terms). */
const PUBLIC_LISTENER_COPY = {
  branding: {
    siteName: "Suno Diary",
    siteTagline: "Songs, worlds, and feelings I did not want to lose."
  },
  home: {
    heroEyebrow: "Suno Diary",
    heroTitle: "A soft archive for songs with stories behind them.",
    heroText:
      "Start with a song, choose a mood, or step into a story world. Some pieces are personal, some are theatrical, and some connect into bigger emotional arcs.",
    featuredCtaLabel: "Play Featured Song",
    jumpCtaLabel: "Start Listening",
    noteEyebrow: "Start Listening",
    noteTitle: "Choose the way into the music that fits your mood.",
    noteText:
      "Collections gather songs by feeling, world, and theme. Search helps when you remember a phrase. Listening paths give you a guided way in when you do not know where to begin.",
    browseEyebrow: "Browse",
    browseTitle: "Find songs by world, mood, or theme.",
    browseText:
      "Collections keep connected songs together, from personal identity pieces to fantasy ballads and darker theatrical arcs.",
    browseLinkLabel: "Browse collections",
    exploreEyebrow: "Find",
    exploreTitle:
      "Search titles, lyrics, and notes when you remember the feeling but not the song.",
    exploreText:
      "Type a title, lyric, mood, or phrase, then narrow by collection if the list gets too wide.",
    exploreLinkLabel: "Search songs",
    identityEyebrow: "About The Archive",
    identityTitle:
      "A personal home for songs, stories, and the feelings between them.",
    identityText:
      "Some songs are direct and autobiographical. Some become fantasy worlds, villain songs, anime-bright transformations, or quiet survival pieces. This site keeps those connections visible.",
    identityLine: "A collection of songs, stories, and moments in motion."
  },
  about: {
    heroEyebrow: "About",
    heroTitle: "I make music to understand things I do not know how to say out loud.",
    heroText:
      "This site is where I keep those songs connected: the personal ones, the fantasy worlds, and the pieces that turned into something larger than a single feeling.",
    artistEyebrow: "The Artist",
    artistTitle: "Feeling first, then atmosphere, then the details that make a song feel lived in.",
    artistText:
      "I make songs from feelings that are hard to explain directly. Some are personal. Some become fantasy worlds. Some turn into villain songs, anime openings, or quiet survival pieces.",
    siteEyebrow: "The Site",
    siteTitle: "Built for listening, reading, and finding connections between songs.",
    siteText:
      "Each song can carry notes, versions, and the mood around it. Collections help you browse by world or theme. Listening paths give you a guided way through the archive when you do not know where to start.",
    quoteEyebrow: "Why It Exists",
    quoteTitle: "Some feelings do not go away until you turn them into something.",
    quoteText:
      "This archive gives each song room to breathe, then links those rooms together into a larger story."
  }
};

const GUIDED_PATH_EYEBROW_MAP = {
  "Guided Path": "Listening Path",
  "Authored Path": "Mood Path",
  "World Path": "Story World"
};

const LEGACY_HOME_MARKERS = [
  "What Changed",
  "Discovery is part of the identity",
  "Discovery is part",
  "utility layer",
  "collection shelves",
  "Play Featured Release",
  "Jump to Latest Releases",
  "release notes with more context",
  "Site Identity",
  "discovery paths between them",
  "catalog into verses",
  "Open explore",
  "See the collection shelves",
  "releases, collections, and the stories"
];

function homeLooksLegacy(home = {}) {
  const blob = JSON.stringify(home).toLowerCase();
  return LEGACY_HOME_MARKERS.some((marker) =>
    blob.includes(marker.toLowerCase())
  );
}

function aboutLooksLegacy(about = {}) {
  const blob = JSON.stringify(about).toLowerCase();
  return (
    blob.includes("release feed") ||
    blob.includes("discovery is authored") ||
    blob.includes("release pages keep the music") ||
    blob.includes("releases that want more room") ||
    blob.includes("frames the artist as someone building") ||
    blob.includes("turns the written notes into something searchable")
  );
}

function taglineLooksLegacy(tagline = "") {
  return /releases, collections, and notes/i.test(String(tagline || ""));
}

function mapGuidedPathEyebrow(eyebrow = "") {
  const trimmed = String(eyebrow || "").trim();
  return GUIDED_PATH_EYEBROW_MAP[trimmed] || trimmed || "Listening Path";
}

function siteContentNeedsLegacyUpgrade(siteContent = {}) {
  return (
    taglineLooksLegacy(siteContent.branding?.siteTagline) ||
    !String(siteContent.branding?.siteTagline || "").trim() ||
    homeLooksLegacy(siteContent.home) ||
    !String(siteContent.home?.heroTitle || "").trim() ||
    aboutLooksLegacy(siteContent.about) ||
    !String(siteContent.about?.heroTitle || "").trim() ||
    (Array.isArray(siteContent.guidedPaths) &&
      siteContent.guidedPaths.some((path) =>
        Object.prototype.hasOwnProperty.call(
          GUIDED_PATH_EYEBROW_MAP,
          String(path?.eyebrow || "").trim()
        )
      ))
  );
}

function applyPublicListenerCopy(siteContent = {}) {
  const next = { ...siteContent };

  if (
    taglineLooksLegacy(siteContent.branding?.siteTagline) ||
    !String(siteContent.branding?.siteTagline || "").trim()
  ) {
    next.branding = {
      ...(siteContent.branding || {}),
      ...PUBLIC_LISTENER_COPY.branding
    };
  }

  if (homeLooksLegacy(siteContent.home) || !String(siteContent.home?.heroTitle || "").trim()) {
    next.home = {
      ...(siteContent.home || {}),
      ...PUBLIC_LISTENER_COPY.home,
      featuredReleaseSlug: siteContent.home?.featuredReleaseSlug || ""
    };
  }

  if (aboutLooksLegacy(siteContent.about) || !String(siteContent.about?.heroTitle || "").trim()) {
    next.about = {
      ...(siteContent.about || {}),
      ...PUBLIC_LISTENER_COPY.about
    };
  }

  if (Array.isArray(siteContent.guidedPaths) && siteContent.guidedPaths.length) {
    next.guidedPaths = siteContent.guidedPaths.map((path) => ({
      ...path,
      eyebrow: mapGuidedPathEyebrow(path.eyebrow)
    }));
  }

  return next;
}

module.exports = {
  PUBLIC_LISTENER_COPY,
  GUIDED_PATH_EYEBROW_MAP,
  applyPublicListenerCopy,
  mapGuidedPathEyebrow,
  siteContentNeedsLegacyUpgrade
};
