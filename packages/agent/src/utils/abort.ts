/**
 * Throws the signal's abort reason when the signal has already been aborted.
 *
 * Example:
 * ```ts
 * throwIfAborted(options.signal);
 * ```
 */
export function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    throw getAbortReason(signal);
  }
}

/**
 * Resolves with `promise`, or rejects with the abort reason as soon as `signal`
 * aborts. `onAbort` runs before the rejection so callers can drop state that
 * the abandoned promise would otherwise have cleaned up.
 *
 * Example:
 * ```ts
 * const approved = await waitUnlessAborted(askUser(), signal, () => pending.delete(id));
 * ```
 */
export function waitUnlessAborted<T>(
  promise: Promise<T>,
  signal: AbortSignal | undefined,
  onAbort?: () => void,
): Promise<T> {
  if (!signal) {
    return promise;
  }

  return new Promise<T>((resolve, reject) => {
    const abort = () => {
      onAbort?.();
      reject(getAbortReason(signal));
    };
    if (signal.aborted) {
      abort();
      return;
    }

    signal.addEventListener("abort", abort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener("abort", abort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", abort);
        reject(error);
      },
    );
  });
}

function getAbortReason(signal: AbortSignal): unknown {
  return signal.reason ?? createAbortError("The operation was aborted.");
}

/**
 * Creates an `Error` named "AbortError". Unlike `DOMException`, it is an
 * `Error` instance in every runtime, so the name survives error normalization.
 *
 * Example:
 * ```ts
 * controller.abort(createAbortError("Closed by the caller."));
 * ```
 */
export function createAbortError(message: string): Error {
  const error = new Error(message);
  error.name = "AbortError";
  return error;
}

/**
 * Aborts `controller` with the same reason when `source` aborts. Returns a
 * function that stops forwarding.
 *
 * Example:
 * ```ts
 * const controller = new AbortController();
 * const stop = forwardAbort(options.signal, controller);
 * ```
 */
export function forwardAbort(source: AbortSignal | undefined, controller: AbortController): () => void {
  if (!source) {
    return () => undefined;
  }
  if (source.aborted) {
    controller.abort(source.reason);
    return () => undefined;
  }

  const abort = () => controller.abort(source.reason);
  source.addEventListener("abort", abort, { once: true });
  return () => source.removeEventListener("abort", abort);
}
