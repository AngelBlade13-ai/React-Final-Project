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

### Verification

- `frontend`: `npm run verify`
- `backend`: `npm run verify`
