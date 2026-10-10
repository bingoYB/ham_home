/**
 * WeeklyOpenTabsChart - one column per day: the light bar is the peak, the solid bar
 * the time-weighted average; the dashed line marks the tab budget when it is on.
 */
import { useTranslation } from "react-i18next";
import { cn } from "@hamhome/ui";
import { formatWeekdayShort } from "@/utils/tab-time-format";
import type { TabStatsDayPoint } from "@/types";

interface WeeklyOpenTabsChartProps {
  days: TabStatsDayPoint[];
  /** Budget limit, shown as a line */
  budgetLimit?: number;
}

const CHART_HEIGHT_PX = 120;

export function WeeklyOpenTabsChart({ days, budgetLimit }: WeeklyOpenTabsChartProps) {
  const { t, i18n } = useTranslation("bookmark");
  const scale = Math.max(1, budgetLimit ?? 0, ...days.map((day) => day.peakOpen)) * 1.1;
  const height = (value: number) => `${Math.round((value / scale) * CHART_HEIGHT_PX)}px`;
  const lastIndex = days.length - 1;

  return (
    <div className="space-y-2" data-testid="weekly-open-tabs-chart">
      <div className="relative flex items-end gap-2" style={{ height: CHART_HEIGHT_PX }}>
        {budgetLimit != null && (
          <div
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-destructive/60"
            style={{ bottom: height(budgetLimit) }}
            title={t("tabCenter.overview.budgetLine", { limit: budgetLimit })}
          />
        )}
        {days.map((day) => {
          const average = day.averageOpen == null ? null : Math.round(day.averageOpen);
          return (
            <div
              key={day.date}
              className="relative flex h-full flex-1 items-end justify-center"
              title={
                average == null
                  ? t("tabCenter.overview.noData")
                  : t("tabCenter.overview.dayTooltip", { average, peak: day.peakOpen })
              }
            >
              {day.peakOpen > 0 ? (
                <div className="relative w-full max-w-9 rounded-t-md bg-primary/15" style={{ height: height(day.peakOpen) }}>
                  {average != null && (
                    <div className="absolute inset-x-0 bottom-0 rounded-t-md bg-primary" style={{ height: height(average) }} />
                  )}
                </div>
              ) : (
                <div className="h-1 w-full max-w-9 rounded-full bg-muted" />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-2">
        {days.map((day, index) => (
          <span
            key={day.date}
            className={cn(
              "flex-1 text-center text-[11px] text-muted-foreground",
              index === lastIndex && "font-medium text-foreground",
            )}
          >
            {index === lastIndex ? t("tabCenter.overview.today") : formatWeekdayShort(day.date, i18n.language)}
          </span>
        ))}
      </div>
      <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-primary" />
          {t("tabCenter.overview.legendAverage")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-primary/15" />
          {t("tabCenter.overview.legendPeak")}
        </span>
      </div>
    </div>
  );
}
