const config = require("../config");

function isRunpodServerlessProvider() {
  return (
    String(config.assistantAiProvider || "")
      .trim()
      .toLowerCase() === "runpod-serverless"
  );
}

function getRunpodServerlessEndpointUrl(path = "runsync") {
  const baseUrl = String(config.runpodServerlessApiBaseUrl || "")
    .trim()
    .replace(/\/+$/, "");
  const endpointId = String(config.runpodServerlessEndpointId || "").trim();
  const normalizedPath = String(path || "runsync").replace(/^\/+/, "");

  return `${baseUrl}/${endpointId}/${normalizedPath}`;
}

function withRunpodServerlessTimeout() {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    config.runpodServerlessTimeoutMs
  );

  return {
    signal: controller.signal,
    clear() {
      clearTimeout(timeoutId);
    }
  };
}

function buildRunpodServerlessInput({
  model,
  prompt,
  generationOptions,
  format = "json"
}) {
  const mode = String(config.runpodServerlessInputMode || "ollama")
    .trim()
    .toLowerCase();

  if (mode === "raw") {
    return {
      model,
      prompt,
      stream: false,
      format,
      options: generationOptions
    };
  }

  return {
    method_name: "generate",
    input: {
      model,
      prompt,
      stream: false,
      format,
      think: false,
      options: generationOptions
    }
  };
}

function extractRunpodServerlessResponse(data = {}) {
  const output = data.output;

  if (typeof output === "string") {
    return output;
  }

  if (output && typeof output === "object") {
    if (typeof output.response === "string") {
      return output.response;
    }

    if (typeof output.text === "string") {
      return output.text;
    }

    if (typeof output.content === "string") {
      return output.content;
    }

    if (typeof output.message?.content === "string") {
      return output.message.content;
    }

    if (Array.isArray(output.choices)) {
      const firstChoice = output.choices[0];
      const content =
        firstChoice?.message?.content ||
        firstChoice?.text ||
        firstChoice?.delta?.content;

      if (typeof content === "string") {
        return content;
      }
    }
  }

  if (typeof data.response === "string") {
    return data.response;
  }

  if (typeof data.text === "string") {
    return data.text;
  }

  return "";
}

function buildRunpodUnavailableStatus(reason, selection = {}) {
  const profiles = Array.isArray(selection.profiles) ? selection.profiles : [];

  return {
    available: false,
    enabled: Boolean(config.localAiEnabled),
    provider: "runpod-serverless",
    baseUrl: getRunpodServerlessEndpointUrl(),
    endpointId: config.runpodServerlessEndpointId,
    model: selection.model || config.localAiModel,
    selectedProfileKey: selection.profileKey || "",
    selectedProfileLabel: selection.profileLabel || "",
    modelProfiles: profiles.map((profile) => ({
      ...profile,
      installed: false,
      selected: profile.model === selection.model
    })),
    models: [],
    modelInstalled: false,
    message: reason
  };
}

function buildRunpodAvailableStatus(selection = {}) {
  const profiles = Array.isArray(selection.profiles) ? selection.profiles : [];

  return {
    available: true,
    enabled: true,
    provider: "runpod-serverless",
    baseUrl: getRunpodServerlessEndpointUrl(),
    endpointId: config.runpodServerlessEndpointId,
    model: selection.model || config.localAiModel,
    selectedProfileKey: selection.profileKey || "",
    selectedProfileLabel: selection.profileLabel || "",
    modelProfiles: profiles.map((profile) => ({
      ...profile,
      installed: true,
      selected: profile.model === selection.model
    })),
    models: profiles.map((profile) => profile.model).filter(Boolean),
    modelInstalled: true,
    message: "RunPod Serverless AI is configured."
  };
}

function getRunpodServerlessStatus(selection = {}) {
  if (!config.localAiEnabled) {
    return buildRunpodUnavailableStatus(
      "Local AI is disabled by LOCAL_AI_ENABLED=false.",
      selection
    );
  }

  if (!config.runpodApiKey) {
    return buildRunpodUnavailableStatus(
      "Set RUNPOD_API_KEY to enable RunPod Serverless AI.",
      selection
    );
  }

  if (!config.runpodServerlessEndpointId) {
    return buildRunpodUnavailableStatus(
      "Set RUNPOD_SERVERLESS_ENDPOINT_ID to enable RunPod Serverless AI.",
      selection
    );
  }

  return buildRunpodAvailableStatus(selection);
}

async function requestRunpodServerlessGenerate({
  model,
  prompt,
  generationOptions,
  format = "json"
}) {
  const timeout = withRunpodServerlessTimeout();

  try {
    const response = await fetch(getRunpodServerlessEndpointUrl("runsync"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.runpodApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        input: buildRunpodServerlessInput({
          model,
          prompt,
          generationOptions,
          format
        })
      }),
      signal: timeout.signal
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.error ||
          data.message ||
          `RunPod Serverless request failed with status ${response.status}.`
      );
    }

    if (String(data.status || "").toUpperCase() === "FAILED") {
      throw new Error(
        data.error ||
          data.output?.error ||
          "RunPod Serverless job failed."
      );
    }

    return {
      response: extractRunpodServerlessResponse(data),
      raw: data
    };
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Timed out while contacting RunPod Serverless.", {
        cause: error
      });
    }

    throw error;
  } finally {
    timeout.clear();
  }
}

module.exports = {
  getRunpodServerlessStatus,
  isRunpodServerlessProvider,
  requestRunpodServerlessGenerate,
  __test: {
    buildRunpodServerlessInput,
    extractRunpodServerlessResponse,
    getRunpodServerlessEndpointUrl
  }
};
