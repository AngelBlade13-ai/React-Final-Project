# Suno Diary Portfolio Technical Explanation

## 1. Executive Summary

Suno Diary is a full-stack personal music archive for Suno-generated songs. The public site presents songs as release pages, browsable collections, story/world archives, guided listening paths, search/explore surfaces, account libraries, public listener profiles, threaded comments, reports, reactions, and a persistent mini-player. The admin side is a private studio for maintaining the archive: posts, collections, homepage/about/site settings, guided paths, comments, users, operational health, JSON reseeding/sync, local importer launch, and AI-assisted catalog review.

The problem it solves is catalog drift. A growing AI-song library is not just a list of files; each song needs stable metadata, media URLs, lyrics, story/world context, versions, collection membership, public visibility, and safe ways to import new material. This project gives the archive a public listening experience and a maintenance workflow.

Primary users:

- Public visitors who browse, read, search, save, react to, comment on, and play releases.
- The site owner/admin who curates songs, world collections, guided paths, media, and catalog quality.
- Developers/instructors/interviewers reviewing a full-stack portfolio project with real data flows.

This is more than a basic CRUD app because it includes media hosting, MongoDB persistence, authored JSON seed files, public/private role separation, JWT cookie sessions, account libraries, threaded community features, comment reporting/moderation, operational audit logs, catalog reseeding, live-store-to-file sync, a separate Python import pipeline, Cloudinary upload, AI-assisted review through Ollama, and optional Thunder Compute GPU runtime support.

## 2. Tech Stack

React and Vite power the frontend in `frontend/`. React 19 builds the UI, React Router 7 handles public and admin routes, SWR handles public API caching in [usePublicApi.js](../frontend/src/hooks/usePublicApi.js), and Vite builds/dev-serves the app. `frontend/vite.config.js` allows tunnel/dev hosts through `server.allowedHosts = true`.

Express powers the backend in `backend/`. [app.js](../backend/src/app.js) mounts public, auth, upload, and admin route modules under `/api`. It uses `helmet`, `cors`, `cookie-parser`, JSON parsing, request context logging, and mutation-protection middleware.

MongoDB is the live datastore. [mongo.js](../backend/src/lib/mongo.js) connects using the official `mongodb` driver, creates the database handle, supports Atlas SRV fallback, and provides transaction fallback for standalone MongoDB. [store.js](../backend/src/data/store.js) normalizes and reads/writes posts, collections, users, comments, site content, and admin audit logs.

JSON seed/store files are the authored catalog layer. The backend defaults `POSTS_FILE` to `backend/data/posts.local.json` in [config.js](../backend/src/config.js). `backend/data/posts.template.json` is the tracked safe template. `backend/data/operational-seed.local.json` can seed operational data like users/comments. Backups such as `posts.local.json.backup.*.json` are local safety snapshots.

Cloudinary stores media. Backend video upload uses [upload.routes.js](../backend/src/routes/upload.routes.js), `multer`, [uploadVideoToCloudinary.js](../backend/src/services/uploadVideoToCloudinary.js), `cloudinary`, and `streamifier`. Avatar upload uses [uploadAvatarToCloudinary.js](../backend/src/services/uploadAvatarToCloudinary.js). The Python importer can also upload video and cover images through `cloudinary.uploader` in [uploader.py](../tools/song-importer/src/uploader.py).

The Python importer tool lives in `tools/song-importer/`. It normalizes new song JSON, detects duplicates, optionally uploads media, maps songs to website post schema, writes review artifacts, can apply changes to the website catalog, and can run reseed. CLI entry is [main.py](../tools/song-importer/main.py). Shared pipeline is [pipeline.py](../tools/song-importer/src/pipeline.py).

Flask importer UI is present. [web_app.py](../tools/song-importer/src/web_app.py) creates a local Flask app with `/`, `/api/process`, `/api/apply`, and `/api/apply/jobs/<job_id>`. It supports paste-JSON, media file upload, preview, apply, background reseed, and verification.

Ollama powers the admin AI assistant. [localAiService.js](../backend/src/services/localAiService.js) checks `/api/tags`, calls `/api/generate`, builds JSON-only prompts, validates returned structures, and exposes catalog review, post suggestions, guided path suggestions, and finding decisions.

Thunder Compute is optional remote GPU infrastructure for Ollama. The app does not manage the Thunder instance lifecycle; the current production-friendly mode points `LOCAL_AI_BASE_URL` at a Thunder forwarded Ollama URL. `backend/src/services/remoteAiService.js` still supports a manual SSH tunnel and `nohup` wake workflow for local/operator use when `REMOTE_AI_ENABLED=true`.

Deployment setup is present in `README.md`: frontend on Vercel, backend on Render, MongoDB as the database, and Cloudinary as media hosting. The README lists a live frontend `https://react-final-project-seven-sigma.vercel.app` and backend `https://react-final-project-cnk7.onrender.com`.

Authentication/session packages include `bcryptjs` for password hashing, `jsonwebtoken` for JWTs, `cookie-parser` for reading cookies, and Express middleware in [auth.js](../backend/src/middleware/auth.js). Cookies are configured in [sessionCookieService.js](../backend/src/services/sessionCookieService.js).

Important npm packages:

- Backend: `express`, `mongodb`, `bcryptjs`, `jsonwebtoken`, `cookie-parser`, `cors`, `helmet`, `express-rate-limit`, `multer`, `cloudinary`, `streamifier`, `dotenv`.
- Frontend: `react`, `react-dom`, `react-router-dom`, `swr`.
- Testing/dev: `vitest`, `node --test`, `supertest`, `mongodb-memory-server`, `playwright`, `eslint`, `prettier`.

Important Python packages:

- `Flask` for browser importer UI.
- `cloudinary` for media upload.
- `python-slugify` for slug normalization.
- `python-dotenv` for importer env loading.
- `pytest` for importer tests.

## 3. High-Level Architecture

Plain English: the React app is the user interface. It calls the Express API. Express reads/writes MongoDB through a normalized store layer. On first startup or reseed, the backend can load authored catalog data from the posts JSON file. Media files are uploaded once to Cloudinary, and the database stores Cloudinary URLs. The browser streams those URLs directly from Cloudinary.

```text
Public React app
  -> VITE_API_URL /api
  -> Express routes
  -> MongoDB live store
  -> normalized posts/collections/siteContent
  -> post.videoUrl points to Cloudinary
  -> release pages and mini-player stream from Cloudinary CDN
```

Public media flow:

```text
Frontend React app
  -> Express API
  -> MongoDB live store
  -> posts JSON seed/source file when reseeding
  -> Cloudinary media URLs
  -> public mini-player/release pages
```

Importer flow:

```text
Python importer
  -> optional Cloudinary upload
  -> website-ready post JSON
  -> apply into posts.local.json target
  -> npm run reseed
  -> MongoDB live store
  -> public site sees new release
```

Admin AI flow:

```text
Admin UI
  -> /api/admin/assistant/*
  -> localAiService builds compact JSON prompt
  -> Ollama at LOCAL_AI_BASE_URL
  -> local machine, Thunder forwarded URL, or Thunder through SSH tunnel
  -> structured suggestions/findings
  -> admin reviews before applying anything
```

## 4. Public Website Features

Homepage: [PublicHome.jsx](../frontend/src/pages/public/PublicHome.jsx) shows the public landing surface, featured release, curated releases, and links into collections/explore. Data comes from `GET /api/site-content` and `GET /api/posts` through `useSiteContent()` and `usePublicPosts()`. Curation helpers live in [site.js](../frontend/src/lib/site.js), especially `getHomepageCuratedPosts`, `collapsePostsByVersionFamily`, and release-status filtering. It exists to give first-time visitors a guided entry instead of a raw database list.

Collections: [CollectionsIndexPage.jsx](../frontend/src/pages/public/CollectionsIndexPage.jsx) uses `GET /api/collections`. [CollectionDetailPage.jsx](../frontend/src/pages/public/CollectionDetailPage.jsx) uses `GET /api/collections/:slug`, displays releases in a collection, and sets world themes through `setActiveCollectionTheme`/`setForcedTheme`. Backend resolution is in [public.routes.js](../backend/src/routes/public.routes.js), using `listPublicCollections`, `resolveCollectionBySlug`, and `buildCollectionSummary` from [catalogService.js](../backend/src/services/catalogService.js).

Listening/guided paths: [GuidedPathsIndexPage.jsx](../frontend/src/pages/public/GuidedPathsIndexPage.jsx) and [GuidedPathPage.jsx](../frontend/src/pages/public/GuidedPathPage.jsx) use `siteContent.guidedPaths` plus helpers in [listeningPaths.js](../frontend/src/lib/listeningPaths.js). A guided path contains `postSlugs` for manual ordering and/or `algorithm` rules such as `preset`, `collectionSlug`, `collectionSlugs`, `sectionKeys`, `themeTags`, `worldLayers`, `releaseStatuses`, `sort`, `match`, and `maxItems`. It exists to make the archive approachable by mood/story route.

Explore/search: [ExplorePage.jsx](../frontend/src/pages/public/ExplorePage.jsx) uses public posts and frontend filtering/sorting helpers. Visitors see searchable releases, collection/category signals, and play/open actions. Data comes from `GET /api/posts`, which only returns public visible posts. Search text is kept in component state while typing, then written to URL query params on blur/Enter so the input does not lose focus after every character. [RouteAnnouncer.jsx](../frontend/src/components/RouteAnnouncer.jsx) only scrolls to top on path changes, not query-string updates, so search-result clicks do not jump the page back to the top.

Release/song pages: [PublicReleasePage.jsx](../frontend/src/pages/public/PublicReleasePage.jsx) uses `GET /api/posts/:slug`. Visitors see title, metadata, lyrics/content, collection links, comments, save/reaction controls for signed-in users, and playback controls. `redirectSlug` supports old slug handling when slug history exists. Media display is handled by [ReleaseMedia.jsx](../frontend/src/components/ReleaseMedia.jsx), and Cloudinary poster derivation is in `getVideoPosterUrl()` in [site.js](../frontend/src/lib/site.js).

