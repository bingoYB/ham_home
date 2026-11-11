import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WebDAVClient } from 'webdav';
import { WebDAVLockManager } from '../webdav-lock';
import { discoveryXML, lockXML, memoryLockStore } from './lock-test-helpers';

const ROOT = '/HamHomeSync';
const BASE = 'https://dav.test/dav';
const SCOPE = JSON.stringify([BASE, 'user', ROOT]);
const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status });

function setup() {
  const store = memoryLockStore();
  let owner = '';
  let token = '';
  let sequence = 0;
  const calls: string[] = [];
  const request = vi.fn(async (_path: string, options: { method: string; data?: string; headers?: Record<string, string> }) => {
    calls.push(options.method);
    if (options.method === 'PROPFIND') {
      return new Response(discoveryXML(token ? [lockXML(token, owner)] : []), { status: 207 });
    }
    if (options.method === 'LOCK') {
      if (options.headers?.If) {
        expect(options.data).toBeUndefined();
        if (options.headers.If !== `(<${token}>)`) throw httpError(412);
      } else {
        if (token) throw httpError(423);
        owner = options.data?.match(/<d:href>(.*?)<\/d:href>/)?.[1] || '';
        token = `urn:uuid:${++sequence}`;
      }
      return new Response(lockXML(token, owner), { status: 200, headers: { 'Lock-Token': `<${token}>` } });
    }
    if (options.method === 'UNLOCK') {
      if (options.headers?.['Lock-Token'] !== `<${token}>`) throw httpError(409);
      token = '';
      return new Response(null, { status: 204 });
    }
    throw new Error(`Unexpected method: ${options.method}`);
  });
  const client = { customRequest: request } as unknown as WebDAVClient;
  const manager = new WebDAVLockManager(client, BASE, 'user', store);
  return { store, request, client, manager, calls, getToken: () => token,
    setLock: (newToken: string, newOwner: string) => { token = newToken; owner = newOwner; } };
}

afterEach(() => vi.useRealTimers());

