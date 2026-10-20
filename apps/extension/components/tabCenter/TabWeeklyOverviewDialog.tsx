/**
 * TabWeeklyOverviewDialog - "This week": open tabs trend (daily average and peak),
 * time over budget, archive and restore counts, Read later in and out.
 * Local stats of this device only.
 */
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@hamhome/ui";
import { useTabWeeklyOverview } from "@/hooks/useTabWeeklyOverview";
import { getAverageChangePercent } from "@/lib/tabs/tab-stats.utils";
import { formatDurationMinutes } from "@/utils/tab-time-format";
import type { TabWeeklyOverview } from "@/types";
import { OverviewStatGrid } from "./overview/OverviewStatGrid";
import { WeeklyOpenTabsChart } from "./overview/WeeklyOpenTabsChart";

interface TabWeeklyOverviewDialogProps {
  open: boolean;
  /** Tab budget limit while the budget is on */
  budgetLimit?: number;
  onOpenChange: (open: boolean) => void;
}

export function TabWeeklyOverviewDialog({ open, budgetLimit, onOpenChange }: TabWeeklyOverviewDialogProps) {
  const { t } = useTranslation("bookmark");
  const { overview, loading } = useTabWeeklyOverview(open);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="tab-weekly-overview">
        <DialogHeader>
          <DialogTitle>{t("tabCenter.overview.title")}</DialogTitle>
          <DialogDescription>{t("tabCenter.overview.description")}</DialogDescription>
        </DialogHeader>
        {overview ? (
          <div className="space-y-5">
            <OpenTabsSection overview={overview} budgetLimit={budgetLimit} />
            <OverviewStatGrid overview={overview} />
            {overview.trackedDays <= 1 && (
              <p className="text-xs text-muted-foreground">{t("tabCenter.overview.fewData")}</p>
            )}
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center">
            {loading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface OpenTabsSectionProps {
  overview: TabWeeklyOverview;
  budgetLimit?: number;
}

function OpenTabsSection({ overview, budgetLimit }: OpenTabsSectionProps) {
  const { t, i18n } = useTranslation("bookmark");
  const change = getAverageChangePercent(overview);
  const summary =
    overview.averageOpen == null
      ? t("tabCenter.overview.noSamples")
      : [
          t("tabCenter.overview.averagePeak", {
            average: Math.round(overview.averageOpen),
            peak: overview.peakOpen,
          }),
          change == null
            ? null
            : change < 0
              ? t("tabCenter.overview.lessThanLastWeek", { percent: -change })
              : change > 0
                ? t("tabCenter.overview.moreThanLastWeek", { percent: change })
                : t("tabCenter.overview.sameAsLastWeek"),
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium">{t("tabCenter.overview.openTabs")}</h3>
        {overview.samplingEnabled && (
          <p className="text-xs text-muted-foreground" data-testid="overview-summary">{summary}</p>
        )}
      </div>
      {overview.samplingEnabled ? (
        <WeeklyOpenTabsChart days={overview.days} budgetLimit={budgetLimit} />
      ) : (
        <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
          {t("tabCenter.overview.samplingOff")}
        </p>
      )}
      {budgetLimit != null && overview.samplingEnabled && (
        <p className="text-xs text-muted-foreground">
          {overview.overBudgetMinutes >= 1
            ? t("tabCenter.overview.overBudgetTime", {
                duration: formatDurationMinutes(overview.overBudgetMinutes, i18n.language),
              })
            : t("tabCenter.overview.neverOverBudget")}
        </p>
      )}
    </section>
  );
}
