require("dotenv").config({ quiet: true });
const fs = require("fs/promises");
const path = require("path");
const config = require("../src/config");
const { slugify } = require("../src/utils/slugify");

const DEFAULT_IMPORT_FILE = path.resolve(process.cwd(), "site_ready_admin_payloads.json");
const FALLBACK_IMPORT_FILE = "d:\\Downloads\\site_ready_admin_payloads.json";
const API_BASE_URL = String(process.env.IMPORT_API_BASE_URL || process.env.API_BASE_URL || `http://localhost:${config.port}/api`).trim();
const ADMIN_EMAIL = String(process.env.IMPORT_ADMIN_EMAIL || process.env.ADMIN_EMAIL || config.adminEmail || "").trim();
const ADMIN_PASSWORD = String(process.env.IMPORT_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || config.adminPassword || "");

function resolveImportFile() {
  const cliPath = process.argv[2];

  if (cliPath) {
    return path.resolve(process.cwd(), cliPath);
  }

  return DEFAULT_IMPORT_FILE;
}

async function readPayload(filePath) {
  try {
    const file = await fs.readFile(filePath, "utf8");
    return JSON.parse(file);
  } catch (error) {
    if (filePath !== FALLBACK_IMPORT_FILE) {
      const fallbackFile = await fs.readFile(FALLBACK_IMPORT_FILE, "utf8");
      return JSON.parse(fallbackFile);
    }

    throw error;
  }
}

function extractMarkdownField(content, label) {
  const normalizedContent = String(content || "");
  const pattern = new RegExp(`\\*\\*${label}:\\*\\*\\s*([^\\n]+)`, "i");
  const match = normalizedContent.match(pattern);
  return String(match?.[1] || "").trim();
}

function getUniqueValue(candidates, usedValues, fallbackBase) {
  const normalizedCandidates = [...new Set(candidates.map((value) => String(value || "").trim()).filter(Boolean))];

  for (const candidate of normalizedCandidates) {
    if (!usedValues.has(candidate)) {
      usedValues.add(candidate);
      return candidate;
    }
  }

  const baseValue = normalizedCandidates[0] || String(fallbackBase || "").trim() || "item";

  if (!usedValues.has(baseValue)) {
    usedValues.add(baseValue);
    return baseValue;
  }

  let counter = 2;
  let nextValue = `${baseValue}-${counter}`;

  while (usedValues.has(nextValue)) {
    counter += 1;
    nextValue = `${baseValue}-${counter}`;
  }

  usedValues.add(nextValue);
  return nextValue;
}

function normalizeCollectionPayload(collection) {
  const slug = String(collection?.slug || slugify(collection?.title || "")).trim();

  return {
    title: String(collection?.title || "").trim(),
    slug,
    description: String(collection?.description || "").trim(),
    featuredReleaseSlug: String(collection?.featuredReleaseSlug || "").trim(),
    theme: String(collection?.theme || "").trim()
  };
}

function normalizePostPayloads(posts = []) {
  const usedSlugs = new Set();

  return posts.map((post, index) => {
    const title = String(post?.title || "").trim();
    const titleSlug = slugify(title);
    const versionLabel = extractMarkdownField(post?.content, "Version");
    const versionSlug = slugify(versionLabel);
    const explicitSlug = String(post?.slug || "").trim();
    const sourceId = String(post?.sourceId || post?.id || "").trim();
    const sourceSlug = slugify(sourceId);
    const slug = getUniqueValue(
      [
        explicitSlug,
        titleSlug,
        titleSlug && versionSlug ? `${titleSlug}-${versionSlug}` : "",
        titleSlug && sourceSlug ? `${titleSlug}-${sourceSlug}` : "",
        sourceSlug
      ],
      usedSlugs,
      `post-${index + 1}`
    );

    return {
      title,
      slug,
      excerpt: String(post?.excerpt || "").trim(),
      content: String(post?.content || "").trim(),
      lyrics: typeof post?.lyrics === "string" ? post.lyrics : "",
      videoUrl: String(post?.videoUrl || "").trim(),
      published: Boolean(post?.published),
      collectionSlugs: Array.isArray(post?.collectionSlugs)
        ? [...new Set(post.collectionSlugs.map((entry) => String(entry || "").trim()).filter(Boolean))]
        : [],
      archiveMeta: post?.archiveMeta && typeof post.archiveMeta === "object" ? post.archiveMeta : null,
      createdAt: post?.createdAt
    };
  });
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}.`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

async function getAdminToken() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error("Admin credentials are required. Set IMPORT_ADMIN_EMAIL/IMPORT_ADMIN_PASSWORD or ADMIN_EMAIL/ADMIN_PASSWORD.");
  }

  const data = await requestJson(`${API_BASE_URL}/admin/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    })
  });

  return data.token;
}

