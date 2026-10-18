# @hamhome/webapp

Web build of the extension's management page (`apps/extension/entrypoints/app`), the base of the
self-hosted deployment tracked in [issue #2](https://github.com/bingoYB/ham_home/issues/2).

This package only owns the build tooling. The page code is the extension's own; the sources that
make it run on a plain web page live in [`apps/extension/web`](../extension/web):

| File | Replaces | Behavior on the web |
| --- | --- | --- |
| `shims/storage.ts` | WXT `storage` global | IndexedDB-backed `defineItem` / `removeItem`, JSON copy semantics, `watch` across tabs via `BroadcastChannel` |
| `shims/browser.ts` | `wxt/browser` | `runtime.getURL/getManifest`, `commands`, `tabs.query/create` work; everything else rejects with `UnsupportedOnWebError` |
| `shims/proxy-service.ts`, `shims/web-background-service.ts` | `@webext-core/proxy-service` | `getBackgroundService()` runs in-page: storage reads work, other methods reject with `UnsupportedOnWebError` |
| `shims/defuddle-full.ts`, `shims/page-extract.ts` | `defuddle/full`, `@/utils/page-extract` | There is no page to capture; keeps about 1 MB of parsers out of the bundle |
| `install-globals.ts` | WXT auto-imports | Installs `storage`; must be the first import of `main.tsx` |

## Commands

```bash
pnpm dev:webapp     # http://localhost:3125
pnpm build:webapp   # apps/webapp/dist
```

Shim and platform tests run with the extension's suite: `pnpm --filter hamhome test`.

## Capabilities

`apps/extension/lib/platform` says what a build can do. This package injects
`__HAMHOME_TARGET__="web"`, which turns off everything that needs extension APIs, a service worker
or on-device assets:

| Capability | Hidden on the web |
| --- | --- |
| `browserTabs` | Workspaces and tab groups (their `#routes` fall back to the bookmark list) |
| `browserBookmarkImport` | Import from, and sync to, the browser's bookmark tree |
| `browserIntegration` | Save panel mode, omnibox, side panel and shortcut settings |
| `ai`, `semanticSearch` | AI settings, assistant launcher, batch organize, AI category generation, embeddings |
| `snapshots`, `screenshots` | Snapshot and screenshot settings, storage cards, viewers and the gallery view |
| `obsidianSync` | "Sync to Obsidian" in the bookmark menu and the batch toolbar (it needs a snapshot and the tabs API) |
| `bookmarkHealth` | The health center |

The web build adds `manualBookmarkEntry`: an "Add bookmark" button that opens the edit dialog in
create mode, since there is no open page to save from.

Flags are scalar `const`s on purpose, so a disabled feature and everything only it imports is
removed at build time. Use them directly at the point of use (`capabilities.ai && <X />`); wrapping
them in an object or a function brings the unused code back into the bundle.

## Bundle

The entry chunk is about 1.2 MB (360 KB gzip), down from 3.8 MB (1.15 MB gzip) before capabilities.
The AI runtime still ships as a separate lazy chunk (about 870 KB) because the extension imports it
on demand; the web build never requests it.

## Why a separate package

`vite` is pinned to the version WXT builds the extension with (5.4.21). A direct `vite` dependency in
`apps/extension` (or a different version anywhere in the workspace) makes pnpm re-resolve WXT's own
copy, which would silently change the extension's build toolchain.

## Known gaps (addressed in follow-up PRs)

- No sync yet: data lives only in this browser's IndexedDB until the WebDAV scheduler is added.
- `UnsupportedOnWebError` is still reachable from code paths no screen links to; the console stays
  clean in normal use.
