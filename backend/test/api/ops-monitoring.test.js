const test = require("node:test");
const assert = require("node:assert/strict");
const { createApiTestContext } = require("../helpers/createApiTestContext");

test("health endpoint exposes request ids and operational logging status", async (t) => {
  const context = await createApiTestContext();
  t.after(async () => {
    await context.close();
  });

  const response = await context.client.get("/api/health");

  assert.equal(response.status, 200);
  assert.ok(response.headers["x-request-id"]);
  assert.equal(response.body.status, "ok");
  assert.equal(response.body.logging.requestLogging, false);
  assert.equal(response.body.logging.adminAuditLogging, true);
  assert.equal(response.body.database.connected, true);
});

test("admin mutations are persisted to the audit trail", async (t) => {
  const context = await createApiTestContext();
  t.after(async () => {
    await context.close();
  });

  const loginResponse = await context.agent
    .post("/api/admin/login")
    .set(context.mutationHeaders)
    .send({
      email: "admin@example.com",
      password: "Admin123!"
    });

  assert.equal(loginResponse.status, 200);

  const createResponse = await context.agent
    .post("/api/admin/posts")
    .set(context.mutationHeaders)
    .send({
      title: "Operational Audit Entry",
      slug: "operational-audit-entry",
      excerpt: "Verifies that admin mutations land in the audit log.",
      content: "This post exists to exercise the admin audit trail.",
      lyrics: "",
      published: true,
      collectionSlugs: []
    });

  assert.equal(createResponse.status, 201);

  const auditResponse = await context.agent.get(
    "/api/admin/audit-logs?limit=5"
  );

  assert.equal(auditResponse.status, 200);
  assert.ok(Array.isArray(auditResponse.body.auditLogs));
  assert.ok(auditResponse.body.auditLogs.length >= 2);

  const createAuditEntry = auditResponse.body.auditLogs.find(
    (entry) => entry.action === "post.created"
  );

  assert.ok(createAuditEntry);
  assert.equal(createAuditEntry.entityLabel, "Operational Audit Entry");
  assert.equal(createAuditEntry.details.slug, "operational-audit-entry");
  assert.equal(createAuditEntry.actorEmail, "admin@example.com");
  assert.ok(createAuditEntry.requestId);
});

test("unsafe requests without the trusted mutation header are blocked", async (t) => {
  const context = await createApiTestContext();
  t.after(async () => {
    await context.close();
  });

  const response = await context.client.post("/api/auth/logout");

  assert.equal(response.status, 403);
  assert.match(response.body.message, /blocked unsafe request/i);
});

test("admin reseed endpoint rewrites the live database from the local authored catalog file", async (t) => {
  const context = await createApiTestContext({
    RESEED_LIVE_SITE_TEST_RESULT: "reseed ok"
  });
  t.after(async () => {
    await context.close();
  });

  const loginResponse = await context.agent
    .post("/api/admin/login")
    .set(context.mutationHeaders)
    .send({
      email: "admin@example.com",
      password: "Admin123!"
    });

  assert.equal(loginResponse.status, 200);
  const adminCookie = loginResponse.headers["set-cookie"];
  assert.ok(adminCookie);

  const reseedResponse = await context.client
    .post("/api/admin/reseed-live-site")
    .set(context.mutationHeaders)
    .set("Cookie", adminCookie);

  assert.equal(reseedResponse.status, 202);
  assert.match(reseedResponse.body.message, /reseed started/i);
  assert.ok(reseedResponse.body.reseedJob);
  assert.equal(reseedResponse.body.reseedJob.status, "running");
  assert.ok(reseedResponse.body.reseedJob.jobId);

  let reseedJob;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const jobResponse = await context.client
      .get(
        `/api/admin/reseed-live-site/jobs/${reseedResponse.body.reseedJob.jobId}`
      )
      .set("Cookie", adminCookie);

    assert.equal(jobResponse.status, 200);
    reseedJob = jobResponse.body.reseedJob;
    if (reseedJob.status !== "running") {
      break;
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 25);
    });
  }

  assert.equal(reseedJob.status, "success");
  assert.ok(reseedJob.reseed);
  assert.ok(reseedJob.reseed.logPath);
  assert.ok(reseedJob.reseed.output);
  assert.match(reseedJob.reseed.output, /reseed ok/);

  const auditResponse = await context.agent.get(
    "/api/admin/audit-logs?limit=5"
  );

  assert.equal(auditResponse.status, 200);
  const reseedAuditEntry = auditResponse.body.auditLogs.find(
    (entry) => entry.action === "site.reseed_started"
  );

  assert.ok(reseedAuditEntry);
  assert.equal(reseedAuditEntry.entityType, "site");
  assert.equal(reseedAuditEntry.entityId, "posts.local.json");
  assert.equal(
    reseedAuditEntry.details.jobId,
    reseedResponse.body.reseedJob.jobId
  );
});

