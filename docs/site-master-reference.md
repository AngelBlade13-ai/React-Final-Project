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
  - optional remote Thunder Compute + SSH tunnel + remote Ollama bootstrap flow

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
- remote AI instance/tunnel/Ollama controls

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
- `remoteAiService`
  - remote Ollama bootstrap/wake
- Thunder Compute-related services
  - instance state
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
- remote Ollama on Thunder Compute

Remote workflow currently supports:

- start instance
- stop instance
- auto-discover SSH endpoint
- open SSH tunnel
- close SSH tunnel
- wake/bootstrap Ollama remotely
- reuse persistent model files from `/home/ubuntu/ollama-models`

Important operational reality:

- model files persist separately from the Ollama binary
- fresh instances may need Ollama installed again
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

## 17. Field-By-Field Entity Reference

This section is for explaining the exact meaning of the core fields point by point.

### 17.1 Post Fields

- `id`
  - internal unique identifier
  - used for admin updates, deletes, and store persistence
- `title`
  - the human-facing song or release name
  - shown on cards, public pages, admin tables, search results, and path listings
- `slug`
  - stable public route key
  - powers `/release/:slug`
  - can be redirected through slug-history logic if renamed
- `videoUrl`
  - media playback URL
  - used by release pages and the mini player
- `excerpt`
  - short public-facing summary
  - powers release cards and hero summaries
- `content`
  - longer release-note body
  - usually more structured and editorial than a normal blog body
- `lyrics`
  - optional lyrics text
  - shown on release pages when present
- `createdAt`
  - chronology anchor
  - affects ordering and curation
- `published`
  - whether the record is intended to be publicly live
- `collectionSlugs`
  - collection memberships
  - determine where the release appears across collection pages and some paths
- `subCategory`
  - editorial category such as identity, villain, princess motif, etc.
- `sourceTag`
  - author/editor source context
- `worldLayer`
  - world or thematic layer
  - used by immersive worlds and path logic
- `themeTags`
  - multi-tag thematic descriptors
  - used by paths, discovery, and assistant logic
- `versionFamily`
  - groups related versions of the same conceptual song
- `isPrimaryVersion`
  - marks the primary version within a family
- `isArchive`
  - indicates archive/alternate treatment
- `isHomepageEligible`
  - lets the song enter homepage-style curated pools
- `isPubliclyVisible`
  - final public visibility gate
- `releaseStatus`
  - one of:
    - `canon`
    - `alternate`
    - `working`
- `supersededBySlug`
  - points at the version that replaced this one
- `supersededReason`
  - explains why it was displaced
- `supersededAt`
  - timestamp for supersession
- `archiveMeta`
  - immersive world metadata bag

### 17.2 `archiveMeta` Fields

Fractureverse-oriented fields:

- `fragmentId`
- `state`
- `perspective`
- `signalType`
- `description`
- `systemNote`
- `linkedSlugs`

Eldoria-oriented fields:

- `chapterNumber`
- `entryType`
- `subtitle`
- `openingPassage`
- `coreSituation`
- `coreTension`
- `chronicleObservation`
- `chronicleContradiction`
- `chronicleConclusion`
- `emotionalState`
- `coreConflict`
- `risk`
- `anchorQuote`
- `resolution`
- `entryStatus`
- `playerFlavorLine`

These fields drive:

- themed labels
- sequence rendering
- world timelines
- immersive copy blocks
- relationship panels

### 17.3 Collection Fields

- `id`
  - internal identifier
- `slug`
  - public route key for `/collections/:slug`
- `title`
  - display name
- `description`
  - collection summary copy
- `featuredReleaseSlug`
  - controls which release is spotlighted first
- `theme`
  - determines whether the collection behaves like:
    - a standard shelf
    - a themed shelf
    - an immersive world
- `isPublicPrimary`
  - marks public-first collections that should be emphasized in browse surfaces

### 17.4 Guided Path Fields

- `slug`
  - public route key for `/paths/:slug`
- `title`
  - public path name
- `eyebrow`
  - framing label
- `intro`
  - explanation of the path
- `moodNote`
  - fast listening-orientation note
- `themeHint`
  - lightweight thematic hint
- `postSlugs`
  - manual ordered sequence
- `algorithm`
  - dynamic path rules

### 17.5 Guided Path Algorithm Fields

- `preset`
  - special predefined logic like `homepage`
- `collectionSlug`
  - single collection scope
- `collectionSlugs`
  - multi-collection scope
- `sectionKeys`
  - category/subcategory scope
- `themeTags`
  - tag scope
