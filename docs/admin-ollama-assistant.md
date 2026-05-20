# Admin Ollama Assistant

## Purpose

The Ollama admin assistant is a review-and-suggestion system for the admin side
of the site. It helps with:

- catalog review from the Insights page
- post draft suggestions from the Posts editor
- guided path patch suggestions from the Paths page
- new guided path suggestions from the Paths page
- remote RunPod, SSH tunnel, and remote Ollama runtime control from the
  Insights page

It is not the source of truth. It does not silently rewrite posts,
collections, or guided paths on its own. It returns suggestions, and the admin
decides whether to apply them.

## High-Level Architecture

The assistant is split into two parallel concerns:

1. Suggestion flow

- Frontend admin UI gathers context
- Backend assistant route receives the request
- Backend builds a structured prompt
- Backend sends the prompt to Ollama
- Ollama returns JSON
- Backend normalizes and filters that JSON
- Frontend renders the result
- Admin optionally applies the patch into the current unsaved draft

2. Runtime control flow

- Frontend Insights UI calls backend runtime routes
- Backend controls RunPod pod state
- Backend controls the SSH tunnel
- Backend can bootstrap and start remote Ollama
- Frontend then refreshes assistant status

## File-Level Map

### [frontend/src/layouts/AdminLayout.jsx](/d:/Docs/Active%20Project/React%20Final%20Project/frontend/src/layouts/AdminLayout.jsx)

Role:

- shared admin shell and data-loading layer
- defines `adminFetch`, which every admin page uses for authenticated backend
  calls

Important functions/components:

- `AdminLayout`
- `useAdminContext`
- `adminFetch`
- `loadAdminData`

Data flowing in:

- authenticated admin browser session
- current API base URL from `apiBaseUrl`

Data flowing out:

- `adminFetch` callback
- admin collections/posts/site settings context for child pages

Reads, writes, or suggests:

- reads backend admin resources
- writes only when child pages call mutations through `adminFetch`
- does not construct AI prompts

Frontend to backend:

- all admin assistant pages ultimately call backend through `adminFetch`
- `adminFetch` adds:
  - `credentials: "include"`
  - mutation intent headers for unsafe methods
  - `cache: "no-store"` so assistant status/runtime state stays fresh

Error handling:

- `401` and `403` trigger `handleSessionExpired`
- page-level loading errors are converted into generic admin UI errors

What can modify site data:

- this file itself does not modify site data
- it only provides the transport used by child pages

### [frontend/src/lib/site.js](/d:/Docs/Active%20Project/React%20Final%20Project/frontend/src/lib/site.js)

Role:

- shared frontend constants
- defines API origin

Important exports:

- `apiBaseUrl`
- `emptyPost`
- `emptyCollection`
- other site/editor constants

Data flowing in:

- Vite env via `import.meta.env.VITE_API_URL`

Data flowing out:

- concrete API base used by admin pages

Reads, writes, or suggests:

- reads env-derived frontend configuration only

### [frontend/src/lib/adminAssistant.js](/d:/Docs/Active%20Project/React%20Final%20Project/frontend/src/lib/adminAssistant.js)

Role:

- shared frontend helper layer for assistant model profile selection

Important functions:

- `readAssistantModelProfile()`
- `writeAssistantModelProfile(profileKey)`
- `buildAssistantStatusUrl(apiBaseUrl, profileKey)`
- `withAssistantProfile(body, profileKey)`

Data flowing in:

- browser `localStorage`
- selected profile key from the UI

Data flowing out:

- profile-aware request payloads
- absolute `assistant/status` URL

Reads, writes, or suggests:

- reads and writes frontend-only local storage
- does not touch backend state or site content

Error handling:

- defensive no-op behavior when `window` is unavailable

### [frontend/src/pages/admin/AdminInsightsPage.jsx](/d:/Docs/Active%20Project/React%20Final%20Project/frontend/src/pages/admin/AdminInsightsPage.jsx)

Role:

- operational dashboard for assistant status, runtime control, and catalog
  review

Important functions/components:

- `AdminInsightsPage`
- `handleRefreshLocalAiStatus`
- `handleRemotePodAction`
- `handleRemoteTunnelAction`
- `handleRemoteOllamaWake`
- `handleLocalAiCatalogReview`
- `handleAssistantProfileChange`

