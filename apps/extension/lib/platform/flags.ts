/**
 * What this build can do. The shape is `PlatformCapabilities`; consumers import this module as
 * a namespace (`capabilities.ai`, see `./index.ts`).
 *
 * Every flag is a scalar `const` derived from one compile-time constant, on purpose: bundlers fold
 * those, so `capabilities.ai && <GlobalAgentLauncher />` removes the component and everything only
 * it imports from the web bundle. An object, or a function that returns one, defeats that: once
 * it is passed around the bundler no longer trusts its property values.
 *
 * `__HAMHOME_TARGET__` is injected by `apps/webapp/vite.config.ts`; the extension build leaves it
 * undefined, hence the `typeof` guard.
 */
declare const __HAMHOME_TARGET__: string | undefined;

const isWeb = typeof __HAMHOME_TARGET__ !== "undefined" && __HAMHOME_TARGET__ === "web";

export const browserTabs = !isWeb;
export const browserBookmarkImport = !isWeb;
export const browserIntegration = !isWeb;
export const ai = !isWeb;
export const semanticSearch = !isWeb;
export const snapshots = !isWeb;
export const screenshots = !isWeb;
export const obsidianSync = !isWeb;
export const bookmarkHealth = !isWeb;
export const manualBookmarkEntry = isWeb;