- `worldLayers`
  - world-layer scope
- `releaseStatuses`
  - canon/alternate/working filter
- `match`
  - `any` or `all`
- `maxItems`
  - result-size cap
- `sort`
  - `curated`, `fractureverse`, or `eldoria`

## 18. Page-By-Page Frontend Reference

### 18.1 App Shell

File:

- `frontend/src/App.jsx`

What it owns:

- route registration
- route-level lazy loading
- theme state
- forced theme state for immersive pages
- current public-user session bootstrap
- admin session bootstrap
- mini-player queue, progress, and playback state
- site metadata provider

How it fits:

- this is the single global frontend shell
- public and admin layouts both live under it

### 18.2 Public Layout

File:

- `frontend/src/layouts/PublicLayout.jsx`

What it does:

- renders header, nav, theme toggle, sign-in/account links
- handles hidden admin-access reveal
- hosts public routes through `Outlet`

### 18.3 Admin Layout

File:

- `frontend/src/layouts/AdminLayout.jsx`

What it does:

- creates authenticated `adminFetch`
- handles admin-session expiry
- loads:
  - posts
  - collections
  - site content
- stores shared admin editing state
- powers all admin child pages

### 18.4 Public Home

File:

- `frontend/src/pages/public/PublicHome.jsx`

What it does:

- presents site identity
- highlights curated public entry points
- points people to collections, paths, and explore

### 18.5 Collections Index

File:

- `frontend/src/pages/public/CollectionsIndexPage.jsx`

What it does:

- lists public collections
- separates more public-primary collection surfaces from internal/supporting ones

### 18.6 Collection Detail

File:

- `frontend/src/pages/public/CollectionDetailPage.jsx`

What it does:

- loads one collection and its releases
- resolves redirect slugs
- determines whether the collection is:
  - standard
  - Fractureverse
  - Eldoria
- computes featured release, timeline, and alternate/secondary relationships
- applies immersive visual rules for themed collections

### 18.7 Release Detail

File:

- `frontend/src/pages/public/PublicReleasePage.jsx`

What it does:

- loads one release
- resolves redirect slugs
- renders playback media
- renders release framing and collection context
- renders sequence navigation
- renders version-family context
- renders comments

### 18.8 Guided Paths Index

File:

- `frontend/src/pages/public/GuidedPathsIndexPage.jsx`

What it does:

- lists available guided listening routes

### 18.9 Guided Path Detail

File:

- `frontend/src/pages/public/GuidedPathPage.jsx`

What it does:

- resolves a path into songs
- presents the resolved route to the user

### 18.10 Explore

File:

- `frontend/src/pages/public/ExplorePage.jsx`

What it does:

- utility retrieval surface
- supports:
  - search phrase
  - collection filter
  - release-status filter
  - URL-backed search state

### 18.11 About

File:

- `frontend/src/pages/public/AboutPage.jsx`

What it does:

- explains the artist/site framing outside song-specific content

### 18.12 Account

File:

- `frontend/src/pages/public/AccountPage.jsx`

What it does:

- registration
- login
- profile update
- sign-out

### 18.13 Admin Login

File:

- `frontend/src/pages/admin/AdminLogin.jsx`

What it does:

- starts the admin-auth flow

### 18.14 Admin Posts

File:

- `frontend/src/pages/admin/AdminPostsPage.jsx`

What it does:

- create/edit/delete release records
- assign collections
- edit metadata
- trigger AI post assistant

### 18.15 Admin Collections

File:

- `frontend/src/pages/admin/AdminCollectionsPage.jsx`

What it does:

- create/edit/delete collections
- assign themes
- set featured release

### 18.16 Admin About

File:

- `frontend/src/pages/admin/AdminAboutPage.jsx`

What it does:

- edit about-page content

### 18.17 Admin Site

File:

- `frontend/src/pages/admin/AdminSitePage.jsx`

What it does:

- edit site-wide framing content
- edit theme profiles

### 18.18 Admin Paths

File:

- `frontend/src/pages/admin/AdminPathsPage.jsx`

What it does:

- manage guided paths as real admin objects
- edit manual order
- edit algorithm rules
- trigger AI path patching
- trigger AI new-path creation

### 18.19 Admin Insights

File:

- `frontend/src/pages/admin/AdminInsightsPage.jsx`

What it does:

- shows archive health
- shows operational health
- shows audit logs
- controls assistant, remote instance, tunnel, and remote Ollama
- hosts live-store sync tools

### 18.20 Admin Comments

File:

- `frontend/src/pages/admin/AdminCommentsPage.jsx`

