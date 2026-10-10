/**
 * OverviewStatGrid - weekly counts: tabs archived (automatically / by you) and
 * restored, Read later in (added) and out (finished, expired).
 */
import { useTranslation } from "react-i18next";
import type { TabWeeklyOverview } from "@/types";

interface OverviewStatGridProps {
  overview: TabWeeklyOverview;
}

export function OverviewStatGrid({ overview }: OverviewStatGridProps) {
  const { t } = useTranslation("bookmark");
  const groups = [
    {
      title: t("tabCenter.overview.archiveTitle"),
      items: [
        { key: "autoArchived", value: overview.autoArchived },
        { key: "manualArchived", value: overview.manualArchived },
        { key: "restored", value: overview.restored },
      ],
    },
    {
      title: t("tabCenter.overview.readLaterTitle"),
      items: [
        { key: "readLaterAdded", value: overview.readLaterAdded },
        { key: "readLaterRead", value: overview.readLaterRead },
        { key: "readLaterExpired", value: overview.readLaterExpired },
      ],
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {groups.map((group) => (
        <section key={group.title} className="rounded-lg border p-3">
          <h3 className="mb-2 text-xs font-medium text-muted-foreground">{group.title}</h3>
          <dl className="grid grid-cols-3 gap-2">
            {group.items.map((item) => (
              <div key={item.key} className="flex flex-col-reverse" data-testid={`overview-${item.key}`}>
                <dt className="text-[11px] text-muted-foreground">{t(`tabCenter.overview.${item.key}`)}</dt>
                <dd className="text-lg font-semibold tabular-nums">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
