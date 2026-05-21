## feat/seo-social-metadata

This branch removes the hardcoded browser-title assumption and turns metadata into a managed layer that follows the site's authored branding and page content.

### What changed

- Added a site metadata context so the active site name and default description come from `siteContent.branding.siteName` and `siteContent.home.heroText`.
- Added `usePageMetadata()` to manage:
  - `document.title`
  - `meta[name="description"]`
  - Open Graph title, description, site name, type, and URL
  - Twitter card title and description
  - canonical link tags
- Kept `useDocumentTitle()` as a thin wrapper so admin pages continue to work without duplicating metadata logic.
- Added default metadata tags to `frontend/index.html` for first paint and crawler fallback.
- Updated public pages to provide route-specific descriptions:
  - home
  - about
  - collections index
  - explore
  - guided paths index
  - guided path detail
  - account
  - collection detail
  - release detail

### Outcome

- Browser titles now stay aligned with the admin-managed site name.
- Public pages emit descriptions that match their actual role instead of falling back to a generic site title.
- Social preview metadata is present on route transitions instead of being limited to the static shell.
- Canonical URLs are maintained on the client for the current route.

### Verification

- `npm run lint`
- `npm run verify` in `frontend`
