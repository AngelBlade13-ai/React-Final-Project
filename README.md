# Suno Diary

Suno Diary is a full-stack music archive built with React, Vite, Express, and MongoDB. It combines public release browsing, immersive collection worlds, guided listening paths, protected admin management, public user accounts, and comments into one deployable portfolio project.

The public site is designed as a curated music archive rather than a plain CRUD demo: releases can belong to authored worlds, collection pages can carry custom themes, and the admin side supports catalog maintenance, moderation, operational health, and AI-assisted review workflows.

## Reviewer Quick Start

Live frontend:

- https://react-final-project-seven-sigma.vercel.app

Live backend:

- https://react-final-project-cnk7.onrender.com

API base:

- https://react-final-project-cnk7.onrender.com/api

Useful public routes:

- `/` - curated homepage
- `/collections` - world and archive collection index
- `/explore` - searchable release archive
- `/paths` - guided listening paths
- `/about` - project and artist context
- `/login` - sign in and registration
- `/account` - signed-in public profile and library

Operational routes:

- `/api/health` - backend health and runtime status
- `/admin/login` - compatibility redirect to `/login`

## Project Structure

```text
project-root/
|-- backend/
|   |-- src/
|   `-- package.json
|-- frontend/
|   |-- src/
|   `-- package.json
|-- README.md
`-- .gitignore
```

## Key Features

- Admin authentication with JWT-protected admin routes
- Public user registration, login, logout, and account editing
- CRUD API for posts, collections, about content, and comments
- MongoDB persistence for posts, collections, site content, users, and comments
- Public comments with avatars, public profile links, replies, reports, and edit/delete controls for the comment author
- Admin archive intelligence dashboard with health scoring, readiness signals, and quick-win surfacing
- Admin comment moderation workspace with reported-comment filtering, report details, hide/show controls, and delete controls
- Structured request logging, `x-request-id` tracing, runtime health snapshots, and persisted admin audit logs
- Optional Ollama-backed admin assistant for non-destructive catalog review, post suggestions, and guided path suggestions
- Themed collection and release pages with responsive layout
- Dynamic page titles and a custom threshold favicon
- Graceful public loading, error, retry, and 404 recovery states
- Keyboard skip link, improved focus states, and canonical/social metadata support

## Setup

### 1. Install dependencies

```bash
npm install

cd backend
npm install

cd ../frontend
npm install
```

### 2. Configure environment variables

Copy the root `.env.example` values into your own local environment files.

Required backend values:

- `PORT`
- `CLIENT_URL`
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD` or `ADMIN_PASSWORD_HASH`
- `MONGODB_URI` (MongoDB Atlas or another reachable MongoDB connection string)
- `MONGODB_DB_NAME`

Optional backend operations values:

