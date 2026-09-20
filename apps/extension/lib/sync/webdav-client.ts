import { createClient, AuthType, WebDAVClient } from 'webdav';
import type { WebDAVConfig, SyncErrorCode } from '@/types';

/**
 * Error carrying a machine readable reason of a WebDAV failure.
 * The UI maps the code to an actionable hint, the raw server message is kept for debugging.
 */
export class SyncError extends Error {
  readonly code: SyncErrorCode;
  readonly status?: number;

  constructor(code: SyncErrorCode, message: string, status?: number) {
    super(message);
    this.name = 'SyncError';
    this.code = code;
    this.status = status;
  }
}

/**
 * Normalize any thrown value into a SyncError.
 * The `webdav` package attaches the HTTP status to its errors, while `fetch` rejects
 * with a TypeError when the request never reached the server (DNS, TLS, firewall...).
 */
export function toSyncError(err: unknown): SyncError {
  if (err instanceof SyncError) return err;

  const status = (err as { status?: unknown } | undefined)?.status;
  const message = (err as { message?: string } | undefined)?.message || String(err);

  if (typeof status === 'number') {
    if (status === 401) return new SyncError('auth', message, status);
    if (status === 403) return new SyncError('forbidden', message, status);
    if (status === 404) return new SyncError('notFound', message, status);
    if (status >= 500) return new SyncError('server', message, status);
    return new SyncError('unknown', message, status);
  }

  if (err instanceof TypeError) return new SyncError('network', message);
  return new SyncError('unknown', message);
}

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

  /**
   * Create (or re-create) the underlying client.
   * Safe to call before every operation: the client is only rebuilt when the
   * url/credentials actually changed, so updated credentials always take effect.
   */
  init(config: WebDAVConfig) {
    const { url, username, password } = normalizeConfig(config);

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
      await client.getDirectoryContents('/');
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
      const res: any = await client.getFileContents(probePath, { format: 'text', details: true });
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
      const res: any = await client.getFileContents(filename, { format: 'text', details: true });
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

  async putJSON(filename: string, data: any): Promise<boolean> {
    const client = this.requireClient();
    try {
      const content = JSON.stringify(data);
      const dirPath = filename.substring(0, filename.lastIndexOf('/'));
      if (dirPath && dirPath !== '') {
        await this.ensureDirectory(dirPath);
      }
      await client.putFileContents(filename, content);
      return true;
    } catch (err) {
      const error = toSyncError(err);
      console.error(`Failed to put JSON to ${filename}`, error);
      throw error;
    }
  }

  async getJSON<T>(filename: string): Promise<T | null> {
    const contents = await this.getFileContents(filename);
    if (!contents) return null;
    try {
      return JSON.parse(contents) as T;
    } catch (err) {
      console.error(`Failed to parse JSON from ${filename}`, err);
      return null;
    }
  }

  async ensureDirectory(dirPath: string): Promise<void> {
    const client = this.requireClient();
    try {
      await client.createDirectory(dirPath, { recursive: true });
    } catch (err) {
      const error = toSyncError(err);
      // 405 / 409 mean the collection already exists (or was created concurrently)
      if (error.status === 405 || error.status === 409) return;
      throw error;
    }
  }

  async deleteFile(filename: string): Promise<boolean> {
    const client = this.requireClient();
    try {
      await client.deleteFile(filename);
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
