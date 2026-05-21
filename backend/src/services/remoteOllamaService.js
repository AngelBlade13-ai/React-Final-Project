const os = require("os");
const path = require("path");
const childProcess = require("child_process");
const config = require("../config");
const { getRunpodSshEndpoint } = require("./runpodPodService");

const SSH_COMMAND_TIMEOUT_MS = 30000;
const WAKE_REMOTE_OLLAMA_TIMEOUT_MS = 180000;
const REMOTE_OLLAMA_BINARY = "/usr/local/bin/ollama";
const REMOTE_OLLAMA_MODELS_DIR = "/workspace/ollama-models";
const REMOTE_OLLAMA_LOG = "/workspace/ollama.log";

function isRemoteOllamaTestMode() {
  return process.env.REMOTE_OLLAMA_TEST_MODE === "true";
}

function expandHomePath(value) {
  const normalized = String(value || "").trim();

  if (!normalized.startsWith("~")) {
    return normalized;
  }

  return path.join(os.homedir(), normalized.slice(1));
}

function isRemoteOllamaConfigured() {
  return Boolean(
    config.runpodSshKeyPath && (config.runpodSshHost || config.runpodApiKey)
  );
}

async function resolveRemoteSshTarget() {
  const manualHost = String(config.runpodSshHost || "").trim();
  const manualPort = Number(config.runpodSshPort) || 0;

  if (manualHost && manualPort > 0) {
    return {
      host: manualHost,
      port: manualPort,
      user: config.runpodSshUser,
      source: "manual"
    };
  }

  const discoveredEndpoint = await getRunpodSshEndpoint();

  if (discoveredEndpoint?.ready) {
    return discoveredEndpoint;
  }

  return {
    host: "",
    port: 0,
    user: config.runpodSshUser,
    source: "runpod"
  };
}

async function runSshCommand(
  remoteCommand,
  timeoutMs = SSH_COMMAND_TIMEOUT_MS,
  stdinText = ""
) {
  const sshTargetConfig = await resolveRemoteSshTarget();

  if (!sshTargetConfig.host || !sshTargetConfig.port) {
    const error = new Error(
      "RunPod SSH endpoint is not ready yet. Start the pod and wait for SSH to initialize."
    );
    error.statusCode = 503;
    throw error;
  }

  return new Promise((resolve, reject) => {
    try {
      const sshKeyPath = expandHomePath(config.runpodSshKeyPath);
      const sshTarget = `${sshTargetConfig.user}@${sshTargetConfig.host}`;
      const child = childProcess.spawn(
        "ssh",
        [
          sshTarget,
          "-p",
          String(sshTargetConfig.port),
          "-i",
          sshKeyPath,
          "-o",
          "BatchMode=yes",
          "-o",
          "StrictHostKeyChecking=accept-new",
          "-o",
          "ConnectTimeout=10",
          remoteCommand
        ],
        {
          windowsHide: true
        }
      );

      let stdout = "";
      let stderr = "";
      let settled = false;
      const timeoutId = setTimeout(() => {
        if (settled) {
          return;
        }

        settled = true;
        child.kill();
        const error = new Error("Timed out while contacting remote Ollama.");
        error.statusCode = 504;
        reject(error);
      }, timeoutMs);

      child.stdout.on("data", (chunk) => {
        stdout += String(chunk || "");
      });
      child.stderr.on("data", (chunk) => {
        stderr += String(chunk || "");
      });
      child.on("error", (error) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timeoutId);
        reject(error);
      });
      child.on("close", (code) => {
        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timeoutId);

        if (code !== 0) {
          const error = new Error(
            String(stderr || stdout || "Remote SSH command failed.").trim()
          );
          error.statusCode = 502;
          reject(error);
          return;
        }

        resolve({
          stdout: String(stdout || ""),
          stderr: String(stderr || ""),
          sshHost: sshTargetConfig.host,
          sshPort: sshTargetConfig.port,
          sshUser: sshTargetConfig.user,
          targetSource: sshTargetConfig.source
        });
      });

      if (stdinText) {
        child.stdin.write(stdinText);
      }
      child.stdin.end();
    } catch (error) {
      reject(error);
    }
  });
}

function extractRemoteTagsJson(output = "") {
  const text = String(output || "");
  const startIndex = text.indexOf("{");
  const endIndex = text.lastIndexOf("}");

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return null;
  }

  try {
    return JSON.parse(text.slice(startIndex, endIndex + 1));
  } catch {
    return null;
  }
}

