# Site Master Reference

This document is the high-level operating map for the website. It is meant to explain how the site works to another developer, collaborator, or reviewer without requiring them to reverse-engineer the codebase first.

It complements the more focused documents already in `docs/` by describing the full system in one place.

## 1. What The Website Is

The site is a full-stack music archive with two major faces:

- Public site:
  - presents songs as release pages
  - groups songs into collections and guided paths
  - supports themed world experiences such as Fractureverse and Eldoria
  - supports public user accounts and comments
- Admin site:
  - manages posts, collections, site content, and comments
  - exposes archive insights and operational health
  - includes a local/remote AI assistant for non-destructive review and suggestion workflows

The project is intentionally structured around authored catalog data rather than a generic blog model. Songs, release notes, world metadata, collection curation, and path logic are first-class concepts.

## 2. Technology Stack

- Frontend:
  - React
  - Vite
  - React Router
  - SWR for public-data fetching
- Backend:
  - Express
  - MongoDB
  - JWT/cookie session handling
  - structured request logging and admin audit logging
- AI assistant:
  - Ollama-compatible API
  - local backend integration
  - optional remote RunPod + SSH tunnel + remote Ollama bootstrap flow

## 3. Repository Layout

- `frontend/`
  - public site and admin SPA
- `backend/`
  - API routes, persistence, services, scripts, tests
- `docs/`
  - focused implementation and operational documents
- `.env.example`
  - shared environment reference

Important current privacy model:

- authored catalog content now lives locally, not in Git, through `backend/data/posts.local.json`
- operational runtime artifacts such as tunnel state/log files are local-only

## 4. Core Domain Model

### 4.1 Posts

A post is the main song/release record. It is not just a blog entry. It can contain:

- title
- slug
- excerpt
- content
- lyrics
- video URL
- createdAt
- published
- release status
  - `canon`
  - `alternate`
  - `working`
- collection membership
- theme tags
- world layer
- version-family metadata
- archive/supersession flags
- homepage-eligibility flag
- immersive `archiveMeta` fields for world-specific behavior

Posts are the base unit used by:

- public release pages
- collections
- guided listening paths
- homepage curation
- AI assistant suggestion flows

### 4.2 Collections

A collection groups related releases. It can act as:

- a standard archive shelf
- a thematic grouping
- a world container

Important collection fields:

- `title`
- `slug`
- `description`
- `theme`
- `featuredReleaseSlug`
- `isPublicPrimary`

Collections determine:

- public collection pages
- themed presentation rules
- collection-level navigation
- some guided path algorithms

### 4.3 Site Content

Site content is separate from posts and collections. It includes:

- branding
- homepage copy
- about-page content
- collection theme profiles
- guided paths

This means the site’s framing and navigation language can evolve without rewriting song posts themselves.

### 4.4 Guided Paths

Guided paths are curated or algorithmic routes through the catalog.

Each path can contain:

- `slug`
- `title`
- `eyebrow`
- `intro`
- `moodNote`
- `themeHint`
- `postSlugs`
- `algorithm`

There are two main path modes:

- Manual path:
  - uses explicit `postSlugs`
  - fixed order
- Algorithm path:
  - uses rule-based resolution
  - dynamic output

Examples:

- `start-here`
  - homepage-style newcomer route
- `fractureverse`
  - collection-scoped world route
- `eldoria`
  - collection-scoped world route

## 5. Source Of Truth Model

The website has two important layers of truth:

- local authored catalog file
  - `backend/data/posts.local.json`
  - used as the authored catalog source
- live database state
  - MongoDB
  - used by the running application

The system supports sync and review workflows between these layers rather than pretending the live DB is always the only truth.

Important related tooling:

- live-store preview/sync endpoints
- reports in `backend/reports/live-store-sync/`
- docs such as:
  - `docs/catalog-source-of-truth.md`
  - `docs/catalog-sync-live-store-report.md`

## 6. Frontend Architecture

### 6.1 App Shell

`frontend/src/App.jsx` is the main route and global-state shell.

It owns:

- router setup
- theme state
- forced theme logic for immersive worlds
- current user session bootstrap
- admin session bootstrap
- mini-player queue and playback state
- route-level code splitting via `lazy(...)`

Major route groups:

- Public pages
  - home
  - collections index
  - collection detail
  - release detail
  - guided paths index
  - guided path detail
  - explore
  - about
  - account
- Admin pages
  - login
  - posts
  - collections
  - about
  - site
  - paths
  - insights
  - comments

### 6.2 Public Layout

`frontend/src/layouts/PublicLayout.jsx` renders the public header and public route outlet.

