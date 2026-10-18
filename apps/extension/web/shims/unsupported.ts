/**
 * Raised when code reachable from the web build calls an extension-only API.
 * Features that need such APIs are expected to be hidden on the web (see PR 2); this error
 * makes a missed one visible instead of silently doing nothing.
 */
export class UnsupportedOnWebError extends Error {
  readonly api: string;

  constructor(api: string) {
    super(`${api} is not available in the web build`);
    this.name = "UnsupportedOnWebError";
    this.api = api;
  }
}

/**
 * Proxy whose every property is another proxy and whose every call rejects with
 * `UnsupportedOnWebError`. `on*` members behave like extension events with no emitter.
 */
export function createUnsupportedProxy(path: string): any {
  const noopEvent = {
    addListener() {},
    removeListener() {},
    hasListener: () => false,
  };

  return new Proxy(function unsupported() {}, {
    get(_target, prop) {
      // `await proxy` and string coercion probe these; answering them keeps the proxy inert.
      if (typeof prop === "symbol" || prop === "then") return undefined;
      if (prop.startsWith("on")) return noopEvent;
      return createUnsupportedProxy(`${path}.${prop}`);
    },
    apply() {
      return Promise.reject(new UnsupportedOnWebError(path));
    },
  });
}
