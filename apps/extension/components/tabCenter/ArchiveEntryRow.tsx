/**
 * ArchiveEntryRow - one archived tab: title, domain, idle time when it was closed,
 * reason, close time and count; restore, read later, bookmark, workspace, delete.
 */
import { memo } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, BookmarkPlus, Briefcase, RotateCcw, Trash2 } from "lucide-react";
import { Badge, Button, Checkbox, cn } from "@hamhome/ui";
import { useSafeFavicon } from "@/hooks/useSafeFavicon";
import { formatArchiveTime, formatIdleDuration } from "@/utils/tab-time-format";
import type { TabArchiveEntry } from "@/types";

interface ArchiveEntryRowProps {
  entry: TabArchiveEntry;
  selected: boolean;
  bookmarked: boolean;
  onToggleSelect: (id: string) => void;
  onRestore: (entry: TabArchiveEntry) => void;
  onReadLater: (entry: TabArchiveEntry) => void;
  onBookmark: (entry: TabArchiveEntry) => void;
  onWorkspace: (entry: TabArchiveEntry) => void;
  onDelete: (entry: TabArchiveEntry) => void;
}

function ArchiveEntryRowComponent({
  entry,
  selected,
  bookmarked,
  onToggleSelect,
  onRestore,
  onReadLater,
  onBookmark,
  onWorkspace,
  onDelete,
}: ArchiveEntryRowProps) {
  const { t, i18n } = useTranslation("bookmark");
  const favicon = useSafeFavicon(entry.url, entry.favicon);
  const idle = formatIdleDuration(entry.closedAt - entry.lastActiveAt, i18n.language);

  return (
    <div
      data-testid="archive-entry-row"
      className={cn(
        "group flex items-center gap-3 rounded-lg border bg-card px-3 py-2 transition-colors hover:bg-muted/40",
        selected && "border-primary/50 bg-primary/5",
      )}
    >
      <Checkbox checked={selected} onCheckedChange={() => onToggleSelect(entry.id)} aria-label={entry.title} />
      {favicon ? <img src={favicon} alt="" className="h-4 w-4 shrink-0 rounded" /> : <span className="h-4 w-4 shrink-0 rounded bg-muted" />}
      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onRestore(entry)}
          className="block max-w-full truncate text-left text-sm text-foreground hover:text-primary hover:underline"
          title={entry.url}
        >
          {entry.title}
        </button>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
          <span className="max-w-[220px] truncate">{entry.domain}</span>
          <span>{t("tabCenter.archive.idleWhenClosed", { time: idle })}</span>
          <span>{formatArchiveTime(entry.closedAt, i18n.language)}</span>
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-normal">
            {t(`tabCenter.reasons.${entry.reason}`)}
          </Badge>
          {entry.closeCount > 1 && <span>{t("tabCenter.archive.closeCount", { count: entry.closeCount })}</span>}
          {bookmarked && (
            <Badge variant="outline" className="h-5 border-emerald-500/40 px-1.5 text-[10px] font-normal text-emerald-700 dark:text-emerald-400">
              {t("tabCenter.archive.bookmarked")}
            </Badge>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-0.5 opacity-60 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
        <RowAction label={t("tabCenter.archive.restore")} onClick={() => onRestore(entry)} icon={<RotateCcw className="h-3.5 w-3.5" />} />
        <RowAction label={t("tabCenter.actions.readLater")} onClick={() => onReadLater(entry)} icon={<BookOpen className="h-3.5 w-3.5" />} />
        <RowAction label={t("tabCenter.actions.bookmark")} onClick={() => onBookmark(entry)} icon={<BookmarkPlus className="h-3.5 w-3.5" />} />
        <RowAction label={t("tabCenter.actions.workspace")} onClick={() => onWorkspace(entry)} icon={<Briefcase className="h-3.5 w-3.5" />} />
        <RowAction label={t("tabCenter.archive.delete")} onClick={() => onDelete(entry)} icon={<Trash2 className="h-3.5 w-3.5" />} />
      </div>
    </div>
  );
}

function RowAction({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClick} title={label} aria-label={label}>
      {icon}
    </Button>
  );
}

export const ArchiveEntryRow = memo(ArchiveEntryRowComponent);
export default ArchiveEntryRow;
