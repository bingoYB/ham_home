/**
 * AutoArchiveCard - auto archive switch, idle threshold, usage-day counting, mode,
 * optional protections, protected domains and locked tabs.
 */
import { useTranslation } from "react-i18next";
import { Archive, LockOpen, ShieldCheck } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@hamhome/ui";
import { IDLE_THRESHOLD_OPTIONS } from "@/lib/tabs/tab-idle.utils";
import { MIN_OPEN_TABS_MAX } from "@/lib/tabs/tab-lifecycle-settings.utils";
import type { OpenTabInfo, TabArchiveMode, TabAutoArchiveSettings, TabIdleCountBy } from "@/types";
import { NumberSettingInput } from "./NumberSettingInput";
import { ProtectedDomainsEditor } from "./ProtectedDomainsEditor";
import { RuleRow } from "./RuleRow";

interface AutoArchiveCardProps {
  rule: TabAutoArchiveSettings;
  active: boolean;
  trackingEnabled: boolean;
  supportsGroups: boolean;
  lockedTabs: OpenTabInfo[];
  lastSweepText?: string;
  onToggle: (enabled: boolean) => void;
  onChange: (patch: Partial<TabAutoArchiveSettings>) => void;
  onAddDomain: (input: string) => Promise<boolean>;
  onRemoveDomain: (domain: string) => void;
  onUnlock: (tabId: number) => void;
}

export function AutoArchiveCard({
  rule,
  active,
  trackingEnabled,
  supportsGroups,
  lockedTabs,
  lastSweepText,
  onToggle,
  onChange,
  onAddDomain,
  onRemoveDomain,
  onUnlock,
}: AutoArchiveCardProps) {
  const { t } = useTranslation("bookmark");
  const thresholdKey = `${rule.idleThreshold.value}:${rule.idleThreshold.unit}`;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Archive className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">{t("tabCenter.rules.autoArchive.title")}</CardTitle>
        </div>
        <CardDescription>{t("tabCenter.rules.autoArchive.description")}</CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        <RuleRow
          label={t("tabCenter.rules.autoArchive.enable")}
          description={trackingEnabled ? lastSweepText : t("tabCenter.rules.autoArchive.needsTracking")}
          htmlFor="auto-archive-enabled"
          disabled={!trackingEnabled}
        >
          <Switch id="auto-archive-enabled" checked={active} disabled={!trackingEnabled} onCheckedChange={onToggle} data-testid="auto-archive-switch" />
        </RuleRow>
        <RuleRow label={t("tabCenter.rules.autoArchive.threshold")} description={t("tabCenter.rules.autoArchive.thresholdHint")}>
          <Select
            value={thresholdKey}
            onValueChange={(value) => {
              const [amount, unit] = value.split(":");
              onChange({ idleThreshold: { value: Number(amount), unit: unit as "hour" | "day" } });
            }}
          >
            <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {IDLE_THRESHOLD_OPTIONS.map((option) => (
                <SelectItem key={`${option.value}:${option.unit}`} value={`${option.value}:${option.unit}`}>
                  {t(`tabCenter.rules.autoArchive.thresholdOption.${option.unit}`, { count: option.value })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </RuleRow>
        {rule.idleThreshold.unit === "day" && (
          <RuleRow label={t("tabCenter.rules.autoArchive.countBy")} description={t(`tabCenter.rules.autoArchive.countByHint.${rule.countBy}`)}>
            <Select value={rule.countBy} onValueChange={(value) => onChange({ countBy: value as TabIdleCountBy })}>
              <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="usage-days">{t("tabCenter.rules.autoArchive.countByOption.usage-days")}</SelectItem>
                <SelectItem value="calendar">{t("tabCenter.rules.autoArchive.countByOption.calendar")}</SelectItem>
              </SelectContent>
            </Select>
          </RuleRow>
        )}
        <RuleRow label={t("tabCenter.rules.autoArchive.mode")} description={t(`tabCenter.rules.autoArchive.modeHint.${rule.mode}`)}>
          <Select value={rule.mode} onValueChange={(value) => onChange({ mode: value as TabArchiveMode })}>
            <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(["auto", "confirm", "mark-only"] as TabArchiveMode[]).map((mode) => (
                <SelectItem key={mode} value={mode}>{t(`tabCenter.rules.autoArchive.modeOption.${mode}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </RuleRow>

        <div className="space-y-1 py-3">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            {t("tabCenter.rules.protection.title")}
          </p>
          <p className="text-xs text-muted-foreground">{t("tabCenter.rules.protection.alwaysOn")}</p>
        </div>
        <RuleRow label={t("tabCenter.rules.protection.audible")} htmlFor="protect-audible">
          <Switch id="protect-audible" checked={rule.protectAudible} onCheckedChange={(value) => onChange({ protectAudible: value })} />
        </RuleRow>
        {supportsGroups && (
          <RuleRow label={t("tabCenter.rules.protection.grouped")} description={t("tabCenter.rules.protection.groupedHint")} htmlFor="protect-grouped">
            <Switch id="protect-grouped" checked={rule.protectGrouped} onCheckedChange={(value) => onChange({ protectGrouped: value })} />
          </RuleRow>
        )}
        <RuleRow label={t("tabCenter.rules.protection.dirtyForms")} description={t("tabCenter.rules.protection.dirtyFormsHint")} htmlFor="protect-dirty">
          <Switch id="protect-dirty" checked={rule.protectDirtyForms} onCheckedChange={(value) => onChange({ protectDirtyForms: value })} />
        </RuleRow>
        <RuleRow label={t("tabCenter.rules.protection.minOpenTabs")} description={t("tabCenter.rules.protection.minOpenTabsHint")} htmlFor="min-open-tabs">
          <NumberSettingInput
            id="min-open-tabs"
            value={rule.minOpenTabs}
            min={0}
            max={MIN_OPEN_TABS_MAX}
            onCommit={(minOpenTabs) => onChange({ minOpenTabs })}
          />
        </RuleRow>
        <div className="space-y-2 py-3">
          <p className="text-sm font-medium">{t("tabCenter.rules.domains.title")}</p>
          <ProtectedDomainsEditor domains={rule.protectedDomains} onAdd={onAddDomain} onRemove={onRemoveDomain} />
        </div>
        <div className="space-y-2 py-3">
          <p className="text-sm font-medium">{t("tabCenter.rules.locked.title", { count: lockedTabs.length })}</p>
          {lockedTabs.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t("tabCenter.rules.locked.empty")}</p>
          ) : (
            <ul className="space-y-1">
              {lockedTabs.map((tab) => (
                <li key={tab.tabId} className="flex items-center gap-2 text-sm">
                  <span className="min-w-0 flex-1 truncate" title={tab.url}>{tab.title}</span>
                  <Button variant="ghost" size="sm" className="h-7" onClick={() => onUnlock(tab.tabId)}>
                    <LockOpen className="mr-1 h-3.5 w-3.5" />
                    {t("tabCenter.actions.unlock")}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default AutoArchiveCard;