Mini-player: [MiniPlayer.jsx](../frontend/src/components/MiniPlayer.jsx) is always mounted in [App.jsx](../frontend/src/App.jsx). App-level state stores `playerQueue`, `currentQueueIndex`, progress, duration, volume, and play state. A hidden `<video>` element acts as the media element, even for audio-like playback, and receives `currentTrack.videoUrl`. When a signed-in user plays a track, App posts to `POST /api/auth/library/releases/:slug/listen`.

Account/profile: [AccountPage.jsx](../frontend/src/pages/public/AccountPage.jsx) loads `GET /api/auth/library`, updates profile through `PUT /api/auth/me`, uploads avatars through `POST /api/auth/me/avatar`, and shows saved/recent releases/reactions. Public listener profiles are served by [PublicProfilePage.jsx](../frontend/src/pages/public/PublicProfilePage.jsx) at `/users/:id`, powered by `GET /api/users/:id/profile`. The public profile intentionally exposes display name, avatar, role label, visible comment count, and recent visible comments, not email or library data. Auth state is owned by [App.jsx](../frontend/src/App.jsx), which calls `GET /api/auth/me` on load.

Saved songs/recently played: Backend user documents store `savedReleaseSlugs`, `recentReleaseSlugs`, and `releaseReactions`. Routes live in [auth.routes.js](../backend/src/routes/auth.routes.js): `GET /auth/library`, `PUT /auth/library/releases/:slug/save`, `PUT /auth/library/releases/:slug/reaction`, and `POST /auth/library/releases/:slug/listen`.

Comments/reactions: [CommentsSection.jsx](../frontend/src/components/CommentsSection.jsx) calls `GET /api/posts/:slug/comments`, `POST /api/posts/:slug/comments`, `PUT /api/comments/:id`, `DELETE /api/comments/:id`, and `POST /api/comments/:id/report`. Backend comments have `id`, `postSlug`, `parentCommentId`, `authorId`, `body`, `status`, private `reports`, and timestamps. The public UI renders author avatars, links usernames to `/users/:id`, nests replies through `parentCommentId`, lets owners edit/delete their own comments, and lets signed-in non-owners report comments. Public responses sanitize report details so reporter identities and moderation data are not exposed. Reactions are user-library metadata, not global reaction counts.

Theme toggle/light-dark mode: [ThemeToggle.jsx](../frontend/src/components/ThemeToggle.jsx), [PublicLayout.jsx](../frontend/src/layouts/PublicLayout.jsx), and [App.jsx](../frontend/src/App.jsx) manage `suno-blog-theme` in localStorage and set `data-theme` on the root. Theme CSS variables come from site content collection theme profiles through `getThemeCssVariables()`.

World-specific pages/styling: Eldoria and Fractureverse are implemented as collection themes and metadata-aware UI, not as separate backend resource types. [EldoriaWorldMap.jsx](../frontend/src/components/EldoriaWorldMap.jsx), [EldoriaSigil.jsx](../frontend/src/components/EldoriaSigil.jsx), `getEldoriaMeta`, `getFractureverseMeta`, `sortEldoriaPosts`, and `sortFractureversePosts` in [site.js](../frontend/src/lib/site.js) power world-specific presentation. CSS lives in `frontend/src/styles/collection-worlds.css` and `world-restraint.css`.

## 5. Admin Studio Features

All admin API routes are mounted under `/api/admin` and protected by `requireAdmin` in [admin.routes.js](../backend/src/routes/admin.routes.js). The admin UI uses [AdminLayout.jsx](../frontend/src/layouts/AdminLayout.jsx), which includes shared loaders, forms, `adminFetch`, upload handling, and admin navigation.

Admin login/authentication: the visible login page is [LoginPage.jsx](../frontend/src/pages/public/LoginPage.jsx), using `POST /api/auth/login` or `POST /api/auth/register`. Admin credentials can also use `POST /api/admin/login`. Admin access is determined by `currentUser.role === "admin"` in [App.jsx](../frontend/src/App.jsx). `/admin/*` routes are wrapped in `ProtectedRoute`.

Posts editor: [AdminPostsPage.jsx](../frontend/src/pages/admin/AdminPostsPage.jsx) works with shared AdminLayout post state. Routes: `GET /api/admin/posts`, `POST /api/admin/posts`, `PUT /api/admin/posts/:id`, `DELETE /api/admin/posts/:id`, and `POST /api/admin/posts/bulk-update`. It changes MongoDB `posts`. Slug changes append `slugHistory`, rename comments for the post slug, and remap collection/site references.

Collections editor: [AdminCollectionsPage.jsx](../frontend/src/pages/admin/AdminCollectionsPage.jsx) uses `GET /api/admin/collections`, `POST /api/admin/collections`, `PUT /api/admin/collections/:id`, and `DELETE /api/admin/collections/:id`. It changes MongoDB `collections` and validates featured release references.

Site content/about/home settings: [AdminAboutPage.jsx](../frontend/src/pages/admin/AdminAboutPage.jsx) uses `PUT /api/admin/site-content/about`. [AdminSitePage.jsx](../frontend/src/pages/admin/AdminSitePage.jsx) uses `PUT /api/admin/site-content/site`. Data changes the `siteContent` MongoDB document, including `branding`, `home`, `collectionThemes`, and `guidedPaths`.

Guided paths editor: [AdminPathsPage.jsx](../frontend/src/pages/admin/AdminPathsPage.jsx) edits `siteContent.guidedPaths` and uses `PUT /api/admin/site-content/site` to save. It can call `POST /api/admin/assistant/guided-path-suggestions` and `POST /api/admin/assistant/guided-path-new-suggestion`.

Insights/dashboard: [AdminInsightsPage.jsx](../frontend/src/pages/admin/AdminInsightsPage.jsx) calls `GET /api/admin/insights`. [archiveInsights.js](../backend/src/services/archiveInsights.js) calculates archive health, video/lyrics/world metadata coverage, featured-release issues, theme coverage, collection health, recent activity, and quick wins.

Comments moderation: [AdminCommentsPage.jsx](../frontend/src/pages/admin/AdminCommentsPage.jsx) calls `GET /api/admin/comments`, `PUT /api/admin/comments/:id`, and `DELETE /api/admin/comments/:id`. It searches comments by release/author/text, filters visible/hidden/reported items, shows commenter avatars/profile links, displays report reasons/details for moderators, changes comment `status` between `visible` and `hidden`, and can delete comments.

Users management: [AdminUsersPage.jsx](../frontend/src/pages/admin/AdminUsersPage.jsx) calls `GET /api/admin/users`, `PUT /api/admin/users/:id`, and `DELETE /api/admin/users/:id`. Backend prevents deleting your own signed-in admin and requires demoting admin users before deletion.

Live store sync: [AdminSystemPage.jsx](../frontend/src/pages/admin/AdminSystemPage.jsx) calls `GET /api/admin/live-store-sync` for preview and `POST /api/admin/live-store-sync` to write the live Mongo authored catalog back to the configured posts file. Backend implementation is [liveStoreSync.js](../backend/src/services/liveStoreSync.js).

Reseed from posts file: [AdminSystemPage.jsx](../frontend/src/pages/admin/AdminSystemPage.jsx) calls `POST /api/admin/reseed-live-site`, then polls `GET /api/admin/reseed-live-site/jobs/:jobId`. Backend job orchestration is [reseedLiveSiteService.js](../backend/src/services/reseedLiveSiteService.js), which runs `npm run reseed` in `backend/`.

Importer launcher: AdminLayout calls `POST /api/admin/importer/launch`. [importerLauncherService.js](../backend/src/services/importerLauncherService.js) checks if `IMPORTER_URL` is reachable, otherwise starts `tools/song-importer/main.py --web --website-root <root> --website-posts <config.postsFile> --port <port> --no-browser`.

AI assistant panel/status/actions: [AdminAiRuntimePage.jsx](../frontend/src/pages/admin/AdminAiRuntimePage.jsx), [AdminPostsPage.jsx](../frontend/src/pages/admin/AdminPostsPage.jsx), and [AdminPathsPage.jsx](../frontend/src/pages/admin/AdminPathsPage.jsx) call assistant routes. Status: `GET /api/admin/assistant/status`. Runtime controls are Thunder/manual SSH helpers only when `REMOTE_AI_ENABLED=true`; in forwarded-URL mode, `LOCAL_AI_BASE_URL` points directly at Thunder and the SSH controls are intentionally disabled. Suggestions: catalog review, catalog finding review/dismiss, post suggestions, guided path suggestions, and new guided path suggestions.

Protection against accidental changes:

- `requireAdmin` protects admin routes.
- `requireTrustedMutation` blocks unsafe POST/PUT/PATCH/DELETE unless the request has `X-Suno-Intent: ui` or a bearer token.
- Reseed and live-store file mutation routes require `ENABLE_CATALOG_FILE_MUTATIONS` in production-like environments through `requireCatalogFileMutationsEnabled`.
- Admin audit logs are recorded for mutations through [adminAuditService.js](../backend/src/services/adminAuditService.js).
- Importer apply creates backups before writing catalog files.
- Live store sync creates backups before overwriting the posts file.

## 6. Data Model

Core data is normalized in [store.js](../backend/src/data/store.js). MongoDB collections are `posts`, `collections`, `users`, `comments`, `siteContent`, and `adminAuditLogs`.

Post/song object example:

```json
{
  "id": "heaven-wakes-in-me",
  "title": "Heaven Wakes in Me",
  "slug": "heaven-wakes-in-me",
  "slugHistory": [],
  "videoUrl": "https://res.cloudinary.com/.../video/upload/...mp4",
  "excerpt": "Short public card copy.",
  "content": "Release note or story context.",
  "lyrics": "Full lyrics",
  "createdAt": "2026-05-26T00:00:00.000Z",
  "published": true,
  "collectionSlugs": ["original-personal"],
  "versionFamily": "heaven-wakes-in-me",
  "releaseStatus": "canon",
  "isPrimaryVersion": true,
  "isArchive": false,
  "isHomepageEligible": true,
  "isPubliclyVisible": true,
  "subCategory": "identity",
  "sourceTag": "suno",
  "worldLayer": "core",
  "themeTags": ["identity", "awakening"],
  "archiveMeta": null
}
```

Important post fields:

