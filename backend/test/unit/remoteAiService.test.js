const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const backendSrcRoot = path.resolve(__dirname, "../../src");

function loadRemoteAiService(overrides = {}) {
  for (const cacheKey of Object.keys(require.cache)) {
    if (cacheKey.startsWith(backendSrcRoot)) {
      delete require.cache[cacheKey];
    }
  }

  const originalEnv = { ...process.env };

  process.env = {
    ...originalEnv,
    NODE_ENV: "test",
    REMOTE_AI_ENABLED: "true",
    REMOTE_AI_SSH_HOST: "203.0.113.10",
    REMOTE_AI_SSH_PORT: "22",
    REMOTE_AI_SSH_USER: "ubuntu",
    REMOTE_AI_SSH_KEY_PATH: "~/.ssh/thunder_ed25519",
    REMOTE_AI_TUNNEL_LOCAL_PORT: "11434",
    REMOTE_AI_TUNNEL_REMOTE_HOST: "127.0.0.1",
    REMOTE_AI_TUNNEL_REMOTE_PORT: "11434",
    REMOTE_AI_OLLAMA_MODELS_PATH: "/home/ubuntu/ollama-models",
    REMOTE_AI_OLLAMA_LOG_PATH: "/home/ubuntu/ollama.log",
    ...overrides
  };

  return {
    service: require("../../src/services/remoteAiService"),
    restore() {
      process.env = originalEnv;
      for (const cacheKey of Object.keys(require.cache)) {
        if (cacheKey.startsWith(backendSrcRoot)) {
          delete require.cache[cacheKey];
        }
      }
    }
  };
}

test("remote AI config reports a clear missing host error", () => {
  const { service, restore } = loadRemoteAiService({
    REMOTE_AI_SSH_HOST: ""
  });

  try {
    assert.match(service.__test.validateRemoteAiConfig(), /REMOTE_AI_SSH_HOST/);
  } finally {
    restore();
  }
});

test("remote AI config allows SSH config aliases without an explicit key path", () => {
  const { service, restore } = loadRemoteAiService({
    REMOTE_AI_SSH_KEY_PATH: ""
  });

  try {
    assert.equal(service.__test.validateRemoteAiConfig(), "");
  } finally {
    restore();
  }
});

test("remote AI tunnel can rely on an SSH config alias for port and key", () => {
  const { service, restore } = loadRemoteAiService({
    REMOTE_AI_SSH_HOST: "tnr-0",
    REMOTE_AI_SSH_PORT: "",
    REMOTE_AI_SSH_KEY_PATH: ""
  });

  try {
    const args = service.__test.buildTunnelSshArgs();

    assert.deepEqual(args.slice(0, 4), [
      "-N",
      "-L",
      "11434:127.0.0.1:11434",
      "ubuntu@tnr-0"
    ]);
    assert.equal(args.includes("-p"), false);
    assert.equal(args.includes("-i"), false);
  } finally {
    restore();
  }
});

test("remote AI tunnel builds the expected SSH port-forward command", () => {
  const { service, restore } = loadRemoteAiService({
    REMOTE_AI_SSH_HOST: "198.51.100.25",
    REMOTE_AI_SSH_PORT: "2222",
    REMOTE_AI_TUNNEL_LOCAL_PORT: "11434",
    REMOTE_AI_TUNNEL_REMOTE_HOST: "127.0.0.1",
    REMOTE_AI_TUNNEL_REMOTE_PORT: "11434"
  });

  try {
    const args = service.__test.buildTunnelSshArgs();

    assert.deepEqual(args.slice(0, 7), [
      "-N",
      "-L",
      "11434:127.0.0.1:11434",
      "ubuntu@198.51.100.25",
      "-p",
      "2222",
      "-i"
    ]);
    assert.match(args[7], /thunder_ed25519$/);
    assert.ok(args.includes("ExitOnForwardFailure=yes"));
  } finally {
    restore();
  }
});

test("remote Ollama wake script uses Thunder paths and no systemd or sudo", () => {
  const { service, restore } = loadRemoteAiService();

  try {
    const script = service.__test.buildWakeOllamaScript();

    assert.match(script, /OLLAMA_MODELS="\/home\/ubuntu\/ollama-models"/);
    assert.match(script, /nohup ollama serve > "\/home\/ubuntu\/ollama.log"/);
    assert.match(script, /OLLAMA_FLASH_ATTENTION/);
    assert.match(script, /OLLAMA_MAX_LOADED_MODELS/);
    assert.match(script, /CUDA_VISIBLE_DEVICES/);
    assert.match(script, /curl -s http:\/\/127\.0\.0\.1:11434\/api\/tags/);
    assert.doesNotMatch(script, /pgrep -f/);
    assert.doesNotMatch(script, /systemctl|systemd|sudo/);
  } finally {
    restore();
  }
});
