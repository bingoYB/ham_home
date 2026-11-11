import { useTranslation } from 'react-i18next';
import { Loader2, RefreshCw, Trash2, UnlockKeyhole } from 'lucide-react';
import { Button } from '@hamhome/ui';
import { useWebDAVSyncActions } from '@/hooks/useWebDAVSyncActions';
import type { WebDAVConfig, SyncStatus } from '@/types/sync';
import { WebDAVLockDialog } from './WebDAVLockDialog';

interface WebDAVSyncActionsProps {
  config: WebDAVConfig;
  status: SyncStatus;
  isSyncing: boolean;
  isClearingRemote: boolean;
  onSyncStateChange: (syncing: boolean) => void;
  onClearRemoteData: () => void;
}

export function WebDAVSyncActions({ config, status, isSyncing, isClearingRemote, onSyncStateChange, onClearRemoteData }: WebDAVSyncActionsProps) {
  const { t } = useTranslation('settings');
  const actions = useWebDAVSyncActions(onSyncStateChange);
  const syncing = isSyncing || status.status === 'syncing';
  const disabled = actions.pending || syncing || isClearingRemote || !config.url || !config.username || !config.password;
  const key = 'settings:settings.sync.config.';
  return (
    <div className="space-y-2 pt-2">
      <div className="flex flex-wrap gap-2">
        <Button onClick={actions.sync} disabled={disabled}>
          {syncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          {t(`${key}${syncing ? 'syncingBtn' : 'syncBtn'}`)}
        </Button>
        <Button variant="outline" onClick={actions.check} disabled={actions.pending || isSyncing || isClearingRemote || !config.url || !config.username || !config.password}>
          <UnlockKeyhole className="mr-2 h-4 w-4" />{t('settings:settings.sync.lockRecovery.title')}
        </Button>
        <Button onClick={onClearRemoteData} variant="destructive" disabled={disabled}>
          {isClearingRemote ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
          {t(`${key}${isClearingRemote ? 'clearingRemoteBtn' : 'clearRemoteBtn'}`)}
        </Button>
      </div>
      {actions.error && !actions.open && <p role="alert" className="text-sm text-destructive">{actions.error}</p>}
      <WebDAVLockDialog {...actions} onOpenChange={actions.setOpen} onCheck={actions.check} onUnlock={actions.unlock} />
    </div>
  );
}
