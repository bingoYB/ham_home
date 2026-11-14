import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  getFileContents: vi.fn(),
  createDirectory: vi.fn(),
  deleteFile: vi.fn(),
  putFileContents: vi.fn(),
  lock: vi.fn(),
  unlock: vi.fn(),
  customRequest: vi.fn(),
  stat: vi.fn(),
}));

vi.mock("webdav", () => ({
  AuthType: { Auto: "auto", Password: "password" },
  createClient: mocks.createClient,
}));

import { WebDAVAdapter, SyncError, toSyncError } from "../webdav-client";
import { memoryLockStore, lockXML } from "./lock-test-helpers";

function httpError(status: number) {
  const err: any = new Error(`Invalid response: ${status}`);
  err.status = status;
  return err;
}

afterEach(() => vi.useRealTimers());

beforeEach(() => {
  vi.clearAllMocks();
  mocks.customRequest.mockImplementation(async (path, options) => {
    if (options.method === 'LOCK') {
      const lock = await mocks.lock(path, { timeout: options.headers.Timeout, headers: { Depth: options.headers.Depth } });
      return new Response(lockXML(lock.token, '', lock.serverTimeout), { status: 200 });
    }
    if (options.method === 'UNLOCK') {
      await mocks.unlock(path, options.headers['Lock-Token']);
      return new Response(null, { status: 204 });
    }
    throw httpError(404);
  });
  mocks.createClient.mockImplementation(() => ({
    getFileContents: mocks.getFileContents,
    createDirectory: mocks.createDirectory,
    deleteFile: mocks.deleteFile,
    putFileContents: mocks.putFileContents,
    lock: mocks.lock,
    unlock: mocks.unlock,
    customRequest: mocks.customRequest,
    stat: mocks.stat,
    getDirectoryContents: vi.fn(),
  }));
  mocks.stat.mockRejectedValue(httpError(404));
});

describe('server-enforced sync lock', () => {
  const config = { enabled: true, url: 'https://dav.test/dav', username: 'u', password: 'p' };
  const root = '/HamHomeSync';

  it('rejects a second device and fences an expired writer after another device takes over', async () => {
    let owner: string | null = null;
    let sequence = 0;
    const remote = new Map<string, string>();
    mocks.lock.mockImplementation(async () => {
      if (owner) throw httpError(423);
      owner = `urn:uuid:${++sequence}`;
      return { token: owner, serverTimeout: 'Second-600' };
    });
    mocks.unlock.mockImplementation(async (_path, token) => {
      if (`<${owner}>` !== token) throw httpError(409);
      owner = null;
    });
    mocks.putFileContents.mockImplementation(async (path, value, options) => {
      if (!owner || options.headers.If !== `<https://dav.test/dav/HamHomeSync> (<${owner}>)`) throw httpError(412);
      remote.set(path, value);
      return true;
    });
    mocks.createDirectory.mockResolvedValue(undefined);
    const a = new WebDAVAdapter(memoryLockStore());
    const b = new WebDAVAdapter(memoryLockStore());
    a.init(config);
    b.init(config);
    await a.withExclusiveLock(root, async () => {
      const secondRun = vi.fn();
      await expect(b.withExclusiveLock(root, secondRun)).rejects.toMatchObject({ code: 'conflict' });
      expect(secondRun).not.toHaveBeenCalled();
      // The first worker was suspended long enough for its server lease to expire.
      owner = null;
      await b.withExclusiveLock(root, async () => {
        await b.putJSON(`${root}/meta.json`, { title: 'new' });
        await expect(a.putJSON(`${root}/meta.json`, { title: 'stale' })).rejects.toMatchObject({ code: 'conflict' });
        expect(owner).toBe('urn:uuid:2');
      });
      expect(JSON.parse(remote.get(`${root}/meta.json`)!)).toEqual({ title: 'new' });
    });
    expect(mocks.lock).toHaveBeenCalledWith(root, { timeout: 'Second-600', headers: { Depth: 'infinity' } });
  });

  it('fails closed for unsupported LOCK and remains reusable', async () => {
    const adapter = new WebDAVAdapter(memoryLockStore());
    adapter.init(config);
    mocks.lock.mockRejectedValueOnce(httpError(405));
    const operation = vi.fn();
    await expect(adapter.withExclusiveLock(root, operation)).rejects.toMatchObject({ code: 'lockingUnsupported' });
    expect(operation).not.toHaveBeenCalled();
    mocks.lock.mockResolvedValue({ token: 'urn:uuid:ok', serverTimeout: 'Second-600' });
    mocks.unlock.mockResolvedValue(undefined);
    await adapter.withExclusiveLock(root, operation);
    expect(operation).toHaveBeenCalledOnce();
  });

  it('includes the token on directory creation and deletion, and releases on failure', async () => {
    const adapter = new WebDAVAdapter(memoryLockStore());
    adapter.init(config);
    mocks.lock.mockResolvedValue({ token: 'urn:uuid:ok', serverTimeout: 'Second-600' });
    mocks.unlock.mockResolvedValue(undefined);
    mocks.createDirectory.mockResolvedValue(undefined);
    mocks.deleteFile.mockResolvedValue(undefined);
    await expect(adapter.withExclusiveLock(root, async () => {
      expect(() => adapter.init({ ...config, password: 'changed' })).toThrow(SyncError);
      await adapter.ensureDirectory(`${root}/bookmarks`);
      await adapter.deleteFile(`${root}/old.json`);
      throw new Error('operation failed');
    })).rejects.toThrow('operation failed');
    const headers = { If: '<https://dav.test/dav/HamHomeSync> (<urn:uuid:ok>)' };
    expect(mocks.createDirectory).toHaveBeenCalledWith(`${root}/bookmarks`, expect.objectContaining({ recursive: false, headers }));
    expect(mocks.deleteFile).toHaveBeenCalledWith(`${root}/old.json`, expect.objectContaining({ headers }));
    expect(mocks.unlock).toHaveBeenCalledWith(root, '<urn:uuid:ok>');
  });
});