Data flowing in:

- `adminFetch` from `AdminLayout`
- selected assistant profile from `localStorage`
- assistant status response
- remote pod status response
- SSH tunnel status response

Data flowing out:

- POST requests to:
  - `/api/admin/assistant/remote-pod/start`
  - `/api/admin/assistant/remote-pod/stop`
  - `/api/admin/assistant/remote-tunnel/start`
  - `/api/admin/assistant/remote-tunnel/stop`
  - `/api/admin/assistant/remote-ollama/wake`
  - `/api/admin/assistant/catalog-review`
- GET request to:
  - `/api/admin/assistant/status`

Reads, writes, or suggests:

- reads status and review data
- writes only operational state by invoking runtime control routes
- does not directly modify posts/collections/paths

How the frontend calls the backend:

- `handleRefreshLocalAiStatus` calls `buildAssistantStatusUrl(...)`
- `handleLocalAiCatalogReview` sends `profile` in the request body through
  `withAssistantProfile`

What actually modifies site data:

- none of the assistant actions here modify catalog content
- pod/tunnel/wake routes modify runtime state only

### [frontend/src/pages/admin/AdminPostsPage.jsx](/d:/Docs/Active%20Project/React%20Final%20Project/frontend/src/pages/admin/AdminPostsPage.jsx)

Role:

- post authoring/editor workspace
- contains the post assistant UI

Important functions/components:

- `AdminPostsPage`
- `handlePostAssistantSuggest`
- `handleApplyAssistantSuggestion`
- `handleAssistantProfileChange`

Data flowing in:

- current post draft snapshot from editor state
- assistant status from `/api/admin/assistant/status`

Data flowing out:

- POST `/api/admin/assistant/post-suggestions`
  - body includes:
    - `profile`
    - `postDraft`

Reads, writes, or suggests:

- reads current draft form state
- suggestion action only asks for a patch
- apply action writes only into the current unsaved frontend form state
- actual persistence still happens only when the admin later saves the post

Where prompts are constructed:

- not here; this page only submits `postDraft`

Error handling:

- `assistantError`
- `assistantStatusError`

What can modify site data:

- `handleApplyAssistantSuggestion` only mutates local editor state
- no DB write happens until the admin submits the post form

### [frontend/src/pages/admin/AdminPathsPage.jsx](/d:/Docs/Active%20Project/React%20Final%20Project/frontend/src/pages/admin/AdminPathsPage.jsx)

Role:

- guided path editor/workspace
- contains the path assistant UI

Important functions/components:

- `AdminPathsPage`
- `requestPathSuggestion`
- `handleGuidedPathAssistantSuggest`
- `handleNewGuidedPathSuggestion`
- `handleApplyGuidedPathSuggestion`
- `handleAssistantProfileChange`

Data flowing in:

- current guided path draft JSON / selected path
- assistant status from `/api/admin/assistant/status`

Data flowing out:

- POST `/api/admin/assistant/guided-path-suggestions`
- POST `/api/admin/assistant/guided-path-new-suggestion`
- both carry `profile`

Reads, writes, or suggests:

- reads current unsaved guided path draft
- assistant only suggests
- apply action mutates local unsaved guided path draft state
- persistence only happens when site settings are saved

Error handling:

- `guidedPathAssistantError`
- `assistantStatusError`

What can modify site data:

- only local draft state until explicit save

### [backend/src/server.js](/d:/Docs/Active%20Project/React%20Final%20Project/backend/src/server.js)

Role:

- backend entrypoint
- loads `backend/.env`
- starts Express after DB/store setup

Important functions:

- `startServer`

Data flowing in:

- env vars from `backend/.env`

Data flowing out:

- running backend process on configured port

Reads, writes, or suggests:

- reads env
- does not perform assistant logic directly

### [backend/src/config.js](/d:/Docs/Active%20Project/React%20Final%20Project/backend/src/config.js)

Role:

- central configuration source for assistant/runtime behavior

Important fields:

- `localAiEnabled`
- `localAiBaseUrl`
- `localAiModel`
- `localAiModelProfilesRaw`
- `localAiTimeoutMs`
- `localAiStatusCacheMs`
- `localAiKeepAlive`
- `localAiDefaultNumCtx`
- `localAiDefaultNumPredict`
- `localAiNumThread`
- `localAiPostNumPredict`
- `localAiPathNumPredict`
- `localAiNewPathNumPredict`
- `runpodApiKey`
- `runpodPodId`
- `runpodApiBaseUrl`
- SSH tunnel and remote Ollama fields

