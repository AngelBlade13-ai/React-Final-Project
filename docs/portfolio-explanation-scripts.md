# Suno Diary Portfolio Explanation Scripts

## 60-Second Elevator Pitch

Suno Diary is a full-stack archive for my Suno-generated songs. The public site lets visitors browse releases, collections, story worlds, guided listening paths, search results, threaded comments, public listener profiles, and a persistent mini-player. The backend is Express with MongoDB, Cloudinary media URLs, JWT cookie sessions, account libraries, comment replies/reports, and admin moderation.

The admin studio manages posts, collections, site content, guided paths, users, comments, reseeding, live-store sync, importer launch, and Ollama AI suggestions. The interesting part is that it solves a real catalog problem: MongoDB is the live store, JSON is the authored seed/source, Cloudinary hosts media, and AI/import tools help maintain the catalog without blindly mutating it.

## 5-Minute Portfolio Walkthrough

I would start on the homepage and explain that this is not a generic blog; it is a music archive where every song has metadata, lyrics, media, collections, version status, public visibility, and sometimes story-world context. Then I would open Collections and Guided Paths to show the difference between grouping songs and creating a listening route.

Next I would play a song and explain the Cloudinary pipeline: upload produces a `secure_url`, that URL is stored as `post.videoUrl`, and the browser streams directly from Cloudinary through the mini-player. The backend is not serving media bytes.

Then I would open a release page and show comments, replies, profile avatars, report controls, save/reaction controls, and slug-based routing. Public profile pages show only sanitized public data, while saved songs, recent listens, and reactions stay behind the authenticated account page.

After that I would open the admin studio. I would show Insights first to explain catalog health, then posts/collections/guided paths to show the management workflow. I would point out that admin changes write to MongoDB, while reseed and live-store sync move data between MongoDB and the authored JSON file in opposite directions.

Finally, I would show the AI assistant. It reads catalog context, builds constrained JSON prompts, sends them to Ollama through `LOCAL_AI_BASE_URL`, and returns suggestions for admin review. In production, `LOCAL_AI_BASE_URL` can point to a Thunder Compute forwarded Ollama URL; the site still does not let AI mutate the catalog automatically.

## Technical Interview Explanation

The frontend is a React/Vite app with React Router public/admin route trees. `App.jsx` owns auth state, theme state, and mini-player playback state. SWR hooks load public posts, collections, releases, about content, and site content. The search page filters client-side and updates URL query params on blur/Enter so typing and clicking results do not reset scroll unexpectedly.

The backend is Express mounted under `/api`, with public routes, auth routes, upload routes, and admin routes. MongoDB is accessed through a normalized store layer in `backend/src/data/store.js`, which keeps posts, collections, users, comments, site content, and audit logs in predictable shapes.

The data model is slug-centered. Posts are addressed by `slug`, collections reference posts through `collectionSlugs`, guided paths reference posts through `postSlugs`, comments reference posts through `postSlug`, and replies reference parent comments through `parentCommentId`. Slug history supports public redirects, and admin slug changes remap references.

Media is hosted externally. Admin and importer uploads go to Cloudinary, the app stores returned URLs, and the browser streams from Cloudinary. Video thumbnails are derived from the video URL; the site does not rely on a separate cover image field for public playback.

Authentication uses JWT cookies. Public users can save releases, mark recent listens, react, update profile data, upload avatars, comment, reply, and report misconduct. Admin users get protected `/admin` routes for content, users, comment moderation, insights, sync/reseed, importer launch, and AI. Unsafe mutations require the trusted mutation header, and admin mutations are audited.

The AI assistant is intentionally non-autonomous. `localAiService.js` builds compact JSON prompts, calls Ollama `/api/tags` and `/api/generate`, validates structured output, suppresses dismissed findings with decision memory, and returns suggestions for admin review. Locally it can call `http://127.0.0.1:11434`; in production it can call a Thunder forwarded Ollama URL. The SSH remote service remains available for manual tunnel/wake mode, but the app does not manage Thunder billing or lifecycle.
