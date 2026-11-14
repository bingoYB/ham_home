import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { expect, it } from 'vitest';
import { WebDAVAdapter } from '../webdav-client';
import { lockXML, memoryLockStore } from './lock-test-helpers';

it('serializes concurrent chunk writes, directory creation and deletion under one server lock', async () => {
  const token = 'urn:uuid:serialized-writes';
  let held = false;
  let overlappingRequests = 0;
  const written: string[] = [];
  const server = createServer(async (request, response) => {
    for await (const _chunk of request) { /* Consume the request before responding. */ }
    if (request.method === 'LOCK') {
      response.writeHead(200, { 'Content-Type': 'application/xml' }).end(lockXML(token));
      return;
    }
    if (request.method === 'PROPFIND') { response.writeHead(404).end(); return; }
    if (request.method === 'UNLOCK') {
      expect(held).toBe(false);
      response.writeHead(204).end();
      return;
    }
    // Koofr's lock system temporarily holds the root token during each mutation.
    if (held) { overlappingRequests++; response.writeHead(412).end(); return; }
    held = true;
    await new Promise(resolve => setTimeout(resolve, 10));
    if (request.method === 'PUT') written.push(request.url!);
    held = false;
    response.writeHead(request.method === 'DELETE' ? 204 : 201).end();
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const adapter = new WebDAVAdapter(memoryLockStore());
  adapter.init({ enabled: true, url, username: 'test', password: 'test' });
  try {
    await adapter.withExclusiveLock('/HamHomeSync', async () => {
      const results = await Promise.allSettled([
        ...['a', 'b', 'c'].map(id => adapter.putJSON(`/HamHomeSync/chunks/${id}.json`, { id })),
        adapter.deleteFile('/HamHomeSync/old.json'),
      ]);
      expect(results.every(result => result.status === 'fulfilled')).toBe(true);
    });
    expect(overlappingRequests).toBe(0);
    expect(written).toHaveLength(3);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

it('revalidates the sync marker after writing it instead of reading a cached previous owner', async () => {
  const previous = { lock_owner: 'previous-owner', lock_status: 'unlocked' };
  let current = previous;
  const token = 'urn:uuid:marker-test';
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    if (request.method === 'GET') {
      // Model a cache that still has the previous response after the marker PUT.
      const revalidate = request.headers['cache-control'] === 'no-cache';
      response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(revalidate ? current : previous));
    } else if (request.method === 'LOCK') {
      response.writeHead(200, { 'Content-Type': 'application/xml' }).end(lockXML(token));
    } else if (request.method === 'PROPFIND') {
      response.writeHead(404).end();
    } else if (request.method === 'PUT') {
      current = JSON.parse(Buffer.concat(chunks).toString());
      response.writeHead(201).end();
    } else {
      response.writeHead(request.method === 'UNLOCK' ? 204 : 201).end();
    }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const adapter = new WebDAVAdapter(memoryLockStore());
  adapter.init({ enabled: true, url, username: 'test', password: 'test' });
  try {
    await adapter.withExclusiveLock('/HamHomeSync', async () => {
      expect(await adapter.getJSON('/HamHomeSync/sys.json')).toEqual(previous);
      const next = { lock_owner: 'current-owner', lock_status: 'locked' };
      await adapter.putJSON('/HamHomeSync/sys.json', next);
      expect(await adapter.getJSON('/HamHomeSync/sys.json')).toEqual(next);
    });
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

it('sends LOCK/If/UNLOCK through the real WebDAV SDK and rejects an expired writer over HTTP', async () => {
  let owner: string | null = null;
  let sequence = 0;
  let rootUrl = '';
  const bodies = new Map<string, string>();
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    // Reads are not write-locked; the SDK probes before recursive MKCOL.
    if (request.method === 'PROPFIND') { response.writeHead(404).end(); return; }
    if (request.method === 'LOCK') {
      if (owner) { response.writeHead(423).end(); return; }
      owner = `urn:uuid:token-${++sequence}`;
      expect(request.headers.depth).toBe('infinity');
      response.writeHead(200, { 'Content-Type': 'application/xml' }).end(
        `<d:prop xmlns:d="DAV:"><d:lockdiscovery><d:activelock><d:lockscope><d:exclusive/></d:lockscope><d:locktype><d:write/></d:locktype><d:depth>infinity</d:depth><d:timeout>Second-600</d:timeout><d:locktoken><d:href>${owner}</d:href></d:locktoken></d:activelock></d:lockdiscovery></d:prop>`,
      );
      return;
    }
    if (request.method === 'UNLOCK') {
      if (request.headers['lock-token'] !== `<${owner}>`) { response.writeHead(409).end(); return; }
      owner = null;
      response.writeHead(204).end();
      return;
    }
    if (request.headers.if !== `<${rootUrl}> (<${owner}>)` || !owner) {
      response.writeHead(412).end(); return;
    }
    if (request.method === 'MKCOL') { response.writeHead(201).end(); return; }
    if (request.method === 'PUT') {
      bodies.set(request.url!, Buffer.concat(chunks).toString());
      response.writeHead(201).end(); return;
    }
    response.writeHead(404).end();
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  rootUrl = `${url}/HamHomeSync`;
  const first = new WebDAVAdapter(memoryLockStore());
  const second = new WebDAVAdapter(memoryLockStore());
  first.init({ enabled: true, url, username: 'test', password: 'test' });
  second.init({ enabled: true, url, username: 'test', password: 'test' });
  try {
    await first.withExclusiveLock('/HamHomeSync', async () => {
      await first.putJSON('/HamHomeSync/meta.json', { value: 1 });
      await expect(second.withExclusiveLock('/HamHomeSync', async () => {})).rejects.toMatchObject({ code: 'conflict' });
      owner = null; // Simulated server-side expiration while the first worker is suspended.
      await second.withExclusiveLock('/HamHomeSync', async () => {
        await second.putJSON('/HamHomeSync/meta.json', { value: 2 });
        await expect(first.putJSON('/HamHomeSync/meta.json', { value: 0 })).rejects.toMatchObject({ code: 'conflict' });
      });
    });
    expect(JSON.parse(bodies.get('/HamHomeSync/meta.json')!)).toEqual({ value: 2 });
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
