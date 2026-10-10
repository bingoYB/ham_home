/**
 * TabStatusBadges - state of an open tab as text + icon (never color alone):
 * pinned, locked, playing, saving, protected domain, unsaved input, archive soon /
 * expired, duplicate, sleeping.
 */
import { useTranslation } from "react-i18next";
import {
  AlarmClock,
  Copy,
  Lock,
  Moon,
  PenLine,
  Pin,
  Save,
  ShieldCheck,
  Volume2,
} from "lucide-react";
import { Badge, cn } from "@hamhome/ui";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import type { OpenTabInfo, TabArchiveMode, TabIdleUnit } from "@/types";

interface TabStatusBadgesProps {
  tab: OpenTabInfo;
  archiveMode: TabArchiveMode;
  thresholdUnit: TabIdleUnit;
  pendingConfirm: boolean;
}

function StatusBadge({
  icon,
  label,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  tone?: "neutral" | "warning" | "info";
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-5 gap-1 px-1.5 text-[10px] font-normal",
        tone === "warning" && "border-amber-500/40 text-amber-700 dark:text-amber-400",
        tone === "info" && "border-sky-500/40 text-sky-700 dark:text-sky-400",
      )}
    >
      {icon}
      {label}
    </Badge>
  );
}

export function TabStatusBadges({ tab, archiveMode, thresholdUnit, pendingConfirm }: TabStatusBadgesProps) {
  const { t } = useTranslation("bookmark");
  const archiveIn = useRelativeTime(tab.archiveAt);
  const has = (reason: OpenTabInfo["protection"][number]) => tab.protection.includes(reason);

  let archiveLabel: string | null = null;
  if (tab.protection.length === 0) {
    if (pendingConfirm) archiveLabel = t("tabCenter.status.pendingConfirm");
    else if (tab.idleState === "expired") {
      archiveLabel = archiveMode === "mark-only" ? t("tabCenter.status.expired") : t("tabCenter.status.archivingSoon");
    } else if (tab.idleState === "expiring") {
      archiveLabel =
        thresholdUnit === "day" && (tab.remainingUsageDays ?? 1) <= 1
          ? t("tabCenter.status.archivesTomorrow")
          : t("tabCenter.status.archivesIn", { time: archiveIn });
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {tab.pinned && <StatusBadge icon={<Pin className="h-3 w-3" />} label={t("tabCenter.status.pinned")} />}
      {tab.locked && <StatusBadge icon={<Lock className="h-3 w-3" />} label={t("tabCenter.status.locked")} tone="info" />}
      {has("audible") && <StatusBadge icon={<Volume2 className="h-3 w-3" />} label={t("tabCenter.status.audible")} />}
      {has("saving") && <StatusBadge icon={<Save className="h-3 w-3" />} label={t("tabCenter.status.saving")} />}
      {has("protectedDomain") && (
        <StatusBadge icon={<ShieldCheck className="h-3 w-3" />} label={t("tabCenter.status.protectedDomain")} />
      )}
      {has("dirtyForm") && <StatusBadge icon={<PenLine className="h-3 w-3" />} label={t("tabCenter.status.dirtyForm")} />}
      {archiveLabel && <StatusBadge icon={<AlarmClock className="h-3 w-3" />} label={archiveLabel} tone="warning" />}
      {(tab.duplicateCount ?? 0) > 1 && (
        <StatusBadge icon={<Copy className="h-3 w-3" />} label={t("tabCenter.status.duplicate", { count: tab.duplicateCount })} />
      )}
      {tab.discarded && <StatusBadge icon={<Moon className="h-3 w-3" />} label={t("tabCenter.status.discarded")} />}
    </div>
  );
}

export default TabStatusBadges;
