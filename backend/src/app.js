const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const config = require("./config");
const { requireAdmin } = require("./middleware/auth");
const { readPosts, writePosts } = require("./data/store");
const { slugify } = require("./utils/slugify");
const uploadRoutes = require("./routes/upload.routes");

const app = express();

app.use(
  cors({
    origin: config.clientUrl
  })
);
app.use(express.json());
app.use("/api/uploads", uploadRoutes);

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body;

  if (email !== config.adminEmail || password !== config.adminPassword) {
    return res.status(401).json({ message: "Invalid admin credentials." });
  }

  const token = jwt.sign(
    {
      email: config.adminEmail,
      role: "admin"
    },
    config.jwtSecret,
    { expiresIn: "2h" }
  );

  return res.json({
    token,
    admin: {
      email: config.adminEmail,
      role: "admin"
    }
  });
});

app.get("/api/posts", async (req, res, next) => {
  try {
    const posts = await readPosts();
    res.json({ posts: posts.filter((post) => post.published) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/posts", requireAdmin, async (req, res, next) => {
  try {
    const posts = await readPosts();
    res.json({ posts });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/posts", requireAdmin, async (req, res, next) => {
  try {
    const posts = await readPosts();
    const newPost = {
      id: crypto.randomUUID(),
      title: req.body.title?.trim() || "",
      slug: slugify(req.body.title || ""),
      videoUrl: req.body.videoUrl?.trim() || "",
      excerpt: req.body.excerpt?.trim() || "",
      content: req.body.content?.trim() || "",
      lyrics: req.body.lyrics?.trim() || "",
      createdAt: req.body.createdAt || new Date().toISOString(),
      published: Boolean(req.body.published)
    };

    if (!newPost.title || !newPost.videoUrl || !newPost.excerpt || !newPost.content) {
      return res.status(400).json({ message: "Title, video URL, excerpt, and content are required." });
    }

    posts.unshift(newPost);
    await writePosts(posts);
    res.status(201).json({ post: newPost });
  } catch (error) {
    next(error);
  }
});

app.put("/api/admin/posts/:id", requireAdmin, async (req, res, next) => {
  try {
    const posts = await readPosts();
    const index = posts.findIndex((post) => post.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ message: "Post not found." });
    }

    const updated = {
      ...posts[index],
      title: req.body.title?.trim() || posts[index].title,
      slug: slugify(req.body.title || posts[index].title),
      videoUrl: req.body.videoUrl?.trim() || posts[index].videoUrl,
      excerpt: req.body.excerpt?.trim() || posts[index].excerpt,
      content: req.body.content?.trim() || posts[index].content,
      lyrics: req.body.lyrics?.trim() ?? posts[index].lyrics,
      createdAt: posts[index].createdAt,
      published: typeof req.body.published === "boolean" ? req.body.published : posts[index].published
    };

    posts[index] = updated;
    await writePosts(posts);
    res.json({ post: updated });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/admin/posts/:id", requireAdmin, async (req, res, next) => {
  try {
    const posts = await readPosts();
    const remaining = posts.filter((post) => post.id !== req.params.id);

    if (remaining.length === posts.length) {
      return res.status(404).json({ message: "Post not found." });
    }

    await writePosts(remaining);
    res.json({ message: "Post deleted." });
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: "Internal server error." });
});

module.exports = app;