- `title`: display name.
- `slug`: stable URL key used by `/release/:slug` and `/api/posts/:slug`.
- `slugHistory`: previous slugs for redirects.
- `excerpt`: card/summary copy.
- `content`: release note/story context.
- `lyrics`: full lyrics when available.
- `videoUrl`: Cloudinary or other playable media URL.
- `collectionSlugs`: relationship to collections.
- `versionFamily`: groups alternate versions of the same song.
- `releaseStatus`: `canon`, `alternate`, or `working`.
- `isPrimaryVersion`: preferred version within a family.
- `isHomepageEligible`: eligible for homepage curation.
- `isPubliclyVisible`: can hide a published post from public surfaces.
- `subCategory`, `worldLayer`, `themeTags`: public IA/story/mood metadata.
- `archiveMeta`: Fractureverse/Eldoria specialized metadata.

Collection object example:

```json
{
  "id": "col-fractureverse",
  "slug": "fractureverse",
  "slugHistory": [],
  "title": "Fractureverse",
  "description": "A broken story world...",
  "featuredReleaseSlug": "still-breathing-in-a-dying-world-reimagined",
  "theme": "fractureverse",
  "themeTags": ["fracture"],
  "worldLayers": ["core"],
  "isPublicPrimary": true
}
```

Guided path object example:

```json
{
  "slug": "start-here",
  "title": "Start Here",
  "eyebrow": "Listening Path",
  "intro": "A concise first route...",
  "moodNote": "Best for first contact.",
  "themeHint": "",
  "postSlugs": ["song-one", "song-two"],
  "algorithm": {
    "preset": "homepage",
    "maxItems": 5,
    "sort": "curated"
  }
}
```

Site content object:

```json
{
  "branding": { "siteName": "Suno Diary", "siteTagline": "..." },
  "home": { "heroTitle": "...", "featuredReleaseSlug": "..." },
  "collectionThemes": [
    { "key": "eldoria", "palette": { "light": {}, "dark": {} } }
  ],
  "guidedPaths": [],
  "about": { "heroTitle": "...", "artistText": "..." },
  "assistantFindingDecisions": []
}
```

User object:

```json
{
  "id": "uuid",
  "email": "user@example.com",
  "displayName": "Listener",
  "avatarUrl": "https://res.cloudinary.com/.../image/upload/...",
  "passwordHash": "bcrypt-hash",
  "role": "user",
  "status": "active",
  "savedReleaseSlugs": ["heaven-wakes-in-me"],
  "recentReleaseSlugs": ["heaven-wakes-in-me"],
  "releaseReactions": { "heaven-wakes-in-me": "on-repeat" },
  "createdAt": "...",
  "updatedAt": "..."
}
```

Comment object:

```json
{
  "id": "uuid",
  "postSlug": "heaven-wakes-in-me",
  "parentCommentId": "",
  "authorId": "uuid",
  "body": "Comment text",
  "status": "visible",
  "reports": [
    {
      "id": "uuid",
      "reporterId": "uuid",
      "reason": "harassment",
      "details": "Optional moderator context",
      "status": "open",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "createdAt": "...",
  "updatedAt": "..."
}
```

Important comment fields:

- `postSlug`: connects the comment to a release.
- `parentCommentId`: empty for a top-level comment, set to another comment id for replies.
- `authorId`: connects to a user; public responses include sanitized author display name/avatar.
- `status`: `visible` or `hidden`.
- `reports`: private moderation records. Public comment responses do not expose report details; admin comment responses include sanitized report/reporter summaries.

Assistant finding decision:

```json
{
  "fingerprint": "stable-finding-key",
  "status": "dismissed",
  "reasonCode": "manual-dismissal",
  "summary": "Admin dismissed this finding.",
  "targetType": "post",
  "targetSlug": "heaven-wakes-in-me",
  "field": "themeTags",
  "issue": "...",
  "recommendedAction": "...",
  "targetStateHash": "...",
  "model": "qwen2.5:7b",
  "reviewedAt": "...",
  "patchFields": ["themeTags"]
}
```

Slugs connect everything. Posts are opened by slug. Collections contain posts through `collectionSlugs`. Comments point to posts by `postSlug`, and threaded replies point to comments by `parentCommentId`. Guided paths point to posts by `postSlugs`. Featured releases use `featuredReleaseSlug`. Homepage uses `home.featuredReleaseSlug`. Slug-change logic in [admin.routes.js](../backend/src/routes/admin.routes.js) appends slug history and remaps references.

## 7. Cloudinary Media Pipeline

What gets uploaded:

- Backend admin upload currently uploads video files through `POST /api/uploads`.
- Public profile/avatar upload uploads image files through `POST /api/auth/me/avatar`.
- Python importer can upload video files and cover images before producing website-ready JSON.

Where uploads happen:

- Backend video upload: [upload.routes.js](../backend/src/routes/upload.routes.js) -> [uploadVideoToCloudinary.js](../backend/src/services/uploadVideoToCloudinary.js) -> Cloudinary `upload_chunked_stream`.
- Backend avatar upload: [auth.routes.js](../backend/src/routes/auth.routes.js) -> [uploadAvatarToCloudinary.js](../backend/src/services/uploadAvatarToCloudinary.js) -> Cloudinary `upload_stream`.
- Importer media upload: [uploader.py](../tools/song-importer/src/uploader.py) -> Cloudinary `uploader.upload`.

What URL is stored:

- Video upload returns `result.secure_url` as `videoUrl`.
- Avatar upload returns `result.secure_url` as `avatarUrl`.
- Importer video upload sets `song.videoUrl`.
- Importer cover upload sets `song.coverImageUrl`, but the current website does not use a separate cover image as release media. The public UI derives thumbnails from the Cloudinary video URL through `getVideoPosterUrl()`. If the importer receives a cover image URL, it is preserved as metadata in generated content rather than becoming a first-class website media field.

Frontend usage:

- Release pages and cards read `post.videoUrl`.
- [App.jsx](../frontend/src/App.jsx) assigns `audioRef.current.src = currentTrack.videoUrl` on playback.
- [site.js](../frontend/src/lib/site.js) derives Cloudinary poster URLs from video URLs with `getVideoPosterUrl()`.

The backend does not stream media. It only authenticates the upload and stores the final Cloudinary URL. The browser streams directly from Cloudinary’s CDN, reducing backend bandwidth and avoiding long-running media responses.

Plain-English flow:

```text
local media file
  -> importer/backend upload
  -> Cloudinary secure_url
  -> post.videoUrl
  -> mini-player/release page
  -> browser streams from Cloudinary CDN
```

## 8. Python Importer Tool

The importer solves the pre-admin problem: preparing messy song JSON and local media for a structured website catalog without manually creating every field.

CLI mode: [main.py](../tools/song-importer/main.py) parses flags such as `--catalog`, `--input`, `--output-dir`, `--no-upload`, `--dry-run`, `--website-root`, `--website-posts`, `--apply-to-website`, `--reseed-website`, `--merge-lyrics`, `--lyrics-repair-only`, `--web`, and `--demo`.

Web/browser UI mode: [web_app.py](../tools/song-importer/src/web_app.py) creates a Flask app with:

- `GET /`: renders `templates/import_window.html`.
- `POST /api/process`: parses pasted JSON, attaches uploaded files, runs the shared pipeline, writes output artifacts, returns preview JSON.
- `POST /api/apply`: applies website-ready posts or lyrics merges to the website catalog.
- `GET /api/apply/jobs/<job_id>`: polls background apply/reseed progress.

JSON paste workflow: the UI accepts one song object or an array. `_parse_song_json()` validates this. Uploaded files are only allowed for a single-song submission.

Video/cover upload workflow: `_attach_uploaded_files()` writes temporary uploaded files and adds `videoPath`/`coverImagePath`; [uploader.py](../tools/song-importer/src/uploader.py) uploads them if Cloudinary is configured and upload is enabled.

Duplicate detection: [duplicate_checker.py](../tools/song-importer/src/duplicate_checker.py) scores exact slug, version family, and fuzzy title signals. The README documents `>=60` as blocked and `>=40` as review candidate.

Normalization: [normalizer.py](../tools/song-importer/src/normalizer.py) and [utils.py](../tools/song-importer/src/utils.py) normalize titles, slugs, version families, release statuses, lists, and input validation.

Import-ready output: [exporter.py](../tools/song-importer/src/exporter.py) writes `normalized_new_songs.json`, `import_ready_songs.json`, `website_posts_ready.json`, `duplicate_report.json`, and `import_report.md`.

Apply to website: [website_integration.py](../tools/song-importer/src/website_integration.py) loads the website catalog, validates it, creates `website_posts_merged_preview.json`, backs up the original catalog, writes the merged catalog, can export a live store backup, run `npm run reseed`, and run `npm run catalog:diff-live`.

Reseed option: CLI `--reseed-website` and browser apply can run reseed after writing the catalog. Browser mode runs it as a background job and streams progress to a log file.

Demo mode: `python main.py --web --demo` uses sample input, disables upload, writes to `output/demo`, and disables website apply/reseed.

Hosted importer mode: `python tools/song-importer/start_hosted.py` exists for the deployed instructor demo. It is intentionally a preview/import-preparation surface, not the production write path. A hosted Render importer can generate normalized output, duplicate reports, website-ready JSON, and Cloudinary URLs, but it should not be treated as the source that mutates the live site because writes would only affect the service's deployed filesystem. Real apply/reseed work stays local/operator-run from the repo checkout so `posts.local.json` changes can be backed up, reviewed, committed, pushed, and then deployed.

Important files:

- [main.py](../tools/song-importer/main.py): CLI entry.
- [pipeline.py](../tools/song-importer/src/pipeline.py): shared processing pipeline.
- [web_app.py](../tools/song-importer/src/web_app.py): Flask UI/API.
- [website_mapper.py](../tools/song-importer/src/website_mapper.py): maps songs to website post shape.
- [website_integration.py](../tools/song-importer/src/website_integration.py): applies/backs up/reseeds/verifies website catalog.
- [uploader.py](../tools/song-importer/src/uploader.py): Cloudinary upload.
- [models.py](../tools/song-importer/src/models.py): importer data classes.
- `tests/`: pytest coverage for normalizer, duplicate checker, pipeline, web app, website integration, and mapper.

## 9. Reseed / Live Store Sync

There are two catalog layers:

- Authored JSON file: configured by `POSTS_FILE`, defaulting to `backend/data/posts.local.json`.
- MongoDB live store: what the running API actually reads and writes after startup.

