import { toSyncError } from './webdav-errors';

/** Abort both stalled requests and transfers whose owning lease has failed. */
export async function withWebDAVTimeout<T>(operation: (signal: AbortSignal) => Promise<T>, timeoutMs: number, parent?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (parent?.aborted) abort();
  parent?.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(() => {
    controller.abort(new DOMException(`WebDAV request timed out after ${timeoutMs / 1000} seconds`, 'AbortError'));
  }, timeoutMs);
  try { return await operation(controller.signal); }
  catch (err) { throw toSyncError(err); }
  finally {
    clearTimeout(timer);
    parent?.removeEventListener('abort', abort);
  }
}
