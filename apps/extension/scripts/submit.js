#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const appRoot = path.resolve(__dirname, "..");
const outputDir = path.join(appRoot, ".output");
const envFile = path.join(appRoot, ".env.submit");
const packageJsonPath = path.join(appRoot, "package.json");
const wxtConfigPath = path.join(appRoot, "wxt.config.ts");

const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const customArgs = process.argv.slice(2);
const ownFlags = ["--skip-zip", "--allow-dirty", "--help", "-h"];
const shouldSkipZip = customArgs.includes("--skip-zip");
const allowDirty = customArgs.includes("--allow-dirty");
const shouldShowHelp =
  customArgs.includes("--help") || customArgs.includes("-h");
// pnpm forwards a literal "--" separator (`submit:all -- --dry-run`); drop it so
// `wxt submit` does not treat the remaining flags as positional arguments.
const passthroughArgs = customArgs.filter(
  (arg) => arg !== "--" && !ownFlags.includes(arg),
);

// publish-browser-extension 2.3.1 (used by `wxt submit`) posts a formdata-node
// FormData through native fetch. On Node >= 24 the body is serialized as the
// string "[object FormData]" (text/plain) without any error: Chrome publishes
// the previously uploaded draft while the tool reports success, and Firefox
// answers 415. Node 18/20/22 send proper multipart bodies.
// Revisit this guard when upgrading wxt / publish-browser-extension.
const FIRST_UNSUPPORTED_NODE_MAJOR = 24;
const MAX_LISTED_CHANGES = 20;

function log(message) {
  console.log(`[submit] ${message}`);
}

function fail(message) {
  console.error(`[submit] ${message}`);
  process.exit(1);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function loadEnvFile(filePath) {
  if (!fileExists(filePath)) {
    log(`Skip loading env file, not found: ${path.relative(appRoot, filePath)}`);
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = stripQuotes(line.slice(separatorIndex + 1).trim());

    if (!key || process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = value;
  }

  log(`Loaded env vars from ${path.relative(appRoot, filePath)}`);
}

// Child processes (pnpm, the wxt shim) resolve `node` from PATH, which may be
// a different version than the one running this script. Put this script's
// Node first so the version guard also covers them.
const childEnv = {
  ...process.env,
  PATH: [path.dirname(process.execPath), process.env.PATH]
    .filter(Boolean)
    .join(path.delimiter),
};

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: appRoot,
    stdio: "inherit",
    env: childEnv,
    ...options,
  });

  if (result.status !== 0) {
    fail(`Command failed: ${command} ${args.join(" ")}`);
  }
}

