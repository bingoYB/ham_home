import { createClient, AuthType, WebDAVClient } from 'webdav';
import type { WebDAVConfig } from '@/types';

import { SyncError, toSyncError } from './webdav-errors';
import { WebDAVLockManager } from './webdav-lock';
import { webdavLockStorage, type WebDAVLockStore } from './webdav-lock-storage';
import { withWebDAVTimeout } from './webdav-request';
export { SyncError, toSyncError } from './webdav-errors';

// Cloud WebDAV metadata can take more than 30s to download even at modest sizes.
// Lock requests keep their separate, shorter timeout in WebDAVLockManager.
const TRANSFER_TIMEOUT_MS = 120_000;

/**
 * Trim the URL and drop trailing slashes so that the client signature stays stable.
 * Credentials pasted from a password manager often carry stray whitespace/newlines,
 * which the server rejects with a 401 that looks exactly like a wrong password.
 */
function normalizeConfig(config: WebDAVConfig) {
  return {
    url: (config.url ?? '').trim().replace(/\/+$/, ''),
    username: (config.username ?? '').trim(),
    password: (config.password ?? '').trim(),
  };
}

export class WebDAVAdapter {
  private client: WebDAVClient | null = null;
  /** Signature of the config the current client was built from. */
  private signature = '';
  private locks?: WebDAVLockManager;

  constructor(private lockStore: WebDAVLockStore = webdavLockStorage) {}

  /**
   * Create (or re-create) the underlying client.
   * Safe to call before every operation: the client is only rebuilt when the
   * url/credentials actually changed, so updated credentials always take effect.
   */
  init(config: WebDAVConfig) {
    const { url, username, password } = normalizeConfig(config);

    const nextSignature = JSON.stringify([url, username, password]);
    if (this.locks?.isBusy && nextSignature !== this.signature) {
      throw new SyncError('conflict', 'Cannot change WebDAV connection during a sync');
    }
    if (!url) {
      this.client = null;
      this.signature = '';
      return;
    }

    const signature = JSON.stringify([url, username, password]);
    if (this.client && signature === this.signature) {
      return;
    }

    this.client = null;
    this.signature = '';

    if (!/^https?:\/\//i.test(url)) {
      throw new SyncError('invalidUrl', `WebDAV URL must start with http:// or https:// (got "${url}")`);
    }

    this.client = createClient(url, {
      username,
      password,
      // Auto: send Basic auth first and fall back to Digest when the server asks
      // for it (Synology / nginx-fronted servers often reject Basic with a 401).
      authType: AuthType.Auto,
      maxContentLength: 50 * 1024 * 1024, // 50MB
    });
    this.locks = new WebDAVLockManager(this.client, url, username, this.lockStore);
    this.signature = signature;
  }

  get isInitialized() {
    return this.client !== null;
  }

  /** Drop the cached client, forcing a fresh handshake on the next init(). */
  reset() {
    this.client = null;
    this.signature = '';
  }

  private requireClient(): WebDAVClient {
    if (!this.client) {
      throw new SyncError('notInitialized', 'WebDAV client not initialized');
    }
    return this.client;
  }

  async testConnection(): Promise<boolean> {
    const client = this.requireClient();
    try {
      await this.request('PROPFIND', '/', options => client.getDirectoryContents('/', options));
      return true;
    } catch (err) {
      console.error('WebDAV connection failed', toSyncError(err));
      return false;
    }
  }

  /**
   * Run the auth handshake once, before anything is written.
   *
   * When Digest auth is negotiated the `webdav` package stops throwing on 401 responses
   * (it cannot tell a handshake challenge from a real rejection), so a wrong password
   * would silently look like "remote is empty". Reading the raw status closes that hole.
   */
  async checkAuth(probePath: string): Promise<void> {
    const client = this.requireClient();
    try {
      const res: any = await this.request('GET', probePath, options => client.getFileContents(probePath, { ...options, format: 'text', details: true }));
      this.assertOkStatus(res?.status, probePath);
    } catch (err) {
      const error = toSyncError(err);
      // The probe file may legitimately not exist yet — that still proves we are authenticated
      if (error.code === 'notFound') return;
      throw error;
    }
  }

  async getFileContents(filename: string): Promise<string | null> {
    const client = this.requireClient();
    try {
      const res: any = await this.request('GET', filename, options => client.getFileContents(filename, { ...options, format: 'text', details: true }));
      this.assertOkStatus(res?.status, filename);
      return res?.data as string;
    } catch (err) {
      const error = toSyncError(err);
      if (error.code === 'notFound') return null;
      throw error;
    }
  }

