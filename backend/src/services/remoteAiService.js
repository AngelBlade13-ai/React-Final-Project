const fs = require("fs");
const fsPromises = require("fs/promises");
const net = require("net");
const os = require("os");
const path = require("path");
const childProcess = require("child_process");
const config = require("../config");

const TUNNEL_STATE_PATH = path.join(
  __dirname,
  "..",
  "data",
  "remote-ai-tunnel.json"
);
const TUNNEL_LOG_PATH = path.join(
  __dirname,
  "..",
  "data",
  "remote-ai-tunnel.log"
);
const WAIT_INTERVAL_MS = 250;
const READY_TIMEOUT_MS = 12000;
const FAILURE_LOG_TAIL_LENGTH = 1200;
const SSH_COMMAND_TIMEOUT_MS = 30000;
const WAKE_REMOTE_OLLAMA_TIMEOUT_MS = 180000;

function isTunnelTestMode() {
  return process.env.REMOTE_AI_TUNNEL_TEST_MODE === "true";
}

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

function getRemoteAiTarget() {
  return {
    host: String(config.remoteAiSshHost || "").trim(),
    port:
      config.remoteAiSshPort === null
        ? null
        : Number(config.remoteAiSshPort) || 22,
    user: String(config.remoteAiSshUser || "ubuntu").trim() || "ubuntu"
  };
}

function buildUnconfiguredStatus(message) {
  const target = getRemoteAiTarget();

  return {
    configured: false,
    enabled: Boolean(config.remoteAiEnabled),
    running: false,
    pid: null,
    localUrl: `http://127.0.0.1:${config.remoteAiTunnelLocalPort}`,
    sshHost: target.host,
    sshPort: target.port,
    sshUser: target.user,
    remoteHost: config.remoteAiTunnelRemoteHost,
    remotePort: config.remoteAiTunnelRemotePort,
    modelsPath: config.remoteAiOllamaModelsPath,
    logPath: config.remoteAiOllamaLogPath,
    lastError: message,
    message
  };
}

function validateRemoteAiConfig() {
  if (!config.remoteAiEnabled) {
    return "Remote AI controls are disabled by REMOTE_AI_ENABLED=false.";
  }

  if (!String(config.remoteAiSshHost || "").trim()) {
    return "Set REMOTE_AI_SSH_HOST to enable remote AI SSH controls.";
  }

  return "";
}

function assertRemoteAiConfigured(action) {
  const message = validateRemoteAiConfig();

  if (message) {
    const error = new Error(action ? `${message} Cannot ${action}.` : message);
    error.statusCode = 503;
    throw error;
  }
}

function buildTunnelSshArgs(target = getRemoteAiTarget()) {
  const sshKeyPath = expandHomePath(config.remoteAiSshKeyPath);
  const forwardTarget = `${config.remoteAiTunnelLocalPort}:${config.remoteAiTunnelRemoteHost}:${config.remoteAiTunnelRemotePort}`;
  const sshTarget = `${target.user}@${target.host}`;
  const args = [
    "-N",
    "-L",
    forwardTarget,
    sshTarget,
    "-o",
    "BatchMode=yes",
    "-o",
    "StrictHostKeyChecking=accept-new",
    "-o",
    "ExitOnForwardFailure=yes",
    "-o",
    "ConnectTimeout=10",
    "-o",
    "ServerAliveInterval=30",
    "-o",
    "ServerAliveCountMax=3"
  ];

  if (target.port) {
    args.splice(4, 0, "-p", String(target.port));
  }

  if (sshKeyPath) {
    const insertIndex = target.port ? 6 : 4;
    args.splice(insertIndex, 0, "-i", sshKeyPath);
  }

  return args;
}

