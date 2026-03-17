const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const config = require("../config");

const seedPosts = [
  {
    id: crypto.randomUUID(),
    title: "Beautiful & Real Sunshine",
    slug: "beautiful-and-real-sunshine",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    excerpt: "A first release post with the song video, a short note, and room for the lyrics that shaped it.",
    content:
      "This is the release format going forward: one entry per song, a short written note, and the video at the center of the post.",
    lyrics: "You can add full lyrics here whenever a song needs them.",
    createdAt: "2026-03-17T00:00:00.000Z",
    published: true
  },
  {
    id: crypto.randomUUID(),
    title: "Second Window",
    slug: "second-window",
    videoUrl: "https://www.w3schools.com/html/movie.mp4",
    excerpt: "A quieter draft kept in the dashboard until the post is ready to go live.",
    content:
      "Draft posts stay simple too. Add the video, write the release note, optionally paste lyrics, and publish when it feels finished.",
    lyrics: "",
    createdAt: "2026-03-18T00:00:00.000Z",
    published: false
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
