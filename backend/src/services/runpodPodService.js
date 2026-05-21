const config = require("../config");

function buildUnconfiguredStatus(message) {
  return {
    configured: false,
    provider: "runpod",
    podId: config.runpodPodId,
    podName: config.runpodPodName || "",
    configuredPodName: config.runpodPodName || "",
    configuredPodId: config.runpodPodId || "",
    podIdOverride: Boolean(config.runpodPodIdOverride),
    resolveSource: "none",
    desiredStatus: "UNKNOWN",
    runtimeStatus: "unconfigured",
    canStart: false,
    canStop: false,
    message
  };
}

function isRunpodConfigured() {
  return Boolean(
    config.runpodApiKey && (config.runpodPodName || config.runpodPodId)
  );
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

function normalizePodListResponse(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data.pods)) {
    return data.pods;
  }

  if (Array.isArray(data.results)) {
    return data.results;
  }

  if (Array.isArray(data.data)) {
    return data.data;
  }

  return [];
}

async function listRunpodPods() {
  const data = await fetchRunpod("/pods");
  return normalizePodListResponse(data);
}

async function resolveRunpodPod() {
  if (!config.runpodApiKey) {
    const error = new Error("Set RUNPOD_API_KEY to enable RunPod discovery.");
    error.statusCode = 503;
    throw error;
  }

  const podName = String(config.runpodPodName || "").trim();
  const fallbackPodId = String(config.runpodPodId || "").trim();

  if (fallbackPodId && config.runpodPodIdOverride) {
    const pod = await fetchRunpod(`/pods/${fallbackPodId}`);
    return normalizeResolvedRunpodPod(pod, "id");
  }

  if (podName) {
    const pods = await listRunpodPods();
    const matches = pods.filter(
      (pod) => String(pod.name || "").trim() === podName
    );

    if (matches.length === 1) {
      return normalizeResolvedRunpodPod(matches[0], "name");
    }

    if (matches.length > 1) {
      const error = new Error(
        `Multiple RunPod pods are named "${podName}". Rename them so the name is unique.`
      );
      error.statusCode = 409;
      throw error;
    }

    if (!fallbackPodId) {
      const error = new Error(
        `No RunPod pod found with name "${podName}". Check RUNPOD_POD_NAME or rename/create the pod.`
      );
      error.statusCode = 404;
      throw error;
    }
  }

  if (fallbackPodId) {
    const pod = await fetchRunpod(`/pods/${fallbackPodId}`);
    return normalizeResolvedRunpodPod(pod, "id");
  }

  const error = new Error(
    "Set RUNPOD_POD_NAME or RUNPOD_POD_ID to enable remote pod controls."
  );
  error.statusCode = 503;
  throw error;
}

function normalizeResolvedRunpodPod(pod = {}, source = "id") {
  return {
    source,
    pod,
    podName: pod.name || config.runpodPodName || "",
    podId: pod.id || config.runpodPodId || "",
    status: String(pod.desiredStatus || "").trim().toUpperCase() || "UNKNOWN",
    machineId: pod.machineId || pod.machine?.id || "",
    gpuDisplayName:
      pod.gpuDisplayName ||
      pod.gpuTypeDisplayName ||
      pod.machine?.gpuDisplayName ||
      pod.machine?.gpuTypeDisplayName ||
      ""
  };
}

function normalizeRunpodStatus(pod = {}, resolveSource = "id") {
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
    podName: pod.name || config.runpodPodName || "",
    configuredPodName: config.runpodPodName || "",
    configuredPodId: config.runpodPodId || "",
    podIdOverride: Boolean(config.runpodPodIdOverride),
    resolveSource,
    machineId: pod.machineId || pod.machine?.id || "",
    gpuDisplayName:
      pod.gpuDisplayName ||
      pod.gpuTypeDisplayName ||
      pod.machine?.gpuDisplayName ||
      pod.machine?.gpuTypeDisplayName ||
      "",
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
        ? `RunPod pod is running. Resolved by ${resolveSource}. Ollama may still require an SSH tunnel or exposed endpoint.`
        : runtimeStatus === "stopped"
          ? `RunPod pod is stopped. Resolved by ${resolveSource}.`
          : runtimeStatus === "terminated"
            ? `RunPod pod is terminated. Resolved by ${resolveSource}.`
            : `RunPod pod status is unknown. Resolved by ${resolveSource}.`
  };
}

async function getRunpodPodStatus() {
  if (!isRunpodConfigured()) {
    return buildUnconfiguredStatus(
      "Set RUNPOD_API_KEY plus RUNPOD_POD_NAME or RUNPOD_POD_ID to enable remote pod controls."
    );
  }

  try {
    const resolved = await resolveRunpodPod();
    return normalizeRunpodStatus(resolved.pod, resolved.source);
  } catch (error) {
    return {
      configured: true,
      provider: "runpod",
      podId: config.runpodPodId,
      podName: config.runpodPodName || "",
      configuredPodName: config.runpodPodName || "",
      configuredPodId: config.runpodPodId || "",
      podIdOverride: Boolean(config.runpodPodIdOverride),
      resolveSource: "error",
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

  const resolved = await resolveRunpodPod();
  const endpoint = getRunpodSshEndpointFromPod(resolved.pod);

  return {
    ...endpoint,
    source: resolved.source
  };
}

async function startRunpodPod() {
  if (!isRunpodConfigured()) {
    const error = new Error(
      "Set RUNPOD_API_KEY plus RUNPOD_POD_NAME or RUNPOD_POD_ID before starting the remote AI pod."
    );
    error.statusCode = 503;
    throw error;
  }

  const resolved = await resolveRunpodPod();
  const podId = resolved.pod?.id;

  if (!podId) {
    const error = new Error("Resolved RunPod pod does not have an id.");
    error.statusCode = 502;
    throw error;
  }

  await fetchRunpod(`/pods/${podId}/start`, {
    method: "POST"
  });

  return getRunpodPodStatus();
}

async function stopRunpodPod() {
  if (!isRunpodConfigured()) {
    const error = new Error(
      "Set RUNPOD_API_KEY plus RUNPOD_POD_NAME or RUNPOD_POD_ID before stopping the remote AI pod."
    );
    error.statusCode = 503;
    throw error;
  }

  const resolved = await resolveRunpodPod();
  const podId = resolved.pod?.id;

  if (!podId) {
    const error = new Error("Resolved RunPod pod does not have an id.");
    error.statusCode = 502;
    throw error;
  }

  await fetchRunpod(`/pods/${podId}/stop`, {
    method: "POST"
  });

  return getRunpodPodStatus();
}

module.exports = {
  getRunpodPodStatus,
  getRunpodSshEndpoint,
  resolveRunpodPod,
  startRunpodPod,
  stopRunpodPod
};
