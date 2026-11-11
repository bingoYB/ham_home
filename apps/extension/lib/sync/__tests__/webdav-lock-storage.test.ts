import { afterEach, expect, it, vi } from 'vitest';
import { webdavLockStorage } from '../webdav-lock-storage';

afterEach(() => vi.unstubAllGlobals());

it('serializes writes, preserves different accounts and only removes the matching owner', async () => {
  let records: unknown = null;
  vi.stubGlobal('storage', {
    getItem: vi.fn(async () => structuredClone(records)),
    setItem: vi.fn(async (_key, value) => { records = structuredClone(value); }),
  });
  const first = { scope: 'server-account-one', owner: 'one', token: 'token-one' };
  const second = { scope: 'server-account-two', owner: 'two', token: 'token-two' };
  await Promise.all([webdavLockStorage.save(first), webdavLockStorage.save(second)]);
  expect(await webdavLockStorage.get(first.scope)).toEqual(first);
  expect(await webdavLockStorage.get(second.scope)).toEqual(second);
  await webdavLockStorage.save({ ...first, owner: 'replacement' });
  await webdavLockStorage.remove(first);
  expect(await webdavLockStorage.get(first.scope)).toMatchObject({ owner: 'replacement' });
  await webdavLockStorage.remove(second);
  expect(await webdavLockStorage.get(second.scope)).toBeUndefined();
});
