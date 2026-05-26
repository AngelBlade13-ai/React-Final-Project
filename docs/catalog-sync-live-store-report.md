# Catalog Sync Report

- Catalog file: `backend\data\posts.local.json`
- Generated: `2026-05-26T20:04:17.050Z`

## Summary

- Tracked posts before sync: `42`
- Live posts exported: `42`
- Live-only posts added to tracked catalog: `0`
- Tracked-only posts missing from live store: `0`
- Matching posts with field drift: `0`
- Tracked collections before sync: `12`
- Live collections exported: `12`
- Collections with field drift: `0`
- Site content sections changed: `0`
- Live users excluded from tracked catalog: `1`
- Live comments excluded from tracked catalog: `0`

## Canonical Scope

- Repo-tracked catalog now covers authored content only: `posts`, `collections`, and `siteContent`.
- `users` and `comments` remain live operational data and are intentionally excluded from the tracked catalog file.
- `backend/data/posts.local.json` is the local authored catalog restore source.

## Post Drift

## Collection Drift

- No collection field drift detected.

## Site Content Drift

- No site content drift detected.

## Anchor Validation

- All collection featured slugs point to valid posts.
- All collection featured slugs point to published, visible posts.
- Home featured slug: `hopes-song` (exists, published, visible)

## Recommended Follow-Up

- Merge this reconciliation before any data-layer refactor work.
- Build safe partial updates against the reconciled catalog so future live changes do not drift silently.
