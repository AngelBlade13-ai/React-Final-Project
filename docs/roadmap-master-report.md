# Roadmap Master Report

Generated: `2026-04-22`

## Status

- Roadmap completion: `18 / 18` planned items complete
- Baseline branch before roadmap work: `develop` at `2797c12`
- Final integrated roadmap branch: `chore/ops-monitoring-logging` at `96f7ba9`
- Branch model used: short-lived, stacked feature branches created from the working roadmap branch as work progressed
- Current integrated state: all roadmap work exists together on `chore/ops-monitoring-logging`

## Branch Ledger

- `chore/catalog-sync-live-store` - `9781d3b` - reconcile tracked catalog with live authored data
- `fix/backend-safe-partial-updates` - `cbf400f` - replace destructive request-path rewrites with targeted writes
- `feat/routing-slug-stability-redirects` - `f2b0672` - preserve slugs and redirect legacy routes
- `fix/frontend-card-interaction-markup` - `ded4377` - remove invalid nested interactive markup on public cards
- `feat/media-poster-first-lazy-cards` - `e2804e9` - switch browse surfaces to poster-first media
- `fix/admin-collection-feature-validation` - `06bf6d3` - restrict collection featured releases to valid members
- `feat/admin-post-editor-v2` - `37995c4` - overhaul the admin post editor workflow
- `feat/admin-catalog-tools` - `c976b07` - add admin filters, search, and bulk catalog tools
- `feat/homepage-curated-v2` - `acb66bb` - recurate homepage entry points
- `feat/collection-journey-navigation` - `959446f` - add journey rails to collections and releases
- `feat/version-family-ui` - `77e17bc` - clarify public version-family hierarchy
- `feat/guided-listening-paths` - `b2e9773` - add guided listening path routes
- `refactor/frontend-data-cache-layer` - `9be7ecc` - add shared cached public data hooks
- `refactor/backend-route-service-split` - `0436c78` - split backend routes, services, and validators
- `feat/auth-session-hardening` - `c009553` - move active auth flow to cookie-backed sessions
- `chore/quality-gates-ci` - `00ff69e` - add lint, tests, Playwright smoke coverage, and CI
- `feat/seo-social-metadata` - `74a12ae` - add managed route-level SEO and social metadata
- `chore/ops-monitoring-logging` - `96f7ba9` - add runtime health, request logging, audit logs, and operational backup tooling

## Release A: Stability

### 1. Catalog source-of-truth reconciliation

Branch: `chore/catalog-sync-live-store`

What changed:

- Added live-to-tracked catalog reconciliation tooling.
- Added `npm run catalog:diff-live` and `npm run catalog:sync-live`.
- Reconciled `backend/data/posts.json` against live authored content.
- Wrote the source-of-truth note in `docs/catalog-source-of-truth.md`.
- Wrote the initial reconciliation report in `docs/catalog-sync-live-store-report.md`.
- Updated project docs so the repo clearly distinguishes authored catalog data from operational data.

What it does:

- Makes the repo-tracked catalog trustworthy again before later refactors.
- Establishes `posts`, `collections`, and `siteContent` as versioned authored content.
- Explicitly keeps `users` and `comments` out of the tracked catalog.
- Gives the project a repeatable pre-migration safety step before future pruning or structural work.

### 2. Data-layer safety and partial updates

Branch: `fix/backend-safe-partial-updates`

What changed:

- Replaced normal request-path `readStore()` plus full `writeStore()` rewrites with targeted Mongo writes.
- Added transaction-backed multi-collection mutations where routes touch more than one collection.
- Kept `writeStore()` only for intentional batch tooling, reseeds, and bulk maintenance scripts.
- Changed store synchronization behavior so batch flows sync by document id instead of wiping and reinserting whole collections.

What it does:

- Removes the biggest clobber risk from routine admin, auth, and comment flows.
- Makes request-path mutations safer under concurrent activity.
- Limits failure blast radius when one write path touches posts, collections, comments, or site content together.