- `LOG_LEVEL`
- `ENABLE_REQUEST_LOGGING`
- `ENABLE_ADMIN_AUDIT_LOGGING`
- `SLOW_REQUEST_THRESHOLD_MS`
- `MONITORING_WEBHOOK_URL`
- `IMPORTER_ENABLED` (`true` for local workstation use; leave unset or `false` on Render)
- `IMPORTER_LAUNCH_MODE` (`local` to spawn Flask locally, `external` to open a separately hosted importer URL)
- `IMPORTER_ROOT` (optional override; defaults to `tools/song-importer`)
- `IMPORTER_URL`
- `IMPORTER_PYTHON_PATH` (optional override; defaults to the bundled importer's virtualenv Python)

The song importer can be used two ways:

- Local workstation mode: the backend launches the bundled Flask importer from `tools/song-importer`.
- Hosted demo mode: a separate Python web service runs the importer, and the admin button opens that external URL.

Create the local virtualenv before using **Open Importer** in local workstation mode:

```bash
cd tools/song-importer
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
```

Frontend API base URL:

- `VITE_API_URL`
- `VITE_IMPORTER_ENABLED` (`true` locally; unset or `false` for the deployed Vercel build)
- `VITE_IMPORTER_URL`

For an instructor demo from the deployed Vercel site, deploy the importer as a separate Render Python web service:

- Build command: `pip install -r tools/song-importer/requirements.txt`
- Start command: `python tools/song-importer/start_hosted.py`
- Optional importer env: `IMPORTER_DEMO_MODE=false`, `IMPORTER_NO_UPLOAD=false`, and Cloudinary credentials if media upload should be demonstrated.
- Backend Render env: `IMPORTER_ENABLED=true`, `IMPORTER_LAUNCH_MODE=external`, `IMPORTER_URL=https://your-importer-service.onrender.com`.
- Vercel env: `VITE_IMPORTER_ENABLED=true`, `VITE_IMPORTER_URL=https://your-importer-service.onrender.com`.

Hosted importer mode is for preview/import preparation. It does not write directly into the deployed website repository or reseed MongoDB.

### 3. Confirm MongoDB access

The app expects `MONGODB_URI` to point at a reachable MongoDB database. For this deployed project, that is normally MongoDB Atlas. Local development can use Atlas too; you do not need to run a Docker MongoDB container unless you specifically want a local-only database.

### 4. Start the backend

```bash
cd backend
npm run dev
```

### 5. Start the frontend

```bash
cd frontend
npm run dev
```

## Verification

```bash
npm run ci

# Or run the major gates separately:
npm run lint
npm run format:check
npm run test:unit
npm run test:api
npm run verify
npm run test:e2e

cd tools/song-importer
.\.venv\Scripts\python.exe -m pytest

cd ../..
python tools/content_audit.py --format markdown
```

Operational checks that touch live data or local backups should be run intentionally:

```bash
cd backend

npm run catalog:diff-live
npm run backup:ops -- --label=smoke
```

On first backend startup, the API seeds MongoDB from the local authored catalog file if the database is empty. By default that file is `backend/data/posts.local.json`.

Current quality gate notes:

- `npm run ci` passes.
- importer pytest passes from `tools/song-importer`.
- Generated build, report, cache, and output folders are ignored and should not be committed.

## Usage

### Public user flow

1. Open `/login`
2. Create an account with display name, email, and password
3. Open `/account` to manage the profile and library
4. Add, edit, or delete your own comments
5. Reply to comments or report misconduct when needed
6. Use the account page to update your display name, avatar, or password

### Admin flow

1. Open `/login`
2. Sign in with the configured admin credentials
3. Use `Open Admin Studio` from the account page
4. Create, edit, and delete posts and collections
5. Update About page content
6. Open `/admin/insights` for archive health, runtime status, and the admin audit trail
7. Open `/admin/comments` for comment and report moderation
8. Use `Open Importer` when the local or hosted importer integration is configured
9. Use `/admin/ai-runtime` to confirm Ollama/Thunder status before running assistant reviews

## Authentication

The project uses one account login surface:

- standard users can manage their public account, comments, library, and reactions
- admin users are normal accounts with `role: "admin"` and access to the protected dashboard

Security measures currently in code:

- hashed user passwords with `bcryptjs`
- JWT-based session tokens
- `helmet` security headers
- rate limiting on login and comment write routes
- ownership checks on comment edits and deletes

## Operations

- `GET /api/health` returns runtime status, database connectivity, uptime, and logging configuration.
- `GET /api/admin/audit-logs` returns the most recent admin mutations for operational review.
- `cd backend && npm run backup:ops -- --label=pre-release` writes a JSON operational snapshot to `backend/backups/`.
- `docs/operations-runbook.md` documents backups, restore expectations, and versioning notes for operational changes.

## API Documentation

### Admin authentication compatibility

`POST /api/admin/login`

This compatibility endpoint signs in the configured admin as a normal user
session with `role: "admin"`. The public UI uses `/login` for authentication
and `/account` for the signed-in profile.

Example request:

```json
{
  "email": "admin@example.com",
  "password": "Admin123!"
}
```

Example response:

```json
{
  "token": "jwt-token",
  "user": {
    "email": "admin@example.com",
    "role": "admin"
  },
  "admin": {
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

### Public user registration

`POST /api/auth/register`

Example request:

```json
{
  "displayName": "AngelBlade13",
  "email": "user@example.com",
  "password": "StrongPass123"
}
```

Example response:

```json
{
  "token": "jwt-token",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "displayName": "AngelBlade13",
    "role": "user",
    "status": "active"
  }
}
```

### Posts CRUD

- `GET /api/posts`
- `GET /api/posts/:slug`
- `POST /api/admin/posts`
- `PUT /api/admin/posts/:id`
- `DELETE /api/admin/posts/:id`

Create request example:

```json
{
  "title": "Signal in the Static",
  "excerpt": "A transmission from the threshold.",
  "content": "Full release description",
  "published": true,
  "collectionSlugs": ["fractureverse"]
}
```

Create response example:

```json
{
  "post": {
    "id": "post-id",
    "title": "Signal in the Static",
    "slug": "signal-in-the-static",
    "published": true
  }
}
```

### Collections CRUD

- `GET /api/collections`
- `GET /api/collections/:slug`
- `POST /api/admin/collections`
- `PUT /api/admin/collections/:id`
- `DELETE /api/admin/collections/:id`

Create request example:

```json
{
  "title": "Fractureverse",
  "description": "A broken world of recursive signals.",
  "theme": "fractureverse"
}
```

Create response example:

```json
{
  "collection": {
    "id": "collection-id",
    "title": "Fractureverse",
    "slug": "fractureverse"
  }
}
```

### Comment CRUD

- `GET /api/posts/:slug/comments`
- `POST /api/posts/:slug/comments`
- `PUT /api/comments/:id`
- `DELETE /api/comments/:id`

Create request example:

```json
{
  "body": "This release feels like a threshold crossing."
}
```

Create response example:

```json
{
  "comment": {
    "id": "comment-id",
    "postSlug": "signal-in-the-static",
    "body": "This release feels like a threshold crossing."
  }
}
```

### About content update

- `GET /api/about`
- `GET /api/admin/site-content`
- `PUT /api/admin/site-content/about`

Update request example:

```json
{
  "heroTitle": "Inside the archive",
  "heroText": "A journal of releases, worlds, and fragments."
}
```

Update response example:

```json
{
  "about": {
    "heroTitle": "Inside the archive",
    "heroText": "A journal of releases, worlds, and fragments."
  }
}
```

## Validation and UI Notes

- account forms validate required fields, email format, and password length
- comment forms require minimum text length
- delete actions use confirmation prompts
- success and error states are shown inline on account and comment actions
- layouts are responsive across mobile and desktop breakpoints
- public routes include retryable API failure states and useful bad-route recovery
- unmatched routes render a designed 404 page instead of a blank shell
- release and collection pages emit canonical metadata and poster-derived social images when available

## Repository Notes

- `.gitignore` excludes `node_modules`, build output, `.env`, and local authored data files
- `.env.example` lists the required configuration variables
- commit history uses feature-focused commit messages on separate branches
- `backend/data/posts.local.json` is the local authored catalog file used by the app by default
- `backend/data/posts.template.json` is the safe repo-tracked template
- `docs/catalog-source-of-truth.md` documents catalog sync, backup layers, and restore guidance

## Deployment Checklist

Frontend:

- Set `VITE_API_URL` to the deployed backend API base, for example `https://react-final-project-cnk7.onrender.com/api`.
- For the deployed importer demo, set `VITE_IMPORTER_ENABLED=true` and `VITE_IMPORTER_URL` to the hosted importer service URL.
- Build command: `npm run build` from `frontend/`.
- Output directory: `frontend/dist`.

