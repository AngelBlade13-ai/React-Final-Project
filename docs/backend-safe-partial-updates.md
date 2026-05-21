# Backend Safe Partial Updates

This branch replaces the highest-risk normal mutation paths that previously used `readStore()` plus full-store `writeStore()` rewrites.

## What changed

- Normal app CRUD routes now use targeted Mongo writes for:
  - user register/update
  - public comment create/update/delete
  - admin comment moderation
  - admin post create/update/delete
  - admin collection create/update/delete
  - admin site-content saves
- Cross-collection mutations now run through `runStoreTransaction(...)`.
- `writeStore(...)` remains available for bulk maintenance scripts and reseeds, but it now syncs collections by document id instead of `deleteMany()` plus `insertMany()` for every collection.

## Safety model

- On transaction-capable Mongo deployments, cross-collection mutations run atomically.
- On standalone/local Mongo deployments that do not support transactions, the backend logs a warning once and falls back to ordered non-transactional writes.
- The fallback still avoids whole-store rewrites, so unrelated collections are no longer clobbered by routine user/comment/post/admin updates.

## Remaining batch paths

The following scripts still use `writeStore(...)` intentionally because they are bulk mutation tools:

- `backend/scripts/reseed-from-posts-file.js`
- `backend/scripts/migrate-collection-taxonomy.js`
- `backend/scripts/backfill-public-ia.js`
- `backend/scripts/apply-post-curation-map.js`
- `backend/scripts/classify-release-status.js`
- `backend/scripts/apply-donna-duplicate-cleanup.js`

These are safer than before because `writeStore(...)` no longer wipes and reinserts every collection, but they are still batch operations and should be treated as operational tooling rather than normal request-path writes.
