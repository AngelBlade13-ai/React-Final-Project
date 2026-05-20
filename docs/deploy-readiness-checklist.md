# Deploy Readiness Checklist

Use this checklist before promoting the portfolio site or sending it to reviewers.

## Current Branch

- Branch: `polish/deploy-ready-website`
- Purpose: public-site polish, resilience, accessibility, route recovery, deploy documentation, and smoke coverage.

## Public UX

- Homepage has retryable API failure handling.
- Collections index has retryable API failure handling.
- Collection detail pages have loading, error, and bad-slug recovery states.
- Explore has retryable API failure handling.
- Guided paths have retryable API failure handling.
- Release detail pages have loading, error, and bad-slug recovery states.
- Unmatched routes render a designed 404 page with recovery links.
- Public shell includes a footer, skip link, stronger keyboard focus states, and route focus reset.

## Admin UX

- Admin shell shows a compact protected workspace status strip.
- Unknown protected admin routes render a recovery page instead of a blank dashboard.
- Browser smoke coverage verifies authenticated admin route recovery.

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
python tools/content_audit.py --format markdown
```

Known repository note:

- `npm run format:check` currently reports pre-existing formatting drift across docs/tests. Do this as a separate formatting-only cleanup if required, not mixed into feature polish.

## Content Audit Status

Latest audit summary on May 20, 2026:

- Total posts: 42
- Published posts: 42
- Public posts: 42
- Public primary collections: 4
- Video coverage: 41/42
- Lyric coverage: 42/42
- World metadata coverage: 9/9
- Featured collection coverage: 4/4

Known launch content gap:

- `we-were-never-meant-to-survive-reimagined-duet` is published without a video source.

Decision needed before final launch:

- Add the missing video URL, or intentionally keep it public with the existing “Video Pending” UI.

## Deployment Environment

Frontend:

- `VITE_API_URL` points to the deployed backend `/api`.
- `VITE_IMPORTER_URL` is only set if the importer should be visible from the deployed admin shell.

Backend:

- `CLIENT_URL` matches the deployed frontend origin.
- `JWT_SECRET` is a long production secret.
- `ADMIN_PASSWORD_HASH` is used instead of plaintext `ADMIN_PASSWORD`.
- `MONGODB_URI` and `MONGODB_DB_NAME` point to production MongoDB.
- Cloudinary credentials are set if upload is required.
- Optional AI/importer/RunPod variables are configured only when those workflows are intended for production.

## Manual Smoke Test

After deploy:

- Open `/`.
- Open `/collections`.
- Open one world collection.
- Open `/explore` and search for a known title.
- Open one release page.
- Open `/paths` and one guided path.
- Open `/account`.
- Open `/not-a-real-route` and confirm the 404 recovery page appears.
- Sign into `/admin/login`, open `/admin/unknown-surface`, and confirm the admin recovery page appears.
- Open `/api/health` and confirm database status is connected.