Data flowing in:

- `process.env`

Data flowing out:

- normalized config object consumed by services

Reads, writes, or suggests:

- reads config only

### [backend/src/routes/admin.routes.js](/d:/Docs/Active%20Project/React%20Final%20Project/backend/src/routes/admin.routes.js)

Role:

- HTTP entrypoint for admin assistant routes

Important functions/routes:

- `getAssistantModelSelection(req)`
- `GET /assistant/status`
- `POST /assistant/remote-pod/start`
- `POST /assistant/remote-pod/stop`
- `POST /assistant/remote-tunnel/start`
- `POST /assistant/remote-tunnel/stop`
- `POST /assistant/remote-ollama/wake`
- `POST /assistant/catalog-review`
- `POST /assistant/post-suggestions`
- `POST /assistant/guided-path-suggestions`
- `POST /assistant/guided-path-new-suggestion`

Data flowing in:

- authenticated admin HTTP requests
- current store data for suggestion routes
- optional `profile` or `model` selection
- post or path draft payloads

Data flowing out:

- status payloads
- review/suggestion payloads
- runtime action payloads

Reads, writes, or suggests:

- reads store data for AI context
- runtime routes write operational state
- suggestion routes return suggestions only
- audit events are written for assistant/runtime actions

How the backend calls Ollama:

- through `backend/src/services/localAiService.js`

Where errors are handled:

- route-level try/catch
- if `error.localAiStatus` exists, routes return structured `503`
- runtime routes return explicit error messages and status codes

What actions can actually modify site data:

- none of the assistant suggestion routes directly persist posts or paths
- they only return suggestion objects
- the route does write audit log entries describing the assistant action

### [backend/src/services/localAiService.js](/d:/Docs/Active%20Project/React%20Final%20Project/backend/src/services/localAiService.js)

Role:

- core assistant service
- model profile resolution
- Ollama status checks
- prompt construction
- Ollama request execution
- response normalization and safety filtering

Important functions:

- `getConfiguredModelProfiles()`
- `resolveRequestedModel(options)`
- `getLocalAiStatus(options)`
- `assertLocalAiReady(options)`
- `fetchOllama(path, options)`
- `generateJson(prompt, options)`
- `reviewCatalogWithLocalAi(store, options)`
- `suggestPostDraftWithLocalAi(store, postDraft, options)`
- `suggestGuidedPathWithLocalAi(store, guidedPath, options)`
- `suggestNewGuidedPathWithLocalAi(store, existingPaths, options)`

Important normalization/safety helpers:

- `extractJsonObject`
- `normalizeReviewResult`
- `normalizePostSuggestionResult`
- `normalizeGuidedPathSuggestionResult`
- `normalizeNewGuidedPathSuggestionResult`
- `valuesAreEquivalent`
- `isStrongExcerptPatch`
- `isStrongContentPatch`
- `getGuidedPathCandidatePosts`
- `titleFitsSuggestedMembership`

Data flowing in:

- current admin store data
- current post draft or guided path draft
- selected model profile or explicit model
- config limits such as `num_predict`, `num_ctx`, `keep_alive`

Data flowing out:

- normalized review object
- normalized post suggestion object
- normalized path suggestion object

Reads, writes, or suggests:

- reads store/draft data
- reads Ollama `/api/tags` and `/api/generate`
- does not write posts, collections, or site settings
- only suggests

How the backend calls Ollama:

- `fetchOllama("/api/tags")` for status
- `fetchOllama("/api/generate")` for actual generation
- request body includes:
  - `model`
  - `prompt`
  - `stream: false`
  - `format: "json"`
  - `keep_alive`
  - `options` with temperature/context/predict/thread settings

Where prompts are constructed:

- `reviewCatalogWithLocalAi`
- `suggestPostDraftWithLocalAi`
- retry prompt inside `suggestPostDraftWithLocalAi`
- `suggestGuidedPathWithLocalAi`
- `suggestNewGuidedPathWithLocalAi`
- JSON shape instructions are embedded directly in those prompt arrays

Where errors are handled:

- `getLocalAiStatus` converts transport failures into structured unavailable
  status
- `assertLocalAiReady` throws `503` when Ollama or the selected model is not
  available
- `generateJson` retries once with a repair prompt if the first answer is not
  valid JSON

Safety boundaries:

- selected model must actually be installed
- post metadata patches are filtered if they only repeat existing values
- weak excerpt/content rewrites are dropped
- guided path slugs must exist in the provided candidate set
- world titles for new paths are cleared if they do not match membership

### [backend/src/services/runpodPodService.js](/d:/Docs/Active%20Project/React%20Final%20Project/backend/src/services/runpodPodService.js)

Role:

- RunPod API integration
- pod status/start/stop
- SSH endpoint discovery from pod metadata

Important functions:

- `getRunpodPodStatus()`
- `startRunpodPod()`
- `stopRunpodPod()`
- `getRunpodSshEndpoint()`
- `fetchRunpod(path, options)`

Data flowing in:

- RunPod API key and pod ID from config

Data flowing out:

- normalized pod status object
- normalized SSH endpoint derived from `publicIp` and `portMappings["22"]`

Reads, writes, or suggests:

- reads provider state
- writes provider state by calling RunPod start/stop APIs
- does not touch site content

Error handling:

- if config is missing, returns `configured: false`
- if provider fetch fails after config is present, returns `runtimeStatus: "error"`

### [backend/src/services/remoteAiTunnelService.js](/d:/Docs/Active%20Project/React%20Final%20Project/backend/src/services/remoteAiTunnelService.js)

Role:

- local machine SSH tunnel automation for remote Ollama access

Important functions:

- `getRemoteAiTunnelStatus()`
- `startRemoteAiTunnel()`
- `stopRemoteAiTunnel()`
- `resolveTunnelSshTarget()`
- `waitForTunnelReady()`

Data flowing in:

- RunPod SSH endpoint or manual SSH config
- local SSH key path

Data flowing out:

- tunnel status object
- spawned `ssh -N -L ...` process state

Reads, writes, or suggests:

- writes operational state to:
  - [backend/src/data/remote-ai-tunnel.json](/d:/Docs/Active%20Project/React%20Final%20Project/backend/src/data/remote-ai-tunnel.json)
  - [backend/src/data/remote-ai-tunnel.log](/d:/Docs/Active%20Project/React%20Final%20Project/backend/src/data/remote-ai-tunnel.log)
- does not write catalog/site data

Error handling:

- detects local port readiness timeout
- returns detailed SSH failure messages

### [backend/src/services/remoteOllamaService.js](/d:/Docs/Active%20Project/React%20Final%20Project/backend/src/services/remoteOllamaService.js)

Role:

- remote Ollama bootstrap/wake logic over SSH

Important functions:

- `wakeRemoteOllama()`
- `runSshCommand(...)`
- `resolveRemoteSshTarget()`
- `normalizeRemoteOllamaResponse(...)`

Important constants:

- `REMOTE_OLLAMA_BINARY`
- `REMOTE_OLLAMA_MODELS_DIR`
- `REMOTE_OLLAMA_LOG`

Data flowing in:

- resolved SSH target
- remote keep-alive/parallel config
- remote model storage directory

Data flowing out:

- normalized remote Ollama status after wake/bootstrap

Reads, writes, or suggests:

- writes operational state on the remote pod:
  - installs Ollama if missing
  - creates `/workspace/ollama-models`
  - starts `ollama serve`
  - writes `/workspace/ollama.log`
- does not modify site content

How the backend calls Ollama here:

- indirectly, by SSHing into the pod and using `curl http://127.0.0.1:11434/api/tags`
- not through local `fetchOllama`

Error handling:

- SSH timeout becomes `504`
- remote bootstrap failures become explicit assistant runtime errors

### [backend/src/data/store.js](/d:/Docs/Active%20Project/React%20Final%20Project/backend/src/data/store.js)

Role:

- live store read/write layer used by admin routes

Assistant relevance:

- assistant routes call `readStore()` to gather context
- assistant does not directly write through this file

### [backend/src/services/adminAuditService.js](/d:/Docs/Active%20Project/React%20Final%20Project/backend/src/services/adminAuditService.js)

Role:

- records audit entries for assistant/runtime actions

Assistant relevance:

