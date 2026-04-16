export const WORLD_ENTRY_STORAGE_KEY = "suno-world-entry";

export function isImmersiveTheme(theme = "") {
  return theme === "eldoria" || theme === "fractureverse";
}

export function prefersReducedMotion() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function setThresholdState(theme = "") {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  root.dataset.thresholdActive = "true";
  root.dataset.thresholdTheme = theme;
}

export function clearThresholdState() {
  if (typeof document === "undefined") {
    return;
  }

  const root = document.documentElement;
  delete root.dataset.thresholdActive;
  delete root.dataset.thresholdTheme;
}

export function storePendingWorldEntry(entry) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(WORLD_ENTRY_STORAGE_KEY, JSON.stringify(entry));
}

export function consumePendingWorldEntry({ slug = "", theme = "" } = {}) {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(WORLD_ENTRY_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  window.sessionStorage.removeItem(WORLD_ENTRY_STORAGE_KEY);

  try {
    const entry = JSON.parse(raw);

    if (slug && entry?.slug && entry.slug !== slug) {
      return null;
    }

    if (theme && entry?.theme && entry.theme !== theme) {
      return null;
    }

    return entry;
  } catch {
    return null;
  }
}
