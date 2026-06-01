const fs = require("fs/promises");
const http = require("http");
const https = require("https");
const path = require("path");
const { spawn } = require("child_process");
const config = require("../config");

const DEFAULT_READY_TIMEOUT_MS = 8000;
const PING_TIMEOUT_MS = 700;
const DEFAULT_IMPORTER_LOG_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "reports",
  "importer"
);

async function launchImporter(options = {}) {
  if (
    Object.prototype.hasOwnProperty.call(
      process.env,
      "IMPORTER_LAUNCH_TEST_RESULT"
    )
  ) {
    return {
      url: config.importerUrl,
      alreadyRunning:
        process.env.IMPORTER_LAUNCH_TEST_RESULT === "already-running",
      started: process.env.IMPORTER_LAUNCH_TEST_RESULT !== "already-running"
    };
  }

  if (!config.importerEnabled) {
    const error = new Error(
      "Importer launcher is disabled for this backend. Run the importer locally, or set IMPORTER_ENABLED=true with IMPORTER_LAUNCH_MODE=external and IMPORTER_URL pointing to a trusted hosted importer service."
    );
    error.statusCode = 503;
    throw error;
  }

  const importerUrl = normalizeImporterUrl(
    options.importerUrl || config.importerUrl
  );
  const launchMode = String(
    options.launchMode || config.importerLaunchMode || "local"
  )
    .trim()
    .toLowerCase();

  if (launchMode === "external") {
    return {
      url: importerUrl,
      alreadyRunning: true,
      started: false,
      external: true,
      logPath: ""
    };
  }

  if (await isImporterReachable(importerUrl)) {
    return {
      url: importerUrl,
      alreadyRunning: true,
      started: false,
      logPath: ""
    };
  }

  const importerRoot = path.resolve(
    options.importerRoot || config.importerRoot
  );
  const mainPath = path.join(importerRoot, "main.py");
  const pythonPath =
    options.pythonPath ||
    config.importerPythonPath ||
    path.join(
      importerRoot,
      ".venv",
      process.platform === "win32" ? "Scripts\\python.exe" : "bin/python"
    );

  await assertFileExists(mainPath, "Importer entry point was not found.");
  await assertFileExists(
    pythonPath,
    "Importer Python executable was not found."
  );

  const port = resolvePort(importerUrl);
  const logPath = await createImporterLogPath();
  const logHandle = await fs.open(logPath, "a");
  const child = spawn(
    pythonPath,
    [
      "main.py",
      "--web",
      "--website-root",
      config.websiteRoot,
      "--website-posts",
      config.postsFile,
      "--port",
      String(port),
      "--no-browser"
    ],
    {
      cwd: importerRoot,
      detached: true,
      stdio: ["ignore", logHandle.fd, logHandle.fd],
      windowsHide: true
    }
  );
  child.unref();
  await logHandle.close();

  try {
    await waitForImporter(importerUrl, DEFAULT_READY_TIMEOUT_MS);
  } catch (error) {
    error.message = `${error.message} Importer log: ${logPath}`;
    throw error;
  }

  return {
    url: importerUrl,
    alreadyRunning: false,
    started: true,
    logPath
  };
}

async function createImporterLogPath() {
  await fs.mkdir(DEFAULT_IMPORTER_LOG_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return path.join(DEFAULT_IMPORTER_LOG_DIR, `importer.${timestamp}.log`);
}

function normalizeImporterUrl(value) {
  const importerUrl = new URL(String(value || "").trim());

  if (importerUrl.protocol !== "http:" && importerUrl.protocol !== "https:") {
    throw new Error("IMPORTER_URL must be an http or https URL.");
  }

  importerUrl.pathname = importerUrl.pathname || "/";
  return importerUrl.toString();
}

function resolvePort(value) {
  const importerUrl = new URL(value);

  if (importerUrl.port) {
    return Number.parseInt(importerUrl.port, 10);
  }

  return importerUrl.protocol === "https:" ? 443 : 80;
}

async function assertFileExists(filePath, message) {
  try {
    await fs.access(filePath);
  } catch {
    const error = new Error(`${message} Checked: ${filePath}`);
    error.statusCode = 503;
    throw error;
  }
}

async function waitForImporter(importerUrl, timeoutMs) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    if (await isImporterReachable(importerUrl)) {
      return;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 250);
    });
  }

  const error = new Error(`Importer did not become ready at ${importerUrl}.`);
  error.statusCode = 504;
  throw error;
}

function isImporterReachable(importerUrl) {
  return new Promise((resolve) => {
    const parsedUrl = new URL(importerUrl);
    const transport = parsedUrl.protocol === "https:" ? https : http;
    const request = transport.get(parsedUrl, (response) => {
      response.resume();
      resolve(response.statusCode >= 200 && response.statusCode < 500);
    });

    request.setTimeout(PING_TIMEOUT_MS, () => {
      request.destroy();
      resolve(false);
    });
    request.on("error", () => {
      resolve(false);
    });
  });
}

module.exports = {
  createImporterLogPath,
  isImporterReachable,
  launchImporter,
  normalizeImporterUrl,
  resolvePort
};
