import { nanoid } from 'nanoid';
import type { RequestOptionsCustom, WebDAVClient } from 'webdav';
import type { WebDAVLockInspection } from '@/types/sync';
import { SyncError, toSyncError } from './webdav-errors';
import { webdavLockStorage, type WebDAVLockRecord, type WebDAVLockStore } from './webdav-lock-storage';
import { lockLifetime, normalizeLockToken, parseLockDiscovery, parseLockResponse } from './webdav-lock.utils';
import { withWebDAVTimeout } from './webdav-request';

const REQUEST_TIMEOUT = 20_000;
const TIMEOUT = 'Second-600';
interface Lease {
  record: WebDAVLockRecord;
  expiresAt: number;
  controller: AbortController;
  failure?: SyncError;
  timer?: ReturnType<typeof setTimeout>;
  renewal?: Promise<void>;
  closed: boolean;
}

/** Owns the full LOCK lifecycle, including durable recovery after the worker disappears. */
export class WebDAVLockManager {
  private lease?: Lease;
  private running = false;

  constructor(private client: WebDAVClient, private baseUrl: string, private username: string,
    private store: WebDAVLockStore = webdavLockStorage) {}

  get isBusy() { return this.running; }
  get owner() { return this.lease?.record.owner; }
  private scope(path: string) { return JSON.stringify([this.baseUrl, this.username, path]); }
  private url(path: string) { return `${this.baseUrl}/${path.replace(/^\//, '')}`; }

  private assertLease(): void {
    const lease = this.lease;
    if (!lease) return;
    if (!lease.failure && Date.now() >= lease.expiresAt) {
      lease.failure = new SyncError('conflict', 'WebDAV lock expired; writes stopped');
      lease.controller.abort();
    }
    if (lease.failure) throw lease.failure;
  }

  mutationOptions(): { headers: Record<string, string>; signal?: AbortSignal } {
    this.assertLease();
    return this.lease ? {
      headers: { If: `<${this.urlFromScope(this.lease.record)}> (<${this.lease.record.token}>)` },
      signal: this.lease.controller.signal,
    } : { headers: {} };
  }

  private urlFromScope(record: WebDAVLockRecord): string {
    return this.url((JSON.parse(record.scope) as string[])[2]);
  }

  private async request(path: string, options: RequestOptionsCustom,
    onHeaders?: (response: Awaited<ReturnType<WebDAVClient['customRequest']>>) => Promise<void>) {
    try {
      return await withWebDAVTimeout(async signal => {
        const response = await this.client.customRequest(path, { ...options, signal });
        if (response.status >= 400) {
          throw toSyncError(Object.assign(new Error(`HTTP ${response.status}`), { status: response.status }));
        }
        await onHeaders?.(response);
        return { status: response.status, text: await response.text() };
      }, REQUEST_TIMEOUT);
    } catch (err) {
      const error = toSyncError(err);
      throw new SyncError(error.code, `${options.method} ${path}: ${error.message}`, error.status);
    }
  }

  private async discover(path: string) {
    try {
      const response = await this.request(path, { method: 'PROPFIND', headers: {
        Depth: '0', 'Content-Type': 'application/xml; charset=utf-8',
      }, data: '<d:propfind xmlns:d="DAV:"><d:prop><d:lockdiscovery/></d:prop></d:propfind>' });
      const result = parseLockDiscovery(response.text);
      // Only this sync root may be unlocked. Never follow a server-supplied URL elsewhere.
      const expected = this.url(path).replace(/\/$/, '');
      return { ...result, locks: result.locks.filter(lock => !lock.root ||
        new URL(lock.root, `${expected}/`).href.replace(/\/$/, '') === expected) };
    } catch (err) {
      if ([404, 405, 501].includes(toSyncError(err).status ?? 0)) return { supported: false, locks: [] };
      throw err;
    }
  }

  async inspect(path: string): Promise<WebDAVLockInspection> {
    const record = await this.store.get(this.scope(path));
    const result = await this.discover(path);
    const locks = result.locks.map(lock => ({ token: lock.token, timeout: lock.timeout,
      ownedByThisDevice: lock.token === record?.token || lock.owner === record?.owner }));
    if (record?.token && !locks.some(lock => lock.token === record.token)) {
      // Some servers don't expose lockdiscovery. A saved token remains usable for UNLOCK.
      locks.push({ token: record.token, ownedByThisDevice: true, timeout: undefined });
    }
    return { locks, discoverySupported: result.supported };
  }

  private async unlockToken(path: string, token: string): Promise<void> {
    for (let attempt = 0; ; attempt++) {
      try {
        const response = await this.request(path, { method: 'UNLOCK', headers: { 'Lock-Token': `<${token}>` } });
        if (![200, 204].includes(response.status)) throw new Error(`Unexpected UNLOCK status: ${response.status}`);
        return;
      } catch (err) {
        const error = toSyncError(err);
        // Already expired/deleted, including a successful UNLOCK whose response was lost.
        if (error.status === 404 || error.status === 409) return;
        if (attempt < 1 && (error.code === 'network' || error.code === 'server')) continue;
        throw error;
      }
    }
  }