function normalizeRemoteOllamaResponse({
  output = "",
  sshHost = "",
  sshPort = 0,
  sshUser = "",
  targetSource = "runpod"
} = {}) {
  const data = extractRemoteTagsJson(output);
  const models = Array.isArray(data?.models)
    ? data.models.map((model) => model.name).filter(Boolean)
    : [];
  const installedNow = output.includes("__OLLAMA_INSTALLED__=1");
  const alreadyRunning = output.includes("__OLLAMA_ALREADY_RUNNING__=1");
  const startedNow = output.includes("__OLLAMA_STARTED__=1");
  const retriedStart = output.includes("__OLLAMA_RETRIED_START__=1");

  return {
    configured: true,
    available: Boolean(data),
    running: alreadyRunning || startedNow || Boolean(data),
    installedNow,
    startedNow,
    alreadyRunning,
    retriedStart,
    sshHost,
    sshPort,
    sshUser,
    targetSource,
    modelsPath: REMOTE_OLLAMA_MODELS_DIR,
    models,
    modelInstalled: models.includes(config.localAiModel),
    message: data
      ? installedNow && startedNow
        ? retriedStart
          ? "Remote Ollama was installed, retried once, and responded to /api/tags."
          : "Remote Ollama was installed, started, and responded to /api/tags."
        : installedNow
          ? "Remote Ollama was installed and responded to /api/tags."
        : startedNow
          ? retriedStart
            ? "Remote Ollama retried once and responded to /api/tags."
            : "Remote Ollama started and responded to /api/tags."
          : alreadyRunning
            ? "Remote Ollama was already running and responded to /api/tags."
            : "Remote Ollama responded to /api/tags."
      : "Remote Ollama did not return a valid /api/tags response."
  };
}

async function wakeRemoteOllama() {
  if (isRemoteOllamaTestMode()) {
    return {
      configured: true,
      available: true,
      running: true,
      installedNow: process.env.REMOTE_OLLAMA_TEST_INSTALLED_NOW === "true",
      startedNow: process.env.REMOTE_OLLAMA_TEST_STARTED_NOW === "true",
      alreadyRunning:
        process.env.REMOTE_OLLAMA_TEST_STARTED_NOW !== "true",
      retriedStart: process.env.REMOTE_OLLAMA_TEST_RETRIED_START === "true",
      sshHost: "213.192.2.117",
      sshPort: 40179,
      sshUser: "root",
      targetSource: "runpod",
      modelsPath: REMOTE_OLLAMA_MODELS_DIR,
      models: [config.localAiModel],
      modelInstalled: true,
      message: "Remote Ollama responded to /api/tags."
    };
  }

  if (!isRemoteOllamaConfigured()) {
    const error = new Error(
      "Set RUNPOD_SSH_KEY_PATH plus either RUNPOD_SSH_HOST or the RunPod API settings before waking remote Ollama."
    );
    error.statusCode = 503;
    throw error;
  }

  const remoteCommand = "sh -s --";
  const bootstrapScript = `#!/usr/bin/env sh
set -e

OLLAMA_BINARY="${REMOTE_OLLAMA_BINARY}"
OLLAMA_MODELS="${REMOTE_OLLAMA_MODELS_DIR}"
OLLAMA_KEEP_ALIVE="${config.remoteOllamaKeepAlive}"
OLLAMA_NUM_PARALLEL="${config.remoteOllamaNumParallel}"
OLLAMA_LOG="${REMOTE_OLLAMA_LOG}"

mkdir -p "${REMOTE_OLLAMA_MODELS_DIR}"
touch "${REMOTE_OLLAMA_LOG}"
export OLLAMA_MODELS="${REMOTE_OLLAMA_MODELS_DIR}"
export OLLAMA_NUM_PARALLEL="${config.remoteOllamaNumParallel}"

start_ollama() {
  setsid -f sh -c "exec env OLLAMA_MODELS='${REMOTE_OLLAMA_MODELS_DIR}' OLLAMA_KEEP_ALIVE='${config.remoteOllamaKeepAlive}' OLLAMA_NUM_PARALLEL='${config.remoteOllamaNumParallel}' '${REMOTE_OLLAMA_BINARY}' serve >>'${REMOTE_OLLAMA_LOG}' 2>&1"
}

wait_for_tags() {
  for i in 1 2 3 4 5 6; do
    sleep 2
    if curl -fsS http://127.0.0.1:11434/api/tags; then
      return 0
    fi
  done

  return 1
}

if [ ! -x "${REMOTE_OLLAMA_BINARY}" ]; then
  curl -fsSL https://ollama.com/install.sh | sh
  echo "__OLLAMA_INSTALLED__=1"
  sleep 3
fi

if pgrep -f "[o]llama serve" >/dev/null; then
  echo "__OLLAMA_ALREADY_RUNNING__=1"
else
  start_ollama
  echo "__OLLAMA_STARTED__=1"
fi

if wait_for_tags; then
  exit 0
fi

pkill -f "[o]llama serve" || true
sleep 2
start_ollama
echo "__OLLAMA_RETRIED_START__=1"

if wait_for_tags; then
  exit 0
fi

exit 1
`;
  const result = await runSshCommand(
    remoteCommand,
    WAKE_REMOTE_OLLAMA_TIMEOUT_MS,
    bootstrapScript
  );

  return normalizeRemoteOllamaResponse({
    output: result.stdout,
    sshHost: result.sshHost,
    sshPort: result.sshPort,
    sshUser: result.sshUser,
    targetSource: result.targetSource
  });
}

module.exports = {
  wakeRemoteOllama
};
