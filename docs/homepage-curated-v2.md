## Homepage Curated V2

Branch: `feat/homepage-curated-v2`

### What changed

- Reworked `frontend/src/pages/public/PublicHome.jsx` so the homepage emphasizes authored entry points instead of reading like a long cleaned feed.
- Added a new `Choose a Doorway` section with:
  - featured release entry
  - Fractureverse threshold
  - Eldoria threshold
  - a utility path into collections/explore
- Kept the large featured release treatment, but reframed it as the homepage lead entry instead of a generic latest item.
- Reduced the latest-homepage feed weight by limiting the recent section to a smaller curated set.
- Renamed collection emphasis to `Begin With a Collection` to reinforce the site’s world-first / journey-first framing.
- Added supporting homepage styles in `frontend/src/styles/app.css` for doorway cards, threshold note treatment, and the revised section hierarchy.

### Why it matters

- The homepage now behaves more like a threshold into authored journeys.
- Utility navigation still exists, but it no longer dominates the emotional first impression.
- This aligns the front door with the archive’s broader goal: guide people into meaningful worlds and listening paths rather than just present cleaner storage.

### Verification

- `frontend`: `npm run verify`
- `backend`: `npm run verify`
