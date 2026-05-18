const ASSISTANT_MODEL_PROFILE_STORAGE_KEY = "suno-blog-assistant-model-profile";

export function readAssistantModelProfile() {
  if (typeof window === "undefined") {
    return "";
  }

  return String(
    window.localStorage.getItem(ASSISTANT_MODEL_PROFILE_STORAGE_KEY) || ""
  ).trim();
}

export function writeAssistantModelProfile(profileKey) {
  if (typeof window === "undefined") {
    return;
  }

  const nextValue = String(profileKey || "").trim();

  if (!nextValue) {
    window.localStorage.removeItem(ASSISTANT_MODEL_PROFILE_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(
    ASSISTANT_MODEL_PROFILE_STORAGE_KEY,
    nextValue
  );
}

export function buildAssistantStatusUrl(apiBaseUrl, profileKey) {
  const url = new URL(`${apiBaseUrl}/admin/assistant/status`, window.location.origin);

  if (String(profileKey || "").trim()) {
    url.searchParams.set("profile", String(profileKey).trim());
  }

  return url.toString();
}

export function withAssistantProfile(body = {}, profileKey) {
  const nextProfile = String(profileKey || "").trim();

  return nextProfile ? { ...body, profile: nextProfile } : body;
}