It handles:

- brand display
- nav links
- theme toggle
- account/sign-in links
- hidden admin access reveal

Hidden admin access behavior:

- repeated clicks on the site mark reveal admin access UI
- direct `/admin/login` access also works

### 6.3 Admin Layout

`frontend/src/layouts/AdminLayout.jsx` is the admin shell and data loader.

It owns:

- admin fetch helper with credentials
- session-expiration handling
- initial admin data fetch
  - posts
  - collections
  - site content
- admin-side editing state for post/collection/site forms

This layout acts as the shared data spine for admin pages.

### 6.4 Public Data Fetching

`frontend/src/hooks/usePublicApi.js` provides SWR-based public fetch hooks:

- `useSiteContent()`
- `usePublicPosts()`
- `usePublicCollections()`
- `usePublicCollection(slug)`
- `usePublicRelease(slug)`
- `useAboutContent()`

These hooks normalize empty/default structures so pages do not have to defend themselves against missing shapes repeatedly.

## 7. Public-Site Behavior

### 7.1 Homepage

The homepage uses:

- homepage content from site content
- curated releases
- collection browse framing
- identity/explanation copy

Homepage curation is not just “latest posts.” It is a curated public surface.

### 7.2 Release Pages

`frontend/src/pages/public/PublicReleasePage.jsx`

A release page can operate in one of several modes:

- standard release
- Fractureverse release
- Eldoria release

The page combines:

- release media
- excerpt and note content
- collection context
- related sequence navigation
- version-family relationships
- themed visual treatments
- comments

Important special behavior:

- Eldoria and Fractureverse releases can force dark theme
- immersive CSS variables drive visual atmosphere
- collection theme hints propagate up to the app shell

### 7.3 Collection Pages

`frontend/src/pages/public/CollectionDetailPage.jsx`

A collection page is not just a list of posts. It can act as:

- a normal collection shelf
- a world page
- a sequence navigator

Special logic exists for:

- Fractureverse sequencing
- Eldoria chronicle/timeline behavior
- featured release handling
- secondary-version handling
- themed world overlays and entry states

### 7.4 Guided Paths

Path resolution is implemented in:

- `frontend/src/lib/listeningPaths.js`

The resolver:

- normalizes configured paths
- resolves manual `postSlugs`
- resolves algorithm paths
- filters to public posts
- applies collection/status/section/theme/world rules
- sorts the resulting songs

Important path presets:

- `preset: "homepage"`
  - resolves through homepage-curated posts

### 7.5 Explore

`frontend/src/pages/public/ExplorePage.jsx`

Explore is the archive utility surface.

It supports:

- phrase search
- collection filtering
- release-status filtering
- deferred query updates
- direct release jumping through search results

### 7.6 About And Account

- About explains the site and artist framing
- Account handles public user identity, sign-in, and account management

Comments are tied to public user accounts rather than anonymous posting.

## 8. Admin-Site Behavior

### 8.1 Posts Workspace

Admin posts editing supports:

- create/update/delete
- bulk update
- archive metadata editing
- collection assignment
- release-status control
- homepage-eligibility control
- AI-assisted post suggestions

The post editor is catalog-first, not generic CMS-first.

### 8.2 Collections Workspace

Admin collections editing supports:

- collection metadata
- theme assignment
- featured release assignment
- public-primary control

### 8.3 Site Workspace

Site editing supports:

- branding
- homepage copy
- about content
- theme profile configuration

### 8.4 Paths Workspace

Admin paths has its own dedicated page and supports:

- editing path metadata
- switching between algorithm/manual logic
- visual manual song-order editing
- AI path suggestions
- AI new-path suggestions

Raw JSON still exists as an advanced fallback, but the main editing flow is visual.

### 8.5 Comments Workspace

Admin comments moderation supports:

- listing comments
- moderation state changes
- hide/restore flows

### 8.6 Insights Workspace

Admin insights aggregates:

- archive-health insights
- runtime health
- audit logs
- live-store sync tools
- AI assistant status
- remote AI pod/tunnel/Ollama controls

## 9. Backend Architecture

### 9.1 Route Layers

Main backend route files:

- `auth.routes.js`
- `public.routes.js`
- `admin.routes.js`
- `upload.routes.js`

Important public endpoints:

- `GET /api/posts`
- `GET /api/posts/:slug`
- `GET /api/posts/:slug/comments`
- `POST /api/posts/:slug/comments`
- `PUT /api/comments/:id`
- `DELETE /api/comments/:id`
- `GET /api/collections`
- `GET /api/collections/:slug`
- `GET /api/about`
- `GET /api/site-content`