### 3. Slug stability and redirects

Branch: `feat/routing-slug-stability-redirects`

What changed:

- Stopped auto-changing slugs when titles change.
- Exposed slug controls for posts and collections in admin.
- Added `slugHistory` for both posts and collections.
- Added old-slug resolution and redirect support for release and collection routes.
- Updated canonical references when post slugs change, including homepage featured slugs, collection featured slugs, comments, linked archive metadata, and supersession references.

What it does:

- Preserves shared links unless an editor intentionally changes the slug.
- Prevents silent URL breakage when titles are edited.
- Allows old URLs to recover to canonical current routes.

### 4. Valid interactive card markup

Branch: `fix/frontend-card-interaction-markup`

What changed:

- Removed nested button-inside-link and link-inside-link patterns from the public card surfaces.
- Cleaned up interaction structure in:
  - `ReleaseCard`
  - `TimelineCard`
  - `FractureFragmentCard`
  - homepage featured-release surfaces
- Updated supporting CSS to match the cleaned interaction model.

What it does:

- Fixes invalid HTML on the browse surfaces.
- Improves click behavior, focus behavior, and keyboard navigation.
- Reduces accessibility and event-propagation bugs on public cards.

### 5. Poster-first media and lazy loading

Branch: `feat/media-poster-first-lazy-cards`

What changed:

- Changed compact browse surfaces to prefer poster-style media instead of mounting real `<video>` elements.
- Kept actual video playback on explicit playback surfaces such as release pages and admin preview/editing.
- Reduced preload cost for non-controlled media still rendered outside dedicated playback contexts.

What it does:

- Lowers homepage, collection, and browse-surface media cost.
- Keeps public lists visually rich without paying full video-mount cost on first load.
- Improves browsing performance while preserving full media playback where it matters.

### 6. Collection feature validation

Branch: `fix/admin-collection-feature-validation`

What changed:

- Limited the admin featured-release selector to posts actually assigned to the collection.
- Surfaced invalid legacy selections instead of silently dropping them.
- Added backend validation to reject mismatched `featuredReleaseSlug` values.

What it does:

- Stops collections from advertising broken featured releases.
- Keeps collection anchors and public collection surfaces consistent.

## Release B: Authoring

### 7. Admin post editor v2

Branch: `feat/admin-post-editor-v2`

What changed:

- Reworked the post editor into tabbed sections:
  - `Essentials`
  - `Media`
  - `Catalog`
  - `World`
  - `Publish`
- Added a save/status rail with dirty-state visibility and validation summary.
- Added local draft autosave and restore using `localStorage`.
- Added unsaved-change protection for reset, browser close, and switching edit sessions.
- Cleaned up editing controls for richer catalog metadata such as release status, family, world layer, theme tags, and supersession fields.
- Added `replacePostForm` support in the shared admin layout to make full-form restores safe.

What it does:

- Makes the post model maintainable now that it carries much richer catalog metadata.
- Reduces accidental loss during long authoring sessions.
- Gives admin editing a workflow that matches the complexity of the content model.

### 8. Admin catalog tools

Branch: `feat/admin-catalog-tools`

What changed:

- Added backend bulk post mutation support.
- Added bulk controls for visibility, archive state, homepage eligibility, release status, source tag, world layer, and collection membership.
- Added post search and filtering by collection, release status, source tag, and world layer.
- Added collection search and filtering by theme and public/internal visibility.

What it does:

- Makes large review passes and cleanup work practical.
- Turns admin catalog maintenance from one-record-at-a-time editing into a usable archive-management surface.
- Supports future pruning, reclassification, and visibility correction work much more efficiently.

### 9. Collection featured-release validation

Branch: `fix/admin-collection-feature-validation`

What changed:

- This branch was also part of Release B because it tightened authoring integrity directly in the collection editor.

What it does:

- Prevents invalid collection highlight states from reappearing during admin editing.