function buildWakeOllamaScript() {
  return `#!/usr/bin/env sh
set -e

OLLAMA_MODELS="${config.remoteAiOllamaModelsPath}"
OLLAMA_LOG="${config.remoteAiOllamaLogPath}"

mkdir -p "${config.remoteAiOllamaModelsPath}"
touch "${config.remoteAiOllamaLogPath}"
export OLLAMA_MODELS="${config.remoteAiOllamaModelsPath}"

if ps -eo comm=,args= | awk '$1 == "ollama" && $0 ~ /ollama serve/ { found = 1 } END { exit !found }'; then
  echo "__OLLAMA_ALREADY_RUNNING__=1"
else
  OLLAMA_FLASH_ATTENTION="\${OLLAMA_FLASH_ATTENTION:-1}" \\
  OLLAMA_NUM_PARALLEL="\${OLLAMA_NUM_PARALLEL:-1}" \\
  OLLAMA_MAX_LOADED_MODELS="\${OLLAMA_MAX_LOADED_MODELS:-1}" \\
  CUDA_VISIBLE_DEVICES="\${CUDA_VISIBLE_DEVICES:-0}" \\
  nohup ollama serve > "${config.remoteAiOllamaLogPath}" 2>&1 &
  echo "__OLLAMA_STARTED__=1"
  sleep 5
fi

ollama list
curl -s http://127.0.0.1:11434/api/tags
`;
}

async function readTunnelState() {
  try {
    const file = await fsPromises.readFile(TUNNEL_STATE_PATH, "utf8");
    return JSON.parse(file);
  } catch {
    return null;
  }
}

async function writeTunnelState(state) {
  await fsPromises.mkdir(path.dirname(TUNNEL_STATE_PATH), { recursive: true });
  await fsPromises.writeFile(TUNNEL_STATE_PATH, JSON.stringify(state, null, 2));
}

async function clearTunnelState() {
  try {
    await fsPromises.unlink(TUNNEL_STATE_PATH);
  } catch {
    // Ignore missing file cleanup.
  }
}

async function resetTunnelLog() {
  await fsPromises.mkdir(path.dirname(TUNNEL_LOG_PATH), { recursive: true });
  await fsPromises.writeFile(TUNNEL_LOG_PATH, "");
}

async function readTunnelLogTail() {
  try {
    const contents = await fsPromises.readFile(TUNNEL_LOG_PATH, "utf8");
    const normalized = String(contents || "").trim();

    if (!normalized) {
      return "";
    }

    return normalized.slice(-FAILURE_LOG_TAIL_LENGTH);
  } catch {
    return "";
  }
}

function buildTunnelFailureMessage(logTail) {
  const normalizedLog = String(logTail || "").trim();

  if (!normalizedLog) {
    return `SSH tunnel did not become ready on local port ${config.remoteAiTunnelLocalPort}.`;
  }

  return `SSH tunnel did not become ready on local port ${config.remoteAiTunnelLocalPort}. SSH reported: ${normalizedLog}`;
}

function isPidRunning(pid) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function isLocalPortReachable(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection(
      {
        host: "127.0.0.1",
        port
      },
      () => {
        socket.destroy();
        resolve(true);
      }
    );

    socket.setTimeout(700, () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => {
      resolve(false);
    });
  });
}

async function waitForTunnelReady(timeoutMs = READY_TIMEOUT_MS) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (await isLocalPortReachable(config.remoteAiTunnelLocalPort)) {
      return true;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, WAIT_INTERVAL_MS);
    });
  }

  return false;
}