`backend/data/posts.template.json` is a safe tracked template. `backend/data/posts.local.json` is the local authored catalog currently present in this workspace. The backend default and the importer default now both target `backend/data/posts.local.json`; `POSTS_FILE` can still override that path for a specific environment.

Replacing the JSON file alone does not necessarily change the live database. The public site reads MongoDB through `readStore()`, not the file on every request. The file is read on initial empty database seed or explicit reseed.

Reseed direction:

```text
posts.local.json / configured POSTS_FILE
  -> npm run reseed
  -> scripts/reseed-from-posts-file.js
  -> readLegacySeed()
  -> writeStore({ posts, collections })
  -> MongoDB live store
```

Live store sync direction:

```text
MongoDB live store
  -> /api/admin/live-store-sync or npm run sync:live-store:write
  -> liveStoreSync.js
  -> backup current posts file
  -> write authored catalog file
```

Diagram:

```text
posts.local.json -> reseed -> MongoDB
MongoDB -> live store sync -> posts.local.json
```

Reseed writes posts and collections from the authored file into MongoDB while preserving current operational store data such as users/comments by spreading `currentStore` in [reseed-from-posts-file.js](../backend/scripts/reseed-from-posts-file.js).

Live store sync writes the current live authored content back into the posts file. [liveStoreSync.js](../backend/src/services/liveStoreSync.js) intentionally builds an authored catalog with only `posts`, `collections`, and `siteContent`, not users/comments.

## 10. Authentication and Accounts

Login/session flow:

1. User submits [LoginPage.jsx](../frontend/src/pages/public/LoginPage.jsx).
2. `POST /api/auth/login` or `POST /api/auth/register` runs in [auth.routes.js](../backend/src/routes/auth.routes.js).
3. Passwords are checked/created with `bcryptjs`.
4. `issueAuthToken()` in [authUserService.js](../backend/src/services/authUserService.js) creates a JWT.
5. [sessionCookieService.js](../backend/src/services/sessionCookieService.js) sets `suno_blog_user_session` as an HTTP-only cookie.
6. Frontend calls `GET /api/auth/me` on startup to populate `currentUser`.

Admin vs public roles:

- `role: "user"` can use account/library/comment features.
- `role: "admin"` can also access `/admin/*`.
- `requireUser` allows `user` or `admin`.
- `requireAdmin` requires `role === "admin"`.

`currentUser` contains sanitized user fields: `id`, `displayName`, `email`, `avatarUrl`, `role`, `status`, saved/recent slugs, reactions, and timestamps. It does not include `passwordHash`.

Protected routes: [App.jsx](../frontend/src/App.jsx) wraps `/admin` in `ProtectedRoute` from [AdminLayout.jsx](../frontend/src/layouts/AdminLayout.jsx). Backend protection is still the real enforcement through `requireAdmin`.

Profile updates: `PUT /api/auth/me` changes public user display name and optionally password. Admin accounts are blocked from this endpoint with “Admin accounts are managed separately.”

Saved/recent songs: `savedReleaseSlugs`, `recentReleaseSlugs`, and `releaseReactions` live on the user document. Backend resolves slugs into visible public posts for `GET /api/auth/library`.

Avatar/profile picture upload: [AccountPage.jsx](../frontend/src/pages/public/AccountPage.jsx) sends multipart form data to `POST /api/auth/me/avatar`. Backend validates image type and 5 MB limit through `multer`, uploads to Cloudinary, stores `avatarUrl`, and issues a refreshed token/cookie.

## 11. AI Assistant Architecture

The admin AI assistant is a review/suggestion system for catalog maintenance. It is not an autonomous editor. It does not directly mutate posts from model output. It returns structured suggestions/findings that the admin reviews.

Models: default profiles are defined in [localAiService.js](../backend/src/services/localAiService.js): `fast` -> `qwen2.5:7b`, `balanced` -> `qwen3:14b`, `thorough` -> `qwen3:30b`. `LOCAL_AI_MODEL` and `LOCAL_AI_MODEL_PROFILES` can override selection.

Frontend requests:

- [AdminAiRuntimePage.jsx](../frontend/src/pages/admin/AdminAiRuntimePage.jsx): status, runtime controls, catalog review, finding review/dismiss.
- [AdminPostsPage.jsx](../frontend/src/pages/admin/AdminPostsPage.jsx): post draft suggestions.
- [AdminPathsPage.jsx](../frontend/src/pages/admin/AdminPathsPage.jsx): guided path suggestions.
- [adminAssistant.js](../frontend/src/lib/adminAssistant.js): stores selected assistant model profile and builds URLs/bodies.

Backend prompt building: [localAiService.js](../backend/src/services/localAiService.js) builds compact JSON prompts from summarized posts, collections, paths, current draft fields, and allowed slugs/statuses. It instructs the model not to invent slugs and validates returned JSON.

Backend to Ollama: `fetchOllama()` calls `${LOCAL_AI_BASE_URL}/api/tags` for status and `/api/generate` for generation. `requestGenerate()` uses `stream: false`, `format: "json"`, `think: false`, keep-alive, context, and prediction limits from env.

Local/remote Ollama: locally, `LOCAL_AI_BASE_URL` can be `http://127.0.0.1:11434`. In production forwarded-URL mode, Render can call a Thunder forwarded Ollama URL directly, for example `https://<uuid>-11434.thundercompute.net`, with `REMOTE_AI_ENABLED=false`. In operator tunnel mode, Thunder Compute hosts Ollama and the backend calls `localhost:11434` after an SSH tunnel maps local port 11434 to the instance’s remote 11434.

Thunder Compute purpose: provide a GPU machine for larger Ollama models without running them on the laptop. Models live under `/home/ubuntu/ollama-models`.

SSH tunnel purpose: when `REMOTE_AI_ENABLED=true`, `backend/src/services/remoteAiService.js` runs:

```text
ssh -N -L localPort:remoteHost:remotePort user@instanceHost -p instanceSshPort -i key
```

That makes `http://127.0.0.1:11434` on the backend machine reach Ollama running inside the instance.

Network volume: Thunder Compute instances can be ephemeral. Storing models in `/home/ubuntu/ollama-models` on a persistent volume prevents losing downloaded model files when the tunnel stops/restarts.

Forwarded URL mode: if Thunder forwards port `11434`, Ollama must be started with `OLLAMA_HOST=0.0.0.0:11434`; otherwise Thunder's forwarder cannot reach it. Render then uses that HTTPS forward URL as `LOCAL_AI_BASE_URL`, and the admin runtime page correctly shows SSH tunnel controls as disabled because the backend is no longer opening a tunnel.

Catalog review flow:

```text
Admin clicks catalog review
  -> POST /api/admin/assistant/catalog-review
  -> backend readStore()
  -> buildCatalogContext()
  -> prompt sent to Ollama
  -> JSON review normalized
  -> findings suppressed if contradicted/dismissed
  -> admin reviews findings
```

Remote AI flow:

```text
Start/restore Thunder instance manually
  -> start Ollama on Thunder with OLLAMA_HOST=0.0.0.0:11434
  -> Thunder forwards port 11434 to HTTPS URL
  -> Render LOCAL_AI_BASE_URL points at forwarded URL
  -> suggestions return to admin UI
```

Optional SSH tunnel flow:

```text
Start/restore Thunder instance manually
  -> backend opens SSH tunnel
  -> backend wakes Ollama over SSH
  -> backend calls localhost:11434
  -> suggestions return to admin UI
```

AI findings must be reviewed because the model can hallucinate, misread editorial intent, over-tag, or suggest subjective changes. The code tries to reduce this with conservative prompts, allowed target validation, finding fingerprints, state hashes, and decision memory, but final authority remains the admin.

## 12. Thunder Compute/Ollama Operational Explanation

Thunder Compute is used when local hardware is not enough for the selected Ollama model. The GPU instance hosts Ollama, while the backend continues to use the same Ollama HTTP API.

The current production setup uses Thunder forwarded port mode. Thunder forwards port `11434` to an HTTPS URL, and Render sets `LOCAL_AI_BASE_URL` to that URL. In this mode the backend does not need SSH credentials and `REMOTE_AI_ENABLED=false` is correct. The admin runtime page still reports Ollama reachable and model installed, while SSH tunnel cards show disabled/unconfigured because they are not part of this production path.

The operator SSH mode still exists for local/admin use. In that mode, the app can open a tunnel and wake Ollama after the Thunder instance is manually started or restored.

The Thunder instance hosts Ollama. For forwarded port mode, Ollama must listen on all interfaces:

```bash
export OLLAMA_MODELS=/home/ubuntu/ollama-models
export OLLAMA_HOST=0.0.0.0:11434
export OLLAMA_FLASH_ATTENTION=1
export OLLAMA_NUM_PARALLEL=1
export OLLAMA_MAX_LOADED_MODELS=1
export CUDA_VISIBLE_DEVICES=0
nohup ollama serve > /home/ubuntu/ollama.log 2>&1 &
```

For SSH tunnel mode, Ollama can listen on `127.0.0.1:11434` because the tunnel forwards traffic to the local Ollama port inside the instance.

Model files live under `/home/ubuntu/ollama-models`. Keeping the model path there prevents repeated downloads when the instance is restored from a snapshot or persistent storage.

To download models, SSH into the instance or use the instance terminal after Ollama is running and run commands such as:

```bash
OLLAMA_MODELS=/home/ubuntu/ollama-models ollama pull qwen2.5:7b
OLLAMA_MODELS=/home/ubuntu/ollama-models ollama pull qwen3:14b
```

Actions:

- Check Ollama status: `GET /api/admin/assistant/status` checks `${LOCAL_AI_BASE_URL}/api/tags`.
- Refresh models: the same status flow refreshes installed-model data.
- Tunnel start: `POST /api/admin/assistant/remote-tunnel/start` opens local port forwarding when `REMOTE_AI_ENABLED=true`.
- Tunnel stop: kills the stored SSH process and clears `remote-ai-tunnel.json`.
- Wake: `POST /api/admin/assistant/remote-ollama/wake` installs/starts Ollama and checks `/api/tags`.
- Start/stop billing: not handled by the website. Start/restore/snapshot/delete the instance in Thunder.

What can go wrong:

