const { slugify } = require("../utils/slugify");

function normalizeAboutContent(input = {}, existingAbout = {}) {
  return {
    heroEyebrow: String(input.heroEyebrow || existingAbout.heroEyebrow || "").trim(),
    heroTitle: String(input.heroTitle || existingAbout.heroTitle || "").trim(),
    heroText: String(input.heroText || existingAbout.heroText || "").trim(),
    artistEyebrow: String(input.artistEyebrow || existingAbout.artistEyebrow || "").trim(),
    artistTitle: String(input.artistTitle || existingAbout.artistTitle || "").trim(),
    artistText: String(input.artistText || existingAbout.artistText || "").trim(),
    siteEyebrow: String(input.siteEyebrow || existingAbout.siteEyebrow || "").trim(),
    siteTitle: String(input.siteTitle || existingAbout.siteTitle || "").trim(),
    siteText: String(input.siteText || existingAbout.siteText || "").trim(),
    quoteEyebrow: String(input.quoteEyebrow || existingAbout.quoteEyebrow || "").trim(),
    quoteTitle: String(input.quoteTitle || existingAbout.quoteTitle || "").trim(),
    quoteText: String(input.quoteText || existingAbout.quoteText || "").trim()
  };
}

function normalizeBrandingContent(input = {}, existingBranding = {}) {
  return {
    siteName: String(input.siteName || existingBranding.siteName || "").trim(),
    siteTagline: String(input.siteTagline || existingBranding.siteTagline || "").trim()
  };
}

function normalizeHomeContent(input = {}, existingHome = {}) {
  return {
    heroEyebrow: String(input.heroEyebrow || existingHome.heroEyebrow || "").trim(),
    heroTitle: String(input.heroTitle || existingHome.heroTitle || "").trim(),
    heroText: String(input.heroText || existingHome.heroText || "").trim(),
    featuredReleaseSlug: String(input.featuredReleaseSlug || existingHome.featuredReleaseSlug || "").trim(),
    featuredCtaLabel: String(input.featuredCtaLabel || existingHome.featuredCtaLabel || "").trim(),
    jumpCtaLabel: String(input.jumpCtaLabel || existingHome.jumpCtaLabel || "").trim(),
    noteEyebrow: String(input.noteEyebrow || existingHome.noteEyebrow || "").trim(),
    noteTitle: String(input.noteTitle || existingHome.noteTitle || "").trim(),
    noteText: String(input.noteText || existingHome.noteText || "").trim(),
    browseEyebrow: String(input.browseEyebrow || existingHome.browseEyebrow || "").trim(),
    browseTitle: String(input.browseTitle || existingHome.browseTitle || "").trim(),
    browseText: String(input.browseText || existingHome.browseText || "").trim(),
    browseLinkLabel: String(input.browseLinkLabel || existingHome.browseLinkLabel || "").trim(),
    exploreEyebrow: String(input.exploreEyebrow || existingHome.exploreEyebrow || "").trim(),
    exploreTitle: String(input.exploreTitle || existingHome.exploreTitle || "").trim(),
    exploreText: String(input.exploreText || existingHome.exploreText || "").trim(),
    exploreLinkLabel: String(input.exploreLinkLabel || existingHome.exploreLinkLabel || "").trim(),
    identityEyebrow: String(input.identityEyebrow || existingHome.identityEyebrow || "").trim(),
    identityTitle: String(input.identityTitle || existingHome.identityTitle || "").trim(),
    identityText: String(input.identityText || existingHome.identityText || "").trim(),
    identityLine: String(input.identityLine || existingHome.identityLine || "").trim()
  };
}

