## Local Admin Assistant

This adds an optional local AI smoke test for the admin dashboard.

### Runtime

- Provider: Ollama
- Default endpoint: `http://127.0.0.1:11434`
- Default model: `qwen2.5:7b`
- Admin status endpoint: `GET /api/admin/assistant/status`
- Admin catalog review endpoint: `POST /api/admin/assistant/catalog-review`
- Admin post suggestion endpoint: `POST /api/admin/assistant/post-suggestions`
- Admin guided path suggestion endpoint:
  `POST /api/admin/assistant/guided-path-suggestions`
- Admin new guided path suggestion endpoint:
  `POST /api/admin/assistant/guided-path-new-suggestion`

The assistant is intentionally non-destructive. It reads the current catalog,
asks the local model for a JSON-only review, validates the response shape, and
returns suggestions to the admin UI. It does not edit posts, collections,
source files, or source-of-truth sync output.

The post editor also has a targeted assistant panel. It sends the current
unsaved post draft to the backend and accepts only a validated draft patch for
bounded fields: `excerpt`, `content`, `subCategory`, `worldLayer`, `themeTags`,
`releaseStatus`, and `collectionSlugs`. Applying the suggestion only changes the
local form state; the normal post save button is still required to persist it.
The post assistant prioritizes excerpt/content rewrites and filters out
metadata suggestions that simply repeat the current draft values.
It also returns `fieldAssessments` so the UI can show whether each supported
field was kept, improved, missing, or uncertain. The backend enforces those
assessments by accepting patches only for fields marked `improve` or `missing`.

The admin dashboard has a dedicated Paths tab for guided path authoring. It
parses the current JSON draft, so the assistant can detect already-authored
paths before they are saved. It can review one selected path at a time and
suggest path copy, curated `postSlugs`, or a validated `algorithm` block.
If the live database still has an empty guided path list from an older seed, the
backend hydrates the admin draft from the legacy guided path defaults so the
previous hardcoded paths are still editable.

The Insights page also supports optional RunPod lifecycle controls for a remote
GPU pod. When `RUNPOD_API_KEY` and `RUNPOD_POD_ID` are configured, the admin UI
can start or stop that pod without exposing provider credentials to the browser.
This only controls the RunPod pod itself. If `LOCAL_AI_BASE_URL` points to an
SSH tunnel such as `http://127.0.0.1:11434`, that tunnel still has to be opened
separately on the machine running the backend.

The Paths tab can also ask for one new guided path concept. The backend prompts
the model to find a real catalog gap, rejects duplicate slugs, filters suggested
post slugs against public catalog posts, and warns when the model does not
return usable membership. Applying a suggestion only stages it in the unsaved
site settings draft; the normal Save Site Settings action is still required.

### Local Setup

For a GPU-backed host such as RunPod, install Ollama and pull the default model:

```powershell
ollama pull qwen2.5:7b
```

Start the normal app stack and open `/admin/insights`. The Local Assistant Test
Bench panel will show whether Ollama is reachable and whether the configured
model is installed.

For a short local laptop-only test, use `LOCAL_AI_MODEL=qwen2.5:0.5b` instead.
The 0.5B model is much weaker, but it can prove connectivity on constrained
hardware.

### RunPod Tunnel

On the RunPod pod, keep Ollama warm for admin sessions:

```bash
pkill -f ollama
OLLAMA_KEEP_ALIVE=30m nohup ollama serve > /workspace/ollama.log 2>&1 &
curl http://127.0.0.1:11434/api/tags
```

From Windows, open an SSH tunnel using the current RunPod SSH host and port:

```powershell
ssh -L 11434:127.0.0.1:11434 root@RUNPOD_HOST -p RUNPOD_PORT -i ~/.ssh/id_ed25519
```

Keep the tunnel window open while using the assistant. The backend can then call
the remote pod through `http://127.0.0.1:11434`.

### Environment

```env
LOCAL_AI_ENABLED=true
LOCAL_AI_BASE_URL=http://127.0.0.1:11434
LOCAL_AI_MODEL=qwen2.5:7b
LOCAL_AI_TIMEOUT_MS=120000
RUNPOD_API_KEY=
RUNPOD_POD_ID=
RUNPOD_API_BASE_URL=https://rest.runpod.io/v1
```

Set `LOCAL_AI_ENABLED=false` to keep the endpoints visible but unavailable in a
safe, explicit way.

### Why This Shape

- Keeps local AI optional so the admin dashboard works without Ollama.
- Keeps model output review-only until an admin explicitly applies future
  suggestions through existing editors.
- Preserves source-of-truth discipline: AI suggestions do not touch
  `backend/data/posts.json`; approved admin content can still be synced through
  the existing source-of-truth workflow.
