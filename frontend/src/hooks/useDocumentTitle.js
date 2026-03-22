import { useEffect } from "react";

const SITE_TITLE = "Suno Diary";

export function formatDocumentTitle(pageTitle = "") {
  const cleanedTitle = String(pageTitle || "").trim();
  return cleanedTitle ? `${cleanedTitle} | ${SITE_TITLE}` : SITE_TITLE;
}

export default function useDocumentTitle(pageTitle = "") {
  useEffect(() => {
    document.title = formatDocumentTitle(pageTitle);
  }, [pageTitle]);
}
