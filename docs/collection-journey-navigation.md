## Collection Journey Navigation

Branch: `feat/collection-journey-navigation`

### What changed

- Added a collection-level journey rail in `frontend/src/pages/public/CollectionDetailPage.jsx`.
  - surfaces a guided starting point
  - highlights the lead / anchor entry
  - points toward the latest or deepest continuation
- Added a release-level journey rail in `frontend/src/pages/public/PublicReleasePage.jsx`.
  - shows current sequence position
  - keeps previous/next navigation visible at a higher priority
  - reinforces the parent collection as the main thread
- Removed lower-priority duplicate previous/next panels from the themed release support sections so navigation reads as one coherent system instead of two competing ones.
- Added shared styling in `frontend/src/styles/app.css` for the new journey rail and summary cards.

### Why it matters

- Collections now feel more authored and less like flat category buckets.
- Release pages keep people inside the world or collection sequence instead of letting navigation collapse into isolated page views.
- This moves the site closer to the stated goal of world-first listening journeys.

### Verification

- `frontend`: `npm run verify`
- `backend`: `npm run verify`