async function getRemoteAiTunnelStatus() {
  const target = getRemoteAiTarget();

  if (isTunnelTestMode()) {
    const configured = !validateRemoteAiConfig();

    return {
      configured,
      enabled: Boolean(config.remoteAiEnabled),
      running: process.env.REMOTE_AI_TUNNEL_TEST_RUNNING === "true",
      managed: process.env.REMOTE_AI_TUNNEL_TEST_RUNNING === "true",
      pid: process.env.REMOTE_AI_TUNNEL_TEST_RUNNING === "true" ? 4321 : null,
      localUrl: `http://127.0.0.1:${config.remoteAiTunnelLocalPort}`,
      sshHost: target.host,
      sshPort: target.port,
      sshUser: target.user,
      remoteHost: config.remoteAiTunnelRemoteHost,
      remotePort: config.remoteAiTunnelRemotePort,
      modelsPath: config.remoteAiOllamaModelsPath,
      logPath: config.remoteAiOllamaLogPath,
      lastError: process.env.REMOTE_AI_TUNNEL_TEST_LAST_ERROR || "",
      message:
        process.env.REMOTE_AI_TUNNEL_TEST_RUNNING === "true"
          ? "SSH tunnel is active."
          : configured
            ? "SSH tunnel is not running."
            : validateRemoteAiConfig()
    };
  }

  const validationMessage = validateRemoteAiConfig();

  if (validationMessage) {
    return buildUnconfiguredStatus(validationMessage);
  }

  const state = await readTunnelState();
  const pid = Number.parseInt(String(state?.pid || ""), 10);
  const pidRunning = isPidRunning(pid);
  const portReachable = await isLocalPortReachable(
    config.remoteAiTunnelLocalPort
  );

  if (!pidRunning && state && !state.lastError) {
    await clearTunnelState();
  }

  const managedTunnelRunning = pidRunning && portReachable;
  const manualTunnelReachable = !pidRunning && portReachable;

  return {
    configured: true,
    enabled: true,
    running: managedTunnelRunning || manualTunnelReachable,
    managed: managedTunnelRunning,
    pid: pidRunning ? pid : null,
    localUrl: `http://127.0.0.1:${config.remoteAiTunnelLocalPort}`,
    sshHost: target.host,
    sshPort: target.port,
    sshUser: target.user,
    remoteHost: config.remoteAiTunnelRemoteHost,
    remotePort: config.remoteAiTunnelRemotePort,
    modelsPath: config.remoteAiOllamaModelsPath,
    logPath: config.remoteAiOllamaLogPath,
    lastError:
      pidRunning || manualTunnelReachable
        ? ""
        : String(state?.lastError || "").trim(),
    message:
      managedTunnelRunning
        ? "SSH tunnel is active."
        : manualTunnelReachable
          ? "SSH tunnel is active on the local port, but it was not started by this backend."
        : pidRunning
          ? "SSH tunnel process exists but local port is not ready."
          : "SSH tunnel is not running."
  };
}

async function startRemoteAiTunnel() {
  if (isTunnelTestMode()) {
    assertRemoteAiConfigured("start the SSH tunnel");
    process.env.REMOTE_AI_TUNNEL_TEST_RUNNING = "true";
    return {
      ...(await getRemoteAiTunnelStatus()),
      alreadyRunning: false
    };
  }

  assertRemoteAiConfigured("start the SSH tunnel");

  const currentStatus = await getRemoteAiTunnelStatus();

  if (currentStatus.running) {
    return {
      ...currentStatus,
      alreadyRunning: true
    };
  }

  const target = getRemoteAiTarget();

  await resetTunnelLog();
  const logFd = fs.openSync(TUNNEL_LOG_PATH, "a");
  const child = childProcess.spawn("ssh", buildTunnelSshArgs(target), {
    detached: true,
    stdio: ["ignore", logFd, logFd],
    windowsHide: true
  });
  fs.closeSync(logFd);
  child.unref();

  await writeTunnelState({
    pid: child.pid,
    startedAt: new Date().toISOString(),
    sshHost: target.host,
    sshPort: target.port,
    sshUser: target.user,
    lastError: ""
  });

  const ready = await waitForTunnelReady();

  if (!ready) {
    const logTail = await readTunnelLogTail();

    if (isPidRunning(child.pid)) {
      process.kill(child.pid);
    }

    await writeTunnelState({
      pid: null,
      startedAt: new Date().toISOString(),
      sshHost: target.host,
      sshPort: target.port,
      sshUser: target.user,
      lastError: buildTunnelFailureMessage(logTail)
    });

    const error = new Error(buildTunnelFailureMessage(logTail));
    error.statusCode = 504;
    throw error;
  }

  return {
    ...(await getRemoteAiTunnelStatus()),
    alreadyRunning: false
  };
}

