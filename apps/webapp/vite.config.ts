import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * Web build of the extension's management page (`entrypoints/app`) for self-hosting.
 *
 * The page runs unmodified: `storage`, `wxt/browser` and the background service proxy are
 * replaced by browser implementations from `apps/extension/web/shims`. This package only owns the
 * build tooling, which is why it pins the same Vite major that WXT builds the extension with:
 * a different direct `vite` dependency would make pnpm re-resolve WXT's own copy.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const extension = path.resolve(here, "../extension");

// The manifest version lives in wxt.config.ts; reuse it so the About page shows the same number.
function readManifestVersion(): string {
  const source = readFileSync(path.join(extension, "wxt.config.ts"), "utf8");
  return source.match(/\bversion:\s*"(\d+\.\d+\.\d+)"/)?.[1] ?? "0.0.0";
}

export default defineConfig({
  root: path.join(extension, "web"),
  // Relative asset URLs: the bundle also works when served from a sub-path behind a reverse proxy
  base: "./",
  plugins: [react()],
  define: {
    __WEBAPP_VERSION__: JSON.stringify(readManifestVersion()),
    // Read by lib/platform: turns extension-only features off at build time
    __HAMHOME_TARGET__: JSON.stringify("web"),
  },
  resolve: {
    alias: [
      { find: "wxt/browser", replacement: path.join(extension, "web/shims/browser.ts") },
      {
        find: "@webext-core/proxy-service",
        replacement: path.join(extension, "web/shims/proxy-service.ts"),
      },
      { find: "defuddle/full", replacement: path.join(extension, "web/shims/defuddle-full.ts") },
      { find: /^@\/utils\/page-extract$/, replacement: path.join(extension, "web/shims/page-extract.ts") },
      { find: /^@ui\//, replacement: `${path.resolve(here, "../../packages/ui/src")}/` },
      { find: /^@\//, replacement: `${extension}/` },
    ],
  },
  server: { port: 3125 },
  build: {
    outDir: path.join(here, "dist"),
    emptyOutDir: true,
  },
});
