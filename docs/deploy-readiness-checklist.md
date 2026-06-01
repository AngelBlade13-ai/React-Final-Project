# Deploy Readiness Checklist

Use this checklist before promoting the portfolio site or sending it to reviewers.

## Current Branch

- Branch: `master`
- Purpose: production/deploy readiness for the public site, admin studio, importer workflow, and AI assistant integration.

## Public UX

- Homepage has retryable API failure handling.
- Collections index has retryable API failure handling.
- Collection detail pages have loading, error, and bad-slug recovery states.
- Explore has retryable API failure handling.
- Guided paths have retryable API failure handling.
- Release detail pages have loading, error, and bad-slug recovery states.
- Unmatched routes render a designed 404 page with recovery links.
- Public shell includes a footer, skip link, stronger keyboard focus states, and route focus reset.
- Listing-heavy public pages use card-shaped skeleton states instead of only generic loading panels.
- Public account forms disable duplicate submissions while requests are in flight.
- Explore search keeps keyboard focus while typing and does not scroll back to top when query params update.
- Public comments support avatars, public profile links, replies, reports, and owner edit/delete controls.

## Admin UX

- Admin shell shows a compact protected workspace status strip.
- Unknown protected admin routes render a recovery page instead of a blank dashboard.
- Browser smoke coverage verifies authenticated admin route recovery.
- Browser smoke coverage verifies bad public route, release slug, and collection slug recovery.
- Admin comments can filter reported comments, inspect reports, hide/show comments, and delete comments.

## Metadata

- Core public pages set dynamic document titles and descriptions.
- Release pages set canonical URLs.
- Collection pages set canonical URLs.
- Release and collection pages use Cloudinary-derived poster images for social metadata when video URLs are available.
- 404 page sets its own metadata.

## Quality Gates

Run before deploy:

```bash
npm run lint
npm run test:unit
npm run test:api
npm run verify
npm run test:e2e
cd tools/song-importer && .\.venv\Scripts\python.exe -m pytest
python tools/content_audit.py --format markdown
cd backend && npm run site:refresh-public-copy
```

Run `site:refresh-public-copy` against production MongoDB when the live site still shows legacy homepage/about copy from earlier admin language.

Known repository note:

- `npm run format:check` currently reports pre-existing formatting drift across docs/tests. Do this as a separate formatting-only cleanup if required, not mixed into feature polish.

## Content Audit Status

Latest audit summary on June 1, 2026:

- Total posts: 45
- Published posts: 45
- Public posts: 45
- Public primary collections: 12
- Video coverage: 44/45
- Lyric coverage: 45/45
- World metadata coverage: 9/9
- Featured collection coverage: 12/12

Known intentional no-video release:

- `we-were-never-meant-to-survive-reimagined-duet` is published without a video source.

Launch decision:

- Keep it public without a video. Duet generation quality is poor for this song, and the Fractureverse presentation intentionally treats it as an unrecorded fragment.
- Public cards and route surfaces should use theme-aware language such as "Fragment Unrecorded" and "Signal Unavailable," not generic "Video Pending," for this release.

## Deployment Environment

Frontend:

- `VITE_API_URL` points to the deployed backend `/api`.
- `VITE_IMPORTER_ENABLED` is `true` for instructor demos only when `VITE_IMPORTER_URL` points to a browser-reachable hosted importer service.
- `VITE_IMPORTER_URL` is only set when the importer should be visible from the admin shell.

Backend:

- `CLIENT_URL` matches the deployed frontend origin.
- `JWT_SECRET` is a long production secret.
- `ADMIN_PASSWORD_HASH` is used instead of plaintext `ADMIN_PASSWORD`.
- `MONGODB_URI` and `MONGODB_DB_NAME` point to production MongoDB.
- Cloudinary credentials are set if upload is required.
- For a deployed importer demo, Render backend has `IMPORTER_ENABLED=true`, `IMPORTER_LAUNCH_MODE=external`, and `IMPORTER_URL` set to the separate Python importer service URL.
- Without a separate hosted importer service, `IMPORTER_ENABLED` is unset or `false` on Render.
- Hosted importer mode is preview-only by design. Real apply/reseed remains local/operator-run from the repo checkout so catalog writes can be backed up, reviewed, committed, and deployed.
- Optional AI/Thunder Compute variables are configured only when those workflows are intended for production.
- For Thunder forwarded Ollama mode, `LOCAL_AI_BASE_URL` points to the forwarded Ollama host, `LOCAL_AI_DEFAULT_NUM_GPU=99`, and `REMOTE_AI_ENABLED=false`.
- For SSH tunnel mode, `REMOTE_AI_ENABLED=true` and the `REMOTE_AI_*` SSH/tunnel values are configured.

Importer:

- `tools/song-importer/input/existing_catalog.json` and `tools/song-importer/input/new_songs.json` exist for standalone demo mode.
- `cd tools/song-importer && .\.venv\Scripts\python.exe -m pytest` passes.
- `cd tools/song-importer && .\.venv\Scripts\python.exe main.py --demo --dry-run` works from a fresh checkout.
- Website preview mode works without applying changes: `.\.venv\Scripts\python.exe main.py --website-root "<repo>" --input input\new_songs.json --output-dir output\website-smoke --no-upload --dry-run`.
- Hosted demo service, if used, builds with `pip install -r tools/song-importer/requirements.txt` and starts with `python tools/song-importer/start_hosted.py`.
- Hosted demo service can preview/import-prep and optionally upload to Cloudinary, but apply/reseed controls should stay disabled unless the importer is running locally with a real website target.

## Manual Smoke Test

After deploy:

- Open `/`.
- Open `/collections`.
- Open one world collection.
- Open `/explore` and search for a known title.
- Confirm clicking a searched result does not jump the page back to the top.
- Open one release page.
- Add a test comment/reply from a non-admin account and confirm avatar/profile links render.
- Report a comment and confirm `/admin/comments` shows the report for moderation.
- Open `/paths` and one guided path.
- Open `/account`.
- Open `/not-a-real-route` and confirm the 404 recovery page appears.
- Open `/release/not-a-real-release` and confirm the release recovery page appears.
- Open `/collections/not-a-real-collection` and confirm the collection recovery page appears.
- Sign into `/admin/login`, open `/admin/unknown-surface`, and confirm the admin recovery page appears.
- Open `/api/health` and confirm database status is connected.
- Open `/admin/ai-runtime` and confirm Ollama status is reachable for the intended local/Thunder mode.
