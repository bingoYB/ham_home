/**
 * TabRulesView - the tab center's "Rules": activity tracking, auto archive and
 * protections, archive retention and the tab budget.
 */
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ScrollArea } from "@hamhome/ui";
import { useOpenTabActions } from "@/hooks/useOpenTabActions";
import { useTabArchiveCount } from "@/hooks/useTabArchive";
import type { UseTabLifecycleSettingsResult } from "@/hooks/useTabLifecycleSettings";
import { formatArchiveTime } from "@/utils/tab-time-format";
import type { OpenTabsSnapshot, TabLifecycleSweepSummary } from "@/types";
import { ActivityTrackingCard } from "./rules/ActivityTrackingCard";
import { ArchiveRetentionCard } from "./rules/ArchiveRetentionCard";
import { AutoArchiveCard } from "./rules/AutoArchiveCard";
import { TabBudgetCard } from "./rules/TabBudgetCard";

interface TabRulesViewProps {
  header: ReactNode;
  snapshot: OpenTabsSnapshot | null;
  lifecycle: UseTabLifecycleSettingsResult;
  onEnableAutoArchive: () => void;
  onResumeNudge: () => void;
}

export function TabRulesView({ header, snapshot, lifecycle, onEnableAutoArchive, onResumeNudge }: TabRulesViewProps) {
  const { t, i18n } = useTranslation("bookmark");
  const actions = useOpenTabActions();
  const archive = useTabArchiveCount();
  const { settings, state } = lifecycle;
  const supportsGroups = typeof (globalThis as { chrome?: { tabGroups?: unknown } }).chrome?.tabGroups !== "undefined";
  const lockedTabs = (snapshot?.tabs ?? []).filter((tab) => tab.locked);
  const nudgePaused =
    state.budgetNudge.dismissedDate != null || (state.budgetNudge.snoozedUntil ?? 0) > Date.now();

  const sweepText = (sweep?: TabLifecycleSweepSummary) => {
    if (!sweep) return undefined;
    const time = formatArchiveTime(sweep.at, i18n.language);
    if (sweep.error) return t("tabCenter.rules.sweep.error", { time });
    if (sweep.skippedReason) return t(`tabCenter.rules.sweep.skipped.${sweep.skippedReason}`, { time });
    return t("tabCenter.rules.sweep.done", { time, count: sweep.archived });
  };

  return (
    <ScrollArea type="auto" className="h-full bg-background">
      <div className="mx-auto max-w-4xl space-y-4 px-6 py-6 pb-24">
        {header}
        <ActivityTrackingCard enabled={settings.activityTracking} onChange={lifecycle.setActivityTracking} />
        <AutoArchiveCard
          rule={settings.autoArchive}
          active={lifecycle.autoArchiveActive}
          trackingEnabled={settings.activityTracking}
          supportsGroups={supportsGroups}
          lockedTabs={lockedTabs}
          lastSweepText={lifecycle.autoArchiveActive ? sweepText(state.lastSweep) : undefined}
          onToggle={(enabled) => (enabled ? onEnableAutoArchive() : void lifecycle.setAutoArchiveEnabled(false))}
          onChange={(patch) => void lifecycle.update({ autoArchive: patch })}
          onAddDomain={lifecycle.addProtectedDomain}
          onRemoveDomain={(domain) => void lifecycle.removeProtectedDomain(domain)}
          onUnlock={(tabId) => void actions.setLocked([tabId], false)}
        />
        <ArchiveRetentionCard
          retentionDays={settings.archive.retentionDays}
          entryCount={archive.count}
          onChange={(retentionDays) => void lifecycle.update({ archive: { retentionDays } })}
          onClear={archive.clear}
        />
        <TabBudgetCard
          budget={settings.budget}
          autoMakeRoomActive={lifecycle.autoMakeRoomActive}
          nudgePaused={nudgePaused}
          onChange={(patch) => void lifecycle.update({ budget: patch })}
          onOverActionChange={(action) => void lifecycle.setOverBudgetAction(action)}
          onResumeNudge={onResumeNudge}
        />
      </div>
    </ScrollArea>
  );
}

export default TabRulesView;
