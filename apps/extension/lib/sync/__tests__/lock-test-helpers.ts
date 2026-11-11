import type { WebDAVLockRecord, WebDAVLockStore } from '../webdav-lock-storage';

export function memoryLockStore(): WebDAVLockStore {
  const records = new Map<string, WebDAVLockRecord>();
  return {
    async get(scope) { return structuredClone(records.get(scope)); },
    async save(record) { records.set(record.scope, structuredClone(record)); },
    async remove(record) { if (records.get(record.scope)?.owner === record.owner) records.delete(record.scope); },
  };
}

export function lockXML(token: string, owner = '', timeout = 'Second-600', root?: string): string {
  return `<d:prop xmlns:d="DAV:"><d:lockdiscovery><d:activelock><d:lockscope><d:exclusive/></d:lockscope><d:locktype><d:write/></d:locktype><d:timeout>${timeout}</d:timeout><d:owner><d:href>${owner}</d:href></d:owner><d:locktoken><d:href>${token}</d:href></d:locktoken>${root ? `<d:lockroot><d:href>${root}</d:href></d:lockroot>` : ''}</d:activelock></d:lockdiscovery></d:prop>`;
}

export function discoveryXML(locks: string[], status = 200): string {
  return `<d:multistatus xmlns:d="DAV:"><d:response><d:href>/HamHomeSync</d:href><d:propstat><d:prop><d:lockdiscovery>${locks.map(xml => xml.split('<d:lockdiscovery>')[1].split('</d:lockdiscovery>')[0]).join('')}</d:lockdiscovery></d:prop><d:status>HTTP/1.1 ${status} Result</d:status></d:propstat></d:response></d:multistatus>`;
}
