const fs = require("fs/promises");
const path = require("path");
const config = require("../config");
const { readLegacySeed, readStore } = require("../data/store");

const DEFAULT_REPORTS_DIR = path.resolve(__dirname, "..", "..", "reports", "live-store-sync");

function buildLiveStoreSyncReport(liveStore, fileStore) {
  return {
    generatedAt: new Date().toISOString(),
    postsFile: config.postsFile,
    posts: compareEntityList(liveStore.posts, fileStore.posts, ["title", "published", "videoUrl", "lyrics"]),
    collections: compareEntityList(liveStore.collections, fileStore.collections, ["title", "featuredReleaseSlug"]),
    users: {
      liveCount: liveStore.users.length,
      fileCount: fileStore.users.length
    },
    comments: {
      liveCount: liveStore.comments.length,
      fileCount: fileStore.comments.length
    }
  };
}

async function previewLiveStoreSync(options = {}) {
  const outputDir = path.resolve(options.outputDir || DEFAULT_REPORTS_DIR);
  const [liveStore, fileStore] = await Promise.all([readStore(), readLegacySeed()]);
  const report = buildLiveStoreSyncReport(liveStore, fileStore);
  const artifacts = await writeLiveStoreSyncArtifacts({ liveStore, report, outputDir });

  return {
    liveStore,
    fileStore,
    report,
    outputDir,
    ...artifacts
  };
}

async function applyLiveStoreSync(options = {}) {
  const preview = await previewLiveStoreSync(options);
  const timestamp = createTimestamp();
  const backupPath = `${config.postsFile}.backup.${timestamp}.json`;

  await fs.copyFile(config.postsFile, backupPath);
  await writeJson(config.postsFile, preview.liveStore);

  return {
    ...preview,
    backupPath
  };
}

async function writeLiveStoreSyncArtifacts({ liveStore, report, outputDir }) {
  await fs.mkdir(outputDir, { recursive: true });
  const timestamp = createTimestamp();
  const liveSnapshotPath = path.join(outputDir, `live-store-snapshot.${timestamp}.json`);
  const reportPath = path.join(outputDir, `live-store-sync-report.${timestamp}.json`);

  await writeJson(liveSnapshotPath, liveStore);
  await writeJson(reportPath, report);

  return {
    liveSnapshotPath,
    reportPath
  };
}

function compareEntityList(liveItems = [], fileItems = [], keyFields = []) {
  const liveBySlug = new Map(liveItems.map((item) => [String(item.slug || item.id || ""), item]));
  const fileBySlug = new Map(fileItems.map((item) => [String(item.slug || item.id || ""), item]));
  const onlyInLive = [];
  const onlyInFile = [];
  const changed = [];

  for (const [key, liveItem] of liveBySlug.entries()) {
    if (!key) {
      continue;
    }

    const fileItem = fileBySlug.get(key);
    if (!fileItem) {
      onlyInLive.push({ key, title: liveItem.title || "" });
      continue;
    }

    const fieldChanges = [];
    const candidateFields = new Set([...Object.keys(liveItem), ...Object.keys(fileItem), ...keyFields]);

    for (const field of candidateFields) {
      if (field === "updatedAt") {
        continue;
      }

      if (!isSameValue(liveItem[field], fileItem[field])) {
        fieldChanges.push(field);
      }
    }

    if (fieldChanges.length) {
      changed.push({
        key,
        title: liveItem.title || fileItem.title || "",
        changedFields: fieldChanges.sort()
      });
    }
  }

  for (const [key, fileItem] of fileBySlug.entries()) {
    if (!key || liveBySlug.has(key)) {
      continue;
    }

    onlyInFile.push({ key, title: fileItem.title || "" });
  }

  return {
    liveCount: liveItems.length,
    fileCount: fileItems.length,
    onlyInLive,
    onlyInFile,
    changed: changed.sort((left, right) => left.key.localeCompare(right.key))
  };
}

function isSameValue(left, right) {
  return JSON.stringify(normalizeValue(left)) === JSON.stringify(normalizeValue(right));
}

function normalizeValue(value) {
  if (Array.isArray(value)) {
    return value.map(normalizeValue);
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce((accumulator, key) => {
        accumulator[key] = normalizeValue(value[key]);
        return accumulator;
      }, {});
  }

  return value ?? null;
}

function createTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

async function writeJson(destination, data) {
  await fs.writeFile(destination, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

module.exports = {
  DEFAULT_REPORTS_DIR,
  applyLiveStoreSync,
  buildLiveStoreSyncReport,
  previewLiveStoreSync
};