- Thunder forwarded port points at the wrong port or old instance UUID.
- Ollama is listening on `127.0.0.1` when forwarded URL mode requires `0.0.0.0`.
- `LOCAL_AI_BASE_URL` includes the wrong host or missing scheme.
- The model is installed but not loaded; the first `qwen3:30b` request can spend over a minute loading.
- The model consumes output tokens on reasoning/thinking and returns empty visible output; larger `LOCAL_AI_*_NUM_PREDICT` budgets help.
- SSH key path wrong or key not authorized.
- Local port 11434 already in use.
- Ollama installed but model not pulled.
- Model path not on persistent volume.
- Tunnel process exists but local port is not reachable.
- `LOCAL_AI_BASE_URL` points somewhere other than the tunnel.

Env vars:

- `LOCAL_AI_ENABLED`: turns assistant availability on/off.
- `LOCAL_AI_BASE_URL`: Ollama HTTP base URL the backend calls.
- `LOCAL_AI_MODEL`: default model name.
- `LOCAL_AI_TIMEOUT_MS`: model request timeout.
- `LOCAL_AI_DEFAULT_NUM_GPU`: Ollama GPU-layer hint, currently set to `99` for GPU offload.
- `REMOTE_AI_ENABLED`: enables/disables backend-managed SSH tunnel controls.
- `REMOTE_AI_SSH_HOST`: Thunder SSH host or SSH config alias for tunnel mode.
- `REMOTE_AI_SSH_KEY_PATH`: private key path for SSH.
- `REMOTE_AI_SSH_PORT`: manual/default SSH port.
- `REMOTE_AI_SSH_USER`: SSH username, usually `ubuntu`.
- `REMOTE_AI_TUNNEL_LOCAL_PORT`: local port exposed to backend.
- `REMOTE_AI_TUNNEL_REMOTE_HOST`: remote host inside instance, usually `127.0.0.1`.
- `REMOTE_AI_TUNNEL_REMOTE_PORT`: remote Ollama port, usually `11434`.

## 13. Environment Variables

Sanitized table:

| Name                            | Purpose                                 |                                       Safe example | Required         | Scope            | What breaks if wrong                                   |
| ------------------------------- | --------------------------------------- | -------------------------------------------------: | ---------------- | ---------------- | ------------------------------------------------------ |
| `PORT`                          | Backend port                            |                                             `4000` | Yes backend      | Backend          | API starts on unexpected port                          |
| `CLIENT_URL`                    | Allowed frontend origin for CORS        |                            `http://localhost:5173` | Yes              | Backend          | Browser CORS/cookie requests fail                      |
| `JWT_SECRET`                    | Signs JWT sessions                      |                         `replace-with-long-secret` | Yes              | Backend          | Sessions invalid/insecure; production startup may fail |
| `ADMIN_EMAIL`                   | Admin login email                       |                                `admin@example.com` | Yes              | Backend          | Admin login fails                                      |
| `ADMIN_PASSWORD`                | Plain admin password fallback           |                                     `ChangeMe123!` | Dev only         | Backend          | Admin login fails                                      |
| `ADMIN_PASSWORD_HASH`           | Preferred production admin hash         |                                          `$2a$...` | Prod recommended | Backend          | Production may reject weak/plain config                |
| `MONGODB_URI`                   | MongoDB connection string               |                        `mongodb://127.0.0.1:27017` | Yes              | Backend          | API cannot read/write store                            |
| `MONGODB_DIRECT_URI`            | Fallback for Atlas SRV DNS problems     |         `mongodb://user:pass@host:27017/?tls=true` | No               | Backend          | SRV DNS fallback unavailable                           |
| `MONGODB_DB_NAME`               | Database name                           |                                        `suno_blog` | Yes              | Backend          | Reads/writes wrong database                            |
| `POSTS_FILE`                    | Authored catalog seed/sync file         |                    `backend/data/posts.local.json` | No               | Backend          | Reseed/sync reads or writes wrong file                 |
| `OPERATIONAL_SEED_FILE`         | Optional users/comments seed            |         `backend/data/operational-seed.local.json` | No               | Backend          | Operational seed not loaded                            |
| `ENABLE_REQUEST_LOGGING`        | Per-request backend logs                |                                            `false` | No               | Backend          | Less/more logging than expected                        |
| `ENABLE_ADMIN_AUDIT_LOGGING`    | Admin mutation audit logs               |                                             `true` | No               | Backend          | Audit trail disabled                                   |
| `ENABLE_CATALOG_FILE_MUTATIONS` | Allows reseed/sync file mutation routes |                                             `true` | No               | Backend          | Admin reseed/sync POST blocked                         |
| `LOG_LEVEL`                     | Logger level                            |                                             `info` | No               | Backend          | Missing/noisy logs                                     |
| `SLOW_REQUEST_THRESHOLD_MS`     | Slow request log threshold              |                                             `1200` | No               | Backend          | Slow request detection off/misleading                  |
| `MONITORING_WEBHOOK_URL`        | Optional monitoring webhook             |                  `https://example.invalid/webhook` | No               | Backend          | External alerting disabled/fails                       |
| `CLOUDINARY_CLOUD_NAME`         | Cloudinary account name                 |                                       `demo-cloud` | For uploads      | Backend/importer | Video/avatar/media upload fails                        |
| `CLOUDINARY_API_KEY`            | Cloudinary API key                      |                                       `1234567890` | For uploads      | Backend/importer | Upload auth fails                                      |
| `CLOUDINARY_API_SECRET`         | Cloudinary secret                       |                                  `not-real-secret` | For uploads      | Backend/importer | Upload auth fails                                      |
| `CLOUDINARY_FOLDER`             | Backend upload folder                   |                                    `suno-releases` | No               | Backend          | Assets go to unexpected folder                         |
| `CLOUDINARY_CHUNK_SIZE`         | Chunked video upload size               |                                         `20971520` | No               | Backend          | Large upload reliability changes                       |
| `LOCAL_AI_ENABLED`              | Enables AI assistant checks             |                                             `true` | No               | Backend          | Assistant unavailable                                  |
| `LOCAL_AI_BASE_URL`             | Ollama API URL                          |                           `http://127.0.0.1:11434` | For AI           | Backend          | Assistant cannot reach Ollama                          |
| `LOCAL_AI_MODEL`                | Default Ollama model                    |                                       `qwen2.5:7b` | For AI           | Backend          | Model not installed/status warning                     |
| `LOCAL_AI_MODEL_PROFILES`       | JSON model profile list                 |            `[{"key":"fast","model":"qwen2.5:7b"}]` | No               | Backend          | Profile picker defaults only                           |
| `LOCAL_AI_TIMEOUT_MS`           | Ollama timeout                          |                                           `600000` | No               | Backend          | AI requests timeout too soon/late                      |
| `LOCAL_AI_DEFAULT_NUM_GPU`      | Ollama GPU-layer hint                   |                                               `99` | No               | Backend          | Larger local models may fall back to CPU               |
| `LOCAL_AI_STATUS_CACHE_MS`      | Status cache lifetime                   |                                             `8000` | No               | Backend          | Stale/noisy status checks                              |
| `LOCAL_AI_KEEP_ALIVE`           | Ollama keep-alive                       |                                              `45m` | No               | Backend          | Model unload behavior changes                          |
| `LOCAL_AI_DEFAULT_NUM_CTX`      | Default context size                    |                                             `4096` | No               | Backend          | Prompt capacity changes                                |
| `LOCAL_AI_DEFAULT_NUM_PREDICT`  | Default response budget                 |                                              `320` | No               | Backend          | Short/long model output                                |
| `LOCAL_AI_NUM_THREAD`           | Ollama thread override                  |                                                `0` | No               | Backend          | Performance changes                                    |
| `LOCAL_AI_POST_NUM_PREDICT`     | Post suggestion budget                  |                                              `700` | No               | Backend          | Post suggestions truncated/verbose                     |
| `LOCAL_AI_PATH_NUM_PREDICT`     | Path suggestion budget                  |                                              `850` | No               | Backend          | Path suggestions truncated/verbose                     |
| `LOCAL_AI_NEW_PATH_NUM_PREDICT` | New path suggestion budget              |                                              `900` | No               | Backend          | New path suggestions truncated/verbose                 |
| `REMOTE_AI_ENABLED`             | Enables SSH tunnel/wake controls        |                                            `false` | No               | Backend          | SSH controls hidden/disabled or unexpectedly active    |
| `REMOTE_AI_SSH_HOST`            | Thunder SSH host or SSH config alias    |                                            `tnr-0` | For tunnel       | Backend          | Tunnel/wake cannot find host                           |
| `REMOTE_AI_SSH_PORT`            | SSH port                                |                                               `22` | For tunnel       | Backend          | SSH connection fails                                   |
| `REMOTE_AI_SSH_USER`            | SSH user                                |                                           `ubuntu` | For tunnel       | Backend          | SSH login fails                                        |
| `REMOTE_AI_SSH_KEY_PATH`        | Private key path                        |                                `~/.ssh/id_ed25519` | For tunnel       | Backend          | SSH auth fails                                         |
| `REMOTE_AI_TUNNEL_LOCAL_PORT`   | Local forwarded port                    |                                            `11434` | For tunnel       | Backend          | Backend cannot reach expected local port               |
| `REMOTE_AI_TUNNEL_REMOTE_HOST`  | Remote host                             |                                        `127.0.0.1` | For tunnel       | Backend          | Tunnel points wrong place                              |
| `REMOTE_AI_TUNNEL_REMOTE_PORT`  | Remote Ollama port                      |                                            `11434` | For tunnel       | Backend          | Tunnel points wrong service                            |
| `REMOTE_AI_OLLAMA_MODELS_PATH`  | Remote model directory                  |                       `/home/ubuntu/ollama-models` | For tunnel       | Backend          | Wake script uses wrong model path                      |
| `REMOTE_AI_OLLAMA_LOG_PATH`     | Remote Ollama log file                  |                          `/home/ubuntu/ollama.log` | For tunnel       | Backend          | Wake script logs go missing                            |
| `IMPORTER_ROOT`                 | Importer directory override             |                       `D:\...\tools\song-importer` | No               | Backend          | Importer launcher cannot find tool                     |
| `IMPORTER_ENABLED`              | Enables admin importer launcher         |                                             `true` | Optional         | Backend          | Admin importer button fails or stays disabled          |
| `IMPORTER_LAUNCH_MODE`          | Importer launch strategy                |                                         `external` | Hosted demo      | Backend          | Backend may spawn local Python instead of opening URL  |
| `IMPORTER_URL`                  | Local importer URL                      |                            `http://127.0.0.1:8765` | No               | Backend          | Admin Open Importer points wrong place                 |
| `IMPORTER_PYTHON_PATH`          | Python executable override              | `...\tools\song-importer\.venv\Scripts\python.exe` | No               | Backend          | Importer launch fails                                  |
| `VITE_API_URL`                  | Frontend API base                       |                        `http://localhost:4000/api` | Yes frontend     | Frontend         | Public/admin API calls fail or hit wrong backend       |
| `VITE_IMPORTER_ENABLED`         | Shows local importer launch UI          |                                             `true` | Local only       | Frontend         | Hosted admin may show a button that cannot work        |
| `VITE_IMPORTER_URL`             | Frontend importer link base             |                            `http://127.0.0.1:8765` | No               | Frontend         | Importer link opens wrong URL                          |
| `WEBSITE_ROOT`                  | Importer website root fallback          |       `D:\Docs\Active Project\React Final Project` | No               | Importer         | Website integration cannot resolve repo                |
| `WEBSITE_POSTS_PATH`            | Importer direct posts path              |                `...\backend\data\posts.local.json` | No               | Importer         | Importer reads/writes wrong catalog                    |
| `IMPORTER_MAX_UPLOAD_MB`        | Browser importer upload cap             |                                              `512` | No               | Importer         | Large uploads rejected too early/late                  |
| `RESEED_TIMEOUT_MS`             | Reseed command timeout                  |                                           `900000` | No               | Backend/importer | Long reseeds fail or hang longer                       |
| `WEBSITE_STEP_TIMEOUT_MS`       | Importer backup/diff timeout            |                                           `120000` | No               | Importer         | Backup/verify times out                                |

