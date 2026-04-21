## Version Family UI

Branch: `feat/version-family-ui`

### What changed

- Reworked the release-page sibling version section in `frontend/src/pages/public/PublicReleasePage.jsx` into a clearer `Version Family` module.
- The new module now:
  - marks the current release explicitly
  - identifies the family’s surface lead / primary version
  - keeps canon vs alternate status visible
  - shows the whole public family together instead of only “other versions”
- Updated the collection-page alternate-version disclosure copy in `frontend/src/pages/public/CollectionDetailPage.jsx` so it reads as a family-branch view rather than a loose extras bucket.
- Added supporting styling in `frontend/src/styles/app.css`.

### Why it matters

- Version relationships are now presented as a small hierarchy, not just a list of alternates.
- This makes canon / lead / alternate relationships legible without exposing working-history clutter on the public surface.
- It also helps the archive read more intentionally when songs exist in multiple public forms.

### Verification

- `frontend`: `npm run verify`
- `backend`: `npm run verify`