## Release C: Curation

### 10. Homepage recuration

Branch: `feat/homepage-curated-v2`

What changed:

- Reworked the homepage around deliberate entry points rather than a cleaned chronological feed.
- Added a `Choose a Doorway` section with:
  - featured release
  - Fractureverse threshold
  - Eldoria threshold
  - utility path into collections and guided paths
- Reframed the featured release as the site’s lead entry.
- Reduced the relative weight of the recent-feed treatment.

What it does:

- Moves the homepage closer to a threshold into authored journeys.
- Aligns the front page with the site’s world-first strategy.
- Makes the first impression feel intentional instead of archival-only.

### 11. Collection journey rails

Branch: `feat/collection-journey-navigation`

What changed:

- Added collection-level journey rails.
- Added release-level journey rails showing sequence position plus previous/next continuation.
- Removed duplicate lower-priority navigation panels that competed with the new journey structure.

What it does:

- Keeps visitors inside a collection or world thread instead of dropping into isolated page views.
- Makes collections read as authored journeys rather than flat categories.

### 12. Version family UI

Branch: `feat/version-family-ui`

What changed:

- Reworked the release-page sibling-version treatment into a proper `Version Family` module.
- Marked the current release clearly.
- Identified the family’s surface lead or primary version.
- Kept canon versus alternate status visible.
- Updated collection-level copy so alternate versions read as family branches, not loose extras.

What it does:

- Makes multi-version songs legible on the public surface.
- Preserves hierarchy without exposing working-history clutter.
- Helps canon, lead, and alternate relationships feel intentional.

### 13. Guided listening paths

Branch: `feat/guided-listening-paths`

What changed:

- Added a path-resolution layer in `frontend/src/lib/listeningPaths.js`.
- Added `/paths` and `/paths/:slug`.
- Added authored route pages for guided path discovery and step-by-step path playback.
- Added public navigation entry points into the guided path layer.
- Shipped initial authored paths:
  - `Start Here`
  - `Fractureverse`
  - `Eldoria`
  - `Identity / Becoming`
  - `Princess / Anime`
  - `Villain / Catastrophe`

What it does:

- Pushes the site past archive-only behavior into authored listening journeys.
- Gives new visitors a way into the catalog that does not depend on already knowing collection names or titles.

## Release D: Maturity

### 14. Shared data fetching and caching

Branch: `refactor/frontend-data-cache-layer`

What changed:

- Added shared SWR-backed public data hooks.
- Converted the public read layer away from repeated page-local fetch effects.
- Centralized release, collection, site content, and about-page reads.

What it does:

- Reuses cached public responses across navigation.
- Reduces duplicate request churn.
- Simplifies loading and error handling across public pages.

### 15. Backend route and service split

Branch: `refactor/backend-route-service-split`

What changed:

- Split the monolithic backend app into dedicated route modules.
- Moved reusable catalog, auth, and site-content logic into services.
- Moved validation into dedicated validator modules.
- Kept the backend app shell focused on wiring.

What it does:

- Makes the backend maintainable enough for future changes.
- Improves readability and testability.
- Separates public, admin, and auth concerns cleanly.

### 16. Auth session hardening

Branch: `feat/auth-session-hardening`

What changed:

- Moved active admin and public user session flow to cookie-backed auth.
- Added real admin-session validation at app boot.
- Added explicit admin and user logout endpoints.
- Stopped trusting local-storage tokens as the source of truth for active sessions.

What it does:

- Prevents stale local client state from opening protected surfaces.
- Makes session restore depend on server-validated state.
- Materially improves the security model of the current auth flow.

### 17. Tests, lint, and CI

Branch: `chore/quality-gates-ci`

What changed:

- Added root orchestration for lint, formatting, unit tests, API tests, verification, e2e, and CI.
- Added ESLint, Prettier, Vitest, Playwright, GitHub Actions CI, and in-memory Mongo-backed API tests.
- Added smoke coverage for:
  - homepage load
  - user registration and session restore
  - admin login and session restore