## 14. Deployment Story

The README describes frontend deployment to Vercel and backend deployment to Render. The frontend build command is `npm run build` from `frontend/`, output `frontend/dist`. The backend start command is `npm start` from `backend/`.

Frontend deployment needs `VITE_API_URL` set to the deployed backend API base, for example `https://react-final-project-cnk7.onrender.com/api`. If it is missing or points to localhost in production, the deployed frontend will try to call the wrong API.

Backend deployment needs `CLIENT_URL` set to the deployed frontend origin. This controls CORS and credentials. It also needs `JWT_SECRET`, admin credentials/hash, `MONGODB_URI`, `MONGODB_DB_NAME`, and optionally Cloudinary variables.

Database is MongoDB, either local for development or hosted MongoDB/Atlas for production. Media hosting is Cloudinary. The browser streams media from Cloudinary; Render does not need to serve video files.

Local-only or operator-only parts:

- Python importer UI is normally a local admin tool. For an instructor demo, it can also run as a separate hosted Python service with `tools/song-importer/start_hosted.py`; the deployed admin then opens that URL through `IMPORTER_LAUNCH_MODE=external`. Hosted mode is deliberately preview-only. Apply/reseed remains local-only so catalog writes are not hidden inside an ephemeral hosted filesystem.
- Ollama local AI can be local, Thunder forwarded URL, or Thunder SSH tunnel mode.
- Thunder Compute lifecycle is manual. Start/restore/snapshot/delete the instance from Thunder, not from the website.
- Thunder SSH tunnel controls are optional backend admin operations and only apply when `REMOTE_AI_ENABLED=true`.
- Reseed/sync file mutation routes should be carefully controlled in production.

Vercel frontend-only limitation: if only the React app is deployed and the backend is not deployed at the same domain or configured through `VITE_API_URL`, `/api/...` calls can 404. This app does not define Vercel serverless API routes; the real API is Express.

Why `/api` may 404: Vite/React routes are client-side; `/api` is not handled by React. It must point to the Express backend. In local development that is `http://localhost:4000/api`; in production it is the Render backend API base.

CORS/client URL matters because backend [app.js](../backend/src/app.js) uses:

```js
cors({ origin: config.clientUrl, credentials: true });
```

If `CLIENT_URL` does not match the browser origin exactly, credentialed requests and cookies can fail.

### Verified

- Vercel frontend returns 200 and loads the public app.
- Frontend API requests point to the Render backend, not localhost or the Vercel `/api` path.
- Render backend public endpoints return 200.
- Production public API calls for `site-content`, `posts`, and `collections` work.
- Production auth/session health passed: login works, refresh preserves the session, and account/library behavior works.
- Thunder Compute `/home/ubuntu/ollama-models` persistence is confirmed on the network volume.
- Reseed endpoint/test behavior has been fixed.
- Cloudinary video upload and avatar upload are implemented.
- Public playback uses `post.videoUrl`.

## 15. Important User Flows

Visitor browses and plays a song:

1. Visitor opens `/`.
2. [PublicHome.jsx](../frontend/src/pages/public/PublicHome.jsx) loads site content/posts.
3. Visitor clicks play on a release.
4. [App.jsx](../frontend/src/App.jsx) resolves queue context, sets `currentTrack`, and assigns `videoUrl` to the hidden media element.
5. [MiniPlayer.jsx](../frontend/src/components/MiniPlayer.jsx) shows controls.
6. Browser streams the Cloudinary URL directly.

Visitor searches for a song:

1. Visitor opens `/explore`.
2. [ExplorePage.jsx](../frontend/src/pages/public/ExplorePage.jsx) loads `GET /api/posts`.
3. Frontend filters posts by search text and metadata.
4. Search text updates the URL only on blur/Enter, so typing does not lose focus.
5. Visitor opens `/release/:slug` or plays from results without the page jumping back to the top when query params change.

User logs in and saves a song:

1. User opens `/login`.
2. Login/register calls auth route.
3. Backend sets HTTP-only session cookie.
4. User opens a release and clicks save.
5. Frontend calls `PUT /api/auth/library/releases/:slug/save`.
6. Backend updates `savedReleaseSlugs` on the user.
7. `/account` loads `GET /api/auth/library` and shows saved releases.

User comments, replies, and reports:

1. Signed-in user opens a release page.
2. [CommentsSection.jsx](../frontend/src/components/CommentsSection.jsx) loads visible comments through `GET /api/posts/:slug/comments`.
3. New top-level comments call `POST /api/posts/:slug/comments`.
4. Replies call the same route with `parentCommentId`.
5. The UI renders commenter avatar/name and links to `/users/:id`.
6. Non-owners can report misconduct through `POST /api/comments/:id/report`.
7. Admin moderation sees report details through `GET /api/admin/comments`; public users do not see private report data.

Admin creates/edits a post:

1. Admin logs in with role `admin`.
2. Admin opens `/admin/posts`.
3. UI loads `GET /api/admin/posts`.
4. Admin edits fields and saves.
5. UI sends `POST /api/admin/posts` or `PUT /api/admin/posts/:id`.
6. Backend normalizes, validates, checks slug reservations, reconciles collections, remaps slug references if needed, writes MongoDB, and records audit log.

Admin creates/edits a collection:

1. Admin opens `/admin/collections`.
2. UI loads `GET /api/admin/collections`.
3. Admin edits title, slug, theme, featured release, public-primary flag.
4. Backend validates slug and featured release membership.
5. MongoDB `collections` changes and audit log records.

Admin updates guided paths:

1. Admin opens `/admin/paths`.
2. UI reads site content and posts/collections context.
3. Admin edits `guidedPaths` manually or asks AI for suggestions.
4. Save writes via `PUT /api/admin/site-content/site`.
5. Public `/paths` and `/paths/:slug` use updated `siteContent.guidedPaths`.

Admin imports a new song from Python tool:

1. Admin opens importer through `/admin` or runs `python main.py --web`.
2. Importer UI accepts pasted JSON and optional media files.
3. Pipeline normalizes, checks duplicates, uploads media if enabled, and creates `website_posts_ready.json`.
4. Admin reviews duplicate/import report.
5. Apply writes merged catalog preview/backups and updates the posts file.
6. Reseed writes file data to MongoDB.

For the hosted instructor demo, steps 1-4 still demonstrate the workflow, but apply/reseed is intentionally disabled unless a real local website target is configured. The hosted service is for preview/import-ready output, not live catalog mutation.

Admin uploads media to Cloudinary:

1. In admin post editor, choose a video file.
2. AdminLayout sends multipart POST to `POST /api/uploads`.
3. Backend requires admin, reads file with `multer`, uploads chunked to Cloudinary.
4. Response returns `videoUrl`.
5. Admin saves the post with that `videoUrl`.

Admin reseeds the site:

1. Admin opens `/admin/system`.
2. Admin starts reseed.
3. Backend starts job through `startPostFileReseedJob()`.
4. Job runs `npm run reseed`.
5. Script reads `POSTS_FILE`, writes posts/collections into MongoDB.
6. UI polls job status.

Admin runs AI catalog review:

1. Admin opens `/admin/ai-runtime`.
2. UI checks assistant status.
3. Admin clicks catalog review.
4. Backend reads store, builds prompt, calls Ollama.
5. AI returns structured findings.
6. Admin reviews, dismisses, or asks for per-finding review.

Admin uses remote AI on Thunder Compute:

1. Admin starts or restores the Thunder instance from Thunder.
2. Ollama runs on Thunder with `OLLAMA_MODELS=/home/ubuntu/ollama-models`.
3. In forwarded URL mode, Ollama listens on `0.0.0.0:11434` and Thunder forwards port `11434` to an HTTPS URL.
4. Render sets `LOCAL_AI_BASE_URL` to that forwarded URL and `REMOTE_AI_ENABLED=false`.
5. Admin AI status calls `/api/tags` through the forwarded URL and confirms installed models.
6. Admin runs catalog review, post suggestions, or guided path suggestions.
7. For local/operator mode instead, set `REMOTE_AI_ENABLED=true`, open the SSH tunnel, wake Ollama, and keep `LOCAL_AI_BASE_URL=http://127.0.0.1:11434`.

## 16. Error/Debugging Guide

MongoDB connection refused:

- Check `MONGODB_URI` and whether MongoDB is running.
- Local Docker example from README: `docker run --name suno-mongo -p 27017:27017 -d mongo:8`.
- Check `/api/health`; `database.connected` is based on backend initialization.

`/api` 404 on Vercel:

