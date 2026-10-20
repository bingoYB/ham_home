/**
 * Headers of the archive list: the day group ("Today (12)") and the batch block
 * ("10:32 · Idle too long · 6 tabs · Restore this batch").
 */
import { useTranslation } from "react-i18next";
import { RotateCcw } from "lucide-react";
import { Button, Checkbox } from "@hamhome/ui";
import type { ArchiveDateGroup } from "@/lib/tabs/tab-archive.utils";
import { formatArchiveTime } from "@/utils/tab-time-format";
import type { TabArchiveBatch } from "@/types";

export function ArchiveDateHeader({ group, count }: { group: ArchiveDateGroup; count: number }) {
  const { t } = useTranslation("bookmark");
  return (
    <h3 className="px-1 pb-1 pt-4 text-sm font-semibold text-foreground">
      {t(`tabCenter.archive.dateGroups.${group}`)}
      <span className="ml-1.5 text-xs font-normal text-muted-foreground">({count})</span>
    </h3>
  );
}

interface ArchiveBatchHeaderProps {
  batch?: TabArchiveBatch;
  count: number;
  selectedCount: number;
  onToggleAll: (selected: boolean) => void;
  onRestore: () => void;
}

export function ArchiveBatchHeader({ batch, count, selectedCount, onToggleAll, onRestore }: ArchiveBatchHeaderProps) {
  const { t, i18n } = useTranslation("bookmark");
  const checked = selectedCount === 0 ? false : selectedCount === count ? true : "indeterminate";
  return (
    <div className="flex items-center gap-2 px-1 py-1 text-xs text-muted-foreground">
      <Checkbox checked={checked} onCheckedChange={(value) => onToggleAll(value === true)} aria-label={t("tabCenter.archive.selectBatch")} />
      {batch && <span>{formatArchiveTime(batch.createdAt, i18n.language)}</span>}
      {batch && <span>· {t(`tabCenter.reasons.${batch.reason}`)}</span>}
      {batch?.automatic && <span>· {t("tabCenter.archive.automatic")}</span>}
      <span>· {t("tabCenter.archive.tabCount", { count })}</span>
      <Button variant="ghost" size="sm" className="ml-auto h-6 px-2 text-xs" onClick={onRestore}>
        <RotateCcw className="mr-1 h-3 w-3" />
        {t("tabCenter.archive.restoreBatch")}
      </Button>
    </div>
  );
}
