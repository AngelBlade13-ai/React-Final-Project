const fs = require("fs/promises");
const path = require("path");
const { spawn } = require("child_process");
const config = require("../config");

const DEFAULT_REPORTS_DIR = path.resolve(
  __dirname,
  "..",
  "..",
  "reports",
  "reseed-live-site"
);
const DEFAULT_RESEED_TIMEOUT_MS = 15 * 60 * 1000;

function runPostFileReseed(options = {}) {
  const outputDir = path.resolve(options.outputDir || DEFAULT_REPORTS_DIR);
  return reseedWithReport(outputDir);
}

async function reseedWithReport(outputDir) {
  await fs.mkdir(outputDir, { recursive: true });
  const timestamp = createTimestamp();
  const logPath = path.join(outputDir, `reseed-live-site.${timestamp}.log`);

  if (Object.prototype.hasOwnProperty.call(process.env, "RESEED_LIVE_SITE_TEST_RESULT")) {
    const testOutput = String(process.env.RESEED_LIVE_SITE_TEST_RESULT || "").trim();
    await fs.writeFile(logPath, `${testOutput}\n`, "utf8");
    return {
      generatedAt: new Date().toISOString(),
      postsFile: config.postsFile,
      logPath,
      output: testOutput
    };
  }

  const { command, args } = resolveReseedCommand();
  const timeoutMs = resolveTimeoutMs();

  const child = spawn(command, args, {
    cwd: path.resolve(__dirname, ".."),
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32"
  });

  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk.toString("utf8");
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString("utf8");
  });

  let timeoutHandle;
  let timedOut = false;

  let exitCode;
  try {
    exitCode = await new Promise((resolve, reject) => {
      child.on("error", reject);
      child.on("close", resolve);
      timeoutHandle = setTimeout(() => {
        timedOut = true;
        child.kill();
        reject(new Error(`Website reseed timed out after ${timeoutMs} ms.`));
      }, timeoutMs);
    });
  } catch (error) {
    output = output.trim();
    await fs.writeFile(logPath, `${output}\n`, "utf8");
    if (timedOut) {
      error.output = output;
      error.logPath = logPath;
    }
    throw error;
  } finally {
    clearTimeout(timeoutHandle);
  }

  output = output.trim();
  await fs.writeFile(logPath, `${output}\n`, "utf8");
  if (exitCode !== 0) {
    const error = new Error(`Website reseed failed with exit code ${exitCode}.`);
    error.output = output;
    error.logPath = logPath;
    throw error;
  }

  return {
    generatedAt: new Date().toISOString(),
    postsFile: config.postsFile,
    logPath,
    output
  };
}

function resolveTimeoutMs() {
  const rawTimeout = String(process.env.RESEED_TIMEOUT_MS || "").trim();
  if (!rawTimeout) {
    return DEFAULT_RESEED_TIMEOUT_MS;
  }

  const parsedTimeout = Number.parseInt(rawTimeout, 10);
  if (!Number.isFinite(parsedTimeout) || parsedTimeout < 1) {
    throw new Error("RESEED_TIMEOUT_MS must be a positive integer in milliseconds.");
  }

  return parsedTimeout;
}

function resolveReseedCommand() {
  const overrideCommand = String(process.env.RESEED_LIVE_SITE_COMMAND || "").trim();
  if (overrideCommand) {
    const rawArgs = String(process.env.RESEED_LIVE_SITE_ARGS_JSON || "").trim();
    let overrideArgs = [];

    if (rawArgs) {
      try {
        const parsedArgs = JSON.parse(rawArgs);
        if (!Array.isArray(parsedArgs)) {
          throw new Error("RESEED_LIVE_SITE_ARGS_JSON must be a JSON array.");
        }
        overrideArgs = parsedArgs.map((arg) => String(arg));
      } catch (error) {
        throw new Error(
          `Failed to parse RESEED_LIVE_SITE_ARGS_JSON: ${error.message}`,
          { cause: error }
        );
      }
    }

    return {
      command: overrideCommand,
      args: overrideArgs
    };
  }

  const npmExecutable = process.platform === "win32" ? "npm.cmd" : "npm";
  return {
    command: npmExecutable,
    args: ["run", "reseed"]
  };
}

function createTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

module.exports = {
  DEFAULT_REPORTS_DIR,
  resolveReseedCommand,
  resolveTimeoutMs,
  runPostFileReseed
};
