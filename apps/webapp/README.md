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
| `install-globals.ts` | WXT auto-imports | Installs `storage`; must be the first import of `main.tsx` |

## Commands

```bash
pnpm dev:webapp     # http://localhost:3125
pnpm build:webapp   # apps/webapp/dist
```

Shim tests run with the extension's suite: `pnpm --filter hamhome test`.

## Why a separate package

`vite` is pinned to the version WXT builds the extension with (5.4.21). A direct `vite` dependency in
`apps/extension` (or a different version anywhere in the workspace) makes pnpm re-resolve WXT's own
copy, which would silently change the extension's build toolchain.

## Known gaps (addressed in follow-up PRs)

- Extension-only features are still visible and fail with `UnsupportedOnWebError`: AI assistant
  launcher, workspaces, tab groups, bookmark health, AI/embedding settings, import from the browser.
- The bundle includes the whole AI runtime (about 3.8 MB, 1.15 MB gzip); it should be tree-shaken
  once those features are hidden behind a platform flag.
- No sync yet: data lives only in this browser's IndexedDB until the WebDAV scheduler is added.
