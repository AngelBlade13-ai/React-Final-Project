import { useEffect } from "react";
import {
  defaultSiteMetadata,
  useSiteMetadata
} from "../contexts/SiteMetadataContext";

function ensureMetaTag(attribute, value) {
  let element = document.querySelector(`meta[${attribute}="${value}"]`);

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, value);
    document.head.appendChild(element);
  }

  return element;
}

function ensureLinkTag(rel) {
  let element = document.querySelector(`link[rel="${rel}"]`);

  if (!element) {
    element = document.createElement("link");
    element.setAttribute("rel", rel);
    document.head.appendChild(element);
  }

  return element;
}

function removeMetaTag(attribute, value) {
  const element = document.querySelector(`meta[${attribute}="${value}"]`);
  element?.remove();
}

function normalizeDescription(description, siteDescription) {
  const resolvedDescription = String(description || "").trim();
  if (resolvedDescription) {
    return resolvedDescription;
  }

  return (
    String(siteDescription || defaultSiteMetadata.siteDescription).trim() ||
    defaultSiteMetadata.siteDescription
  );
}

function buildAbsoluteUrl(path = "") {
  if (typeof window === "undefined") {
    return "";
  }

  const targetPath = String(path || "").trim() || window.location.pathname;
  return new URL(targetPath, window.location.origin).toString();
}

export function formatDocumentTitle(
  pageTitle = "",
  siteName = defaultSiteMetadata.siteName
) {
  const cleanedTitle = String(pageTitle || "").trim();
  const cleanedSiteName =
    String(siteName || "").trim() || defaultSiteMetadata.siteName;

  return cleanedTitle
    ? `${cleanedTitle} | ${cleanedSiteName}`
    : cleanedSiteName;
}

export default function usePageMetadata({
  canonicalPath = "",
  description = "",
  image = "",
  title = "",
  type = "website"
} = {}) {
  const metadata = useSiteMetadata();
  const siteName =
    String(metadata?.siteName || "").trim() || defaultSiteMetadata.siteName;
  const siteDescription =
    String(metadata?.siteDescription || "").trim() ||
    defaultSiteMetadata.siteDescription;

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const resolvedTitle = formatDocumentTitle(title, siteName);
    const resolvedDescription = normalizeDescription(
      description,
      siteDescription
    );
    const resolvedUrl = buildAbsoluteUrl(canonicalPath);
    const resolvedImage = String(image || "").trim()
      ? buildAbsoluteUrl(image)
      : "";

    document.title = resolvedTitle;
    ensureMetaTag("name", "description").setAttribute(
      "content",
      resolvedDescription
    );
    ensureMetaTag("property", "og:title").setAttribute(
      "content",
      resolvedTitle
    );
    ensureMetaTag("property", "og:description").setAttribute(
      "content",
      resolvedDescription
    );
    ensureMetaTag("property", "og:site_name").setAttribute("content", siteName);
    ensureMetaTag("property", "og:type").setAttribute("content", type);
    ensureMetaTag("property", "og:url").setAttribute("content", resolvedUrl);
    ensureMetaTag("name", "twitter:card").setAttribute(
      "content",
      resolvedImage ? "summary_large_image" : "summary"
    );
    ensureMetaTag("name", "twitter:title").setAttribute(
      "content",
      resolvedTitle
    );
    ensureMetaTag("name", "twitter:description").setAttribute(
      "content",
      resolvedDescription
    );

    if (resolvedImage) {
      ensureMetaTag("property", "og:image").setAttribute(
        "content",
        resolvedImage
      );
      ensureMetaTag("name", "twitter:image").setAttribute(
        "content",
        resolvedImage
      );
    } else {
      removeMetaTag("property", "og:image");
      removeMetaTag("name", "twitter:image");
    }

    ensureLinkTag("canonical").setAttribute("href", resolvedUrl);
  }, [
    canonicalPath,
    description,
    image,
    siteDescription,
    siteName,
    title,
    type
  ]);
}