What it does:

- Gives the repo real quality gates instead of ad hoc local checking.
- Makes CI meaningful for both public and admin flows.
- Establishes a repeatable verification path for future work.

### 18. SEO, social metadata, and operations visibility

Branch: `feat/seo-social-metadata`

What changed:

- Added managed site metadata driven by admin-managed branding and homepage copy.
- Added route-level title, description, Open Graph, Twitter, and canonical metadata.
- Added default metadata tags at first paint in `frontend/index.html`.

What it does:

- Keeps browser titles and descriptions aligned with the managed brand.
- Improves social preview quality and route-level metadata correctness.

Branch: `chore/ops-monitoring-logging`

What changed:

- Added structured backend logging.
- Added request IDs and request completion logs with slow-request detection.
- Expanded `/api/health` into a real runtime snapshot.
- Added persisted admin audit logs plus `GET /api/admin/audit-logs`.
- Logged admin mutation events for posts, collections, site content, moderation, uploads, and admin login.
- Added `npm run backup:ops` for exportable operational JSON snapshots.
- Extended Admin Insights to surface runtime health and recent audit events.

What it does:

- Makes runtime failures and slow requests traceable.
- Makes admin changes observable instead of silent.
- Adds a lightweight operational safety layer for backups and status checks.

## Final Verification

Final integrated branch verification was run on `2026-04-22` from the completed roadmap branch.

Commands that passed:

- `npm run ci`
- `npm run lint`
- `npm run format:check`
- `npm run test:unit`
- `npm run test:api`
- `npm run verify`
- `npm run test:e2e`
- `backend/npm run verify`
- `frontend/npm run verify`

Results:

- Lint exits successfully with `3` existing `react-hooks/exhaustive-deps` warnings in admin code:
  - `frontend/src/layouts/AdminLayout.jsx`
  - `frontend/src/pages/admin/AdminCommentsPage.jsx`
  - `frontend/src/pages/admin/AdminInsightsPage.jsx`
- Backend API tests pass, including the new operational health and audit-log coverage.
- Playwright smoke coverage passes on the final integrated branch.

## Net Effect On The Site

### Data integrity

- The authored catalog is reconciled and documented.
- Normal backend writes are no longer doing destructive collection rewrites.
- Slugs are stable and old links can recover through redirect resolution.
- Collection featured-release integrity is enforced.

### Public experience

- Browse surfaces are lighter because media is poster-first.
- Cards are valid interactive markup.
- Homepage curation now emphasizes authored entry rather than a cleaner feed.
- Collections and releases now carry clearer journey navigation.
- Version families are legible.
- Guided listening paths give explicit authored routes into the archive.
- Public metadata is now route-aware and brand-aware.

### Admin workflow

- Post editing is structured, draft-safe, and validation-aware.
- Admin catalog review supports search, filters, and bulk actions.
- Admin Insights now includes both archive intelligence and operational/audit visibility.

### Platform maturity

- Public reads use a shared cache layer.
- Backend structure is modular instead of monolithic.
- Active sessions are server-validated and cookie-backed.
- The repo now has lint, tests, CI, and browser smoke coverage.
- Runtime logging and operational backup tooling are in place.

## Current Integration Note

- The full roadmap is present on `chore/ops-monitoring-logging`.
- The short-lived roadmap branches remain available for branch-by-branch review.
- `develop` has not been automatically advanced in this worktree; the integrated roadmap state currently lives on the final stacked branch.

## Residual Notes Outside The Roadmap

- The final frontend build still weighs roughly `490 kB` of JS before gzip. Route-level code splitting remains a good follow-up target.
- The three existing admin React hook dependency warnings were intentionally left as warnings instead of being folded into unrelated roadmap branches.
- The roadmap focused on the specified priorities. Additional audit ideas outside this plan can still be pursued after merge and stabilization.