async function stopRemoteAiTunnel() {
  if (isTunnelTestMode()) {
    process.env.REMOTE_AI_TUNNEL_TEST_RUNNING = "false";
    process.env.REMOTE_AI_TUNNEL_TEST_LAST_ERROR = "";
    return getRemoteAiTunnelStatus();
  }

  const state = await readTunnelState();
  const pid = Number.parseInt(String(state?.pid || ""), 10);

  if (Number.isInteger(pid) && pid > 0 && isPidRunning(pid)) {
    process.kill(pid);
  }

  await clearTunnelState();

  return getRemoteAiTunnelStatus();
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
  sshUser = ""
} = {}) {
  const data = extractRemoteTagsJson(output);
  const models = Array.isArray(data?.models)
    ? data.models.map((model) => model.name).filter(Boolean)
    : [];
  const alreadyRunning = output.includes("__OLLAMA_ALREADY_RUNNING__=1");
  const startedNow = output.includes("__OLLAMA_STARTED__=1");

  return {
    configured: true,
    available: Boolean(data),
    running: alreadyRunning || startedNow || Boolean(data),
    startedNow,
    alreadyRunning,
    sshHost,
    sshPort,
    sshUser,
    modelsPath: config.remoteAiOllamaModelsPath,
    logPath: config.remoteAiOllamaLogPath,
    models,
    modelInstalled: models.includes(config.localAiModel),
    message: data
      ? startedNow
        ? "Remote Ollama started and responded to /api/tags."
        : alreadyRunning
          ? "Remote Ollama was already running and responded to /api/tags."
          : "Remote Ollama responded to /api/tags."
      : "Remote Ollama did not return a valid /api/tags response."
  };
}

async function runSshCommand(
  remoteCommand,
  timeoutMs = SSH_COMMAND_TIMEOUT_MS,
  stdinText = ""
) {
  assertRemoteAiConfigured("run the remote SSH command");

  const target = getRemoteAiTarget();

  return new Promise((resolve, reject) => {
    try {
      const sshKeyPath = expandHomePath(config.remoteAiSshKeyPath);
      const sshTarget = `${target.user}@${target.host}`;
      const child = childProcess.spawn(
        "ssh",
        [
          sshTarget,
          "-p",
          String(target.port),
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
          sshHost: target.host,
          sshPort: target.port,
          sshUser: target.user
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

async function wakeRemoteOllama() {
  if (isRemoteOllamaTestMode()) {
    return {
      configured: true,
      available: true,
      running: true,
      startedNow: process.env.REMOTE_OLLAMA_TEST_STARTED_NOW === "true",
      alreadyRunning: process.env.REMOTE_OLLAMA_TEST_STARTED_NOW !== "true",
      sshHost: config.remoteAiSshHost,
      sshPort: config.remoteAiSshPort,
      sshUser: config.remoteAiSshUser,
      modelsPath: config.remoteAiOllamaModelsPath,
      logPath: config.remoteAiOllamaLogPath,
      models: [config.localAiModel],
      modelInstalled: true,
      message: "Remote Ollama responded to /api/tags."
    };
  }

  assertRemoteAiConfigured("wake remote Ollama");

  const remoteCommand = "sh -s --";
  const result = await runSshCommand(
    remoteCommand,
    WAKE_REMOTE_OLLAMA_TIMEOUT_MS,
    buildWakeOllamaScript()
  );

  return normalizeRemoteOllamaResponse({
    output: result.stdout,
    sshHost: result.sshHost,
    sshPort: result.sshPort,
    sshUser: result.sshUser
  });
}

async function getRemoteAiStatus() {
  return {
    tunnel: await getRemoteAiTunnelStatus()
  };
}

module.exports = {
  getRemoteAiStatus,
  getRemoteAiTunnelStatus,
  startRemoteAiTunnel,
  stopRemoteAiTunnel,
  wakeRemoteOllama,
  __test: {
    buildTunnelSshArgs,
    buildWakeOllamaScript,
    getRemoteAiTarget,
    validateRemoteAiConfig
  }
};
