/**
 * Installs the globals WXT would normally auto-import. Storage modules call
 * `storage.defineItem` while they are being imported, so this file must be the first import
 * of the web entry.
 */
import { createWebStorage } from "./shims/storage";

(globalThis as { storage?: unknown }).storage = createWebStorage();

// Ask the browser not to evict the local cache under storage pressure. The server stays the
// source of truth, but a silent eviction would still force a full re-sync.
void navigator.storage?.persist?.().catch(() => undefined);
