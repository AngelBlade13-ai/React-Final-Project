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

  return {
    configured: true,
    provider: "runpod",
    podId: pod.id || config.runpodPodId,
    name: pod.name || "",
    desiredStatus: desiredStatus || "UNKNOWN",
    runtimeStatus,
    costPerHr: Number(pod.costPerHr || 0) || 0,
    publicIp: pod.publicIp || "",
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

async function getRunpodPodStatus() {
  if (!isRunpodConfigured()) {
    return buildUnconfiguredStatus(
      "Set RUNPOD_API_KEY and RUNPOD_POD_ID to enable remote pod controls."
    );
  }

  try {
    const pod = await fetchRunpod(`/pods/${config.runpodPodId}`);
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
  startRunpodPod,
  stopRunpodPod
};
