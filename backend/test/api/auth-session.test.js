const test = require("node:test");
const assert = require("node:assert/strict");
const { PassThrough } = require("node:stream");
const request = require("supertest");
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

test("configured admin email is promoted even when a public account already exists", async (t) => {
  const context = await createApiTestContext();
  t.after(async () => {
    await context.close();
  });

  const registerResponse = await context.agent
    .post("/api/auth/register")
    .send({
      displayName: "Old Public Admin",
      email: "admin@example.com",
      password: "Admin123!"
    })
    .set(context.mutationHeaders);

  assert.equal(registerResponse.status, 201);
  assert.equal(registerResponse.body.user.role, "user");

  const logoutResponse = await context.agent
    .post("/api/auth/logout")
    .set(context.mutationHeaders);

  assert.equal(logoutResponse.status, 200);

  const loginResponse = await context.agent
    .post("/api/auth/login")
    .send({
      email: "admin@example.com",
      password: "Admin123!"
    })
    .set(context.mutationHeaders);

  assert.equal(loginResponse.status, 200);
  assert.equal(loginResponse.body.user.role, "admin");

  const sessionResponse = await context.agent.get("/api/admin/session");

  assert.equal(sessionResponse.status, 200);
  assert.equal(sessionResponse.body.admin.role, "admin");
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

test("user can upload an avatar and receive the updated profile", async (t) => {
  const context = await createApiTestContext({
    CLOUDINARY_CLOUD_NAME: "demo",
    CLOUDINARY_API_KEY: "key",
    CLOUDINARY_API_SECRET: "secret",
    CLOUDINARY_FOLDER: "test-folder"
  });
  const { cloudinary } = require("../../src/lib/cloudinary");
  const originalUploadStream = cloudinary.uploader.upload_stream;

  t.after(async () => {
    cloudinary.uploader.upload_stream = originalUploadStream;
    await context.close();
  });

  cloudinary.uploader.upload_stream = (options, callback) => {
    const stream = new PassThrough();

    stream.on("finish", () => {
      assert.equal(options.resource_type, "image");
      assert.match(options.folder, /\/avatars$/);
      assert.equal(options.transformation[0].width, 512);
      callback(null, {
        secure_url: "https://res.cloudinary.com/demo/image/upload/avatar.jpg",
        public_id: "avatars/test-avatar",
        format: "jpg"
      });
    });

    return stream;
  };

  const registerResponse = await context.agent
    .post("/api/auth/register")
    .send({
      displayName: "Avatar User",
      email: "avatar@example.com",
      password: "Password123!"
    })
    .set(context.mutationHeaders);

  assert.equal(registerResponse.status, 201);

  const avatarResponse = await context.agent
    .post("/api/auth/me/avatar")
    .set(context.mutationHeaders)
    .attach("avatar", Buffer.from("fake image bytes"), {
      filename: "avatar.png",
      contentType: "image/png"
    });

  assert.equal(avatarResponse.status, 200);
  assert.equal(
    avatarResponse.body.user.avatarUrl,
    "https://res.cloudinary.com/demo/image/upload/avatar.jpg"
  );
  assert.ok(avatarResponse.body.token);

  const meResponse = await context.agent.get("/api/auth/me");

  assert.equal(meResponse.status, 200);
  assert.equal(
    meResponse.body.user.avatarUrl,
    "https://res.cloudinary.com/demo/image/upload/avatar.jpg"
  );
});

test("avatar upload validates session and file input", async (t) => {
  const context = await createApiTestContext();
  t.after(async () => {
    await context.close();
  });

  const unauthenticatedResponse = await context.client
    .post("/api/auth/me/avatar")
    .set(context.mutationHeaders);

  assert.equal(unauthenticatedResponse.status, 401);
  assert.equal(
    unauthenticatedResponse.body.message,
    "Authentication required."
  );

  const registerResponse = await context.agent
    .post("/api/auth/register")
    .send({
      displayName: "Avatar Validation User",
      email: "avatar-validation@example.com",
      password: "Password123!"
    })
    .set(context.mutationHeaders);

  assert.equal(registerResponse.status, 201);

  const missingFileResponse = await context.agent
    .post("/api/auth/me/avatar")
    .set(context.mutationHeaders);

  assert.equal(missingFileResponse.status, 400);
  assert.equal(
    missingFileResponse.body.message,
    "Choose an image before uploading."
  );

  const wrongTypeResponse = await context.agent
    .post("/api/auth/me/avatar")
    .set(context.mutationHeaders)
    .attach("avatar", Buffer.from("not image"), {
      filename: "avatar.txt",
      contentType: "text/plain"
    });

  assert.equal(wrongTypeResponse.status, 400);
  assert.equal(
    wrongTypeResponse.body.message,
    "Profile picture must be an image file."
  );
});

test("avatar upload returns a clear message when Cloudinary fails", async (t) => {
  const context = await createApiTestContext({
    CLOUDINARY_CLOUD_NAME: "demo",
    CLOUDINARY_API_KEY: "key",
    CLOUDINARY_API_SECRET: "secret",
    CLOUDINARY_FOLDER: "test-folder"
  });
  const { cloudinary } = require("../../src/lib/cloudinary");
  const originalUploadStream = cloudinary.uploader.upload_stream;

  t.after(async () => {
    cloudinary.uploader.upload_stream = originalUploadStream;
    await context.close();
  });

  cloudinary.uploader.upload_stream = (_options, callback) => {
    const stream = new PassThrough();

    stream.on("finish", () => {
      callback(new Error("Cloudinary unavailable"));
    });

    return stream;
  };

  const registerResponse = await context.agent
    .post("/api/auth/register")
    .send({
      displayName: "Avatar Failure User",
      email: "avatar-failure@example.com",
      password: "Password123!"
    })
    .set(context.mutationHeaders);

  assert.equal(registerResponse.status, 201);

  const avatarResponse = await context.agent
    .post("/api/auth/me/avatar")
    .set(context.mutationHeaders)
    .attach("avatar", Buffer.from("fake image bytes"), {
      filename: "avatar.png",
      contentType: "image/png"
    });

  assert.equal(avatarResponse.status, 502);
  assert.equal(
    avatarResponse.body.message,
    "Profile picture could not be uploaded. Try again in a moment."
  );
});

test("comments include avatars, support replies, reports, profiles, and admin deletion", async (t) => {
  const context = await createApiTestContext();
  const ownerAgent = context.agent;
  const reporterAgent = request.agent(context.app);
  const { readStore, replaceUser } = require("../../src/data/store");

  t.after(async () => {
    await context.close();
  });

  const postsResponse = await context.client.get("/api/posts");
  const targetPost = postsResponse.body.posts[0];

  assert.ok(targetPost?.slug);

  const ownerRegisterResponse = await ownerAgent
    .post("/api/auth/register")
    .send({
      displayName: "Comment Owner",
      email: "comment-owner@example.com",
      password: "Password123!"
    })
    .set(context.mutationHeaders);

  assert.equal(ownerRegisterResponse.status, 201);

  const storeAfterOwner = await readStore();
  const owner = storeAfterOwner.users.find(
    (user) => user.email === "comment-owner@example.com"
  );

  await replaceUser({
    ...owner,
    avatarUrl: "https://example.com/avatar-owner.jpg"
  });

  const commentResponse = await ownerAgent
    .post(`/api/posts/${targetPost.slug}/comments`)
    .send({ body: "This release hit hard." })
    .set(context.mutationHeaders);

  assert.equal(commentResponse.status, 201);
  assert.equal(
    commentResponse.body.comment.author.avatarUrl,
    "https://example.com/avatar-owner.jpg"
  );
  assert.equal(commentResponse.body.comment.parentCommentId, "");
  assert.equal(commentResponse.body.comment.reports, undefined);

  const parentCommentId = commentResponse.body.comment.id;

  const profileResponse = await context.client.get(
    `/api/users/${owner.id}/profile`
  );

  assert.equal(profileResponse.status, 200);
  assert.equal(profileResponse.body.profile.displayName, "Comment Owner");
  assert.equal(profileResponse.body.profile.email, undefined);
  assert.equal(profileResponse.body.profile.recentComments.length, 1);

  const reporterRegisterResponse = await reporterAgent
    .post("/api/auth/register")
    .send({
      displayName: "Reporter",
      email: "reporter@example.com",
      password: "Password123!"
    })
    .set(context.mutationHeaders);

  assert.equal(reporterRegisterResponse.status, 201);

  const replyResponse = await reporterAgent
    .post(`/api/posts/${targetPost.slug}/comments`)
    .send({
      body: "Replying to this thought.",
      parentCommentId
    })
    .set(context.mutationHeaders);

  assert.equal(replyResponse.status, 201);
  assert.equal(replyResponse.body.comment.parentCommentId, parentCommentId);

  const reportResponse = await reporterAgent
    .post(`/api/comments/${parentCommentId}/report`)
    .send({
      reason: "other",
      details: "Needs a moderator review."
    })
    .set(context.mutationHeaders);

  assert.equal(reportResponse.status, 201);
  assert.equal(reportResponse.body.comment.reports, undefined);

  const adminLoginResponse = await ownerAgent
    .post("/api/auth/login")
    .send({
      email: "admin@example.com",
      password: "Admin123!"
    })
    .set(context.mutationHeaders);

  assert.equal(adminLoginResponse.status, 200);
  assert.equal(adminLoginResponse.body.user.role, "admin");

  const adminCommentsResponse = await ownerAgent.get("/api/admin/comments");

  assert.equal(adminCommentsResponse.status, 200);
  const reportedComment = adminCommentsResponse.body.comments.find(
    (comment) => comment.id === parentCommentId
  );

  assert.equal(reportedComment.reportCount, 1);
  assert.equal(reportedComment.reports[0].reason, "other");
  assert.equal(reportedComment.reports[0].reporter.displayName, "Reporter");

  const deleteResponse = await ownerAgent
    .delete(`/api/admin/comments/${parentCommentId}`)
    .set(context.mutationHeaders);

  assert.equal(deleteResponse.status, 200);

  const afterDeleteResponse = await ownerAgent.get("/api/admin/comments");

  assert.equal(
    afterDeleteResponse.body.comments.some(
      (comment) => comment.id === parentCommentId
    ),
    false
  );
});

test("admin can disable and delete public users from user management", async (t) => {
  const context = await createApiTestContext();
  t.after(async () => {
    await context.close();
  });

  const publicRegisterResponse = await context.client
    .post("/api/auth/register")
    .send({
      displayName: "Delete Me",
      email: "delete-me@example.com",
      password: "Password123!"
    })
    .set(context.mutationHeaders);

  assert.equal(publicRegisterResponse.status, 201);

  const loginResponse = await context.agent
    .post("/api/auth/login")
    .send({
      email: "admin@example.com",
      password: "Admin123!"
    })
    .set(context.mutationHeaders);

  assert.equal(loginResponse.status, 200);
  assert.equal(loginResponse.body.user.role, "admin");

  const usersResponse = await context.agent.get("/api/admin/users");

  assert.equal(usersResponse.status, 200);
  const targetUser = usersResponse.body.users.find(
    (user) => user.email === "delete-me@example.com"
  );

  assert.ok(targetUser);

  const disableResponse = await context.agent
    .put(`/api/admin/users/${targetUser.id}`)
    .send({ status: "disabled" })
    .set(context.mutationHeaders);

  assert.equal(disableResponse.status, 200);
  assert.equal(disableResponse.body.user.status, "disabled");

  const deleteResponse = await context.agent
    .delete(`/api/admin/users/${targetUser.id}`)
    .set(context.mutationHeaders);

  assert.equal(deleteResponse.status, 200);

  const afterDeleteResponse = await context.agent.get("/api/admin/users");

  assert.equal(afterDeleteResponse.status, 200);
  assert.equal(
    afterDeleteResponse.body.users.some(
      (user) => user.email === "delete-me@example.com"
    ),
    false
  );
});