describe("WebDAVAdapter.init", () => {
  const baseConfig = {
    enabled: true,
    url: "https://nas.example.com/dav",
    username: "user",
    password: "pwd",
  };

  it("reuses the client while credentials stay the same", () => {
    const adapter = new WebDAVAdapter(memoryLockStore());
    adapter.init(baseConfig);
    adapter.init(baseConfig);
    expect(mocks.createClient).toHaveBeenCalledTimes(1);
  });

  it("rebuilds the client when the password changes", () => {
    const adapter = new WebDAVAdapter(memoryLockStore());
    adapter.init(baseConfig);
    adapter.init({ ...baseConfig, password: "new-pwd" });
    expect(mocks.createClient).toHaveBeenCalledTimes(2);
    expect(mocks.createClient.mock.calls[1][1]).toMatchObject({ password: "new-pwd" });
  });

  it("trims whitespace around url and credentials", () => {
    const adapter = new WebDAVAdapter(memoryLockStore());
    adapter.init({ ...baseConfig, url: " https://nas.example.com/dav/ ", username: " user ", password: "pwd\n" });
    expect(mocks.createClient).toHaveBeenCalledWith(
      "https://nas.example.com/dav",
      expect.objectContaining({ username: "user", password: "pwd" }),
    );
  });

  it("rejects a url without protocol", () => {
    const adapter = new WebDAVAdapter(memoryLockStore());
    expect(() => adapter.init({ ...baseConfig, url: "nas.example.com/dav" })).toThrowError(SyncError);
    expect(adapter.isInitialized).toBe(false);
  });
});