function getPackageBaseName() {
  if (!fileExists(packageJsonPath)) {
    fail("Cannot find apps/extension/package.json");
  }

  const { name } = readJson(packageJsonPath);

  if (!name || typeof name !== "string") {
    fail("Cannot read extension package name from package.json");
  }

  return name.includes("/") ? name.slice(name.lastIndexOf("/") + 1) : name;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getVersionFromZipName(packageBaseName) {
  if (!fileExists(outputDir)) {
    return null;
  }

  const zipNamePattern = new RegExp(
    `^${escapeRegExp(packageBaseName)}-(.+)-(chrome|firefox|edge|sources)\\.zip$`,
  );

  const matches = fs
    .readdirSync(outputDir, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => {
      const match = entry.name.match(zipNamePattern);

      if (!match) {
        return null;
      }

      return {
        version: match[1],
        modifiedAt: fs.statSync(path.join(outputDir, entry.name)).mtimeMs,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.modifiedAt - a.modifiedAt);

  return matches[0]?.version ?? null;
}

function getVersionFromWxtConfig() {
  if (!fileExists(wxtConfigPath)) {
    return null;
  }

  const source = fs.readFileSync(wxtConfigPath, "utf8");
  const versionMatch = source.match(/\bversion\s*:\s*(['"`])([^'"`]+)\1/);

  return versionMatch?.[2] ?? null;
}

function getExtensionVersion(packageBaseName) {
  const versionFromWxtConfig = getVersionFromWxtConfig();

  if (versionFromWxtConfig) {
    return versionFromWxtConfig;
  }

  const versionFromZip = getVersionFromZipName(packageBaseName);

  if (versionFromZip) {
    return versionFromZip;
  }

  fail(
    "Cannot determine extension version from wxt.config.ts or zip names. Please check `manifest.version` in apps/extension/wxt.config.ts.",
  );
}

function requireFile(filePath, label) {
  if (!fileExists(filePath)) {
    fail(`Missing ${label}: ${path.relative(appRoot, filePath)}`);
  }

  return filePath;
}

function hasEnv(keys) {
  return keys.every((key) => {
    const value = process.env[key];
    return typeof value === "string" && value.trim().length > 0;
  });
}

function printHelp() {
  console.log(`Usage: node scripts/submit.js [--skip-zip] [--allow-dirty] [wxt submit options]

Builds the store zips with \`pnpm zip:all\` and submits them with \`wxt submit\`
to every store configured in apps/extension/.env.submit (or process env).

Options:
  --skip-zip     Reuse the zips in .output/ instead of rebuilding them. Fails if a
                 zip for the current version is missing or older than the HEAD commit.
  --allow-dirty  Submit even if the git working tree has uncommitted changes.
  -h, --help     Show this help and exit.

Requirements:
  - Node.js < 24 (Node 22 recommended). Node >= 24 breaks the \`wxt submit\`
    upload (run \`nvm use 22\`).
  - A clean git working tree: modified, staged and untracked files all count,
    gitignored files (.env.submit, .output/, ...) do not.

Any other argument is forwarded to \`wxt submit\` (e.g. --dry-run).`);
}

function assertNodeVersionSupported(nodeVersion, source) {
  const major = Number(nodeVersion.split(".")[0]);

  if (major >= FIRST_UNSUPPORTED_NODE_MAJOR) {
    fail(
      `Node.js ${nodeVersion} (${source}) is not supported for store submission. ` +
        `On Node >= ${FIRST_UNSUPPORTED_NODE_MAJOR}, \`wxt submit\` uploads the string "[object FormData]" instead of the zip: ` +
        "Chrome silently publishes the previously uploaded draft and Firefox returns 415. " +
        "Please switch to Node 22 (e.g. `nvm use 22`) and run again.",
    );
  }
}

function assertSupportedNodeVersion() {
  assertNodeVersionSupported(process.versions.node, "running this script");

  // Double-check the Node that `pnpm exec wxt submit` will actually use.
  const result = spawnSync(
    pnpmCommand,
    ["exec", "node", "-p", "process.versions.node"],
    { cwd: appRoot, env: childEnv, encoding: "utf8" },
  );
  const childVersion = result.status === 0 ? result.stdout.trim() : "";

  if (!/^\d+\.\d+\.\d+/.test(childVersion)) {
    fail(
      "Cannot determine the Node.js version used by `pnpm exec`. Make sure pnpm is installed for this Node version.",
    );
  }

  assertNodeVersionSupported(childVersion, "used by `pnpm exec`");
}

function runGit(args, cwd = appRoot) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });

  if (result.error || result.status !== 0) {
    return null;
  }

  return result.stdout;
}

function readGitState() {
  const repoRoot = runGit(["rev-parse", "--show-toplevel"])?.trim();

  if (!repoRoot) {
    return null;
  }

  // Porcelain output covers the whole repository and already excludes
  // gitignored files. Untracked files are forced on in case the user's git
  // config hides them; optional locks are skipped so a concurrent git process
  // in the same checkout is not disturbed.
  const status = runGit(
    [
      "--no-optional-locks",
      "status",
      "--porcelain",
      "--untracked-files=normal",
    ],
    repoRoot,
  );
  // --no-show-signature keeps gpg output (log.showSignature) out of the line.
  const head = runGit(
    ["log", "-1", "--no-show-signature", "--format=%h%x09%ct%x09%s"],
    repoRoot,
  );

  if (status === null || head === null) {
    return null;
  }

  const [shortSha, commitTime, ...subjectParts] = head.trim().split("\t");

  if (!Number.isFinite(Number(commitTime))) {
    return null;
  }

  const branch = runGit(
    ["rev-parse", "--abbrev-ref", "HEAD"],
    repoRoot,
  )?.trim();

  return {
    repoRoot,
    branch: !branch || branch === "HEAD" ? "(detached HEAD)" : branch,
    shortSha,
    commitTimeMs: Number(commitTime) * 1000,
    subject: subjectParts.join("\t"),
    changes: status.split("\n").filter((line) => line.trim().length > 0),
  };
}

function checkGitState(version) {
  const gitState = readGitState();

  if (!gitState) {
    if (!allowDirty) {
      fail(
        "Cannot read the git state of this checkout, so a clean working tree cannot be verified. Pass --allow-dirty to submit anyway.",
      );
    }

    log(
      "WARNING: cannot read the git state; continuing because --allow-dirty was provided.",
    );
    log(`Version to submit: ${version}`);
    return null;
  }

  log(`Repository: ${gitState.repoRoot}`);
  log(`Branch: ${gitState.branch}`);
  const commitDate = new Date(gitState.commitTimeMs).toISOString();
  log(`Commit: ${gitState.shortSha} ${gitState.subject} (${commitDate})`);
  log(`Version to submit: ${version}`);

  if (gitState.changes.length === 0) {
    log("Working tree is clean.");
    return gitState;
  }

  const listedChanges = gitState.changes.slice(0, MAX_LISTED_CHANGES);
  const hiddenCount = gitState.changes.length - listedChanges.length;
  const report = allowDirty
    ? log
    : (message) => console.error(`[submit] ${message}`);

  report(`Working tree has ${gitState.changes.length} uncommitted change(s):`);
  listedChanges.forEach((line) => report(`  ${line}`));

  if (hiddenCount > 0) {
    report(`  ... and ${hiddenCount} more`);
  }

  if (!allowDirty) {
    fail(
      "Refusing to submit: the zips would include uncommitted code. Commit or stash the changes, or submit from a clean checkout/worktree (copy the gitignored .env.submit there). Pass --allow-dirty to override.",
    );
  }

  log(
    "WARNING: --allow-dirty was provided; the submitted zips may include uncommitted code.",
  );
  return gitState;
}

function describeZip(zip) {
  const relativePath = path.relative(appRoot, zip.filePath);
  const modifiedAt = new Date(fs.statSync(zip.filePath).mtimeMs).toISOString();

  return `${zip.label}: ${relativePath} (modified ${modifiedAt})`;
}

function assertZipsFresh(submittedZips, gitState) {
  if (!gitState) {
    log(
      "Cannot compare zip times with the last commit; check the times above.",
    );
    return;
  }

  const staleZips = submittedZips.filter(
    (zip) => fs.statSync(zip.filePath).mtimeMs < gitState.commitTimeMs,
  );

  if (staleZips.length > 0) {
    // The Edge target may reuse the Chrome zip, so de-duplicate the paths.
    const stalePaths = [
      ...new Set(staleZips.map((zip) => path.relative(appRoot, zip.filePath))),
    ].join(", ");

    fail(
      `These zips are older than commit ${gitState.shortSha} and may be stale: ${stalePaths}. Run again without --skip-zip to rebuild them.`,
    );
  }

  log(`All submitted zips are newer than commit ${gitState.shortSha}.`);
}

function buildSubmitArgs(packageBaseName, version) {
  const zipPaths = {
    chrome: path.join(outputDir, `${packageBaseName}-${version}-chrome.zip`),
    edge: path.join(outputDir, `${packageBaseName}-${version}-edge.zip`),
    firefox: path.join(outputDir, `${packageBaseName}-${version}-firefox.zip`),
    sources: path.join(outputDir, `${packageBaseName}-${version}-sources.zip`),
  };

  const args = ["exec", "wxt", "submit"];
  const enabledStores = [];
  const submittedZips = [];

  if (
    hasEnv([
      "CHROME_EXTENSION_ID",
      "CHROME_CLIENT_ID",
      "CHROME_CLIENT_SECRET",
      "CHROME_REFRESH_TOKEN",
    ])
  ) {
    args.push("--chrome-zip", requireFile(zipPaths.chrome, "Chrome zip"));
    enabledStores.push("chrome");
    submittedZips.push({ label: "Chrome zip", filePath: zipPaths.chrome });
  }

  if (
    hasEnv([
      "FIREFOX_EXTENSION_ID",
      "FIREFOX_JWT_ISSUER",
      "FIREFOX_JWT_SECRET",
    ])
  ) {
    args.push(
      "--firefox-zip",
      requireFile(zipPaths.firefox, "Firefox zip"),
      "--firefox-sources-zip",
      requireFile(zipPaths.sources, "Firefox sources zip"),
    );
    enabledStores.push("firefox");
    submittedZips.push(
      { label: "Firefox zip", filePath: zipPaths.firefox },
      { label: "Firefox sources", filePath: zipPaths.sources },
    );
  }

  if (hasEnv(["EDGE_PRODUCT_ID", "EDGE_CLIENT_ID", "EDGE_API_KEY"])) {
    const edgeZipPath = fileExists(zipPaths.edge)
      ? zipPaths.edge
      : requireFile(zipPaths.chrome, "Edge zip fallback (Chrome zip)");

    args.push("--edge-zip", edgeZipPath);
    enabledStores.push("edge");
    submittedZips.push({ label: "Edge zip", filePath: edgeZipPath });
  }

  if (enabledStores.length === 0) {
    fail(
      "No publishing target is configured. Please check apps/extension/.env.submit.",
    );
  }

  return {
    args: args.concat(passthroughArgs),
    enabledStores,
    submittedZips,
  };
}

function main() {
  if (shouldShowHelp) {
    printHelp();
    return;
  }

  assertSupportedNodeVersion();

  const packageBaseName = getPackageBaseName();
  const version = getExtensionVersion(packageBaseName);
  const gitState = checkGitState(version);

  loadEnvFile(envFile);

  if (!shouldSkipZip) {
    log("Building zip packages with `pnpm zip:all`...");
    run(pnpmCommand, ["zip:all"]);

    // Edits saved while the build ran (editor autosave, another process in
    // this checkout) would end up in the zips, so check the tree again.
    if (gitState && !allowDirty && readGitState()?.changes.length !== 0) {
      fail(
        "The working tree changed while the zips were being built. Commit or revert the changes and run again.",
      );
    }
  } else {
    log("Skip zipping because `--skip-zip` was provided.");
  }

  const { args, enabledStores, submittedZips } = buildSubmitArgs(
    packageBaseName,
    version,
  );

  log(`Detected package: ${packageBaseName}`);
  log(`Detected version: ${version}`);
  log(`Publishing targets: ${enabledStores.join(", ")}`);
  submittedZips.forEach((zip) => log(describeZip(zip)));

  if (shouldSkipZip) {
    assertZipsFresh(submittedZips, gitState);
  }

  log(`Running: ${pnpmCommand} ${args.join(" ")}`);
  run(pnpmCommand, args);
}

main();
