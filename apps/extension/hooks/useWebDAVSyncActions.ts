import { useRef, useState } from 'react';
import { getBackgroundService } from '@/lib/services';
import type { WebDAVLockInspection } from '@/types/sync';

export function useWebDAVSyncActions(onSyncStateChange: (syncing: boolean) => void) {
  const [pending, setPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [inspection, setInspection] = useState<WebDAVLockInspection>();
  const [error, setError] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const inFlight = useRef(false);

  const run = async (action: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError('');
    try { await action(); }
    catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { inFlight.current = false; setPending(false); }
  };

  const sync = () => run(async () => {
    onSyncStateChange(true);
    try { await getBackgroundService().syncWebDAV(); }
    finally { onSyncStateChange(false); }
  });

  const check = () => {
    setOpen(true);
    setInspection(undefined);
    setUnlocked(false);
    setConfirmed(false);
    return run(async () => { setInspection(await getBackgroundService().inspectWebDAVLocks()); });
  };

  const unlock = () => run(async () => {
    if (!inspection) return;
    await getBackgroundService().unlockWebDAVLocks(inspection.locks.map(lock => lock.token));
    setUnlocked(true);
    setInspection(undefined);
  });

  return { pending, open, setOpen, inspection, error, unlocked, confirmed, setConfirmed, sync, check, unlock };
}
