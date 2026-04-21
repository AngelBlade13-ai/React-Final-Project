## Admin Catalog Tools

Branch: `feat/admin-catalog-tools`

### What changed

- Added backend bulk post mutation support at `POST /api/admin/posts/bulk-update`.
- Bulk post updates now support:
  - public visibility
  - archive state
  - homepage eligibility
  - release status
  - source tag
  - world layer
  - add/remove collection membership
- Bulk updates reconcile collection featured-release state after membership changes, so invalid featured slugs do not linger.
- Expanded `frontend/src/pages/admin/AdminPostsPage.jsx` with a catalog tool surface that supports:
  - search
  - filter by collection
  - filter by release status
  - filter by source tag
  - filter by world layer
  - select filtered results
  - apply bulk changes to selected releases
- Expanded `frontend/src/pages/admin/AdminCollectionsPage.jsx` with collection search and filtering by theme and public/internal visibility.
- Added supporting admin styling in `frontend/src/styles/app.css`.

### Why it matters

- Archive maintenance is no longer constrained to one-record-at-a-time edits.
- This makes large cleanup passes, recategorization, and visibility corrections practical.
- The collection search/filter pass also makes admin review workable as the catalog grows.

### Verification

- `frontend`: `npm run verify`
- `backend`: `npm run verify`

### Notes

- Bulk updates are intentionally conservative. They do not change slugs or rewrite version-family relationships.
- The post editor still blocks bulk actions while it has unsaved form changes, so local authoring work is not silently invalidated.
