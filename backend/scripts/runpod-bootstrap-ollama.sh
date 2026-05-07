#!/usr/bin/env sh
set -eu

OLLAMA_BINARY="${OLLAMA_BINARY:-/usr/local/bin/ollama}"
OLLAMA_MODELS="${OLLAMA_MODELS:-/workspace/ollama-models}"
OLLAMA_KEEP_ALIVE="${OLLAMA_KEEP_ALIVE:-30m}"
OLLAMA_LOG="${OLLAMA_LOG:-/workspace/ollama.log}"

mkdir -p "${OLLAMA_MODELS}"

if [ ! -x "${OLLAMA_BINARY}" ]; then
  echo "Installing Ollama..."
  curl -fsSL https://ollama.com/install.sh | sh
fi

export OLLAMA_MODELS

if pgrep -f "[o]llama serve" >/dev/null 2>&1; then
  echo "Ollama is already running."
else
  echo "Starting Ollama with models at ${OLLAMA_MODELS}..."
  OLLAMA_MODELS="${OLLAMA_MODELS}" OLLAMA_KEEP_ALIVE="${OLLAMA_KEEP_ALIVE}" \
    nohup "${OLLAMA_BINARY}" serve > "${OLLAMA_LOG}" 2>&1 </dev/null &
fi

for i in 1 2 3 4 5 6 7 8 9 10 11 12; do
  sleep 2

  if curl -fsS http://127.0.0.1:11434/api/tags; then
    exit 0
  fi
done

echo "Ollama did not become ready. Recent log output:"
tail -n 80 "${OLLAMA_LOG}" || true
exit 1