async function importCollections(token, collections, summary) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };

  const existing = await requestJson(`${API_BASE_URL}/admin/collections`, { headers });
  const existingCollectionSlugs = new Set((existing.collections || []).map((collection) => collection.slug));

  for (const collection of collections) {
    if (existingCollectionSlugs.has(collection.slug)) {
      summary.collectionsSkipped += 1;
      continue;
    }

    try {
      await requestJson(`${API_BASE_URL}/admin/collections`, {
        method: "POST",
        headers,
        body: JSON.stringify(collection)
      });
      existingCollectionSlugs.add(collection.slug);
      summary.collectionsCreated += 1;
    } catch (error) {
      if (error.status === 400 && /already exists/i.test(String(error.data?.message || ""))) {
        existingCollectionSlugs.add(collection.slug);
        summary.collectionsSkipped += 1;
        continue;
      }

      summary.failures.push({
        type: "collection",
        slug: collection.slug,
        message: error.data?.message || error.message
      });
    }
  }

  return existingCollectionSlugs;
}

async function importPosts(token, posts, summary) {
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
  };

  const existing = await requestJson(`${API_BASE_URL}/admin/posts`, { headers });
  const existingPostSlugs = new Set((existing.posts || []).map((post) => post.slug));

  for (const post of posts) {
    if (existingPostSlugs.has(post.slug)) {
      summary.postsSkipped += 1;
      continue;
    }

    try {
      await requestJson(`${API_BASE_URL}/admin/posts`, {
        method: "POST",
        headers,
        body: JSON.stringify(post)
      });
      existingPostSlugs.add(post.slug);
      summary.postsCreated += 1;
    } catch (error) {
      if (error.status === 400 && /already exists/i.test(String(error.data?.message || ""))) {
        existingPostSlugs.add(post.slug);
        summary.postsSkipped += 1;
        continue;
      }

      summary.failures.push({
        type: "post",
        slug: post.slug,
        message: error.data?.message || error.message
      });
    }
  }
}

async function main() {
  const importFile = resolveImportFile();
  const payload = await readPayload(importFile);
  const collections = Array.isArray(payload.collections) ? payload.collections.map(normalizeCollectionPayload) : [];
  const posts = normalizePostPayloads(Array.isArray(payload.posts) ? payload.posts : []);
  const summary = {
    collectionsCreated: 0,
    collectionsSkipped: 0,
    postsCreated: 0,
    postsSkipped: 0,
    failures: []
  };

  const token = await getAdminToken();
  await importCollections(token, collections, summary);
  await importPosts(token, posts, summary);

  console.log("");
  console.log("Import Summary");
  console.log(`Collections created: ${summary.collectionsCreated}`);
  console.log(`Collections skipped: ${summary.collectionsSkipped}`);
  console.log(`Posts created: ${summary.postsCreated}`);
  console.log(`Posts skipped: ${summary.postsSkipped}`);
  console.log(`Failures: ${summary.failures.length}`);

  if (summary.failures.length) {
    console.log("");
    console.log("Failure Details");
    summary.failures.forEach((failure) => {
      console.log(`[${failure.type}] ${failure.slug}: ${failure.message}`);
    });
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Bulk import failed.");
  console.error(error.message);
  process.exit(1);
});
