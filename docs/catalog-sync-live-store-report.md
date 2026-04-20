# Catalog Sync Report

- Catalog file: `backend/data/posts.json (baseline override)`
- Generated: `2026-04-20T21:25:19.056Z`

## Summary

- Tracked posts before sync: `35`
- Live posts exported: `41`
- Live-only posts added to tracked catalog: `8`
- Tracked-only posts missing from live store: `2`
- Matching posts with field drift: `12`
- Tracked collections before sync: `4`
- Live collections exported: `4`
- Collections with field drift: `0`
- Site content sections changed: `4`
- Live users excluded from tracked catalog: `1`
- Live comments excluded from tracked catalog: `0`

## Canonical Scope

- Repo-tracked catalog now covers authored content only: `posts`, `collections`, and `siteContent`.
- `users` and `comments` remain live operational data and are intentionally excluded from the tracked catalog file.
- `backend/data/posts.json` is the canonical restore source for authored catalog state.

## Post Drift

### Added From Live

- `blooming-forward-` - Blooming Forward / わたし、羽ばたく！
- `the-girl-i-couldnt-kill-heartbreaking-fragile-version` - The Girl I Couldn’t Kill
- `wings-of-light-the-weapon-she-wrote-into-being` - Wings of Light (The Weapon She Wrote Into Being)
- `queen-of-borrowed-crowns-the-throne-that-was-not-hers` - Queen of Borrowed Crowns (The Throne That Was Not Hers)
- `echoes-of-aeloria-the-memory-that-was-never-mine` - Echoes of Aeloria (The Memory That Was Never Mine)
- `between-two-worlds-the-first-awakening` - Between Two Worlds (The First Awakening)
- `we-were-never-meant-to-survive-reimagined-duet` - We Were Never Meant to Survive - Reimagined (Duet)
- `still-breathing-in-a-dying-world-reimagined` - Still Breathing (In a Dying World) - Reimagined

### Missing From Live

- `the-girl-i-couldnt-kill` - The Girl I Couldn’t Kill
- `blooming-forward` - Blooming Forward / わたし、羽ばたく！

### Matching Posts With Field Drift

- `we-were-never-meant-to-survive` changed: isPrimaryVersion
- `still-breathing-in-a-dying-world` changed: isPrimaryVersion, isHomepageEligible
- `the-hands-that-shield` changed: subCategory, themeTags
- `wings-of-light` changed: isPrimaryVersion, isHomepageEligible
- `queen-of-borrowed-crowns` changed: isPrimaryVersion, isHomepageEligible
- `echoes-of-aeloria` changed: isPrimaryVersion, isHomepageEligible
- `between-two-worlds` changed: isPrimaryVersion, isHomepageEligible
- `this-is-my-light` changed: videoUrl
- `the-one-you-used-to-be-reimagined` changed: title, videoUrl, excerpt, content, lyrics, archiveMeta, createdAt, worldLayer
- `you-were-better-before-you-saved-the-world-reimagined` changed: title, videoUrl, excerpt, content, lyrics, archiveMeta, createdAt, worldLayer
- `shattered-trust-reimagined` changed: videoUrl, excerpt, content, lyrics, archiveMeta, createdAt, worldLayer
- `hopes-song` changed: title, videoUrl, excerpt, content, lyrics, createdAt, isPrimaryVersion, isHomepageEligible, releaseStatus

### Field Drift Totals

- `isPrimaryVersion`: 7
- `isHomepageEligible`: 6
- `videoUrl`: 5
- `content`: 4
- `createdAt`: 4
- `excerpt`: 4
- `lyrics`: 4
- `archiveMeta`: 3
- `title`: 3
- `worldLayer`: 3
- `releaseStatus`: 1
- `subCategory`: 1
- `themeTags`: 1

## Collection Drift

- No collection field drift detected.

## Site Content Drift

- `branding`
- `home`
- `collectionThemes`
- `about`

## Anchor Validation

- All collection featured slugs point to valid posts.
- All collection featured slugs point to published, visible posts.
- Home featured slug: `hopes-song` (exists, published, visible)

## Recommended Follow-Up

- Merge this reconciliation before any data-layer refactor work.
- Build safe partial updates against the reconciled catalog so future live changes do not drift silently.
