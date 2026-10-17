/**
 * Web implementation of the background service contract.
 *
 * In the extension the app page reaches the service worker through `@webext-core/proxy-service`.
 * The web build has no service worker, so the few calls that only read storage run in-page and
 * everything else rejects with `UnsupportedOnWebError`.
 */
import type { IBackgroundService } from "@/lib/services/background-service-contract";
import { bookmarkStorage } from "@/lib/storage/bookmark-storage";
import { configStorage } from "@/lib/storage/config-storage";
import { UnsupportedOnWebError } from "./unsupported";

const implemented: Partial<IBackgroundService> = {
  getBookmarks: () => bookmarkStorage.getBookmarks(),
  getCategories: () => bookmarkStorage.getCategories(),
  getAllTags: () => bookmarkStorage.getAllTags(),
  getSettings: () => configStorage.getSettings(),
  openOptionsPage: async (view = "settings") => {
    window.location.hash = view;
  },
  openTab: async (url) => {
    window.open(url, "_blank", "noopener,noreferrer");
  },
  isSemanticAvailable: async () => false,
  getShortcuts: async () => [],
};

export const webBackgroundService = new Proxy(implemented, {
  get(target, prop) {
    if (typeof prop === "symbol" || prop === "then") return undefined;
    if (prop in target) return target[prop as keyof IBackgroundService];
    return async () => {
      throw new UnsupportedOnWebError(`backgroundService.${prop}`);
    };
  },
}) as IBackgroundService;