describe("WebDAVAdapter operations", () => {
  const config = {
    enabled: true,
    url: "https://nas.example.com/dav",
    username: "user",
    password: "pwd",
  };

  it('aborts a stalled directory probe and still releases the sync lock', async () => {
    vi.useFakeTimers();
    const adapter = new WebDAVAdapter(memoryLockStore());
    adapter.init(config);
    mocks.lock.mockResolvedValue({ token: 'urn:uuid:probe', serverTimeout: 'Second-600' });
    mocks.unlock.mockResolvedValue(undefined);
    mocks.stat.mockImplementationOnce((_path, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Request timed out', 'AbortError')));
    }));
    const result = expect(adapter.withExclusiveLock('/HamHomeSync', () => adapter.ensureDirectory('/HamHomeSync/bookmarks'))).rejects.toMatchObject({ code: 'network' });
    await vi.advanceTimersByTimeAsync(120_000);
    await result;
    expect(mocks.unlock).toHaveBeenCalledWith('/HamHomeSync', '<urn:uuid:probe>');
  });

  it('allows a slow metadata download to finish after the former 30 second cutoff', async () => {
    vi.useFakeTimers();
    const adapter = new WebDAVAdapter(memoryLockStore());
    adapter.init(config);
    mocks.getFileContents.mockImplementationOnce((_path, { signal }) => new Promise((resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason));
      setTimeout(() => resolve({ status: 200, data: '{"bookmarks":[]}' }), 45_000);
    }));
    const download = adapter.getJSON('/HamHomeSync/bookmarks/meta.json');
    await vi.advanceTimersByTimeAsync(45_000);
    await expect(download).resolves.toEqual({ bookmarks: [] });
  });

  it('reports the request path and elapsed timeout when a metadata download stalls', async () => {
    vi.useFakeTimers();
    const adapter = new WebDAVAdapter(memoryLockStore());
    adapter.init(config);
    mocks.getFileContents.mockImplementationOnce((_path, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason));
    }));
    const failed = expect(adapter.getJSON('/HamHomeSync/bookmarks/meta.json')).rejects.toMatchObject({
      code: 'network', message: 'GET /HamHomeSync/bookmarks/meta.json: WebDAV request timed out after 120 seconds',
    });
    await vi.advanceTimersByTimeAsync(120_000);
    await failed;
  });

  it("maps a 401 to an auth error instead of swallowing it", async () => {
    const adapter = new WebDAVAdapter(memoryLockStore());
    adapter.init(config);
    mocks.getFileContents.mockRejectedValue(httpError(401));

    await expect(adapter.getFileContents("/a.json")).rejects.toMatchObject({ code: "auth", status: 401 });
  });

  it("detects a 401 that the webdav package swallowed in digest mode", async () => {
    const adapter = new WebDAVAdapter(memoryLockStore());
    adapter.init(config);
    mocks.getFileContents.mockResolvedValue({ status: 401, data: "<html>Unauthorized</html>" });

    await expect(adapter.getFileContents("/a.json")).rejects.toMatchObject({ code: "auth" });
    await expect(adapter.checkAuth("/a.json")).rejects.toMatchObject({ code: "auth" });
  });

  it("returns null for a missing file", async () => {
    const adapter = new WebDAVAdapter(memoryLockStore());
    adapter.init(config);
    mocks.getFileContents.mockRejectedValue(httpError(404));

    await expect(adapter.getFileContents("/a.json")).resolves.toBeNull();
    await expect(adapter.checkAuth("/a.json")).resolves.toBeUndefined();
  });

  it("returns the file body from a detailed response", async () => {
    const adapter = new WebDAVAdapter(memoryLockStore());
    adapter.init(config);
    mocks.getFileContents.mockResolvedValue({ status: 200, data: '{"a":1}' });

    await expect(adapter.getFileContents("/a.json")).resolves.toBe('{"a":1}');
    expect(mocks.getFileContents).toHaveBeenCalledWith('/a.json', expect.objectContaining({
      headers: { 'Cache-Control': 'no-cache' },
    }));
  });

  it('includes the method and sync path when a write is rejected', async () => {
    const adapter = new WebDAVAdapter(memoryLockStore());
    adapter.init(config);
    mocks.stat.mockResolvedValue({ type: 'directory' });
    mocks.putFileContents.mockRejectedValueOnce(httpError(405));
    await expect(adapter.putJSON('/HamHomeSync/sys.json', {})).rejects.toMatchObject({
      code: 'unknown', status: 405, message: 'PUT /HamHomeSync/sys.json: Invalid response: 405',
    });
  });

  it("treats an existing directory as success", async () => {
    const adapter = new WebDAVAdapter(memoryLockStore());
    adapter.init(config);
    mocks.createDirectory.mockRejectedValue(httpError(405));

    await expect(adapter.ensureDirectory("/HamHomeSync/bookmarks/chunks")).resolves.toBeUndefined();
  });

  it("propagates auth failures when deleting", async () => {
    const adapter = new WebDAVAdapter(memoryLockStore());
    adapter.init(config);
    mocks.deleteFile.mockRejectedValue(httpError(401));

    await expect(adapter.deleteFile("/HamHomeSync")).rejects.toMatchObject({ code: "auth" });
  });
});

describe("toSyncError", () => {
  it("classifies http statuses", () => {
    expect(toSyncError(httpError(401)).code).toBe("auth");
    expect(toSyncError(httpError(403)).code).toBe("forbidden");
    expect(toSyncError(httpError(404)).code).toBe("notFound");
    expect(toSyncError(httpError(502)).code).toBe("server");
  });

  it("classifies fetch level failures as network errors", () => {
    expect(toSyncError(new TypeError("Failed to fetch")).code).toBe("network");
  });
});
