## Frontend Data Cache Layer

Branch: `refactor/frontend-data-cache-layer`

### Scope

This branch replaces repeated public-page `fetch` + `useEffect` patterns with shared SWR-backed hooks so the public surface can reuse cached responses instead of re-requesting the same data per page mount.

### What changed

- Added `frontend/src/hooks/usePublicApi.js` as the shared read layer for:
  - site content
  - public posts
  - public collections
  - collection detail responses
  - release detail responses
  - about content
- Converted these public read paths to the shared hooks:
  - `App.jsx`
  - `PublicHome.jsx`
  - `ExplorePage.jsx`
  - `AboutPage.jsx`
  - `CollectionsIndexPage.jsx`
  - `CollectionDetailPage.jsx`
  - `GuidedPathsIndexPage.jsx`
  - `GuidedPathPage.jsx`
  - `PublicReleasePage.jsx`
- Added `swr` to the frontend dependencies.

### Why it matters

- Repeated public navigation now reuses cached data instead of re-running independent effects on each page.
- Redirect-aware collection and release routes now share a single fetch path per resource.
- Public pages carry less duplicate loading and error-state boilerplate.
- This gives the later code-splitting and UX branches a cleaner base to build on.

### Verification

- `frontend`: `npm run verify`
- `backend`: `npm run verify`

### Later follow-up

- Initial route-level JS splitting was added later in `docs/route-level-code-splitting.md`.
- Auth/session fetches and comment mutations were left out on purpose because they need different invalidation and security handling than the public read surface.