  private assertOkStatus(status: unknown, path: string) {
    if (typeof status === 'number' && status >= 400) {
      throw toSyncError(
        Object.assign(new Error(`Invalid response: ${status} for ${path}`), { status }),
      );
    }
  }

  async withExclusiveLock<T>(path: string, operation: () => Promise<T>): Promise<T> {
    this.requireClient();
    return this.locks!.withLock(path, operation);
  }

  get lockOwner() { return this.locks?.owner; }

  async inspectLocks(path: string) {
    this.requireClient();
    return this.locks!.inspect(path);
  }

  async unlockLocks(path: string, tokens: string[]) {
    this.requireClient();
    return this.locks!.unlock(path, tokens);
  }

  async recoverPreviousLock(path: string): Promise<void> {
    this.requireClient();
    await this.locks!.recoverPrevious(path);
  }

  /** Bound every request so a hung transfer cannot prevent finally/UNLOCK forever. */
  private async request<T>(method: string, path: string, operation: (options: { headers: Record<string, string>; signal: AbortSignal }) => Promise<T>, mutation = false): Promise<T> {
    try {
      const execute = () => {
        // Check the lease when the queued request starts, not when it is queued.
        const lease = this.locks?.mutationOptions() ?? { headers: {} };
        const headers = mutation ? lease.headers : method === 'GET' ? { 'Cache-Control': 'no-cache' } : {};
        return withWebDAVTimeout(signal => operation({ headers, signal }), TRANSFER_TIMEOUT_MS, lease.signal);
      };
      return await (mutation && this.locks ? this.locks.withMutation(execute) : execute());
    } catch (err) {
      const error = toSyncError(err);
      throw new SyncError(error.code, `${method} ${path}: ${error.message}`, error.status);
    }
  }

  async putJSON(filename: string, data: any): Promise<boolean> {
    const client = this.requireClient();
    try {
      const content = JSON.stringify(data);
      const dirPath = filename.substring(0, filename.lastIndexOf('/'));
      if (dirPath && dirPath !== '') {
        await this.ensureDirectory(dirPath);
      }
      const written = await this.request('PUT', filename, options => client.putFileContents(filename, content, options), true);
      if (written === false) throw new SyncError('conflict', `Conditional write rejected: ${filename}`);
      return true;
    } catch (err) {
      const error = toSyncError(err);
      console.error(`Failed to put JSON to ${filename}`, error);
      throw error;
    }
  }

  /**
   * Read and parse a remote JSON file. `null` means the file does not exist.
   *
   * A file that exists but is not valid JSON throws `invalidRemoteData`: treating it as
   * missing (the old behaviour) made the engine overwrite it with local data.
   */
  async getJSON<T>(filename: string): Promise<T | null> {
    const contents = await this.getFileContents(filename);
    // An empty file holds no data worth protecting: treat it like a missing one.
    if (contents === null || contents === undefined || contents.trim() === '') return null;
    try {
      return JSON.parse(contents) as T;
    } catch (err) {
      throw new SyncError(
        'invalidRemoteData',
        `Remote file ${filename} is not valid JSON: ${(err as Error)?.message ?? String(err)}`,
      );
    }
  }

  async ensureDirectory(dirPath: string): Promise<void> {
    const client = this.requireClient();
    let current = '';
    for (const segment of dirPath.split('/').filter(Boolean)) {
      current += `/${segment}`;
      const path = current;
      try {
        const result = await this.request('PROPFIND', path, options => client.stat(path, options));
        const stat = 'data' in result ? result.data : result;
        if (stat.type !== 'directory') throw new SyncError('invalidRemoteData', `Expected a WebDAV directory: ${path}`);
        continue;
      } catch (err) {
        if (toSyncError(err).status !== 404) throw err;
      }
      try {
        // The SDK's recursive MKCOL does not pass AbortSignal to its PROPFINDs.
        // Walk explicitly so every request is bounded and can reach UNLOCK on failure.
        await this.request('MKCOL', path, options => client.createDirectory(path, { ...options, recursive: false }), true);
      } catch (err) {
        if (toSyncError(err).status !== 405) throw err;
      }
    }
  }

  async deleteFile(filename: string): Promise<boolean> {
    const client = this.requireClient();
    try {
      await this.request('DELETE', filename, options => client.deleteFile(filename, options), true);
      return true;
    } catch (err) {
      const error = toSyncError(err);
      // Already gone: treat as success so clearing remote data stays idempotent
      if (error.code === 'notFound') return true;
      console.error(`Failed to delete file ${filename}`, error);
      throw error;
    }
  }
}

export const webdavClientAdapter = new WebDAVAdapter();