Important auth endpoints:

- `POST /api/admin/login`
- `POST /api/admin/logout`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PUT /api/auth/me`

Important admin endpoints:

- posts CRUD
- collections CRUD
- site-content update routes
- insights
- audit logs
- comment moderation
- live-store sync
- assistant endpoints
- importer launcher

### 9.2 Service Layer

Major backend services include:

- `catalogService`
  - post/collection normalization
  - slug handling
  - reference remapping
- `siteContentService`
  - site-content normalization
- `archiveInsights`
  - archive health analysis
- `localAiService`
  - catalog review
  - post suggestions
  - guided-path suggestions
  - new guided-path suggestions
- `remoteOllamaService`
  - remote Ollama bootstrap/wake
- RunPod-related services
  - pod state
  - tunnel state
- `liveStoreSync`
  - compare and sync authored/live layers

## 10. Authentication And Security

Two auth systems exist:

- Admin session
  - cookie-backed
  - protected admin routes
- Public user session
  - for account and comments

Security-related behavior includes:

- password hashing
- JWT-backed sessions
- `helmet`
- rate limiting
- mutation-intent header protection
- comment ownership checks

Admin actions are additionally recorded into the audit trail.

## 11. AI Assistant System

### 11.1 Purpose

The assistant is an admin helper, not a freeform code-changing agent inside the website.

It is meant to:

- review catalog quality
- suggest post improvements
- suggest guided path improvements
- suggest new guided paths

It is intentionally non-destructive:

- it returns suggestions
- admin applies them explicitly
- it does not directly rewrite catalog files on suggestion

### 11.2 Assistant Guardrails

Important guardrails already in code:

- invalid JSON responses are repaired or rejected
- weak excerpt/content rewrites are filtered out
- no-op metadata patches are filtered out
- path suggestions can only use validated candidate slugs
- homepage-style path suggestions are now scoped to homepage-style candidates
- new path titles are cleared if they do not match the suggested path membership

### 11.3 Post Assistant

The post assistant looks at:

- current draft fields
- allowed collection slugs
- related/comparable posts

It returns:

- summary
- field assessments
- suggested patch
- rationale
- warnings

### 11.4 Path Assistant

The path assistant supports:

- patching an existing path
- proposing a new path

It treats:

- manual paths
- algorithm paths
- homepage-style paths

differently, with stronger candidate validation than before.

## 12. Remote AI Runtime

The site can use:

- local Ollama
- remote Ollama on RunPod

Remote workflow currently supports:

- start pod
- stop pod
- auto-discover SSH endpoint
- open SSH tunnel
- close SSH tunnel
- wake/bootstrap Ollama remotely
- reuse persistent model files from `/workspace/ollama-models`

Important operational reality:

- model files persist separately from the Ollama binary
- fresh pods may need Ollama installed again
- bootstrap now handles that flow automatically

## 13. Performance Notes

Recent important behavior:

- AI runtime is now more configurable through env values
- assistant status checks are lightly cached on healthy responses
- Eldoria release/collection pages no longer rerender the full React tree on every scroll or pointer movement

This matters because immersive pages were previously driving visible lag through hot-path React state updates.

## 14. Testing And Verification

Key verification commands:

- `npm run test:unit --prefix backend`
- `npm run test:api --prefix backend`
- `npm run verify --prefix backend`
- `npm run build --prefix frontend`

The backend tests cover:

- catalog normalization
- assistant logic
- API contracts
- remote AI control flows

## 15. How To Explain The Site To Someone Else

The simplest accurate explanation is:

1. The site is a music archive, not a generic blog.
2. Songs are stored as rich release records called posts.
3. Posts are grouped into collections and guided paths.
4. Some collections behave like immersive worlds with their own presentation logic.
5. The public site is for listening, browsing, and reading context.
6. The admin site is for managing the catalog, checking archive health, and using the assistant to draft improvements.
7. The AI assistant suggests changes but does not automatically rewrite the source of truth.
8. The backend supports both local and remote Ollama workflows for the admin assistant.

## 16. Related Documents

For deeper topic-specific reading, see:

- `docs/catalog-source-of-truth.md`
- `docs/local-admin-assistant.md`
- `docs/guided-listening-paths.md`
- `docs/admin-post-editor-v2.md`
- `docs/admin-catalog-tools.md`
- `docs/ops-monitoring-logging.md`
- `docs/operations-runbook.md`
- `docs/frontend-data-cache-layer.md`
- `docs/route-level-code-splitting.md`

