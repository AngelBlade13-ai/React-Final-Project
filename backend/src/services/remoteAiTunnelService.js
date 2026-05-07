const fs = require("fs");
const fsPromises = require("fs/promises");
const net = require("net");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const config = require("../config");
const { getRunpodSshEndpoint } = require("./runpodPodService");

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

function isTunnelTestMode() {
  return process.env.REMOTE_AI_TUNNEL_TEST_MODE === "true";
}

function buildUnconfiguredStatus(message) {
  return {
    configured: false,
    running: false,
    pid: null,
    localUrl: `http://127.0.0.1:${config.runpodTunnelLocalPort}`,
    message
  };
}

function isTunnelConfigured() {
  return Boolean(config.runpodSshKeyPath && (config.runpodSshHost || config.runpodApiKey));
}

async function resolveTunnelSshTarget() {
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

function expandHomePath(value) {
  const normalized = String(value || "").trim();

  if (!normalized.startsWith("~")) {
    return normalized;
  }

  return path.join(os.homedir(), normalized.slice(1));
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
    return `SSH tunnel did not become ready on local port ${config.runpodTunnelLocalPort}.`;
  }

  return `SSH tunnel did not become ready on local port ${config.runpodTunnelLocalPort}. SSH reported: ${normalizedLog}`;
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
    if (await isLocalPortReachable(config.runpodTunnelLocalPort)) {
      return true;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, WAIT_INTERVAL_MS);
    });
  }

  return false;
}

async function getRemoteAiTunnelStatus() {
  const resolvedTarget = await resolveTunnelSshTarget().catch(() => ({
    host: "",
    port: 0,
    user: config.runpodSshUser,
    source: "runpod"
  }));

  if (isTunnelTestMode()) {
    return {
      configured: Boolean(config.runpodSshKeyPath && (resolvedTarget.host || config.runpodApiKey)),
      running: process.env.REMOTE_AI_TUNNEL_TEST_RUNNING === "true",
      pid: process.env.REMOTE_AI_TUNNEL_TEST_RUNNING === "true" ? 4321 : null,
      localUrl: `http://127.0.0.1:${config.runpodTunnelLocalPort}`,
      sshHost: resolvedTarget.host,
      sshPort: resolvedTarget.port,
      sshUser: resolvedTarget.user,
      targetSource: resolvedTarget.source,
      lastError: process.env.REMOTE_AI_TUNNEL_TEST_LAST_ERROR || "",
      message:
        process.env.REMOTE_AI_TUNNEL_TEST_RUNNING === "true"
          ? "SSH tunnel is active."
          : "SSH tunnel is not running."
    };
  }

  if (!isTunnelConfigured()) {
    return buildUnconfiguredStatus(
      "Set RUNPOD_SSH_KEY_PATH plus either RUNPOD_SSH_HOST or the RunPod API settings to enable tunnel automation."
    );
  }

  const state = await readTunnelState();
  const pid = Number.parseInt(String(state?.pid || ""), 10);
  const pidRunning = isPidRunning(pid);
  const portReachable = await isLocalPortReachable(
    config.runpodTunnelLocalPort
  );

  if (!pidRunning && state && !state.lastError) {
    await clearTunnelState();
  }

  return {
    configured: true,
    running: pidRunning && portReachable,
    pid: pidRunning ? pid : null,
    localUrl: `http://127.0.0.1:${config.runpodTunnelLocalPort}`,
    sshHost: resolvedTarget.host,
    sshPort: resolvedTarget.port,
    sshUser: resolvedTarget.user,
    targetSource: resolvedTarget.source,
    lastError: pidRunning ? "" : String(state?.lastError || "").trim(),
    message:
      pidRunning && portReachable
        ? "SSH tunnel is active."
        : !resolvedTarget.host || !resolvedTarget.port
          ? "RunPod SSH endpoint is not ready yet."
        : pidRunning
          ? "SSH tunnel process exists but local port is not ready."
          : "SSH tunnel is not running."
  };
}

async function startRemoteAiTunnel() {
  if (isTunnelTestMode()) {
    process.env.REMOTE_AI_TUNNEL_TEST_RUNNING = "true";
    return {
      ...(await getRemoteAiTunnelStatus()),
      alreadyRunning: false
    };
  }

  if (!isTunnelConfigured()) {
    const error = new Error(
      "Set RUNPOD_SSH_KEY_PATH plus either RUNPOD_SSH_HOST or the RunPod API settings before starting the SSH tunnel."
    );
    error.statusCode = 503;
    throw error;
  }

  const currentStatus = await getRemoteAiTunnelStatus();

  if (currentStatus.running) {
    return {
      ...currentStatus,
      alreadyRunning: true
    };
  }

  const sshKeyPath = expandHomePath(config.runpodSshKeyPath);
  const sshTargetConfig = await resolveTunnelSshTarget();

  if (!sshTargetConfig.host || !sshTargetConfig.port) {
    const error = new Error(
      "RunPod has not published an SSH host/port yet. Wait for the pod to finish initializing, then try again."
    );
    error.statusCode = 503;
    throw error;
  }

  const forwardTarget = `${config.runpodTunnelLocalPort}:${config.runpodTunnelRemoteHost}:${config.runpodTunnelRemotePort}`;
  const sshTarget = `${sshTargetConfig.user}@${sshTargetConfig.host}`;
  await resetTunnelLog();
  const logFd = fs.openSync(TUNNEL_LOG_PATH, "a");
  const child = spawn(
    "ssh",
    [
      "-N",
      "-L",
      forwardTarget,
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
      "ExitOnForwardFailure=yes",
      "-o",
      "ConnectTimeout=10",
      "-o",
      "ServerAliveInterval=30",
      "-o",
      "ServerAliveCountMax=3"
    ],
    {
      detached: true,
      stdio: ["ignore", logFd, logFd],
      windowsHide: true
    }
  );
  fs.closeSync(logFd);
  child.unref();

  await writeTunnelState({
    pid: child.pid,
    startedAt: new Date().toISOString(),
    sshHost: sshTargetConfig.host,
    sshPort: sshTargetConfig.port,
    sshUser: sshTargetConfig.user,
    targetSource: sshTargetConfig.source,
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
      sshHost: sshTargetConfig.host,
      sshPort: sshTargetConfig.port,
      sshUser: sshTargetConfig.user,
      targetSource: sshTargetConfig.source,
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

module.exports = {
  getRemoteAiTunnelStatus,
  startRemoteAiTunnel,
  stopRemoteAiTunnel
};
