# Admin Ollama Assistant

The admin AI assistant is an Ollama client with optional Thunder SSH helpers.
It is not an autonomous editor: it returns review-only suggestions that an admin
must inspect before changing catalog data.

## Runtime

The assistant always calls:

```text
LOCAL_AI_BASE_URL/api/tags
LOCAL_AI_BASE_URL/api/generate
```

For Thunder, keep `LOCAL_AI_BASE_URL=http://127.0.0.1:11434` and open the SSH
tunnel from the Admin AI Runtime page.

```text
local backend 127.0.0.1:11434
  -> SSH tunnel
  -> Thunder 127.0.0.1:11434
  -> Ollama
```

## Admin Routes

- `GET /api/admin/assistant/status`: checks local Ollama status and remote
  tunnel status.
- `GET /api/admin/assistant/remote-tunnel/status`: checks only the SSH tunnel.
- `POST /api/admin/assistant/remote-tunnel/start`: starts the local SSH port
  forward.
- `POST /api/admin/assistant/remote-tunnel/stop`: stops the saved tunnel
  process.
- `POST /api/admin/assistant/remote-ollama/wake`: starts `ollama serve` on
  Thunder over SSH if it is not already running.
- `POST /api/admin/assistant/catalog-review`: runs a non-destructive catalog
  review.
- `POST /api/admin/assistant/catalog-finding-review`: reviews one finding
  against the target post.
- `POST /api/admin/assistant/catalog-finding-dismiss`: records a dismissal.
- `POST /api/admin/assistant/post-suggestions`: suggests post draft fields.
- `POST /api/admin/assistant/guided-path-suggestions`: suggests edits for one
  guided path.
- `POST /api/admin/assistant/guided-path-new-suggestion`: suggests a new guided
  path.

## Thunder SSH

Thunder instances are managed manually. Start or restore the instance in Thunder
first. Prefer pointing the app at the Thunder SSH config alias, such as `tnr-0`,
and leave the port/key blank. That lets Thunder update the real host, port, and
key in `~/.ssh/config` after a restore without requiring backend env changes.

```env
REMOTE_AI_ENABLED=true
REMOTE_AI_SSH_HOST=tnr-0
REMOTE_AI_SSH_PORT=
REMOTE_AI_SSH_USER=ubuntu
REMOTE_AI_SSH_KEY_PATH=
REMOTE_AI_TUNNEL_LOCAL_PORT=11434
REMOTE_AI_TUNNEL_REMOTE_HOST=127.0.0.1
REMOTE_AI_TUNNEL_REMOTE_PORT=11434
REMOTE_AI_OLLAMA_MODELS_PATH=/home/ubuntu/ollama-models
REMOTE_AI_OLLAMA_LOG_PATH=/home/ubuntu/ollama.log
```

The wake script uses:

```sh
export OLLAMA_MODELS="/home/ubuntu/ollama-models"
export OLLAMA_FLASH_ATTENTION=1
export OLLAMA_NUM_PARALLEL=1
export OLLAMA_MAX_LOADED_MODELS=1
export CUDA_VISIBLE_DEVICES=0
nohup ollama serve > "/home/ubuntu/ollama.log" 2>&1 &
ollama list
curl -s http://127.0.0.1:11434/api/tags
```

It does not use `systemd` or `sudo`.

## Files

- `backend/src/services/localAiService.js`: prompt building, Ollama requests,
  JSON parsing, and result normalization.
- `backend/src/services/remoteAiService.js`: Thunder SSH tunnel and wake
  controls.
- `frontend/src/pages/admin/AdminAiRuntimePage.jsx`: admin runtime dashboard
  and catalog review surface.

## Shutdown

To stop billing, snapshot/delete the Thunder instance from Thunder. The app does
not manage provider lifecycle or billing.
