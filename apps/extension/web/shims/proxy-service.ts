/**
 * Replaces `@webext-core/proxy-service` in the web build.
 * `getBackgroundService()` keeps its signature but returns the in-page implementation.
 */
import { webBackgroundService } from "./web-background-service";

export function createProxyService<T>(_key: unknown): T {
  return webBackgroundService as unknown as T;
}

export function registerService(): never {
  throw new Error("registerService is only available in the extension background");
}
