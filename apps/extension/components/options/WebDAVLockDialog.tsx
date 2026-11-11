import { useTranslation } from 'react-i18next';
import { Button, Checkbox, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@hamhome/ui';
import type { WebDAVLockInspection } from '@/types/sync';

interface WebDAVLockDialogProps {
  open: boolean;
  pending: boolean;
  inspection?: WebDAVLockInspection;
  error: string;
  unlocked: boolean;
  confirmed: boolean;
  setConfirmed: (confirmed: boolean) => void;
  onOpenChange: (open: boolean) => void;
  onCheck: () => void;
  onUnlock: () => void;
}

export function WebDAVLockDialog({ open, pending, inspection, error, unlocked, confirmed, setConfirmed, onOpenChange, onCheck, onUnlock }: WebDAVLockDialogProps) {
  const { t } = useTranslation(['settings', 'common']);
  const key = 'settings:settings.sync.lockRecovery.';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(`${key}title`)}</DialogTitle>
          <DialogDescription>{t(`${key}description`)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm" aria-live="polite">
          {pending && <p>{t(`${key}working`)}</p>}
          {unlocked && <p className="text-green-600">{t(`${key}success`)}</p>}
          {inspection && <>
            <p>{t(`${key}${inspection.locks.length ? 'found' : 'none'}`, { count: inspection.locks.length })}</p>
            {inspection.locks.length > 0 && <p className="text-muted-foreground">{t(`${key}ownership`, {
              count: inspection.locks.filter(lock => lock.ownedByThisDevice).length,
            })}</p>}
            {!inspection.discoverySupported && <p className="text-muted-foreground">{t(`${key}discoveryUnavailable`)}</p>}
            <label className="flex items-start gap-2">
              <Checkbox checked={confirmed} disabled={pending} onCheckedChange={value => setConfirmed(value === true)} />
              <span>{t(`${key}confirmStopped`)}</span>
            </label>
          </>}
          {error && <p role="alert" className="break-all text-destructive">{t(`${key}failed`)} {error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={pending} onClick={onCheck}>{t(`${key}check`)}</Button>
          <Button disabled={pending || !inspection || !confirmed} onClick={onUnlock}>{t(`${key}unlock`)}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