- Vercel is serving the React frontend, not Express.
- Set `VITE_API_URL` to deployed Render backend `/api`.
- Rebuild the frontend after changing Vite env vars.

Frontend cannot reach backend:

- Confirm `VITE_API_URL`.
- Confirm backend is running.
- Open `${VITE_API_URL}/health`.
- Check browser network tab for wrong host, blocked credentials, or 404.

CORS errors:

- Set backend `CLIENT_URL` to exact frontend origin.
- Backend uses credentialed CORS, so wildcard origins will not work for cookie sessions.

Cloudinary upload failure:

- Check `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- Backend upload route requires admin.
- Large video uploads use chunked upload; account limits can still reject files.
- Importer upload can be skipped with `--no-upload`.

Media URL saved but song will not play:

- Open `post.videoUrl` directly in browser.
- Check whether it is a real media URL and not an HTML error page.
- Check Cloudinary resource type: video should be under `/video/upload/`.
- Check browser console for CORS/media decode errors.

Reseed says wrong number of collections:

- Verify `POSTS_FILE` points to the file you edited.
- Check whether the importer or manual edit workflow is pointed at a different path than `POSTS_FILE`.
- Run `npm run catalog:diff-live --prefix backend` to compare live and tracked file.

Admin data regresses after restart:

- If MongoDB is empty, backend seeds from `POSTS_FILE`.
- If MongoDB persists, restart alone should not reload JSON.
- A manual reseed can overwrite live posts/collections from the authored file.
- Sync live store back to file before reseeding if admin changes should become authored state.

Thunder forwarded URL says nothing is running:

- Confirm the forwarded port is `11434`.
- Start Ollama with `OLLAMA_HOST=0.0.0.0:11434`; `127.0.0.1` only is not enough for Thunder's forwarder.
- Run `ss -ltnp | grep 11434` on Thunder and confirm it shows `*:11434` or `0.0.0.0:11434`.
- Open `https://<uuid>-11434.thundercompute.net/api/tags` directly.

SSH tunnel fails:

- Check `REMOTE_AI_SSH_KEY_PATH`.
- Check instance is running and SSH port is ready in status.
- Check local port `REMOTE_AI_TUNNEL_LOCAL_PORT` is free.
- Inspect `backend/src/data/remote-ai-tunnel.log`.

Ollama not responding:

- Local: run `ollama serve` and `ollama list`.
- Thunder forwarded URL mode: start/restore the instance, start Ollama with `OLLAMA_HOST=0.0.0.0:11434`, and verify the forwarded `/api/tags`.
- Thunder tunnel mode: start instance, start tunnel, wake Ollama.
- Check `LOCAL_AI_BASE_URL`.
- Check model is installed; assistant status distinguishes Ollama running from model installed.

qwen3:30b is slow or reports memory errors:

- First load can take more than a minute even on an A6000.
- Check `free -h`, `nvidia-smi`, `ollama ps`, and `/home/ubuntu/ollama.log`.
- Set `LOCAL_AI_DEFAULT_NUM_GPU=99`, `OLLAMA_NUM_PARALLEL=1`, and `OLLAMA_MAX_LOADED_MODELS=1`.
- Increase prediction budgets for qwen3 reasoning output, or use `qwen3:14b` for faster JSON suggestions.

AI hallucinated a catalog issue:

- Use dismiss/review actions instead of applying blindly.
- The assistant stores `assistantFindingDecisions` with fingerprints and state hashes to suppress rejected/dismissed findings while the target state remains the same.

Vite blocked tunnel host:

- `frontend/vite.config.js` currently uses `server.host = "0.0.0.0"` and `allowedHosts = true`, which should avoid many dev tunnel host blocks.
- If still blocked, verify the running frontend is using this config and restart Vite.

## 17. Portfolio Talking Points

- I built this because a growing Suno song archive needs more than a playlist: it needs lyrics, versions, worlds, public browsing, private curation, and media management.
- I learned how to connect a React/Vite frontend, Express API, MongoDB live store, Cloudinary media hosting, Python tooling, and local AI into one workflow.
- The technically interesting part is the source-of-truth problem: MongoDB is live, JSON is authored backup/seed, and reseed/sync move data in opposite directions.
- The hard parts were stable slugs, version-family curation, avoiding catalog drift, safe admin operations, threaded comment moderation, and making AI suggestions useful without letting them mutate data automatically.
- Data flows from authored JSON or admin forms into MongoDB, then public React pages read normalized API responses.
- Media streaming works by uploading files to Cloudinary once, storing `secure_url`, and letting the browser stream directly from Cloudinary.
- Public comments are threaded by `parentCommentId`, show profile avatars, link to sanitized public profiles, and include reporting that only moderators can inspect.
- The AI assistant works by summarizing the catalog, sending constrained JSON prompts to Ollama, validating returned suggestions, and requiring admin review. In production it can call a Thunder forwarded Ollama URL through `LOCAL_AI_BASE_URL`.
- Next improvements: richer importer update-in-place workflows, stronger schema validation, background job persistence, clearer forwarded-URL/SSH mode UI, and more durable moderation workflows.

Short explanation scripts:

60-second elevator pitch:

> Suno Diary is a full-stack archive for my Suno-generated songs. The public side lets visitors browse releases, collections, story worlds, guided listening paths, search results, comments, profiles, and a persistent mini-player. The backend is Express with MongoDB, Cloudinary media URLs, JWT cookie sessions, account libraries, threaded comments, reports, and admin moderation. The admin studio manages posts, collections, site content, guided paths, users, comments, reseeding, live-store sync, importer launch, and Ollama AI suggestions. The interesting part is that it solves a real catalog problem: MongoDB is the live store, JSON is the authored seed/source, Cloudinary hosts media, and AI/import tools help maintain the catalog without blindly mutating it.

5-minute portfolio walkthrough:

> I would start on the homepage and explain that this is not a generic blog; it is a music archive where every song has metadata, lyrics, media, collections, version status, and story context. Then I would open Collections and Guided Paths to show the difference between grouping songs and creating a listening route. After that I would play a song and explain the Cloudinary pipeline: uploads produce a `secure_url`, that URL is stored as `post.videoUrl`, and the browser streams directly from Cloudinary through the mini-player.
>
> Next I would open a release page and show comments, replies, profile avatars, reports, save/reaction controls, and slug-based routing. The public profile page shows only safe public data, while private library data stays behind the authenticated account page. Then I would open the admin studio and show that it is a real maintenance console: posts, collections, guided paths, comments, users, insights, reseed, sync, importer launch, and AI assistant actions.
>
> For the backend explanation, I would describe Express routes feeding a MongoDB store layer, with normalization in `store.js` and auth/session handling through JWT cookies. For source of truth, I would explain that `posts.local.json` is the authored catalog file, MongoDB is the live store, reseed moves file data into MongoDB, and live-store sync moves current admin-authored data back into JSON. Finally, I would show the AI assistant: it reads catalog context, builds constrained prompts, sends them to Ollama through `LOCAL_AI_BASE_URL`, and returns suggestions the admin must review.

Technical interview explanation:

> The frontend is a React/Vite app with React Router public/admin route trees. `App.jsx` owns auth state, theme state, and mini-player playback state; SWR hooks load public posts, collections, releases, about, and site content. The backend is Express mounted under `/api`, with public routes, auth routes, upload routes, and admin routes. MongoDB is accessed through a normalized store abstraction so posts, collections, users, comments, site content, and audit logs have consistent shape.
>
> The data model is slug-centered. Posts are addressed by `slug`, collections reference posts through `collectionSlugs`, guided paths reference posts through `postSlugs`, comments reference posts through `postSlug`, and replies reference comments through `parentCommentId`. Slug history allows public redirects and admin slug changes remap references. Media is not streamed by the backend: admin/importer uploads to Cloudinary, stores the returned URL, and the browser streams it from Cloudinary.
>
> Authentication uses JWT cookies. Public users can save releases, mark recent listens, react, update profile data, upload avatars, comment, reply, and report comments. Admin users get protected `/admin` routes for content, users, comments, insights, sync/reseed, and AI. Unsafe mutations require the trusted mutation header, and admin mutations are audited.
>
> The AI assistant is intentionally non-autonomous. `localAiService.js` builds compact JSON prompts, calls Ollama `/api/tags` and `/api/generate`, validates structured output, suppresses dismissed findings with decision memory, and returns suggestions for admin review. Locally it can call `http://127.0.0.1:11434`; in production it can call a Thunder forwarded Ollama URL. The SSH remote service remains available for manual tunnel/wake mode, but the app does not manage Thunder billing or lifecycle.

## 18. Demo Script

1. Start at homepage. Explain this is a public music archive for Suno-generated songs, not a generic blog. Point out featured/curated releases and that data comes from MongoDB through the Express API.
2. Open Collections. Show public-primary collections like Fractureverse, Eldoria, Original/Personal, and Standalone. Explain that collections are not just tags; they can control world styling and featured releases.
3. Open Guided Paths. Show that paths are curated listening routes stored in `siteContent.guidedPaths`, with manual `postSlugs` and optional algorithm fields.
4. Play a song. Click play and show the mini-player. Explain that `post.videoUrl` is a Cloudinary URL, the backend is not streaming media, and the browser plays from Cloudinary CDN.
5. Open a release page. Show lyrics/content/threaded comments/profile avatar links/report controls/save/reaction controls. Mention slug-based routing and slug history.
6. Open account/profile/library, then a public listener profile. Show saved/recent releases and profile/avatar options. Explain JWT cookie sessions, private library fields, and sanitized public profiles.
7. Open admin studio. Show Insights first: health score, coverage, issues, recent activity. Explain this is operational catalog maintenance.
8. Edit a post or collection. Show fields like release status, version family, homepage eligibility, public visibility, collection slugs, world layer, and theme tags. Explain validations and audit logs.
9. Run AI assistant review. Show status, selected model, catalog review, and findings. Explain Ollama/local or Thunder forwarded URL flow and that suggestions must be reviewed.
10. Explain Cloudinary/importer. Open Importer if configured or describe `tools/song-importer`: paste JSON, attach media, duplicate check, upload, generate website-ready JSON.
11. Explain reseed/sync. Show System page. Explain `posts.local.json -> reseed -> MongoDB` and `MongoDB -> live store sync -> posts.local.json`.
12. End with future improvements: deeper importer update modes, persistent job queue, clearer AI runtime mode display, and stronger moderation workflows.