- every assistant action in `admin.routes.js` records an audit event

### [docs/local-admin-assistant.md](/d:/Docs/Active%20Project/React%20Final%20Project/docs/local-admin-assistant.md)

Role:

- existing operational setup doc for local/remote assistant runtime

Assistant relevance:

- companion document for environment setup and remote Ollama usage

## Full Request Flow

### A. Catalog review from Insights

1. Admin opens Insights.
2. `AdminInsightsPage` loads assistant status from
   `/api/admin/assistant/status`.
3. Admin picks a model profile.
4. Admin clicks `Run Catalog Review`.
5. `handleLocalAiCatalogReview` sends POST
   `/api/admin/assistant/catalog-review` with `profile`.
6. `admin.routes.js` reads the live store with `readStore()`.
7. `reviewCatalogWithLocalAi` in `localAiService.js`:
   - verifies Ollama availability
   - verifies selected model is installed
   - builds catalog context
   - constructs prompt
   - calls `generateJson`
8. `generateJson` sends POST `${LOCAL_AI_BASE_URL}/api/generate`.
9. Ollama responds.
10. Backend parses JSON and returns `review`.
11. Insights page renders the review.

### B. Post suggestion from the Posts page

1. Admin edits a post in `AdminPostsPage`.
2. Page builds `currentSnapshot`.
3. Admin clicks `Suggest Draft Patch`.
4. Frontend sends POST `/api/admin/assistant/post-suggestions` with:
   - `profile`
   - `postDraft`
5. Route reads store and calls `suggestPostDraftWithLocalAi`.
6. Backend builds context with:
   - allowed release statuses
   - summarized collections
   - summarized current draft
   - comparable posts
7. Prompt is constructed in `suggestPostDraftWithLocalAi`.
8. Ollama is called through `generateJson`.
9. Response is normalized and filtered:
   - invalid fields dropped
   - repeated metadata dropped
   - weak excerpt/content rewrites dropped
10. Suggestion object is returned.
11. Admin can click `Apply Suggestions`.
12. That only updates the unsaved frontend form.
13. Actual persistence happens later when the post form is saved.

### C. Guided path patch suggestion

1. Admin selects a path in `AdminPathsPage`.
2. Admin clicks `Suggest Path Patch`.
3. Frontend sends POST `/api/admin/assistant/guided-path-suggestions`.
4. Backend reads store and calls `suggestGuidedPathWithLocalAi`.
5. Candidate posts are scoped with `getGuidedPathCandidatePosts`.
6. Prompt is constructed with current path plus candidate posts.
7. Ollama returns JSON.
8. Backend normalizes:
   - only valid post slugs
   - only valid algorithm fields
   - no invented collection slugs
9. Frontend renders the suggestion.
10. `Apply Path Suggestion` updates the unsaved guided path draft only.

### D. New guided path suggestion

1. Admin clicks `Suggest New Path`.
2. Frontend sends POST `/api/admin/assistant/guided-path-new-suggestion`.
3. Backend reads store and current existing paths.
4. Prompt is constructed in `suggestNewGuidedPathWithLocalAi`.
5. Ollama returns JSON.
6. Backend normalizes:
   - slug
   - title
   - membership
   - algorithm if present
7. Backend clears misleading titles if they do not match suggested membership.
8. Frontend renders suggestion.
9. `Add New Path` only updates local unsaved draft state.

### E. Remote runtime control flow

1. Admin uses Insights runtime buttons.
2. `Start Remote AI` calls `startRunpodPod`.
3. `Open SSH Tunnel` calls `startRemoteAiTunnel`.
4. `Wake Remote Ollama` calls `wakeRemoteOllama`.
5. `wakeRemoteOllama` may:
   - discover SSH endpoint from RunPod
   - install Ollama
   - start `ollama serve`
   - verify `/api/tags`
6. Admin refreshes assistant status.
7. Assistant actions then use `LOCAL_AI_BASE_URL`, which can be the tunnel.

## Prompt Construction

Prompt strings are built directly inside
[backend/src/services/localAiService.js](/d:/Docs/Active%20Project/React%20Final%20Project/backend/src/services/localAiService.js).

The implementation uses prompt arrays joined with `"\n"` so each task can:

- define a strict JSON shape
- define allowed fields and values
- instruct the model not to invent slugs
- instruct the model to avoid churn
- add task-specific context payloads as final JSON

There is no separate prompt template file right now.

## Ollama Connection Details

### Direct/local mode

- backend uses `LOCAL_AI_BASE_URL`
- status check hits `/api/tags`
- generation hits `/api/generate`

### Remote mode

- backend talks to a local SSH-forwarded port or another configured endpoint
- RunPod control is separate from Ollama inference
- RunPod API controls pod state
- SSH tunnel exposes remote `127.0.0.1:11434` to local `127.0.0.1:11434`
- backend still talks to `LOCAL_AI_BASE_URL`

## Safety Boundaries

- assistant routes are review/suggestion only
- posts are not saved automatically
- guided paths are not saved automatically
- collections are not directly rewritten by assistant routes
- prompts tell the model not to invent slugs
- backend rejects missing selected models
- backend filters invalid/weak/no-op patch fields
- audit entries record assistant actions

## What the Assistant Can Change vs Cannot Change

### Can do

- suggest a catalog review summary
- suggest post draft field patches
- suggest guided path patches
- suggest a brand-new guided path
- start/stop pod runtime
- open/close SSH tunnel
- wake/install remote Ollama

### Cannot do automatically

- save a post to the database on its own
- save site settings on its own
- overwrite collections silently
- run source-of-truth sync as part of suggestion generation
- mutate tracked catalog files as part of suggestion generation

## Source of Truth

The assistant is not the source of truth.

Operationally:

- live admin-backed data remains the working content source during admin usage
- local suggestion application affects only current drafts until explicit save
- tracked/local catalog files are separate from assistant suggestions

## How to Run It Locally

1. Start backend.
2. Start frontend.
3. Start Ollama locally, or start the remote pod + tunnel + remote Ollama.
4. Make sure the selected model is installed.
5. Open admin.
6. Use Insights, Posts, or Paths assistant controls.

Relevant config:

- `LOCAL_AI_ENABLED`
- `LOCAL_AI_BASE_URL`
- `LOCAL_AI_MODEL`
- `LOCAL_AI_MODEL_PROFILES`
- `RUNPOD_API_KEY`
- `RUNPOD_POD_ID`
- SSH/tunnel vars

## Common Errors

### `Local AI is disabled by LOCAL_AI_ENABLED=false.`

Meaning:

- backend assistant is intentionally disabled

### `Ollama is running, but <model> is not installed.`

Meaning:

- status endpoint is reachable
- selected profile model is missing

### `Timed out while contacting Ollama.`

Meaning:

- backend could not get a timely response from `/api/tags` or `/api/generate`

### `The local model did not return valid JSON.`

Meaning:

- Ollama returned malformed output
- backend attempted one JSON repair pass and still could not parse it

### `SSH tunnel did not become ready on local port 11434.`

Meaning:

- remote tunnel automation started but the local forwarded port never became
  reachable

### `RunPod SSH endpoint is not ready yet.`

Meaning:

- pod exists but RunPod has not yet published usable SSH connection details

## Troubleshooting

If the assistant fails:

1. Check backend status route:

- `/api/admin/assistant/status`

2. Check Ollama runtime:

- local `/api/tags`
- remote `/api/tags` through the pod

3. Check the selected model:

- confirm the profile is installed in Ollama

4. Check SSH tunnel:

- [backend/src/data/remote-ai-tunnel.log](/d:/Docs/Active%20Project/React%20Final%20Project/backend/src/data/remote-ai-tunnel.log)
- [backend/src/data/remote-ai-tunnel.json](/d:/Docs/Active%20Project/React%20Final%20Project/backend/src/data/remote-ai-tunnel.json)

5. Check remote Ollama log:

- `/workspace/ollama.log` on the RunPod pod

6. Check RunPod status:

- verify pod is actually `RUNNING`
- verify SSH endpoint exists

7. Check browser/admin runtime:

- confirm frontend is using the expected API base
- refresh assistant status after runtime changes

## Future Improvements

- split algorithm path review from candidate-song-set review
- add model-specific warm-up for the selected profile
- move prompt templates into dedicated files for easier iteration
- add field locks so the assistant cannot touch chosen fields
- add side-by-side diff views before apply
- add confidence scores per suggestion field
- add richer runtime diagnostics directly in the UI
