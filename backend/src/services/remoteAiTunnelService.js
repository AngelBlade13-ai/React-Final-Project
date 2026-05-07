const fs = require("fs/promises");
const net = require("net");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const config = require("../config");

const TUNNEL_STATE_PATH = path.join(
  __dirname,
  "..",
  "data",
  "remote-ai-tunnel.json"
);
const WAIT_INTERVAL_MS = 250;
const READY_TIMEOUT_MS = 12000;

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
  return Boolean(config.runpodSshHost && config.runpodSshKeyPath);
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
    const file = await fs.readFile(TUNNEL_STATE_PATH, "utf8");
    return JSON.parse(file);
  } catch {
    return null;
  }
}

async function writeTunnelState(state) {
  await fs.mkdir(path.dirname(TUNNEL_STATE_PATH), { recursive: true });
  await fs.writeFile(TUNNEL_STATE_PATH, JSON.stringify(state, null, 2));
}

async function clearTunnelState() {
  try {
    await fs.unlink(TUNNEL_STATE_PATH);
  } catch {
    // Ignore missing file cleanup.
  }
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
  if (isTunnelTestMode()) {
    return {
      configured: true,
      running: process.env.REMOTE_AI_TUNNEL_TEST_RUNNING === "true",
      pid: process.env.REMOTE_AI_TUNNEL_TEST_RUNNING === "true" ? 4321 : null,
      localUrl: `http://127.0.0.1:${config.runpodTunnelLocalPort}`,
      sshHost: config.runpodSshHost,
      sshPort: config.runpodSshPort,
      sshUser: config.runpodSshUser,
      message:
        process.env.REMOTE_AI_TUNNEL_TEST_RUNNING === "true"
          ? "SSH tunnel is active."
          : "SSH tunnel is not running."
    };
  }

  if (!isTunnelConfigured()) {
    return buildUnconfiguredStatus(
      "Set RUNPOD_SSH_HOST and RUNPOD_SSH_KEY_PATH to enable tunnel automation."
    );
  }

  const state = await readTunnelState();
  const pid = Number.parseInt(String(state?.pid || ""), 10);
  const pidRunning = isPidRunning(pid);
  const portReachable = await isLocalPortReachable(
    config.runpodTunnelLocalPort
  );

  if (!pidRunning && state) {
    await clearTunnelState();
  }

  return {
    configured: true,
    running: pidRunning && portReachable,
    pid: pidRunning ? pid : null,
    localUrl: `http://127.0.0.1:${config.runpodTunnelLocalPort}`,
    sshHost: config.runpodSshHost,
    sshPort: config.runpodSshPort,
    sshUser: config.runpodSshUser,
    message:
      pidRunning && portReachable
        ? "SSH tunnel is active."
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
      "Set RUNPOD_SSH_HOST and RUNPOD_SSH_KEY_PATH before starting the SSH tunnel."
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
  const forwardTarget = `${config.runpodTunnelLocalPort}:${config.runpodTunnelRemoteHost}:${config.runpodTunnelRemotePort}`;
  const sshTarget = `${config.runpodSshUser}@${config.runpodSshHost}`;
  const child = spawn(
    "ssh",
    [
      "-N",
      "-L",
      forwardTarget,
      sshTarget,
      "-p",
      String(config.runpodSshPort),
      "-i",
      sshKeyPath,
      "-o",
      "ExitOnForwardFailure=yes",
      "-o",
      "ServerAliveInterval=30",
      "-o",
      "ServerAliveCountMax=3"
    ],
    {
      detached: true,
      stdio: "ignore",
      windowsHide: true
    }
  );
  child.unref();

  await writeTunnelState({
    pid: child.pid,
    startedAt: new Date().toISOString()
  });

  const ready = await waitForTunnelReady();

  if (!ready) {
    await stopRemoteAiTunnel();
    const error = new Error(
      `SSH tunnel did not become ready on local port ${config.runpodTunnelLocalPort}.`
    );
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
