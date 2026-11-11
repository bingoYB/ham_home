/** Device-local recovery journal; credentials and records from other accounts are never synced. */
export interface WebDAVLockRecord {
  scope: string;
  owner: string;
  token?: string;
}

export interface WebDAVLockStore {
  get(scope: string): Promise<WebDAVLockRecord | undefined>;
  save(record: WebDAVLockRecord): Promise<void>;
  remove(record: WebDAVLockRecord): Promise<void>;
}

const KEY = 'local:webdavLockJournal' as const;
let writes: Promise<unknown> = Promise.resolve();
const read = async () => (await storage.getItem<WebDAVLockRecord[]>(KEY)) ?? [];
function update(action: (records: WebDAVLockRecord[]) => WebDAVLockRecord[]): Promise<void> {
  const write = writes.then(async () => storage.setItem(KEY, action(await read())));
  writes = write.catch(() => undefined);
  return write;
}

export const webdavLockStorage: WebDAVLockStore = {
  async get(scope) { await writes; return (await read()).find(record => record.scope === scope); },
  save(record) { return update(records => [...records.filter(item => item.scope !== record.scope), { ...record }]); },
  remove(record) {
    return update(records => records.filter(item => item.scope !== record.scope || item.owner !== record.owner));
  },
};
