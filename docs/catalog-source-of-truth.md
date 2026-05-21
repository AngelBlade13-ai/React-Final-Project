# Catalog Source Of Truth

## Canonical Scope

- `backend/data/posts.local.json` is the local source of truth for authored catalog state.
- The local authored catalog includes:
  - `posts`
  - `collections`
  - `siteContent`
- The tracked catalog does not include live operational data:
  - `users`
  - `comments`
  - upload provider state

## Why This Split Exists

- Posts, collections, and site settings are authored content and should be recoverable from private backups.
- Users and comments are operational data that change in production and should not be versioned in the repo.
- The repo keeps only `backend/data/posts.template.json` as a safe structure template.

## Reconciliation Workflow

From `backend/`:

```bash
npm run catalog:diff-live
npm run catalog:sync-live
```

What those do:

- `catalog:diff-live` compares the local authored catalog against the live store and writes a reconciliation report.
- `catalog:sync-live` updates `backend/data/posts.local.json` from the live store and refreshes the report.

## Backup Layers

Use two backup layers, not one:

1. Local authored catalog backup
   - run `npm run catalog:sync-live`
   - review the generated report in `docs/catalog-sync-live-store-report.md`
   - copy the updated local file into your private backup system

2. Full live-store operational backup
   - export a full store snapshot before risky migrations or pruning passes
   - recommended command:

```bash
node scripts/sync-tracked-catalog-from-live.js --snapshot=../backend/backups/live-store-snapshot.json
```

This snapshot can include users and comments, so it should stay local or in your private backup system, not in git.

## Restore Guidance

- To restore authored catalog state into MongoDB, use `npm run reseed`.
- `reseed` is intended to restore `posts`, `collections`, and tracked site settings from `backend/data/posts.local.json`.
- Do not treat `reseed` as a full operational restore for users/comments.
- For full operational restore, use a database snapshot captured outside the repo.

## Safe Working Rule

- Before major catalog refactors or pruning passes:
  - export the live store
  - sync the tracked catalog
  - verify featured slugs and homepage anchors
  - only then run mutations
