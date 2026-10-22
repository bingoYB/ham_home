import { useTranslation } from 'react-i18next';
import { Input, Label, Switch } from '@hamhome/ui';
import { useSyncStrategyInput } from '@/hooks/useSyncStrategyInput';

interface SyncStrategyRowProps {
  id: string;
  label: string;
  description: string;
  unit: string;
  enabled: boolean;
  value: number;
  min: number;
  max: number;
  onEnabledChange: (enabled: boolean) => void;
  onValueChange: (value: number) => void;
}

export function SyncStrategyRow({
  id, label, description, unit, enabled, value, min, max, onEnabledChange, onValueChange,
}: SyncStrategyRowProps) {
  const { t } = useTranslation('settings');
  const { draft, invalid, change, commit } = useSyncStrategyInput({ value, min, max, onCommit: onValueChange });

  return (
    <div className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1 sm:max-w-[60%]">
        <Label htmlFor={`${id}-enabled`}>{label}</Label>
        <p id={`${id}-description`} className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-1.5 sm:shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Input
              id={`${id}-value`}
              type="number"
              inputMode="numeric"
              min={min}
              max={max}
              step={1}
              value={draft}
              disabled={!enabled}
              aria-label={`${label} (${unit})`}
              aria-describedby={`${id}-description ${id}-range`}
              aria-invalid={invalid}
              onChange={(event) => change(event.target.value)}
              onBlur={commit}
              onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur(); }}
              className="w-24 tabular-nums"
            />
            <span className="min-w-8 text-sm text-muted-foreground">{unit}</span>
          </div>
          <Switch
            id={`${id}-enabled`}
            checked={enabled}
            aria-describedby={`${id}-description`}
            onCheckedChange={onEnabledChange}
          />
        </div>
        <p id={`${id}-range`} role={invalid ? 'alert' : undefined}
          className={`text-xs ${invalid ? 'text-destructive' : 'text-muted-foreground'}`}>
          {t('settings.sync.strategy.range', { min, max, unit })}
        </p>
      </div>
    </div>
  );
}