What it does:

- moderates user comments

## 19. Route-By-Route Backend Reference

### 19.1 Public Routes

File:

- `backend/src/routes/public.routes.js`

#### `GET /api/posts`

What it does:

- reads the store
- filters to publicly visible posts
- attaches collection details
- returns public release records

Used by:

- homepage
- explore
- public lists
- guided path resolution surfaces

#### `GET /api/posts/:slug`

What it does:

- resolves the post
- honors redirect slug logic
- returns public release payload

Used by:

- release pages

#### `GET /api/posts/:slug/comments`

What it does:

- resolves release
- filters visible comments
- sorts them by creation time

Used by:

- release-page comments section

#### `POST /api/posts/:slug/comments`

What it does:

- requires logged-in non-admin user
- validates comment body
- inserts public comment

#### `PUT /api/comments/:id`

What it does:

- requires ownership/permission
- validates comment update
- replaces comment

#### `DELETE /api/comments/:id`

What it does:

- requires ownership/permission
- deletes comment

#### `GET /api/collections`

What it does:

- returns public collections
- can honor scope query behavior

#### `GET /api/collections/:slug`

What it does:

- resolves collection by slug with redirect support
- loads public releases in that collection
- returns collection summary plus releases

#### `GET /api/about`

What it does:

- returns about-page content

#### `GET /api/site-content`

What it does:

- returns public branding/home/theme/path configuration

### 19.2 Auth Routes

File:

- `backend/src/routes/auth.routes.js`

#### `POST /api/admin/login`

What it does:

- validates configured admin credentials
- clears user cookie
- issues admin cookie
- records audit event

#### `POST /api/auth/register`

What it does:

- validates public-user registration
- hashes password
- inserts user
- issues user cookie

#### `POST /api/auth/login`

What it does:

- validates user credentials
- issues user cookie

#### `POST /api/auth/logout`

What it does:

- clears user session cookie

#### `POST /api/admin/logout`

What it does:

- clears admin session cookie

#### `GET /api/auth/me`

What it does:

- returns current public user
- rejects admin session use for this route

#### `PUT /api/auth/me`

What it does:

- updates display name and optionally password
- reissues user cookie

### 19.3 Admin Routes

File:

- `backend/src/routes/admin.routes.js`

All admin routes are protected by `requireAdmin`.

#### Session And Audit

- `GET /api/admin/session`
- `GET /api/admin/audit-logs`

#### Posts

- `GET /api/admin/posts`
- `POST /api/admin/posts`
- `POST /api/admin/posts/bulk-update`
- `PUT /api/admin/posts/:id`
- `DELETE /api/admin/posts/:id`

These routes handle:

- creation
- edit
- delete
- bulk edit
- slug remapping
- collection reconciliation
- audit logging

#### Collections

- `GET /api/admin/collections`
- `POST /api/admin/collections`
- `PUT /api/admin/collections/:id`
- `DELETE /api/admin/collections/:id`

These routes handle:

- collection CRUD
- featured-release validation
- collection relationship safety

#### Site Content

- `GET /api/admin/site-content`
- `PUT /api/admin/site-content/about`
- `PUT /api/admin/site-content/site`

These routes handle:

- branding
- homepage copy
- about content
- theme profiles
- guided paths

#### Insights And Assistant

- `GET /api/admin/insights`
- `GET /api/admin/assistant/status`
- `POST /api/admin/assistant/remote-tunnel/start`
- `POST /api/admin/assistant/remote-tunnel/stop`
- `POST /api/admin/assistant/remote-tunnel/start`
- `POST /api/admin/assistant/remote-tunnel/stop`
- `POST /api/admin/assistant/remote-ollama/wake`
- `POST /api/admin/assistant/catalog-review`
- `POST /api/admin/assistant/post-suggestions`
- `POST /api/admin/assistant/guided-path-suggestions`
- `POST /api/admin/assistant/guided-path-new-suggestion`

#### Importer

- `POST /api/admin/importer/launch`

#### Live Store / Source Of Truth

- `GET /api/admin/live-store-sync`
- `POST /api/admin/live-store-sync`
- admin reseed endpoints

#### Comments

- `GET /api/admin/comments`
- `PUT /api/admin/comments/:id`

### 19.4 Upload Routes

File:

- `backend/src/routes/upload.routes.js`

Purpose:

- support admin-side media upload flow

## 20. End-To-End Data Flow

### 20.1 Public Page Load Flow