## 19. File Map

Root:

- [README.md](../README.md): setup, deployment, routes, feature summary, API examples.
- [.env.example](../.env.example): sanitized configuration template.
- [package.json](../package.json): root lint/test/verify/CI scripts.
- [playwright.config.js](../playwright.config.js): E2E config.
- [eslint.config.js](../eslint.config.js): lint config.

Frontend:

- [frontend/src/App.jsx](../frontend/src/App.jsx): route tree, theme state, auth state, mini-player queue/media logic.
- [frontend/src/main.jsx](../frontend/src/main.jsx): React entry.
- [frontend/src/lib/site.js](../frontend/src/lib/site.js): shared frontend domain logic for API base URL, empty schemas, curation, version grouping, world metadata, Cloudinary poster URLs, theme variables.
- [frontend/src/hooks/usePublicApi.js](../frontend/src/hooks/usePublicApi.js): SWR fetch hooks for posts, collections, releases, about, site content.
- [frontend/src/layouts/PublicLayout.jsx](../frontend/src/layouts/PublicLayout.jsx): public shell/navigation.
- [frontend/src/layouts/AdminLayout.jsx](../frontend/src/layouts/AdminLayout.jsx): admin shell, protected route, shared admin data/form actions, upload/importer launch.
- [frontend/src/pages/public/PublicHome.jsx](../frontend/src/pages/public/PublicHome.jsx): homepage.
- [frontend/src/pages/public/ExplorePage.jsx](../frontend/src/pages/public/ExplorePage.jsx): search/explore.
- [frontend/src/pages/public/CollectionsIndexPage.jsx](../frontend/src/pages/public/CollectionsIndexPage.jsx): collection index.
- [frontend/src/pages/public/CollectionDetailPage.jsx](../frontend/src/pages/public/CollectionDetailPage.jsx): collection/world detail.
- [frontend/src/pages/public/GuidedPathsIndexPage.jsx](../frontend/src/pages/public/GuidedPathsIndexPage.jsx): guided paths index.
- [frontend/src/pages/public/GuidedPathPage.jsx](../frontend/src/pages/public/GuidedPathPage.jsx): guided path detail.
- [frontend/src/pages/public/PublicReleasePage.jsx](../frontend/src/pages/public/PublicReleasePage.jsx): release/song detail.
- [frontend/src/pages/public/AccountPage.jsx](../frontend/src/pages/public/AccountPage.jsx): profile/library/avatar.
- [frontend/src/pages/public/PublicProfilePage.jsx](../frontend/src/pages/public/PublicProfilePage.jsx): sanitized public listener profile and recent public comments.
- [frontend/src/pages/public/LoginPage.jsx](../frontend/src/pages/public/LoginPage.jsx): login/register.
- [frontend/src/components/MiniPlayer.jsx](../frontend/src/components/MiniPlayer.jsx): persistent player controls.
- [frontend/src/components/CommentsSection.jsx](../frontend/src/components/CommentsSection.jsx): threaded public comments, replies, reports, avatars, and profile links.
- [frontend/src/components/RouteAnnouncer.jsx](../frontend/src/components/RouteAnnouncer.jsx): route announcements and path-only scroll reset.
- [frontend/src/components/ReleaseMedia.jsx](../frontend/src/components/ReleaseMedia.jsx): release media display.
- [frontend/src/components/EldoriaWorldMap.jsx](../frontend/src/components/EldoriaWorldMap.jsx): Eldoria themed map.
- `frontend/src/styles/*.css`: app, public shell, admin mode, mini-player, themes, world styling.

Backend:

- [backend/src/server.js](../backend/src/server.js): server startup and DB connection.
- [backend/src/app.js](../backend/src/app.js): Express app middleware/routes/error handling.
- [backend/src/config.js](../backend/src/config.js): environment configuration and production assertions.
- [backend/src/lib/mongo.js](../backend/src/lib/mongo.js): MongoDB connection, Atlas fallback, transaction fallback.
- [backend/src/lib/cloudinary.js](../backend/src/lib/cloudinary.js): Cloudinary config assertion.
- [backend/src/data/store.js](../backend/src/data/store.js): normalized data access layer.
- [backend/src/routes/public.routes.js](../backend/src/routes/public.routes.js): public posts, collections, comments/replies/reports, public profiles, site content.
- [backend/src/routes/auth.routes.js](../backend/src/routes/auth.routes.js): login/register/me/library/avatar.
- [backend/src/routes/admin.routes.js](../backend/src/routes/admin.routes.js): admin CRUD, sync, reseed, AI, importer, moderation, users.
- [backend/src/routes/upload.routes.js](../backend/src/routes/upload.routes.js): admin video upload.
- [backend/src/middleware/auth.js](../backend/src/middleware/auth.js): JWT cookie/bearer auth.
- [backend/src/middleware/mutationProtection.js](../backend/src/middleware/mutationProtection.js): unsafe request protection and catalog mutation gate.
- [backend/src/middleware/rateLimiters.js](../backend/src/middleware/rateLimiters.js): login/comment limits.
- [backend/src/services/catalogService.js](../backend/src/services/catalogService.js): post/collection normalization, slug references, curation rules.
- [backend/src/services/siteContentService.js](../backend/src/services/siteContentService.js): site/about/guided path normalization.
- [backend/src/services/archiveInsights.js](../backend/src/services/archiveInsights.js): admin dashboard metrics.
- [backend/src/services/localAiService.js](../backend/src/services/localAiService.js): Ollama assistant prompts/status/validation.
- [backend/src/services/remoteAiService.js](../backend/src/services/remoteAiService.js): optional Thunder SSH tunnel process management and remote Ollama wake controls.
- [backend/src/services/liveStoreSync.js](../backend/src/services/liveStoreSync.js): MongoDB-to-posts-file sync.
- [backend/src/services/reseedLiveSiteService.js](../backend/src/services/reseedLiveSiteService.js): background reseed job wrapper.
- [backend/src/services/importerLauncherService.js](../backend/src/services/importerLauncherService.js): starts local Flask importer.
- [backend/scripts/reseed-from-posts-file.js](../backend/scripts/reseed-from-posts-file.js): posts file to MongoDB reseed.
- [backend/scripts/sync-live-store-to-posts-file.js](../backend/scripts/sync-live-store-to-posts-file.js): live store sync CLI.
- [backend/scripts/sync-tracked-catalog-from-live.js](../backend/scripts/sync-tracked-catalog-from-live.js): tracked catalog reconciliation/diff/report.
- [backend/data/posts.local.json](../backend/data/posts.local.json): current local authored catalog in this workspace.
- [backend/data/posts.template.json](../backend/data/posts.template.json): tracked safe template.

Importer:

- [tools/song-importer/main.py](../tools/song-importer/main.py): CLI/web entry.
- [tools/song-importer/src/config.py](../tools/song-importer/src/config.py): importer config/env.
- [tools/song-importer/src/pipeline.py](../tools/song-importer/src/pipeline.py): shared processing pipeline.
- [tools/song-importer/src/web_app.py](../tools/song-importer/src/web_app.py): Flask browser UI/API.
- [tools/song-importer/src/normalizer.py](../tools/song-importer/src/normalizer.py): song normalization.
- [tools/song-importer/src/duplicate_checker.py](../tools/song-importer/src/duplicate_checker.py): duplicate scoring.
- [tools/song-importer/src/uploader.py](../tools/song-importer/src/uploader.py): Cloudinary upload.
- [tools/song-importer/src/website_mapper.py](../tools/song-importer/src/website_mapper.py): website post mapping.
- [tools/song-importer/src/website_integration.py](../tools/song-importer/src/website_integration.py): apply/reseed/verify website changes.
- [tools/song-importer/templates/import_window.html](../tools/song-importer/templates/import_window.html): importer browser UI template.
- [tools/song-importer/tests](../tools/song-importer/tests): pytest coverage.

Docs:

- [docs/catalog-source-of-truth.md](catalog-source-of-truth.md): source-of-truth notes.
- [docs/admin-ollama-assistant.md](admin-ollama-assistant.md): assistant notes.
- [docs/local-admin-assistant.md](local-admin-assistant.md): local AI notes.
- [docs/operations-runbook.md](operations-runbook.md): operations/backup guidance.
- [docs/admin-catalog-tools.md](admin-catalog-tools.md): admin tools notes.
- [docs/guided-listening-paths.md](guided-listening-paths.md): guided path notes.

## 20. Glossary

- Release/song/post: one catalog entry for a song. The backend calls it a post; the public UI presents it as a release/song.
- Collection: a group of releases connected by world, theme, or archive category. Collections have slugs and can be public-primary.
- Guided path/listening path: a curated route through releases, defined by manual `postSlugs` and/or algorithm fields.
- Version family: a grouping key that keeps alternate versions/remixes of the same song together.
- Release status: `canon`, `alternate`, or `working`, used for public curation and version selection.
- World layer: metadata describing a song’s story layer, such as core, author-layer, meta-memory, proto, inspired, or villain.
- Theme tags: freeform mood/story tags used for filtering, curation, and assistant context.
- Live store: MongoDB data currently used by the API.
- Seed file: authored JSON file used to initialize or reseed the live store.
- Reseed: process that copies posts/collections from the authored posts file into MongoDB.
- Sync: process that copies current MongoDB authored content back into the posts file.
- Cloudinary URL: hosted media URL returned by Cloudinary, usually `secure_url`, stored as `videoUrl` or `avatarUrl`.
- Mini-player: persistent frontend playback UI backed by a hidden media element in [App.jsx](../frontend/src/App.jsx).
- Admin studio: protected `/admin` UI for managing content, users, comments, operations, importer, and AI.
- Local AI: Ollama running on the same machine the backend can reach.
- Remote AI: Ollama running on Thunder Compute and reached through either a forwarded HTTPS URL or an SSH tunnel.
- Ollama: local model server exposing `/api/tags` and `/api/generate`.
- Thunder Compute: GPU cloud provider used to run Ollama models remotely.
- SSH tunnel: local port forwarding that lets backend call remote Ollama as if it were local.
- Thunder forwarded URL: Thunder's port-forwarding mode for exposing Ollama port `11434` at an HTTPS URL used as `LOCAL_AI_BASE_URL`.
