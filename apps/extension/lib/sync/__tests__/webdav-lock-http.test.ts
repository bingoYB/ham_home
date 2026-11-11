import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { expect, it } from 'vitest';
import { WebDAVAdapter } from '../webdav-client';
import { memoryLockStore } from './lock-test-helpers';

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
