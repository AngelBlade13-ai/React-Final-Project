const config = require("../config");

function buildUnconfiguredStatus(message) {
  return {
    configured: false,
    provider: "runpod",
    podId: config.runpodPodId,
    desiredStatus: "UNKNOWN",
    runtimeStatus: "unconfigured",
    canStart: false,
    canStop: false,
    message
  };
}

function isRunpodConfigured() {
  return Boolean(config.runpodApiKey && config.runpodPodId);
}

function normalizePortMappings(portMappings = {}) {
  if (!portMappings || typeof portMappings !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(portMappings).map(([internalPort, publicPort]) => [
      String(internalPort).trim(),
      Number(publicPort) || 0
    ])
  );
}

function getRunpodSshEndpointFromPod(pod = {}) {
  const publicIp = String(pod.publicIp || "").trim();
  const portMappings = normalizePortMappings(pod.portMappings);
  const sshPort = portMappings["22"];

  if (!publicIp || !sshPort) {
    return {
      ready: false,
      host: publicIp,
      port: sshPort || 0,
      user: config.runpodSshUser,
      source: "runpod"
    };
  }

  return {
    ready: true,
    host: publicIp,
    port: sshPort,
    user: config.runpodSshUser,
    source: "runpod"
  };
}

async function fetchRunpod(path, options = {}) {
  const response = await fetch(`${config.runpodApiBaseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${config.runpodApiKey}`,
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data.message || data.error || "RunPod request failed."
    );
    error.statusCode = response.status;
    throw error;
  }

  return data;
}

function normalizeRunpodStatus(pod = {}) {
  const desiredStatus = String(pod.desiredStatus || "")
    .trim()
    .toUpperCase();
  const runtimeStatus =
    desiredStatus === "RUNNING"
      ? "running"
      : desiredStatus === "EXITED"
        ? "stopped"
        : desiredStatus === "TERMINATED"
          ? "terminated"
          : "unknown";

  const sshEndpoint = getRunpodSshEndpointFromPod(pod);

  return {
    configured: true,
    provider: "runpod",
    podId: pod.id || config.runpodPodId,
    name: pod.name || "",
    desiredStatus: desiredStatus || "UNKNOWN",
    runtimeStatus,
    costPerHr: Number(pod.costPerHr || 0) || 0,
    publicIp: pod.publicIp || "",
    portMappings: normalizePortMappings(pod.portMappings),
    sshHost: sshEndpoint.host,
    sshPort: sshEndpoint.port,
    sshUser: sshEndpoint.user,
    sshReady: sshEndpoint.ready,
    lastStartedAt: pod.lastStartedAt || "",
    lastStatusChange: pod.lastStatusChange || "",
    canStart: desiredStatus === "EXITED",
    canStop: desiredStatus === "RUNNING",
    message:
      runtimeStatus === "running"
        ? "RunPod pod is running. Ollama may still require an SSH tunnel or exposed endpoint."
        : runtimeStatus === "stopped"
          ? "RunPod pod is stopped."
          : runtimeStatus === "terminated"
            ? "RunPod pod is terminated."
            : "RunPod pod status is unknown."
  };
}

async function getRunpodPod() {
  if (!isRunpodConfigured()) {
    const error = new Error(
      "Set RUNPOD_API_KEY and RUNPOD_POD_ID to enable RunPod discovery."
    );
    error.statusCode = 503;
    throw error;
  }

  return fetchRunpod(`/pods/${config.runpodPodId}`);
}

async function getRunpodPodStatus() {
  if (!isRunpodConfigured()) {
    return buildUnconfiguredStatus(
      "Set RUNPOD_API_KEY and RUNPOD_POD_ID to enable remote pod controls."
    );
  }

  try {
    const pod = await getRunpodPod();
    return normalizeRunpodStatus(pod);
  } catch (error) {
    return {
      configured: true,
      provider: "runpod",
      podId: config.runpodPodId,
      desiredStatus: "UNKNOWN",
      runtimeStatus: "error",
      canStart: false,
      canStop: false,
      message: error.message || "Failed to read RunPod status."
    };
  }
}

async function getRunpodSshEndpoint() {
  if (!isRunpodConfigured()) {
    return {
      ready: false,
      host: "",
      port: 0,
      user: config.runpodSshUser,
      source: "runpod"
    };
  }

  const pod = await getRunpodPod();
  return getRunpodSshEndpointFromPod(pod);
}

async function startRunpodPod() {
  if (!isRunpodConfigured()) {
    const error = new Error(
      "Set RUNPOD_API_KEY and RUNPOD_POD_ID before starting the remote AI pod."
    );
    error.statusCode = 503;
    throw error;
  }

  await fetchRunpod(`/pods/${config.runpodPodId}/start`, {
    method: "POST"
  });

  return getRunpodPodStatus();
}

async function stopRunpodPod() {
  if (!isRunpodConfigured()) {
    const error = new Error(
      "Set RUNPOD_API_KEY and RUNPOD_POD_ID before stopping the remote AI pod."
    );
    error.statusCode = 503;
    throw error;
  }

  await fetchRunpod(`/pods/${config.runpodPodId}/stop`, {
    method: "POST"
  });

  return getRunpodPodStatus();
}

module.exports = {
  getRunpodPodStatus,
  getRunpodSshEndpoint,
  startRunpodPod,
  stopRunpodPod
};
