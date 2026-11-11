import type { SyncErrorCode } from '@/types/sync';

export class SyncError extends Error {
  constructor(readonly code: SyncErrorCode, message: string, readonly status?: number) {
    super(message);
    this.name = 'SyncError';
  }
}

export function toSyncError(err: unknown): SyncError {
  if (err instanceof SyncError) return err;
  const status = (err as { status?: unknown } | undefined)?.status;
  const message = (err as { message?: string } | undefined)?.message || String(err);
  if (typeof status === 'number') {
    if (status === 401) return new SyncError('auth', message, status);
    if (status === 403) return new SyncError('forbidden', message, status);
    if (status === 412 || status === 423) return new SyncError('conflict', message, status);
    if (status === 404) return new SyncError('notFound', message, status);
    if (status >= 500) return new SyncError('server', message, status);
    return new SyncError('unknown', message, status);
  }
  if (err instanceof TypeError || (err instanceof Error && err.name === 'AbortError')) {
    return new SyncError('network', message);
  }
  return new SyncError('unknown', message);
}