test("local assistant endpoints fail safely when local AI is disabled", async (t) => {
  const context = await createApiTestContext({
    LOCAL_AI_ENABLED: "false"
  });
  t.after(async () => {
    await context.close();
  });

  const loginResponse = await context.agent
    .post("/api/admin/login")
    .set(context.mutationHeaders)
    .send({
      email: "admin@example.com",
      password: "Admin123!"
    });

  assert.equal(loginResponse.status, 200);

  const statusResponse = await context.agent.get("/api/admin/assistant/status");

  assert.equal(statusResponse.status, 200);
  assert.equal(statusResponse.body.localAi.available, false);
  assert.equal(statusResponse.body.localAi.enabled, false);
  assert.equal(statusResponse.body.remoteTunnel.configured, false);

  const reviewResponse = await context.agent
    .post("/api/admin/assistant/catalog-review")
    .set(context.mutationHeaders);

  assert.equal(reviewResponse.status, 503);
  assert.match(reviewResponse.body.message, /disabled/i);

  const postSuggestionResponse = await context.agent
    .post("/api/admin/assistant/post-suggestions")
    .set(context.mutationHeaders)
    .send({
      postDraft: {
        title: "Local Assistant Test",
        excerpt: "A draft to test safe failure."
      }
    });

  assert.equal(postSuggestionResponse.status, 503);
  assert.match(postSuggestionResponse.body.message, /disabled/i);

  const pathSuggestionResponse = await context.agent
    .post("/api/admin/assistant/guided-path-suggestions")
    .set(context.mutationHeaders)
    .send({
      guidedPath: {
        slug: "test-path",
        title: "Test Path"
      }
    });

  assert.equal(pathSuggestionResponse.status, 503);
  assert.match(pathSuggestionResponse.body.message, /disabled/i);

  const newPathSuggestionResponse = await context.agent
    .post("/api/admin/assistant/guided-path-new-suggestion")
    .set(context.mutationHeaders)
    .send({
      guidedPaths: [
        {
          slug: "test-path",
          title: "Test Path"
        }
      ]
    });

  assert.equal(newPathSuggestionResponse.status, 503);
  assert.match(newPathSuggestionResponse.body.message, /disabled/i);

  assert.equal(statusResponse.body.remoteTunnel.configured, false);
});

