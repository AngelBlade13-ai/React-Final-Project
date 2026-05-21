import useSWR from "swr";
import {
  applyPublicAboutCopy,
  applyPublicListenerCopy
} from "../lib/publicListenerCopy";
import { apiBaseUrl, emptyAbout, emptySiteSettings } from "../lib/site";

async function fetchJson(url) {
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message ||
        `Request failed with ${response.status} ${response.statusText}`.trim()
    );
  }

  return data;
}

export function useSiteContent() {
  const { data, error, isLoading, mutate } = useSWR(
    `${apiBaseUrl}/site-content`,
    fetchJson
  );

  return {
    siteContent: applyPublicListenerCopy({
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
      about: {
        ...emptyAbout,
        ...(data?.siteContent?.about || {})
      },
      collectionThemes: Array.isArray(data?.siteContent?.collectionThemes)
        ? data.siteContent.collectionThemes
        : emptySiteSettings.collectionThemes,
      guidedPaths: Array.isArray(data?.siteContent?.guidedPaths)
        ? data.siteContent.guidedPaths
        : emptySiteSettings.guidedPaths
    }),
    error,
    isLoading,
    retry: mutate
  };
}

export function usePublicPosts() {
  const { data, error, isLoading, mutate } = useSWR(
    `${apiBaseUrl}/posts`,
    fetchJson
  );

  return {
    posts: data?.posts || [],
    error,
    isLoading,
    retry: mutate
  };
}

export function usePublicCollections(scope = "") {
  const key = `${apiBaseUrl}/collections${scope ? `?scope=${scope}` : ""}`;
  const { data, error, isLoading, mutate } = useSWR(key, fetchJson);

  return {
    collections: data?.collections || [],
    error,
    isLoading,
    retry: mutate
  };
}

export function usePublicCollection(slug) {
  const { data, error, isLoading, mutate } = useSWR(
    slug ? `${apiBaseUrl}/collections/${slug}` : null,
    fetchJson
  );

  return {
    collection: data?.collection || null,
    releases: data?.releases || [],
    redirectSlug: data?.redirectSlug || "",
    error,
    isLoading,
    retry: mutate
  };
}

export function usePublicRelease(slug) {
  const { data, error, isLoading, mutate } = useSWR(
    slug ? `${apiBaseUrl}/posts/${slug}` : null,
    fetchJson
  );

  return {
    post: data?.post || null,
    redirectSlug: data?.redirectSlug || "",
    error,
    isLoading,
    retry: mutate
  };
}

export function useAboutContent() {
  const { data, error, isLoading, mutate } = useSWR(
    `${apiBaseUrl}/about`,
    fetchJson
  );

  return {
    about: applyPublicAboutCopy({
      ...emptyAbout,
      ...(data?.about || {})
    }),
    error,
    isLoading,
    retry: mutate
  };
}
