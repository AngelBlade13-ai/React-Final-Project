import { emptyAbout, emptySiteSettings } from "./site";

const PUBLIC_LISTENER_COPY = {
  branding: emptySiteSettings.branding,
  home: emptySiteSettings.home,
  about: emptyAbout
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

export function applyPublicListenerCopy(siteContent = {}) {
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

  if (
    homeLooksLegacy(siteContent.home) ||
    !String(siteContent.home?.heroTitle || "").trim()
  ) {
    next.home = {
      ...(siteContent.home || {}),
      ...PUBLIC_LISTENER_COPY.home,
      featuredReleaseSlug: siteContent.home?.featuredReleaseSlug || ""
    };
  }

  if (
    aboutLooksLegacy(siteContent.about) ||
    !String(siteContent.about?.heroTitle || "").trim()
  ) {
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

export function applyPublicAboutCopy(about = {}) {
  if (aboutLooksLegacy(about) || !String(about.heroTitle || "").trim()) {
    return {
      ...about,
      ...PUBLIC_LISTENER_COPY.about
    };
  }

  return about;
}
