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

test("admin reseed endpoint rewrites the live database from posts.json", async (t) => {
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

  assert.equal(reseedResponse.status, 200);
  assert.equal(
    reseedResponse.body.message,
    "Live site reseeded from backend/data/posts.json."
  );
  assert.ok(reseedResponse.body.reseed);
  assert.ok(reseedResponse.body.reseed.logPath);
  assert.ok(reseedResponse.body.reseed.output);
  assert.match(reseedResponse.body.reseed.output, /reseed ok/);

  const auditResponse = await context.agent.get(
    "/api/admin/audit-logs?limit=5"
  );

  assert.equal(auditResponse.status, 200);
  const reseedAuditEntry = auditResponse.body.auditLogs.find(
    (entry) => entry.action === "site.reseeded"
  );

  assert.ok(reseedAuditEntry);
  assert.equal(reseedAuditEntry.entityType, "site");
  assert.equal(reseedAuditEntry.entityId, "posts.json");
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
