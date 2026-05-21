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
    /suno_blog_user_session=/
  );
  assert.equal(loginResponse.body.user.role, "admin");

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
    /suno_blog_user_session=/
  );

  const sessionResponse = await context.agent.get("/api/admin/session");

  assert.equal(sessionResponse.status, 200);
  assert.equal(sessionResponse.body.admin.role, "admin");
  assert.equal(sessionResponse.body.admin.email, "admin@example.com");
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

test("user library saves releases, reactions, and recent listens", async (t) => {
  const context = await createApiTestContext();
  t.after(async () => {
    await context.close();
  });

  const postsResponse = await context.client.get("/api/posts");
  const targetPost = postsResponse.body.posts[0];

  assert.ok(targetPost?.slug);

  const registerResponse = await context.agent
    .post("/api/auth/register")
    .send({
      displayName: "Library User",
      email: "library@example.com",
      password: "Password123!"
    })
    .set(context.mutationHeaders);

  assert.equal(registerResponse.status, 201);

  const saveResponse = await context.agent
    .put(`/api/auth/library/releases/${targetPost.slug}/save`)
    .send({ saved: true })
    .set(context.mutationHeaders);

  assert.equal(saveResponse.status, 200);
  assert.deepEqual(saveResponse.body.savedReleaseSlugs, [targetPost.slug]);

  const reactionResponse = await context.agent
    .put(`/api/auth/library/releases/${targetPost.slug}/reaction`)
    .send({ reaction: "haunted-me" })
    .set(context.mutationHeaders);

  assert.equal(reactionResponse.status, 200);
  assert.equal(
    reactionResponse.body.releaseReactions[targetPost.slug],
    "haunted-me"
  );

  const listenResponse = await context.agent
    .post(`/api/auth/library/releases/${targetPost.slug}/listen`)
    .set(context.mutationHeaders);

  assert.equal(listenResponse.status, 200);
  assert.deepEqual(listenResponse.body.recentReleaseSlugs, [targetPost.slug]);

  const libraryResponse = await context.agent.get("/api/auth/library");

  assert.equal(libraryResponse.status, 200);
  assert.equal(libraryResponse.body.savedReleases[0].slug, targetPost.slug);
  assert.equal(libraryResponse.body.recentReleases[0].slug, targetPost.slug);
  assert.equal(
    libraryResponse.body.releaseReactions[targetPost.slug],
    "haunted-me"
  );
});
