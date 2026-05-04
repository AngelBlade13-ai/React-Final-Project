const fs = require("fs/promises");
const http = require("http");
const https = require("https");
const path = require("path");
const { spawn } = require("child_process");
const config = require("../config");

const DEFAULT_READY_TIMEOUT_MS = 8000;
const PING_TIMEOUT_MS = 700;

async function launchImporter(options = {}) {
  if (Object.prototype.hasOwnProperty.call(process.env, "IMPORTER_LAUNCH_TEST_RESULT")) {
    return {
      url: config.importerUrl,
      alreadyRunning: process.env.IMPORTER_LAUNCH_TEST_RESULT === "already-running",
      started: process.env.IMPORTER_LAUNCH_TEST_RESULT !== "already-running"
    };
  }

  const importerUrl = normalizeImporterUrl(options.importerUrl || config.importerUrl);

  if (await isImporterReachable(importerUrl)) {
    return {
      url: importerUrl,
      alreadyRunning: true,
      started: false
    };
  }

  const importerRoot = path.resolve(options.importerRoot || config.importerRoot);
  const mainPath = path.join(importerRoot, "main.py");
  const pythonPath =
    options.pythonPath ||
    config.importerPythonPath ||
    path.join(importerRoot, ".venv", process.platform === "win32" ? "Scripts\\python.exe" : "bin/python");

  await assertFileExists(mainPath, "Importer entry point was not found.");
  await assertFileExists(pythonPath, "Importer Python executable was not found.");

  const port = resolvePort(importerUrl);
  const child = spawn(
    pythonPath,
    [
      "main.py",
      "--web",
      "--website-root",
      config.websiteRoot,
      "--port",
      String(port),
      "--no-browser"
    ],
    {
      cwd: importerRoot,
      detached: true,
      stdio: "ignore",
      windowsHide: true
    }
  );
  child.unref();

  await waitForImporter(importerUrl, DEFAULT_READY_TIMEOUT_MS);

  return {
    url: importerUrl,
    alreadyRunning: false,
    started: true
  };
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
  isImporterReachable,
  launchImporter,
  normalizeImporterUrl,
  resolvePort
};
