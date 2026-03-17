const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const config = require("../config");

const seedPosts = [
  {
    id: crypto.randomUUID(),
    title: "Welcome To The Suno Blog",
    slug: "welcome-to-the-suno-blog",
    summary: "A starter post for the new blog site that will eventually feature your Suno song videos and writeups.",
    content:
      "This scaffold is intentionally simple. The next steps can add authentication, CRUD posts, video uploads, and a richer publishing flow.",
    coverImage:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80",
    publishedAt: "2026-03-17",
    category: "Project Update"
  },
  {
    id: crypto.randomUUID(),
    title: "How Each Song Post Could Work",
    slug: "how-each-song-post-could-work",
    summary: "Each entry can combine a Suno video, lyrics, a short story about the track, and any release notes you want.",
    content:
      "A blog format fits the project well because each song can become a post with a title, embedded media, description, and supporting text.",
    coverImage:
      "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80",
    publishedAt: "2026-03-18",
    category: "Planning"
  }
];

async function ensureStore() {
  await fs.mkdir(path.dirname(config.postsFile), { recursive: true });
  try {
    await fs.access(config.postsFile);
  } catch {
    await fs.writeFile(config.postsFile, JSON.stringify({ posts: seedPosts }, null, 2));
  }
}

async function readPosts() {
  await ensureStore();
  const file = await fs.readFile(config.postsFile, "utf8");
  const data = JSON.parse(file);
  return data.posts || [];
}

async function writePosts(posts) {
  await ensureStore();
  await fs.writeFile(config.postsFile, JSON.stringify({ posts }, null, 2));
}

module.exports = {
  readPosts,
  writePosts
};
