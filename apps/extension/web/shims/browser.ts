/**
 * Stand-in for `wxt/browser` in the web build.
 *
 * Only the members that stay harmless on a plain web page are implemented. Everything else
 * resolves through `createUnsupportedProxy`, so tab, bookmark and scripting calls reject with
 * `UnsupportedOnWebError`.
 */
import { createUnsupportedProxy } from "./unsupported";

const fallback = createUnsupportedProxy("browser");

const implemented: Record<string, unknown> = {
  runtime: new Proxy(
    {
      id: undefined,
      getURL: (path: string) => new URL(path.replace(/^\//, ""), document.baseURI).toString(),
      getManifest: () => ({ name: "HamHome", version: __WEBAPP_VERSION__ }),
    },
    { get: (target, prop, receiver) => (prop in target ? Reflect.get(target, prop, receiver) : fallback.runtime[prop]) },
  ),
  commands: { getAll: async () => [] },
  tabs: new Proxy(
    {
      query: async () => [],
      create: async ({ url }: { url?: string }) => {
        if (url) window.open(url, "_blank", "noopener,noreferrer");
      },
    },
    { get: (target, prop, receiver) => (prop in target ? Reflect.get(target, prop, receiver) : fallback.tabs[prop]) },
  ),
};

export const browser: any = new Proxy(implemented, {
  get: (target, prop) => (typeof prop === "string" && prop in target ? target[prop] : fallback[prop as string]),
});
