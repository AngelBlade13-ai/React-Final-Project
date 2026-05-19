const test = require("node:test");
const assert = require("node:assert/strict");
const { createApiTestContext } = require("../helpers/createApiTestContext");

test("user registration sets a cookie-backed session that auth/me can restore", async (t) => {
  const context = await createApiTestContext();
  t.after(async () => {
    await context.close();
  });

  const registerResponse = await context.agent
    .post("/api/auth/register")
    .send({
      displayName: "Quality Gate User",
      email: "quality@example.com",
      password: "Password123!"
    })
    .set(context.mutationHeaders);

  assert.equal(registerResponse.status, 201);
  assert.match(
    registerResponse.headers["set-cookie"].join(";"),
    /suno_blog_user_session=/
  );

  const meResponse = await context.agent.get("/api/auth/me");

  assert.equal(meResponse.status, 200);
  assert.equal(meResponse.body.user.displayName, "Quality Gate User");

  const logoutResponse = await context.agent
    .post("/api/auth/logout")
    .set(context.mutationHeaders);
  assert.equal(logoutResponse.status, 200);

  const afterLogoutResponse = await context.agent.get("/api/auth/me");
  assert.equal(afterLogoutResponse.status, 401);
});

test("admin login sets a cookie-backed session that the admin shell endpoint validates", async (t) => {
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
  assert.match(
    loginResponse.headers["set-cookie"].join(";"),
    /suno_blog_admin_session=/
  );

  const sessionResponse = await context.agent.get("/api/admin/session");

  assert.equal(sessionResponse.status, 200);
  assert.equal(sessionResponse.body.admin.role, "admin");
  assert.equal(sessionResponse.body.admin.email, "admin@example.com");

  const logoutResponse = await context.agent
    .post("/api/admin/logout")
    .set(context.mutationHeaders);
  assert.equal(logoutResponse.status, 200);

  const afterLogoutResponse = await context.agent.get("/api/admin/session");
  assert.equal(afterLogoutResponse.status, 401);
});

test("admin activity refreshes the cookie-backed admin session", async (t) => {
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
  assert.match(
    loginResponse.headers["set-cookie"].join(";"),
    /suno_blog_admin_session=/
  );

  const sessionResponse = await context.agent.get("/api/admin/session");

  assert.equal(sessionResponse.status, 200);
  assert.equal(sessionResponse.body.admin.role, "admin");
  assert.equal(sessionResponse.body.admin.email, "admin@example.com");
  assert.ok(Array.isArray(sessionResponse.headers["set-cookie"]));
  assert.match(
    sessionResponse.headers["set-cookie"].join(";"),
    /suno_blog_admin_session=/
  );
});

test("public posts smoke endpoint returns the seeded release catalog", async (t) => {
  const context = await createApiTestContext();
  t.after(async () => {
    await context.close();
  });

  const postsResponse = await context.client.get("/api/posts");

  assert.equal(postsResponse.status, 200);
  assert.ok(Array.isArray(postsResponse.body.posts));
  assert.ok(postsResponse.body.posts.length >= 1);
});