Backend:

- Set `CLIENT_URL` to the deployed frontend origin.
- Set `JWT_SECRET` to a long production secret.
- Prefer `ADMIN_PASSWORD_HASH` over plaintext `ADMIN_PASSWORD`.
- Set `MONGODB_URI` and `MONGODB_DB_NAME` for the production database.
- Set Cloudinary credentials if admin video upload is needed.
- For the deployed importer demo, set `IMPORTER_ENABLED=true`, `IMPORTER_LAUNCH_MODE=external`, and `IMPORTER_URL` to the hosted importer service URL.
- Keep optional AI and importer variables disabled unless those services are intentionally configured.
- Start command: `npm start` from `backend/`.

Hosted importer service:

- Deploy as a separate Python web service.
- Build command from repo root: `pip install -r tools/song-importer/requirements.txt`.
- Start command from repo root: `python tools/song-importer/start_hosted.py`.
- Set Cloudinary credentials on this service if media upload should be demonstrated.

Pre-release checks:

- Run `npm run lint`.
- Run `npm run test:unit`.
- Run `npm run test:api`.
- Run `npm run verify`.
- Run `python tools/content_audit.py`.
- Confirm `/api/health` reports the database as connected.
- Confirm homepage, collections, explore, release detail, account, and `/not-a-real-route` render correctly on the deployed frontend.

## Python Audit Tool

The repo now includes a small Python audit utility for learning-friendly content checks.

Examples:

```bash
python tools/content_audit.py
python tools/content_audit.py --format markdown
python tools/content_audit.py --format json --write docs/content-audit.json
```

The script reads `backend/data/posts.local.json` by default and reports:

- release counts by status
- video and lyrics coverage
- immersive-world metadata coverage
- featured-release coverage for public collections
- common content gaps like missing video, missing lyrics, metadata gaps, and homepage-eligibility conflicts
