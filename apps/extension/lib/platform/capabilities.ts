/**
 * Platform capabilities of the management page.
 *
 * The same React app runs as a browser extension page and as a self-hosted web page (see
 * `apps/webapp`). Features that need extension APIs, a service worker or on-device assets are
 * described here once, so screens ask "can this build do X?" instead of sniffing the environment.
 *
 * The values live in `./flags.ts`; this file holds their shape and the pure helpers.
 */

export interface PlatformCapabilities {
  /** Read and restore browser tabs and windows: workspaces and tab groups. */
  browserTabs: boolean;
  /** Import from, and write back to, the browser's own bookmark tree. */
  browserBookmarkImport: boolean;
  /** Pieces that live in the browser chrome: save panel mode, omnibox, side panel, shortcuts. */
  browserIntegration: boolean;
  /** AI analysis, translation, chat and the agent, together with their settings. */
  ai: boolean;
  /** Embeddings, the vector index and semantic search. */
  semanticSearch: boolean;
  /** Page snapshots stored on this device. */
  snapshots: boolean;
  /** Page screenshots stored on this device. */
  screenshots: boolean;
  /** Link health scans, which need the extension's cross-origin host permissions. */
  bookmarkHealth: boolean;
  /** Add a bookmark by typing its URL: there is no open page to capture it from. */
  manualBookmarkEntry: boolean;
}

/** Hash routes of the app page that only make sense with a capability. */
const VIEW_REQUIREMENTS: Readonly<Record<string, keyof PlatformCapabilities>> = {
  health: "bookmarkHealth",
  workspaces: "browserTabs",
  "tab-groups": "browserTabs",
};

export function isViewAvailable(view: string, capabilities: PlatformCapabilities): boolean {
  const required = VIEW_REQUIREMENTS[view];
  return required === undefined || capabilities[required];
}