  private async release(path: string, record: WebDAVLockRecord, uncertain = false): Promise<void> {
    let token = record.token;
    if (!token) {
      const result = await this.discover(path);
      token = result.locks.find(lock => lock.owner === record.owner)?.token;
      if (!token && (!result.supported || uncertain)) {
        throw new SyncError('lockRecoveryUnavailable', 'Interrupted LOCK has no discoverable token; recovery information was kept');
      }
    }
    if (token) {
      try { await this.unlockToken(path, token); }
      catch (err) {
        // A token recovered by discovery is also durable if UNLOCK fails.
        await this.store.save({ ...record, token });
        throw err;
      }
    }
    await this.store.remove(record);
  }

  /** Manual recovery only releases the exact tokens the user reviewed. */
  async unlock(path: string, tokens: string[]): Promise<number> {
    if (this.running) throw new SyncError('conflict', 'A WebDAV operation is still running');
    this.running = true;
    try {
      const current = await this.inspect(path);
      if (tokens.some(token => !current.locks.some(lock => lock.token === token))) {
        throw new SyncError('conflict', 'WebDAV locks changed; check the lock state again');
      }
      for (const token of new Set(tokens)) await this.unlockToken(path, token);
      const record = await this.store.get(this.scope(path));
      if (record?.token && tokens.includes(record.token)) await this.store.remove(record);
      return new Set(tokens).size;
    } finally { this.running = false; }
  }

  private scheduleRenewal(path: string, lease: Lease, lifetime: number): void {
    const delay = Math.min(60_000, lifetime / 2);
    lease.timer = setTimeout(() => {
      lease.renewal = (async () => {
        try {
          this.assertLease();
          const requestedAt = Date.now();
          const response = await this.request(path, { method: 'LOCK', headers: {
            If: `(<${lease.record.token}>)`, Timeout: TIMEOUT,
          } }); // Refresh MUST have no body (RFC 4918, 9.10.2).
          const refreshed = parseLockResponse(response.text)[0];
          if (!refreshed || refreshed.token !== lease.record.token) throw new Error('Invalid lock refresh response');
          const lifetime = lockLifetime(refreshed.timeout);
          lease.expiresAt = requestedAt + lifetime;
          if (!lease.closed) this.scheduleRenewal(path, lease, lifetime);
        } catch (err) {
          lease.failure = new SyncError('conflict', `WebDAV lock renewal failed: ${toSyncError(err).message}`);
          lease.controller.abort();
        }
      })();
    }, delay);
  }

  async withLock<T>(path: string, operation: () => Promise<T>): Promise<T> {
    if (this.running) throw new SyncError('conflict', 'A WebDAV operation is still running');
    this.running = true;
    let record: WebDAVLockRecord | undefined;
    let primaryError: unknown;
    try {
      const previous = await this.store.get(this.scope(path));
      if (previous) await this.release(path, previous);
      const pending: WebDAVLockRecord = { scope: this.scope(path), owner: `urn:hamhome:${nanoid()}` };
      await this.store.save(pending); // Write intent BEFORE LOCK; a lost response can be recovered by owner.
      record = pending;
      const requestedAt = Date.now();
      let response;
      try {
        response = await this.request(path, { method: 'LOCK', headers: {
          Depth: 'infinity', Timeout: TIMEOUT, 'Content-Type': 'application/xml; charset=utf-8',
        }, data: `<d:lockinfo xmlns:d="DAV:"><d:lockscope><d:exclusive/></d:lockscope><d:locktype><d:write/></d:locktype><d:owner><d:href>${pending.owner}</d:href></d:owner></d:lockinfo>` }, async response => {
          pending.token = normalizeLockToken(response.headers.get('Lock-Token')) || undefined;
          if (pending.token) await this.store.save(pending);
        });
      } catch (err) {
        const error = toSyncError(err);
        if (!pending.token && error.status && ((error.status >= 400 && error.status < 500 && error.status !== 408) || error.status === 501)) {
          await this.store.remove(pending); // The server explicitly refused to grant the lock.
          record = undefined;
        }
        if (error.status === 405 || error.status === 501) {
          throw new SyncError('lockingUnsupported', 'This WebDAV server does not support exclusive LOCK', error.status);
        }
        throw error;
      }
      const granted = parseLockResponse(response.text)[0];
      pending.token ||= granted?.token;
      if (!pending.token) throw new SyncError('lockingUnsupported', 'WebDAV server did not return a lock token');
      await this.store.save(pending);
      const lifetime = lockLifetime(granted?.timeout);
      const lease: Lease = { record: pending, expiresAt: requestedAt + lifetime, controller: new AbortController(), closed: false };
      this.lease = lease;
      this.scheduleRenewal(path, lease, lifetime);
      const result = await operation();
      this.assertLease();
      return result;
    } catch (err) {
      primaryError = err;
      throw err;
    } finally {
      if (this.lease) {
        this.lease.closed = true;
        clearTimeout(this.lease.timer);
        await this.lease.renewal;
      }
      this.lease = undefined;
      try {
        if (record) await this.release(path, record, !record.token);
      } catch (err) {
        // Keep the journal until UNLOCK is acknowledged; never report success with a stranded lock.
        const detail = `WebDAV unlock failed: ${toSyncError(err).message}`;
        if (!primaryError) throw new SyncError('lockReleaseFailed', detail);
        const error = toSyncError(primaryError);
        throw new SyncError(error.code, `${error.message}; ${detail}`, error.status);
      } finally { this.running = false; }
    }
  }
}
