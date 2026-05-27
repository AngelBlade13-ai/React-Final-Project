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
GPU pod. When `RUNPOD_API_KEY` and `RUNPOD_POD_NAME` are configured, the backend
resolves the current pod ID dynamically before start/stop/tunnel/wake actions,
so recreating a pod does not require editing `.env`. `RUNPOD_POD_ID` remains an
optional fallback; set `RUNPOD_POD_ID_OVERRIDE=true` only when you intentionally
want the fixed ID to win over name discovery.

The same Insights panel can also automate the local SSH tunnel when
`RUNPOD_SSH_KEY_PATH` is configured. If `RUNPOD_SSH_HOST` is blank, the backend
asks the RunPod pod API for the current `publicIp` and `portMappings["22"]`, so
the tunnel target updates automatically after a pod restart. It launches a
local detached command equivalent to:

```powershell
ssh -N -L 11434:127.0.0.1:11434 root@RUNPOD_SSH_HOST -p RUNPOD_SSH_PORT -i ~/.ssh/id_ed25519
```

Once the pod and tunnel are ready, the same panel can also wake remote Ollama.
That action SSHes into the pod, installs Ollama if the binary is missing,
forces `OLLAMA_MODELS=/workspace/ollama-models`, starts `ollama serve` with
`OLLAMA_KEEP_ALIVE=30m` if it is not already running, and waits for
`http://127.0.0.1:11434/api/tags` to respond before reporting success.

If you want a manual fallback inside the pod, the repo also includes
`backend/scripts/runpod-bootstrap-ollama.sh`, which performs the same install,
model-path, and startup flow.

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
export OLLAMA_MODELS=/workspace/ollama-models
pkill -f ollama
OLLAMA_KEEP_ALIVE=30m nohup /usr/local/bin/ollama serve > /workspace/ollama.log 2>&1 &
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
ASSISTANT_AI_PROVIDER=ollama
LOCAL_AI_BASE_URL=http://127.0.0.1:11434
LOCAL_AI_MODEL=qwen2.5:7b
# Optional model profiles exposed in admin selectors.
# LOCAL_AI_MODEL_PROFILES=[{"key":"fast","label":"Fast","model":"qwen2.5:7b"},{"key":"balanced","label":"Balanced","model":"qwen3:14b"},{"key":"thorough","label":"Thorough","model":"qwen3:30b"}]
LOCAL_AI_TIMEOUT_MS=120000
RUNPOD_API_KEY=
RUNPOD_POD_NAME=angelina-ollama-admin
RUNPOD_POD_ID=
RUNPOD_POD_ID_OVERRIDE=false
RUNPOD_API_BASE_URL=https://rest.runpod.io/v1
RUNPOD_SSH_HOST=
RUNPOD_SSH_PORT=22
RUNPOD_SSH_USER=root
RUNPOD_SSH_KEY_PATH=~/.ssh/id_ed25519
RUNPOD_TUNNEL_LOCAL_PORT=11434
RUNPOD_TUNNEL_REMOTE_HOST=127.0.0.1
RUNPOD_TUNNEL_REMOTE_PORT=11434
```

Set `LOCAL_AI_ENABLED=false` to keep the endpoints visible but unavailable in a
safe, explicit way. Leave `RUNPOD_SSH_HOST` blank if you want the app to
discover the current SSH host and exposed port from RunPod automatically. The
assistant selectors in admin only enable a profile when Ollama reports that the
profile's model is actually installed.

### RunPod Serverless

For admin-only AI work, use RunPod Serverless to avoid managing a named pod,
SSH endpoint, and local tunnel. The backend still uses the same assistant
prompts and validation logic, but `generateJson` sends each request to a stable
RunPod Serverless endpoint.

```env
LOCAL_AI_ENABLED=true
ASSISTANT_AI_PROVIDER=runpod-serverless
LOCAL_AI_MODEL=qwen2.5:7b
LOCAL_AI_TIMEOUT_MS=180000
RUNPOD_API_KEY=rp_redacted
RUNPOD_SERVERLESS_ENDPOINT_ID=your_endpoint_id
RUNPOD_SERVERLESS_API_BASE_URL=https://api.runpod.ai/v2
RUNPOD_SERVERLESS_INPUT_MODE=ollama
RUNPOD_SERVERLESS_TIMEOUT_MS=180000
```

With the RunPod Ollama Serverless template, keep
`RUNPOD_SERVERLESS_INPUT_MODE=ollama`. The backend posts to:

```text
https://api.runpod.ai/v2/{RUNPOD_SERVERLESS_ENDPOINT_ID}/runsync
```

The request body uses RunPod's Ollama shape:

```json
{
  "input": {
    "method_name": "generate",
    "input": {
      "model": "qwen2.5:7b",
      "prompt": "assistant prompt",
      "stream": false,
      "format": "json",
      "think": false,
      "options": {}
    }
  }
}
```

For a custom handler that expects the prompt directly under `input`, set
`RUNPOD_SERVERLESS_INPUT_MODE=raw`.

### Why This Shape

- Keeps local AI optional so the admin dashboard works without Ollama.
- Keeps model output review-only until an admin explicitly applies future
  suggestions through existing editors.
- Preserves source-of-truth discipline: AI suggestions do not touch
  `backend/data/posts.local.json`; approved admin content can still be synced through
  the existing source-of-truth workflow.
