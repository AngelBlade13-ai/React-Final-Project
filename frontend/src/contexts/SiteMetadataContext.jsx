import { createContext, useContext } from "react";

export const defaultSiteMetadata = {
  siteName: "Suno Diary",
  siteDescription:
    "A soft archive for releases, collections, and the stories that let each song keep breathing."
};

const SiteMetadataContext = createContext(defaultSiteMetadata);

function normalizeMetadataValue(value, fallback) {
  const trimmedValue = String(value || "").trim();
  return trimmedValue || fallback;
}

export function SiteMetadataProvider({ children, siteDescription, siteName }) {
  const value = {
    siteName: normalizeMetadataValue(siteName, defaultSiteMetadata.siteName),
    siteDescription: normalizeMetadataValue(
      siteDescription,
      defaultSiteMetadata.siteDescription
    )
  };

  return (
    <SiteMetadataContext.Provider value={value}>
      {children}
    </SiteMetadataContext.Provider>
  );
}

export function useSiteMetadata() {
  return useContext(SiteMetadataContext);
}