function normalizeThemeProfileInput(input = {}, existingTheme = {}) {
  return {
    ...existingTheme,
    key: slugify(input.key || existingTheme.key || ""),
    label: String(input.label || existingTheme.label || "").trim(),
    kind: String(input.kind || existingTheme.kind || "standard").trim() || "standard",
    worldEyebrow: String(input.worldEyebrow || existingTheme.worldEyebrow || "").trim(),
    featuredLabel: String(input.featuredLabel || existingTheme.featuredLabel || "").trim(),
    featuredAction: String(input.featuredAction || existingTheme.featuredAction || "").trim(),
    listLabel: String(input.listLabel || existingTheme.listLabel || "").trim(),
    worldNoteTitle: String(input.worldNoteTitle || existingTheme.worldNoteTitle || "").trim(),
    worldNoteText: String(input.worldNoteText || existingTheme.worldNoteText || "").trim(),
    itemName: String(input.itemName || existingTheme.itemName || "").trim(),
    itemPlural: String(input.itemPlural || existingTheme.itemPlural || "").trim(),
    itemAction: String(input.itemAction || existingTheme.itemAction || "").trim(),
    playerLabel: String(input.playerLabel || existingTheme.playerLabel || "").trim(),
    playerUpNextLabel: String(input.playerUpNextLabel || existingTheme.playerUpNextLabel || "").trim(),
    palette: {
      light: {
        background: String(input.palette?.light?.background || existingTheme.palette?.light?.background || "").trim(),
        surface: String(input.palette?.light?.surface || existingTheme.palette?.light?.surface || "").trim(),
        surfaceAlt: String(input.palette?.light?.surfaceAlt || existingTheme.palette?.light?.surfaceAlt || "").trim(),
        text: String(input.palette?.light?.text || existingTheme.palette?.light?.text || "").trim(),
        mutedText: String(input.palette?.light?.mutedText || existingTheme.palette?.light?.mutedText || "").trim(),
        border: String(input.palette?.light?.border || existingTheme.palette?.light?.border || "").trim(),
        primary: String(input.palette?.light?.primary || existingTheme.palette?.light?.primary || "").trim(),
        primaryStrong: String(input.palette?.light?.primaryStrong || existingTheme.palette?.light?.primaryStrong || "").trim(),
        secondary: String(input.palette?.light?.secondary || existingTheme.palette?.light?.secondary || "").trim()
      },
      dark: {
        background: String(input.palette?.dark?.background || existingTheme.palette?.dark?.background || "").trim(),
        surface: String(input.palette?.dark?.surface || existingTheme.palette?.dark?.surface || "").trim(),
        surfaceAlt: String(input.palette?.dark?.surfaceAlt || existingTheme.palette?.dark?.surfaceAlt || "").trim(),
        text: String(input.palette?.dark?.text || existingTheme.palette?.dark?.text || "").trim(),
        mutedText: String(input.palette?.dark?.mutedText || existingTheme.palette?.dark?.mutedText || "").trim(),
        border: String(input.palette?.dark?.border || existingTheme.palette?.dark?.border || "").trim(),
        primary: String(input.palette?.dark?.primary || existingTheme.palette?.dark?.primary || "").trim(),
        primaryStrong: String(input.palette?.dark?.primaryStrong || existingTheme.palette?.dark?.primaryStrong || "").trim(),
        secondary: String(input.palette?.dark?.secondary || existingTheme.palette?.dark?.secondary || "").trim()
      }
    }
  };
}

function normalizeStringList(value) {
  return Array.isArray(value)
    ? [
        ...new Set(
          value
            .map((entry) => String(entry || "").trim())
            .filter(Boolean)
        )
      ]
    : [];
}

function normalizeGuidedPathAlgorithm(input = {}, existingAlgorithm = {}) {
  const algorithm =
    input && typeof input === "object" && !Array.isArray(input) ? input : {};
  const existing =
    existingAlgorithm &&
    typeof existingAlgorithm === "object" &&
    !Array.isArray(existingAlgorithm)
      ? existingAlgorithm
      : {};

  return {
    preset: String(algorithm.preset || existing.preset || "").trim(),
    collectionSlug: slugify(
      algorithm.collectionSlug || existing.collectionSlug || ""
    ),
    collectionSlugs: normalizeStringList(
      algorithm.collectionSlugs || existing.collectionSlugs
    ).map(slugify),
    sectionKeys: normalizeStringList(
      algorithm.sectionKeys || existing.sectionKeys
    ),
    themeTags: normalizeStringList(algorithm.themeTags || existing.themeTags),
    worldLayers: normalizeStringList(
      algorithm.worldLayers || existing.worldLayers
    ),
    releaseStatuses: normalizeStringList(
      algorithm.releaseStatuses || existing.releaseStatuses
    ),
    match: ["all", "any"].includes(String(algorithm.match || existing.match))
      ? String(algorithm.match || existing.match)
      : "all",
    maxItems: Math.max(
      0,
      Number.parseInt(String(algorithm.maxItems || existing.maxItems || 0), 10)
    ),
    sort: String(algorithm.sort || existing.sort || "curated").trim() || "curated"
  };
}

function normalizeGuidedPathInput(input = {}, existingPath = {}) {
  const slug = slugify(input.slug || existingPath.slug || input.title || "");
  const fallbackTitle = slug
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");

  return {
    slug,
    title: String(input.title || existingPath.title || fallbackTitle).trim(),
    eyebrow: String(input.eyebrow || existingPath.eyebrow || "Guided Path").trim(),
    intro: String(input.intro || existingPath.intro || "").trim(),
    moodNote: String(input.moodNote || existingPath.moodNote || "").trim(),
    themeHint: slugify(input.themeHint || existingPath.themeHint || ""),
    postSlugs: normalizeStringList(input.postSlugs || existingPath.postSlugs).map(
      slugify
    ),
    algorithm: normalizeGuidedPathAlgorithm(
      input.algorithm,
      existingPath.algorithm
    )
  };
}

function normalizeGuidedPathsInput(input = [], existingPaths = []) {
  if (!Array.isArray(input)) {
    return Array.isArray(existingPaths) ? existingPaths : [];
  }

  const existingBySlug = new Map(
    (Array.isArray(existingPaths) ? existingPaths : []).map((path) => [
      path.slug,
      path
    ])
  );

  return input
    .map((path) =>
      normalizeGuidedPathInput(path, existingBySlug.get(slugify(path?.slug)))
    )
    .filter((path) => path.slug && path.title);
}

module.exports = {
  normalizeAboutContent,
  normalizeBrandingContent,
  normalizeGuidedPathsInput,
  normalizeHomeContent,
  normalizeThemeProfileInput
};
