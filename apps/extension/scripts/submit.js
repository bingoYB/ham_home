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
const shouldSkipZip = customArgs.includes("--skip-zip");
const passthroughArgs = customArgs.filter((arg) => arg !== "--skip-zip");

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

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: appRoot,
    stdio: "inherit",
    env: process.env,
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

function warnAboutNodeVersion() {
  const [major] = process.versions.node.split(".");

  if (Number(major) >= 25) {
    log(
      "Detected Node.js >= 25. `wxt submit` may fail in this environment because of an upstream dependency issue. Node 18-24 is safer for publishing.",
    );
  }
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
  }

  if (hasEnv(["EDGE_PRODUCT_ID", "EDGE_CLIENT_ID", "EDGE_API_KEY"])) {
    const edgeZipPath = fileExists(zipPaths.edge)
      ? zipPaths.edge
      : requireFile(zipPaths.chrome, "Edge zip fallback (Chrome zip)");

    args.push("--edge-zip", edgeZipPath);
    enabledStores.push("edge");
  }

  if (enabledStores.length === 0) {
    fail(
      "No publishing target is configured. Please check apps/extension/.env.submit.",
    );
  }

  return {
    args: args.concat(passthroughArgs),
    enabledStores,
    zipPaths,
  };
}

function main() {
  warnAboutNodeVersion();
  loadEnvFile(envFile);

  if (!shouldSkipZip) {
    log("Building zip packages with `pnpm zip:all`...");
    run(pnpmCommand, ["zip:all"]);
  } else {
    log("Skip zipping because `--skip-zip` was provided.");
  }

  const packageBaseName = getPackageBaseName();
  const version = getExtensionVersion(packageBaseName);
  const { args, enabledStores, zipPaths } = buildSubmitArgs(
    packageBaseName,
    version,
  );

  log(`Detected package: ${packageBaseName}`);
  log(`Detected version: ${version}`);
  log(`Publishing targets: ${enabledStores.join(", ")}`);

  if (enabledStores.includes("firefox")) {
    log(`Firefox zip: ${path.relative(appRoot, zipPaths.firefox)}`);
    log(`Firefox sources: ${path.relative(appRoot, zipPaths.sources)}`);
  }

  if (enabledStores.includes("edge")) {
    const edgeZip = fileExists(zipPaths.edge) ? zipPaths.edge : zipPaths.chrome;
    log(`Edge zip: ${path.relative(appRoot, edgeZip)}`);
  }

  if (enabledStores.includes("chrome")) {
    log(`Chrome zip: ${path.relative(appRoot, zipPaths.chrome)}`);
  }

  log(`Running: ${pnpmCommand} ${args.join(" ")}`);
  run(pnpmCommand, args);
}

main();
