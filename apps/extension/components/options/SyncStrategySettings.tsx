import { useTranslation } from 'react-i18next';
import type { WebDAVConfig } from '@/types/sync';
import { normalizeSyncStrategy, SYNC_DELAY_LIMITS, SYNC_INTERVAL_LIMITS } from '@/lib/sync/sync-strategy';
import { SyncStrategyRow } from './SyncStrategyRow';

interface SyncStrategySettingsProps {
  config: WebDAVConfig;
  onChange: (updates: Partial<WebDAVConfig>) => void;
}

export function SyncStrategySettings({ config, onChange }: SyncStrategySettingsProps) {
  const { t } = useTranslation('settings');
  const strategy = normalizeSyncStrategy(config);
  const rows = [
    { name: 'realtime', enabledKey: 'realtimeSyncEnabled', valueKey: 'realtimeSyncDelaySeconds', limits: SYNC_DELAY_LIMITS, unit: 'seconds' },
    { name: 'startup', enabledKey: 'startupSyncEnabled', valueKey: 'startupSyncDelaySeconds', limits: SYNC_DELAY_LIMITS, unit: 'seconds' },
    { name: 'periodic', enabledKey: 'periodicSyncEnabled', valueKey: 'periodicSyncIntervalMinutes', limits: SYNC_INTERVAL_LIMITS, unit: 'minutes' },
  ] as const;
  const manualOnly = !strategy.realtimeSyncEnabled && !strategy.startupSyncEnabled && !strategy.periodicSyncEnabled;

  return (
    <section className="space-y-4 border-t pt-4" aria-labelledby="webdav-strategy-title">
      <div className="space-y-1">
        <h4 id="webdav-strategy-title" className="text-sm font-medium">{t('settings.sync.strategy.title')}</h4>
        <p className="text-sm text-muted-foreground">{t('settings.sync.strategy.description')}</p>
      </div>
      <div className="divide-y rounded-lg border bg-muted/20 p-4">
        {rows.map(({ name, enabledKey, valueKey, limits, unit }) => (
          <SyncStrategyRow
            key={name}
            id={`webdav-${name}`}
            label={t(`settings.sync.strategy.${name}.label`)}
            description={t(`settings.sync.strategy.${name}.description`)}
            unit={t(`settings.sync.strategy.${unit}`)}
            enabled={strategy[enabledKey]}
            value={strategy[valueKey]}
            {...limits}
            onEnabledChange={(enabled) => onChange({ [enabledKey]: enabled })}
            onValueChange={(value) => onChange({ [valueKey]: value })}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground" role="status">
        {t(manualOnly ? 'settings.sync.strategy.manualOnly' : 'settings.sync.strategy.timingHint')}
      </p>
    </section>
  );
}
