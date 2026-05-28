# Local Admin Assistant

The admin assistant uses Ollama for catalog review, post suggestions, finding
review, and guided path suggestions. The backend always talks to the Ollama HTTP
API at `LOCAL_AI_BASE_URL`.

For local-only use, run Ollama on the same machine as the backend:

```env
LOCAL_AI_ENABLED=true
LOCAL_AI_BASE_URL=http://127.0.0.1:11434
LOCAL_AI_MODEL=qwen2.5:7b
```

For Thunder Compute, start or restore the Thunder instance manually first. The
app does not create, start, stop, delete, or manage billing for the instance. It
only opens a local SSH tunnel and can start `ollama serve` over SSH after the
machine is reachable.

```env
LOCAL_AI_ENABLED=true
LOCAL_AI_BASE_URL=http://127.0.0.1:11434
LOCAL_AI_MODEL=qwen2.5:7b

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

The tunnel maps:

```text
local 127.0.0.1:11434 -> Thunder 127.0.0.1:11434
```

The backend starts the tunnel with:

```powershell
ssh -N -L 11434:127.0.0.1:11434 ubuntu@tnr-0
```

If `REMOTE_AI_SSH_HOST` is an SSH config alias, leave
`REMOTE_AI_SSH_PORT` and `REMOTE_AI_SSH_KEY_PATH` blank so OpenSSH uses the
current Thunder-generated host, port, and key from `~/.ssh/config`.

The Wake Ollama action sends a shell script over SSH. It sets
`OLLAMA_MODELS=/home/ubuntu/ollama-models`, starts Ollama with `nohup` if it is
not already running, then checks `ollama list` and `/api/tags`. It also sets
`OLLAMA_FLASH_ATTENTION=1`, `OLLAMA_NUM_PARALLEL=1`,
`OLLAMA_MAX_LOADED_MODELS=1`, and `CUDA_VISIBLE_DEVICES=0` so Thunder GPU memory
is reserved for the active assistant model.

No `systemd` or `sudo` is used.

When you are done, stop billing from Thunder by snapshotting/deleting the
instance there. The app intentionally does not manage that lifecycle.
