import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { expect, it } from 'vitest';
import { WebDAVAdapter } from '../webdav-client';
import { memoryLockStore } from './lock-test-helpers';

it('revalidates the sync marker after writing it', async () => {
  const previous = { lock_status: 'unlocked', lock_owner: 'previous' };
  let current = previous;
  const readHeaders: Array<string | undefined> = [];
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    if (request.method === 'GET') {
      const cacheControl = request.headers['cache-control'];
      readHeaders.push(cacheControl);
      response.writeHead(200, { 'Content-Type': 'application/json' })
        .end(JSON.stringify(cacheControl === 'no-cache' ? current : previous));
    } else if (request.method === 'PUT') {
      current = JSON.parse(Buffer.concat(chunks).toString());
      response.writeHead(201).end();
    } else {
      response.writeHead(request.method === 'PROPFIND' ? 404 : 201).end();
    }
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const adapter = new WebDAVAdapter(memoryLockStore());
  adapter.init({ enabled: true, url, username: 'test', password: 'test' });
  try {
    expect(await adapter.getJSON('/HamHomeSync/sys.json')).toEqual(previous);
    const next = { lock_status: 'locked', lock_owner: 'current' };
    await adapter.putJSON('/HamHomeSync/sys.json', next);
    expect(await adapter.getJSON('/HamHomeSync/sys.json')).toEqual(next);
    expect(readHeaders).toEqual(['no-cache', 'no-cache']);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
