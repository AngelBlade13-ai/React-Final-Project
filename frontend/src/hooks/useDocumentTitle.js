import usePageMetadata, { formatDocumentTitle } from "./usePageMetadata";

export { formatDocumentTitle };

export default function useDocumentTitle(pageTitle = "") {
  usePageMetadata({ title: pageTitle });
}
