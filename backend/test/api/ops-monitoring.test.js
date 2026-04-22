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

  const loginResponse = await context.agent.post("/api/admin/login").send({
    email: "admin@example.com",
    password: "Admin123!"
  });

  assert.equal(loginResponse.status, 200);

  const createResponse = await context.agent.post("/api/admin/posts").send({
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
