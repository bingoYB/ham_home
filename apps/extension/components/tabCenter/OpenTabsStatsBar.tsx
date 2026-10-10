/**
 * OpenTabsStatsBar - "Budget 47/15 · Archiving soon 6 · 3 duplicate groups ·
 * 5 protected" with one-click duplicate cleanup, rule-based and AI tidy-up.
 */
import { useTranslation } from "react-i18next";
import { Copy, Sparkles, Wand2 } from "lucide-react";
import { Button, cn } from "@hamhome/ui";
import type { OpenTabsSnapshot } from "@/types";

interface OpenTabsStatsBarProps {
  snapshot: OpenTabsSnapshot;
  onCloseDuplicates: () => void;
  onTidyUp: () => void;
  onAITriage: () => void;
}

export function OpenTabsStatsBar({ snapshot, onCloseDuplicates, onTidyUp, onAITriage }: OpenTabsStatsBarProps) {
  const { t } = useTranslation("bookmark");
  const { budget, stats } = snapshot;

  const parts = [
    budget.enabled
      ? t("tabCenter.stats.budget", { count: budget.count, limit: budget.limit })
      : t("tabCenter.stats.open", { count: stats.total }),
    snapshot.autoArchive.active ? t("tabCenter.stats.expiring", { count: stats.expiring + stats.expired }) : null,
    t("tabCenter.stats.stale", { count: stats.stale }),
    t("tabCenter.stats.duplicates", { count: stats.duplicateGroups }),
    t("tabCenter.stats.protected", { count: stats.protected }),
  ].filter(Boolean);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3" data-testid="open-tabs-stats">
      <p className={cn("text-sm", budget.level === "over" && "text-destructive")}>{parts.join(" · ")}</p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={stats.redundantDuplicates === 0}
          onClick={onCloseDuplicates}
        >
          <Copy className="mr-1.5 h-4 w-4" />
          {t("tabCenter.closeDuplicates", { count: stats.redundantDuplicates })}
        </Button>
        <Button variant="outline" size="sm" onClick={onAITriage} data-testid="tab-center-ai-triage">
          <Wand2 className="mr-1.5 h-4 w-4" />
          {t("tabCenter.aiTriage.button")}
        </Button>
        <Button size="sm" onClick={onTidyUp} data-testid="tab-center-tidy">
          <Sparkles className="mr-1.5 h-4 w-4" />
          {t("tabCenter.tidyUp.button")}
        </Button>
      </div>
    </div>
  );
}

export default OpenTabsStatsBar;