1. Browser loads the SPA shell.
2. `App.jsx` initializes theme, sessions, and routes.
3. Public page uses SWR hook from `usePublicApi.js`.
4. Hook requests a public API endpoint.
5. Express route reads the store.
6. Catalog/site services normalize and filter data.
7. JSON returns to the browser.
8. Public page renders normalized results.

### 20.2 Admin Page Load Flow

1. Admin route is opened.
2. Admin session is validated.
3. `AdminLayout` loads posts, collections, and site content.
4. Child pages read shared admin context/state.
5. Save actions call admin endpoints through authenticated `adminFetch`.

### 20.3 Post Save Flow

1. Admin edits a post draft.
2. Frontend submits to admin route.
3. Backend normalizes post input.
4. Backend validates the draft.
5. Backend checks slug and reference constraints.
6. Store writes the updated post.
7. Related references and collections reconcile if needed.
8. Audit event is recorded.
9. Updated post returns to frontend.

### 20.4 Guided Path Resolution Flow

1. Guided paths are loaded from site content.
2. Path config is normalized.
3. Resolver chooses:
   - manual `postSlugs`, or
   - algorithm logic
4. Resolver filters to public posts.
5. Resolver applies collection/status/theme/world rules.
6. Resolver sorts and caps results.
7. Public path page renders resolved posts.

### 20.5 Assistant Suggestion Flow

1. Admin presses an assistant action.
2. Frontend calls an assistant endpoint.
3. Backend checks assistant availability.
4. Backend builds scoped context for the task.
5. Backend asks the model for strict JSON.
6. Backend repairs/parses JSON if possible.
7. Backend filters weak, invalid, repetitive, or unsafe patches.
8. Suggestion returns to the UI.
9. Admin explicitly applies or ignores it.

### 20.6 Remote AI Cold-Start Flow

1. Admin starts remote instance.
2. Backend calls Thunder Compute API.
3. Admin opens SSH tunnel.
4. Backend discovers live SSH endpoint and starts the tunnel.
5. Admin wakes remote Ollama.
6. Backend sends bootstrap script over SSH.
7. Remote bootstrap installs Ollama if missing.
8. Bootstrap points Ollama at `/home/ubuntu/ollama-models`.
9. Bootstrap starts `ollama serve`.
10. Backend confirms `/api/tags`.
11. Assistant becomes usable.

## 21. How The Themed Worlds Fit Together

### 21.1 Fractureverse

Fractureverse relies on:

- collection membership
- canon-first sequence logic
- fragment-oriented archive metadata
- custom world sort and relationship logic

### 21.2 Eldoria

Eldoria relies on:

- collection membership
- chapter-style archive metadata
- themed presentation logic
- chronicle/map/timeline framing

### 21.3 Why This Matters

Themed worlds are not separate products. They are specialized interpretations of the same core post and collection model.

## 22. How To Explain The AI Layer To Someone Else

If someone asks what the AI does, the precise answer is:

- it is admin-side only
- it reads structured context prepared by the backend
- it returns structured JSON suggestions
- the backend validates and filters those suggestions
- an admin still decides whether to apply them

So the AI is:

- editorial aid
- curation aid
- path-planning aid

It is not:

- autonomous publishing
- autonomous catalog rewriting

## 23. Operational Reality And Failure Modes

### 23.1 Public Data Looks Wrong

Likely causes:

- live DB drift
- authored/live source-of-truth mismatch
- visibility or release-status changes

### 23.2 Admin Save Fails

Likely causes:

- validation rejection
- slug conflict
- session/auth issue
- persistence failure

### 23.3 Assistant Fails

Likely causes:

- Ollama unavailable
- model missing
- tunnel missing
- remote tunnel stopped
- invalid model JSON output
- backend normalization dropped all proposed changes

### 23.4 Site Feels Slow

Likely causes:

- immersive page effects
- admin data-request fan-out
- remote AI cold-start time
- first inference model load time

## 24. Practical Talking Script

If you need to explain the site point for point:

1. The site is a music archive, not a generic blog.
2. The main content unit is a release record called a post.
3. Posts carry music, notes, metadata, and world context.
4. Collections group posts into shelves or immersive worlds.
5. Guided paths create curated or algorithmic routes through the catalog.
6. The public site is the listening and discovery surface.
7. The admin site is the authoring and operations surface.
8. MongoDB stores the live state.
9. Local catalog files support the authored source-of-truth workflow.
10. The AI assistant helps review and suggest, but does not publish automatically.
11. Remote AI support exists so the assistant can run on stronger hardware than the local laptop.
12. Everything fits together as one archive with multiple surfaces, not as unrelated pages.
