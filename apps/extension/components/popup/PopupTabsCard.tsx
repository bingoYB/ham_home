/**
 * PopupTabsCard - tabs at a glance in the popup: budget progress, tabs idle past the
 * threshold and duplicates with "Tidy up", today's automatic archiving with
 * "View · Restore all", and pending confirmations / consents.
 */
import { useTranslation } from "react-i18next";
import { ChevronRight, Layers } from "lucide-react";
import { cn } from "@hamhome/ui";
import type { OpenTabsSnapshot, TabArchiveRecentSummary } from "@/types";

interface PopupTabsCardProps {
  snapshot: OpenTabsSnapshot | null;
  recent: TabArchiveRecentSummary;
  needsConsent: boolean;
  onboardingDone: boolean;
  triageOpen: boolean;
  onToggleTriage: () => void;
  onViewArchive: () => void;
  onRestoreRecent: () => void;
  onConfirmPending: () => void;
  onOpenTabCenter: () => void;
}

const LEVEL_COLORS = {
  off: "bg-primary",
  normal: "bg-emerald-500",
  warning: "bg-amber-500",
  over: "bg-red-500",
} as const;

export function PopupTabsCard({
  snapshot,
  recent,
  needsConsent,
  onboardingDone,
  triageOpen,
  onToggleTriage,
  onViewArchive,
  onRestoreRecent,
  onConfirmPending,
  onOpenTabCenter,
}: PopupTabsCardProps) {
  const { t } = useTranslation("bookmark");
  if (!snapshot) return null;
  const { budget, stats, autoArchive } = snapshot;
  const threshold = t(`tabCenter.rules.autoArchive.thresholdOption.${autoArchive.threshold.unit}`, {
    count: autoArchive.threshold.value,
  });
  const percent = budget.enabled ? Math.min(100, Math.round((budget.count / budget.limit) * 100)) : 0;

  return (
    <section className="space-y-2 rounded-xl border bg-card p-3" data-testid="popup-tabs-card">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">{t("popup.tabs.title")}</span>
        <span className={cn("text-sm tabular-nums", budget.level === "over" && "font-semibold text-red-600 dark:text-red-400")}>
          {budget.enabled ? `${budget.count} / ${budget.limit}` : stats.total}
        </span>
        {budget.enabled && budget.over > 0 && (
          <span className="text-xs text-red-600 dark:text-red-400">{t("popup.tabs.over", { count: budget.over })}</span>
        )}
      </div>
      {budget.enabled && (
        <div
          className="h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={budget.limit}
          aria-valuenow={budget.count}
          aria-label={t("popup.tabs.budgetLabel")}
        >
          <div className={cn("h-full rounded-full transition-all", LEVEL_COLORS[budget.level])} style={{ width: `${percent}%` }} />
        </div>
      )}
      <div className="flex items-center gap-2">
        <p className="min-w-0 flex-1 text-xs text-muted-foreground">
          {t("popup.tabs.summary", { stale: stats.stale, threshold, duplicates: stats.duplicateGroups })}
        </p>
        <button
          type="button"
          onClick={onToggleTriage}
          aria-expanded={triageOpen}
          className="flex shrink-0 items-center text-xs font-medium text-primary hover:opacity-80"
          data-testid="popup-tidy-up"
        >
          {t("popup.tabs.tidyUp")}
          <ChevronRight className={cn("h-3 w-3 transition-transform", triageOpen && "rotate-90")} />
        </button>
      </div>
      {recent.count > 0 && (
        <p className="text-xs text-muted-foreground" data-testid="popup-recent-archive">
          {t("popup.tabs.autoArchived", { count: recent.count })} ·{" "}
          <LinkButton onClick={onViewArchive}>{t("popup.tabs.view")}</LinkButton> ·{" "}
          <LinkButton onClick={onRestoreRecent}>{t("popup.tabs.restoreAll")}</LinkButton>
        </p>
      )}
      {snapshot.pendingConfirm.length > 0 && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          {t("popup.tabs.pending", { count: snapshot.pendingConfirm.length })} ·{" "}
          <LinkButton onClick={onOpenTabCenter}>{t("popup.tabs.view")}</LinkButton> ·{" "}
          <LinkButton onClick={onConfirmPending}>{t("popup.tabs.archiveAll")}</LinkButton>
        </p>
      )}
      {needsConsent && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          {t("popup.tabs.consent")} · <LinkButton onClick={onOpenTabCenter}>{t("popup.tabs.review")}</LinkButton>
        </p>
      )}
      {!onboardingDone && !autoArchive.enabled && !budget.enabled && (
        <p className="text-xs text-muted-foreground">
          {t("popup.tabs.setup")} · <LinkButton onClick={onOpenTabCenter}>{t("popup.tabs.setupLink")}</LinkButton>
        </p>
      )}
    </section>
  );
}

function LinkButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="font-medium text-primary hover:underline">
      {children}
    </button>
  );
}

export default PopupTabsCard;
