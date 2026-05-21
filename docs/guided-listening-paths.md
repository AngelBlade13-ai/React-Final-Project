## Guided Listening Paths

Branch: `feat/guided-listening-paths`

### What changed

- Added a dedicated guided-path resolution layer in `frontend/src/lib/listeningPaths.js`.
- Added new public routes:
  - `/paths`
  - `/paths/:slug`
- Added `frontend/src/pages/public/GuidedPathsIndexPage.jsx` to list authored path entry points.
- Added `frontend/src/pages/public/GuidedPathPage.jsx` to present each path as:
  - an authored intro
  - an active step
  - explicit previous/next controls
  - an ordered sequence of releases
- Added new public navigation entry points:
  - `Paths` in the site nav
  - a homepage doorway link into guided paths
- Added styling in `frontend/src/styles/app.css` for the new guided path surfaces.
- Moved guided path definitions into admin-managed site content via `siteContent.guidedPaths`.
- Added a compact admin JSON editor under `/admin/site` for updating path copy, manual post order, and algorithm rules.
- Supported two path assembly modes:
  - `postSlugs` for exact manual sequencing.
  - `algorithm` for catalog-derived paths using collection, section, theme tag, world layer, release status, max item, match mode, and sort filters.

### Initial paths included

- `Start Here`
- `Fractureverse`
- `Eldoria`
- `Identity / Becoming`
- `Princess / Anime`
- `Villain / Catastrophe`

### Why it matters

- This is the clearest move yet toward the site behaving like a narrative listening platform rather than only a release archive.
- Visitors now have explicit authored routes into the catalog instead of needing to infer the best starting point from collections or search.
- Admins can now adjust path membership without editing frontend code, while still using algorithmic rules for paths that should follow catalog metadata over time.

### Verification

- `frontend`: `npm run verify`
- `backend`: `npm run verify`
