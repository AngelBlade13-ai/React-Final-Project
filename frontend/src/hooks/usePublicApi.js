import useSWR from "swr";
import { apiBaseUrl, emptyAbout, emptySiteSettings } from "../lib/site";

async function fetchJson(url) {
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Request failed.");
  }

  return data;
}

export function useSiteContent() {
  const { data, error, isLoading } = useSWR(`${apiBaseUrl}/site-content`, fetchJson);

  return {
    siteContent: {
      ...emptySiteSettings,
      ...(data?.siteContent || {}),
      branding: {
        ...emptySiteSettings.branding,
        ...(data?.siteContent?.branding || {})
      },
      home: {
        ...emptySiteSettings.home,
        ...(data?.siteContent?.home || {})
      },
      collectionThemes: Array.isArray(data?.siteContent?.collectionThemes)
        ? data.siteContent.collectionThemes
        : emptySiteSettings.collectionThemes
    },
    error,
    isLoading
  };
}

export function usePublicPosts() {
  const { data, error, isLoading } = useSWR(`${apiBaseUrl}/posts`, fetchJson);

  return {
    posts: data?.posts || [],
    error,
    isLoading
  };
}

export function usePublicCollections(scope = "") {
  const key = `${apiBaseUrl}/collections${scope ? `?scope=${scope}` : ""}`;
  const { data, error, isLoading } = useSWR(key, fetchJson);

  return {
    collections: data?.collections || [],
    error,
    isLoading
  };
}

export function usePublicCollection(slug) {
  const { data, error, isLoading } = useSWR(slug ? `${apiBaseUrl}/collections/${slug}` : null, fetchJson);

  return {
    collection: data?.collection || null,
    releases: data?.releases || [],
    redirectSlug: data?.redirectSlug || "",
    error,
    isLoading
  };
}

export function usePublicRelease(slug) {
  const { data, error, isLoading } = useSWR(slug ? `${apiBaseUrl}/posts/${slug}` : null, fetchJson);

  return {
    post: data?.post || null,
    redirectSlug: data?.redirectSlug || "",
    error,
    isLoading
  };
}

export function useAboutContent() {
  const { data, error, isLoading } = useSWR(`${apiBaseUrl}/about`, fetchJson);

  return {
    about: {
      ...emptyAbout,
      ...(data?.about || {})
    },
    error,
    isLoading
  };
}