describe('WebDAV lock lifecycle recovery', () => {
  it('persists intent before LOCK and clears the journal after an operation throws', async () => {
    const { manager, request, store, getToken } = setup();
    request.mockImplementationOnce(async () => {
      expect(await store.get(SCOPE)).toMatchObject({ owner: expect.stringMatching(/^urn:hamhome:/) });
      return new Response(lockXML('urn:uuid:test'), { status: 200 });
    });
    await expect(manager.withLock(ROOT, async () => {
      expect(await store.get(SCOPE)).toMatchObject({ token: 'urn:uuid:test' });
      throw new Error('bad remote JSON');
    })).rejects.toThrow('bad remote JSON');
    expect(getToken()).toBe('');
    expect(await store.get(SCOPE)).toBeUndefined();
    expect(request.mock.calls.at(-1)?.[1].method).toBe('UNLOCK');
  });

  it('does not acquire a lock when the recovery journal cannot be saved', async () => {
    const { client, request, store } = setup();
    store.save = vi.fn(async () => { throw new Error('storage unavailable'); });
    const manager = new WebDAVLockManager(client, BASE, 'user', store);
    await expect(manager.withLock(ROOT, async () => {})).rejects.toThrow('storage unavailable');
    expect(request).not.toHaveBeenCalled();
    expect(manager.isBusy).toBe(false);
  });

  it('retries a temporary unlock failure', async () => {
    const { manager, request, store, calls } = setup();
    await manager.withLock(ROOT, async () => {
      request.mockRejectedValueOnce(httpError(503));
    });
    expect(calls.at(-1)).toBe('UNLOCK');
    expect(request.mock.calls.filter(([, options]) => options.method === 'UNLOCK')).toHaveLength(2);
    expect(await store.get(SCOPE)).toBeUndefined();
  });

  it('retains the token on unlock failure and a recreated manager releases it before the next LOCK', async () => {
    const { manager, request, store, client, calls } = setup();
    await expect(manager.withLock(ROOT, async () => {
      request.mockRejectedValueOnce(httpError(503)).mockRejectedValueOnce(httpError(503));
    })).rejects.toMatchObject({ code: 'lockReleaseFailed' });
    expect(await store.get(SCOPE)).toMatchObject({ token: 'urn:uuid:1' });
    const restarted = new WebDAVLockManager(client, BASE, 'user', store);
    calls.length = 0;
    await restarted.withLock(ROOT, async () => {});
    expect(calls).toEqual(['UNLOCK', 'LOCK', 'UNLOCK']);
    expect(await store.get(SCOPE)).toBeUndefined();
  });

  it('preserves the primary error when cleanup also fails', async () => {
    const { manager, request, store } = setup();
    await expect(manager.withLock(ROOT, async () => {
      request.mockRejectedValueOnce(httpError(403));
      throw httpError(412);
    })).rejects.toMatchObject({ code: 'conflict', message: expect.stringContaining('unlock failed') });
    expect(await store.get(SCOPE)).toBeDefined();
  });

  it('recovers a LOCK whose response was lost by the persisted unique owner', async () => {
    const { manager, request, setLock, store, getToken } = setup();
    request.mockImplementationOnce(async (_path, options) => {
      const owner = options.data!.match(/<d:href>(.*?)<\/d:href>/)![1];
      setLock('urn:uuid:lost', owner);
      throw new TypeError('connection lost after LOCK');
    });
    const operation = vi.fn();
    await expect(manager.withLock(ROOT, operation)).rejects.toThrow('connection lost after LOCK');
    expect(operation).not.toHaveBeenCalled();
    expect(getToken()).toBe('');
    expect(await store.get(SCOPE)).toBeUndefined();
  });

  it('can clean up malformed LOCK XML using the response header token', async () => {
    const { manager, request, setLock, getToken, store } = setup();
    request.mockImplementationOnce(async () => {
      setLock('urn:uuid:header', '');
      return new Response('not XML', { status: 200, headers: { 'Lock-Token': '<urn:uuid:header>' } });
    });
    await expect(manager.withLock(ROOT, async () => {})).rejects.toThrow('Invalid WebDAV');
    expect(getToken()).toBe('');
    expect(await store.get(SCOPE)).toBeUndefined();
  });

  it('persists a discovered token if recovery UNLOCK fails after a lost LOCK response', async () => {
    const { manager, request, store, setLock } = setup();
    const server = request.getMockImplementation()!;
    request.mockImplementation(async (path, options) => {
      if (options.method === 'UNLOCK') throw httpError(403);
      return server(path, options);
    });
    request.mockImplementationOnce(async (_path, options) => {
      setLock('urn:uuid:discovered', options.data!.match(/<d:href>(.*?)<\/d:href>/)![1]);
      throw new TypeError('lost LOCK response');
    });
    await expect(manager.withLock(ROOT, async () => {})).rejects.toMatchObject({ code: 'network' });
    expect(await store.get(SCOPE)).toMatchObject({ token: 'urn:uuid:discovered' });
  });

  it('does not unlock another device when LOCK is refused', async () => {
    const { manager, setLock, calls, store } = setup();
    setLock('urn:uuid:other-device', 'another-device');
    await expect(manager.withLock(ROOT, async () => {})).rejects.toMatchObject({ code: 'conflict' });
    expect(calls).toEqual(['LOCK']);
    expect(await store.get(SCOPE)).toBeUndefined();
  });

  it('fails closed and remains reusable when LOCK is unsupported', async () => {
    const { manager, request, store } = setup();
    request.mockRejectedValueOnce(httpError(501));
    await expect(manager.withLock(ROOT, async () => {})).rejects.toMatchObject({ code: 'lockingUnsupported' });
    expect(await store.get(SCOPE)).toBeUndefined();
    await manager.withLock(ROOT, async () => {});
  });

  it('renews a long sync using a bodyless LOCK and keeps the same fencing token', async () => {
    vi.useFakeTimers();
    const { manager, request } = setup();
    await manager.withLock(ROOT, async () => {
      const before = manager.mutationOptions().headers;
      await vi.advanceTimersByTimeAsync(60_000);
      expect(manager.mutationOptions().headers).toEqual(before);
      expect(request.mock.calls.filter(([, options]) => options.method === 'LOCK')).toHaveLength(2);
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('stops writes after renewal fails and still attempts UNLOCK', async () => {
    vi.useFakeTimers();
    const { manager, request, calls } = setup();
    await expect(manager.withLock(ROOT, async () => {
      request.mockRejectedValueOnce(httpError(403));
      await vi.advanceTimersByTimeAsync(60_000);
      expect(() => manager.mutationOptions()).toThrow('renewal failed');
    })).rejects.toMatchObject({ code: 'conflict' });
    expect(calls.at(-1)).toBe('UNLOCK');
  });

  it('rejects writes after suspension past the lease deadline even before a timer runs', async () => {
    vi.useFakeTimers();
    const { manager } = setup();
    await expect(manager.withLock(ROOT, async () => {
      vi.setSystemTime(Date.now() + 601_000);
      expect(() => manager.mutationOptions()).toThrow('expired');
    })).rejects.toMatchObject({ code: 'conflict' });
  });

  it('does not release a different lock that appeared after the user inspected it', async () => {
    const { manager, setLock, calls } = setup();
    setLock('urn:uuid:one', 'other-device');
    const inspection = await manager.inspect(ROOT);
    setLock('urn:uuid:two', 'other-device');
    await expect(manager.unlock(ROOT, inspection.locks.map(lock => lock.token))).rejects.toMatchObject({ code: 'conflict' });
    expect(calls).not.toContain('UNLOCK');
  });

  it('allows explicit manual unlocking without deleting sync data', async () => {
    const { manager, setLock, getToken, calls } = setup();
    setLock('urn:uuid:old', 'other-device');
    const inspection = await manager.inspect(ROOT);
    expect(inspection.locks[0].ownedByThisDevice).toBe(false);
    await manager.unlock(ROOT, inspection.locks.map(lock => lock.token));
    expect(getToken()).toBe('');
    expect(calls).toEqual(['PROPFIND', 'PROPFIND', 'UNLOCK']);
  });

  it('does not follow an unrelated lockroot', async () => {
    const { manager, request } = setup();
    request.mockResolvedValueOnce(new Response(discoveryXML([lockXML('bad', '', 'Infinite', 'https://other.test/private')]), { status: 207 }));
    expect((await manager.inspect(ROOT)).locks).toEqual([]);
  });

  it('uses a saved token when the server does not support discovery', async () => {
    const { manager, request, store, setLock, getToken } = setup();
    await store.save({ scope: SCOPE, owner: 'previous-owner', token: 'urn:uuid:saved' });
    setLock('urn:uuid:saved', 'previous-owner');
    request.mockRejectedValueOnce(httpError(405));
    const inspection = await manager.inspect(ROOT);
    expect(inspection).toEqual({ discoverySupported: false, locks: [{ token: 'urn:uuid:saved', ownedByThisDevice: true, timeout: undefined }] });
    request.mockRejectedValueOnce(httpError(405));
    await manager.unlock(ROOT, ['urn:uuid:saved']);
    expect(getToken()).toBe('');
    expect(await store.get(SCOPE)).toBeUndefined();
  });

  it('keeps an unresolved LOCK intent when a lost response cannot yet be discovered', async () => {
    const { manager, request, store, client } = setup();
    request.mockRejectedValueOnce(new TypeError('Lost response'));
    await expect(manager.withLock(ROOT, async () => {})).rejects.toMatchObject({ code: 'network' });
    expect(await store.get(SCOPE)).toMatchObject({ owner: expect.stringMatching(/^urn:hamhome:/) });
    const restarted = new WebDAVLockManager(client, BASE, 'user', store);
    await restarted.withLock(ROOT, async () => {});
    expect(await store.get(SCOPE)).toBeUndefined();
  });

  it('bounds a stalled LOCK request and runs recovery instead of staying busy forever', async () => {
    vi.useFakeTimers();
    const { manager, request } = setup();
    request.mockImplementationOnce((_path, options) => new Promise((_resolve, reject) => {
      (options as { signal?: AbortSignal }).signal?.addEventListener('abort', () => reject(new DOMException('Timed out', 'AbortError')));
    }));
    const result = expect(manager.withLock(ROOT, async () => {})).rejects.toMatchObject({ code: 'network' });
    await vi.advanceTimersByTimeAsync(20_000);
    await result;
    expect(manager.isBusy).toBe(false);
  });
});