test("assistant status reflects the selected model profile and installed models", async (t) => {
  const originalFetch = global.fetch;

  global.fetch = async (url) => {
    if (String(url).endsWith("/api/tags")) {
      return {
        ok: true,
        json: async () => ({
          models: [{ name: "qwen2.5:7b" }, { name: "qwen3:14b" }]
        })
      };
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  const context = await createApiTestContext({
    LOCAL_AI_ENABLED: "true"
  });
  t.after(async () => {
    global.fetch = originalFetch;
    await context.close();
  });

  const loginResponse = await context.agent
    .post("/api/admin/login")
    .set(context.mutationHeaders)
    .send({
      email: "admin@example.com",
      password: "Admin123!"
    });

  assert.equal(loginResponse.status, 200);

  const statusResponse = await context.agent.get(
    "/api/admin/assistant/status?profile=balanced"
  );

  assert.equal(statusResponse.status, 200);
  assert.equal(statusResponse.body.localAi.model, "qwen3:14b");
  assert.equal(statusResponse.body.localAi.selectedProfileKey, "balanced");
  assert.equal(statusResponse.body.localAi.modelInstalled, true);
  assert.ok(
    statusResponse.body.localAi.modelProfiles.some(
      (profile) =>
        profile.key === "thorough" &&
        profile.model === "qwen3:30b" &&
        profile.installed === false
    )
  );
});

test("assistant requests fail safely when the selected model profile is not installed", async (t) => {
  const originalFetch = global.fetch;

  global.fetch = async (url) => {
    if (String(url).endsWith("/api/tags")) {
      return {
        ok: true,
        json: async () => ({
          models: [{ name: "qwen2.5:7b" }]
        })
      };
    }

    throw new Error(`Unexpected fetch URL: ${url}`);
  };

  const context = await createApiTestContext({
    LOCAL_AI_ENABLED: "true"
  });
  t.after(async () => {
    global.fetch = originalFetch;
    await context.close();
  });

  const loginResponse = await context.agent
    .post("/api/admin/login")
    .set(context.mutationHeaders)
    .send({
      email: "admin@example.com",
      password: "Admin123!"
    });

  assert.equal(loginResponse.status, 200);

  const response = await context.agent
    .post("/api/admin/assistant/catalog-review")
    .set(context.mutationHeaders)
    .send({
      profile: "thorough"
    });

  assert.equal(response.status, 503);
  assert.match(response.body.message, /qwen3:30b/i);
  assert.equal(response.body.localAi.model, "qwen3:30b");
  assert.equal(response.body.localAi.modelInstalled, false);
});

test("catalog review retries once when the model returns an empty response", async (t) => {
  const originalFetch = global.fetch;
  let generateCallCount = 0;
  const generateBodies = [];

  global.fetch = async (url, init = {}) => {
    const normalizedUrl = String(url);

    if (normalizedUrl.endsWith("/api/tags")) {
      return {
        ok: true,
        json: async () => ({
          models: [{ name: "qwen2.5:7b" }]
        })
      };
    }

    if (normalizedUrl.endsWith("/api/generate")) {
      generateCallCount += 1;
      generateBodies.push(JSON.parse(init.body));

      return {
        ok: true,
        json: async () =>
          generateCallCount === 1
            ? { response: "" }
            : {
                response: JSON.stringify({
                  summary: "Catalog is broadly healthy.",
                  risks: [],
                  suggestedActions: [
                    "Tighten one or two collection highlights."
                  ]
                })
              }
      };
    }

    throw new Error(`Unexpected fetch URL: ${normalizedUrl}`);
  };

  const context = await createApiTestContext({
    LOCAL_AI_ENABLED: "true",
    LOCAL_AI_DEFAULT_NUM_GPU: "99"
  });
  t.after(async () => {
    global.fetch = originalFetch;
    await context.close();
  });

  const loginResponse = await context.agent
    .post("/api/admin/login")
    .set(context.mutationHeaders)
    .send({
      email: "admin@example.com",
      password: "Admin123!"
    });

  assert.equal(loginResponse.status, 200);

  const response = await context.agent
    .post("/api/admin/assistant/catalog-review")
    .set(context.mutationHeaders);

  assert.equal(response.status, 200);
  assert.equal(response.body.review.summary, "Catalog is broadly healthy.");
  assert.deepEqual(response.body.review.risks, []);
  assert.deepEqual(response.body.review.suggestedActions, [
    "Tighten one or two collection highlights."
  ]);
  assert.equal(generateCallCount, 2);
  assert.equal(generateBodies[0].options.num_gpu, 99);
});

test("catalog review reports Ollama generation timeouts clearly", async (t) => {
  const originalFetch = global.fetch;

  global.fetch = async (url) => {
    const normalizedUrl = String(url);

    if (normalizedUrl.endsWith("/api/tags")) {
      return {
        ok: true,
        json: async () => ({
          models: [{ name: "qwen3:30b" }]
        })
      };
    }

    if (normalizedUrl.endsWith("/api/generate")) {
      const error = new Error("This operation was aborted");
      error.name = "AbortError";
      throw error;
    }

    throw new Error(`Unexpected fetch URL: ${normalizedUrl}`);
  };

  const context = await createApiTestContext({
    LOCAL_AI_ENABLED: "true",
    LOCAL_AI_TIMEOUT_MS: "1234"
  });
  t.after(async () => {
    global.fetch = originalFetch;
    await context.close();
  });

  const loginResponse = await context.agent
    .post("/api/admin/login")
    .set(context.mutationHeaders)
    .send({
      email: "admin@example.com",
      password: "Admin123!"
    });

  assert.equal(loginResponse.status, 200);

  const response = await context.agent
    .post("/api/admin/assistant/catalog-review")
    .set(context.mutationHeaders)
    .send({
      profile: "thorough"
    });

  assert.equal(response.status, 504);
  assert.match(response.body.message, /Timed out after 1234 ms/);
});

test("catalog finding review stores post assistant decision memory", async (t) => {
  const originalFetch = global.fetch;

  global.fetch = async (url) => {
    const normalizedUrl = String(url);

    if (normalizedUrl.endsWith("/api/tags")) {
      return {
        ok: true,
        json: async () => ({
          models: [{ name: "qwen2.5:7b" }]
        })
      };
    }

    if (normalizedUrl.endsWith("/api/generate")) {
      return {
        ok: true,
        json: async () => ({
          response: JSON.stringify({
            verdict: "rejected",
            reasonCode: "already-coherent",
            summary: "Current post metadata is coherent enough.",
            fieldAssessments: [
              {
                field: "themeTags",
                status: "keep",
                reason: "The existing context does not require another tag."
              }
            ],
            suggestedPatch: {},
            rationale: ["The finding is too thin to justify a post edit."],
            warnings: []
          })
        })
      };
    }

    throw new Error(`Unexpected fetch URL: ${normalizedUrl}`);
  };

  const context = await createApiTestContext({
    LOCAL_AI_ENABLED: "true"
  });
  t.after(async () => {
    global.fetch = originalFetch;
    await context.close();
  });

  const loginResponse = await context.agent
    .post("/api/admin/login")
    .set(context.mutationHeaders)
    .send({
      email: "admin@example.com",
      password: "Admin123!"
    });

  assert.equal(loginResponse.status, 200);

  const createResponse = await context.agent
    .post("/api/admin/posts")
    .set(context.mutationHeaders)
    .send({
      title: "Finding Review Target",
      slug: "finding-review-target",
      excerpt:
        "A focused test post with enough public-facing copy for assistant review.",
      content:
        "**Universe:** Test\n**Theme:** Assistant review\n**Notes:** Used by the API test.",
      lyrics: "",
      published: true,
      collectionSlugs: [],
      themeTags: ["assistant-review"]
    });

  assert.equal(createResponse.status, 201);

  const reviewResponse = await context.agent
    .post("/api/admin/assistant/catalog-finding-review")
    .set(context.mutationHeaders)
    .send({
      finding: {
        severity: "warning",
        targetType: "post",
        targetSlug: "finding-review-target",
        field: "themeTags",
        issue: "Theme tags may need another identity tag.",
        recommendedAction: "Ask the post assistant to verify the tag."
      }
    });

  assert.equal(reviewResponse.status, 200);
  assert.equal(reviewResponse.body.review.verdict, "rejected");
  assert.equal(reviewResponse.body.decision.status, "rejected");
  assert.equal(reviewResponse.body.decision.reasonCode, "already-coherent");

  const siteContentResponse = await context.agent.get(
    "/api/admin/site-content"
  );

  assert.equal(siteContentResponse.status, 200);
  assert.ok(
    siteContentResponse.body.siteContent.assistantFindingDecisions.some(
      (decision) =>
        decision.targetSlug === "finding-review-target" &&
        decision.status === "rejected"
    )
  );
});

test("remote AI tunnel status reports missing Thunder SSH host clearly", async (t) => {
  const context = await createApiTestContext({
    REMOTE_AI_ENABLED: "true",
    REMOTE_AI_SSH_HOST: "",
    REMOTE_AI_SSH_KEY_PATH: ""
  });
  t.after(async () => {
    await context.close();
  });

  const loginResponse = await context.agent
    .post("/api/admin/login")
    .set(context.mutationHeaders)
    .send({
      email: "admin@example.com",
      password: "Admin123!"
    });

  assert.equal(loginResponse.status, 200);

  const statusResponse = await context.agent.get("/api/admin/assistant/status");

  assert.equal(statusResponse.status, 200);
  assert.equal(statusResponse.body.remoteTunnel.configured, false);
  assert.match(statusResponse.body.remoteTunnel.message, /REMOTE_AI_SSH_HOST/);

  const startResponse = await context.agent
    .post("/api/admin/assistant/remote-tunnel/start")
    .set(context.mutationHeaders);

  assert.equal(startResponse.status, 503);
  assert.match(startResponse.body.message, /REMOTE_AI_SSH_HOST/);
});

test("remote AI tunnel status allows Thunder SSH config aliases without a key path", async (t) => {
  const context = await createApiTestContext({
    REMOTE_AI_TUNNEL_TEST_MODE: "true",
    REMOTE_AI_ENABLED: "true",
    REMOTE_AI_SSH_HOST: "tnr-0",
    REMOTE_AI_SSH_PORT: "",
    REMOTE_AI_SSH_KEY_PATH: ""
  });
  t.after(async () => {
    await context.close();
  });

  const loginResponse = await context.agent
    .post("/api/admin/login")
    .set(context.mutationHeaders)
    .send({
      email: "admin@example.com",
      password: "Admin123!"
    });

  assert.equal(loginResponse.status, 200);

  const response = await context.agent.get("/api/admin/assistant/status");

  assert.equal(response.status, 200);
  assert.equal(response.body.remoteTunnel.configured, true);
  assert.equal(response.body.remoteTunnel.sshHost, "tnr-0");
  assert.equal(response.body.remoteTunnel.sshPort, null);
});

test("remote AI tunnel controls report and toggle Thunder tunnel state safely", async (t) => {
  const context = await createApiTestContext({
    REMOTE_AI_TUNNEL_TEST_MODE: "true",
    REMOTE_AI_TUNNEL_TEST_RUNNING: "false",
    REMOTE_AI_ENABLED: "true",
    REMOTE_AI_SSH_HOST: "203.0.113.10",
    REMOTE_AI_SSH_PORT: "22",
    REMOTE_AI_SSH_USER: "ubuntu",
    REMOTE_AI_SSH_KEY_PATH: "~/.ssh/thunder_ed25519"
  });
  t.after(async () => {
    await context.close();
  });

  const loginResponse = await context.agent
    .post("/api/admin/login")
    .set(context.mutationHeaders)
    .send({
      email: "admin@example.com",
      password: "Admin123!"
    });

  assert.equal(loginResponse.status, 200);

  const statusResponse = await context.agent.get("/api/admin/assistant/status");

  assert.equal(statusResponse.status, 200);
  assert.equal(statusResponse.body.remoteTunnel.configured, true);
  assert.equal(statusResponse.body.remoteTunnel.running, false);
  assert.equal(statusResponse.body.remoteTunnel.sshHost, "203.0.113.10");
  assert.equal(statusResponse.body.remoteTunnel.sshUser, "ubuntu");
  assert.equal(statusResponse.body.remoteTunnel.remoteHost, "127.0.0.1");

  const startResponse = await context.agent
    .post("/api/admin/assistant/remote-tunnel/start")
    .set(context.mutationHeaders);

  assert.equal(startResponse.status, 200);
  assert.equal(startResponse.body.remoteTunnel.running, true);

  const stopResponse = await context.agent
    .post("/api/admin/assistant/remote-tunnel/stop")
    .set(context.mutationHeaders);

  assert.equal(stopResponse.status, 200);
  assert.equal(stopResponse.body.remoteTunnel.running, false);
});

test("remote Ollama wake control starts Ollama through Thunder SSH safely", async (t) => {
  const originalSpawn = require("node:child_process").spawn;
  const childProcess = require("node:child_process");
  let wakeScript = "";

  const context = await createApiTestContext({
    REMOTE_AI_ENABLED: "true",
    REMOTE_AI_SSH_HOST: "203.0.113.10",
    REMOTE_AI_SSH_PORT: "22",
    REMOTE_AI_SSH_USER: "ubuntu",
    REMOTE_AI_SSH_KEY_PATH: "~/.ssh/thunder_ed25519",
    REMOTE_AI_OLLAMA_MODELS_PATH: "/home/ubuntu/ollama-models",
    REMOTE_AI_OLLAMA_LOG_PATH: "/home/ubuntu/ollama.log"
  });

  t.after(async () => {
    childProcess.spawn = originalSpawn;
    await context.close();
  });

  childProcess.spawn = (..._args) => {
    const { EventEmitter } = require("node:events");
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.stdin = {
      write(value) {
        wakeScript += String(value || "");
      },
      end() {}
    };
    child.kill = () => {};

    process.nextTick(() => {
      child.stdout.emit(
        "data",
        '__OLLAMA_STARTED__=1\n{"models":[{"name":"qwen2.5:7b"}]}'
      );
      child.emit("close", 0);
    });

    return child;
  };

  const loginResponse = await context.agent
    .post("/api/admin/login")
    .set(context.mutationHeaders)
    .send({
      email: "admin@example.com",
      password: "Admin123!"
    });

  assert.equal(loginResponse.status, 200);

  const wakeResponse = await context.agent
    .post("/api/admin/assistant/remote-ollama/wake")
    .set(context.mutationHeaders);

  assert.equal(wakeResponse.status, 200);
  assert.equal(wakeResponse.body.remoteOllama.available, true);
  assert.equal(wakeResponse.body.remoteOllama.running, true);
  assert.equal(wakeResponse.body.remoteOllama.startedNow, true);
  assert.equal(wakeResponse.body.remoteOllama.modelInstalled, true);
  assert.equal(
    wakeResponse.body.remoteOllama.modelsPath,
    "/home/ubuntu/ollama-models"
  );
  assert.match(wakeScript, /OLLAMA_MODELS="\/home\/ubuntu\/ollama-models"/);
  assert.match(wakeScript, /nohup ollama serve/);
  assert.doesNotMatch(wakeScript, /systemctl|systemd|sudo/);
});
test("admin importer launcher starts the local importer behind admin auth", async (t) => {
  const context = await createApiTestContext({
    IMPORTER_LAUNCH_TEST_RESULT: "started"
  });
  t.after(async () => {
    await context.close();
  });

  const unauthenticatedResponse = await context.client
    .post("/api/admin/importer/launch")
    .set(context.mutationHeaders);
  assert.equal(unauthenticatedResponse.status, 401);

  const loginResponse = await context.agent
    .post("/api/admin/login")
    .set(context.mutationHeaders)
    .send({
      email: "admin@example.com",
      password: "Admin123!"
    });
  assert.equal(loginResponse.status, 200);

  const launchResponse = await context.agent
    .post("/api/admin/importer/launch")
    .set(context.mutationHeaders);

  assert.equal(launchResponse.status, 200);
  assert.equal(launchResponse.body.message, "Importer launched.");
  assert.equal(launchResponse.body.importer.started, true);
  assert.equal(launchResponse.body.importer.alreadyRunning, false);
  assert.match(launchResponse.body.importer.url, /^http/);

  const auditResponse = await context.agent.get(
    "/api/admin/audit-logs?limit=5"
  );
  const importerAuditEntry = auditResponse.body.auditLogs.find(
    (entry) => entry.action === "importer.launched"
  );

  assert.ok(importerAuditEntry);
  assert.equal(importerAuditEntry.entityType, "tool");
  assert.equal(importerAuditEntry.entityId, "song-importer");
});
