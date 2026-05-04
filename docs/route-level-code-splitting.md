## Route-Level Code Splitting

Branch: `perf/route-level-code-splitting`

### Scope

This branch reduces the initial frontend bundle by lazy-loading page-level routes instead of importing every public and admin page during app startup.

### What changed

- Converted page route imports in `frontend/src/App.jsx` to `React.lazy`.
- Wrapped the route tree in `Suspense` with a lightweight archive-themed fallback.
- Added a route-level error boundary so failed lazy chunk loads show a recovery surface instead of blanking the app.
- Kept core app shell code eager:
  - public and admin layouts
  - site metadata provider
  - theme state
  - session bootstrapping
  - mini-player state and controls

### Why it matters

- First load no longer has to parse every admin and detail-page module before rendering the public shell.
- Admin pages, collection detail, release detail, account, guided paths, and secondary public pages can load on demand.
- This closes the main follow-up left by the frontend data cache layer: the cache layer reduced repeated network requests, and this pass reduces initial JavaScript work.

### Verification

- `frontend`: `npm run verify`

### Follow-up

- Consider splitting heavy admin editor subpanels inside `AdminPostsPage.jsx` after the page-level split is stable.
