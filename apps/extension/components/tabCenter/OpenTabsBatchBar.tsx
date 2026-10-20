/**
 * OpenTabsBatchBar - batch actions on selected open tabs: read later, bookmark,
 * add to workspace, archive, lock / unlock, plus renew and close without a record.
 */
import { useTranslation } from "react-i18next";
import { Archive, BookOpen, BookmarkPlus, Briefcase, Lock, LockOpen, MoreHorizontal } from "lucide-react";
import {
  Button,
  Checkbox,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  cn,
} from "@hamhome/ui";
import type { OpenTabInfo } from "@/types";

interface OpenTabsBatchBarProps {
  visibleTabIds: number[];
  selectedTabs: OpenTabInfo[];
  onToggleSelectAll: (tabIds: number[]) => void;
  onReadLater: () => void;
  onBookmark: () => void;
  onWorkspace: () => void;
  onArchive: () => void;
  onLock: () => void;
  onUnlock: () => void;
  onRenew: () => void;
  onCloseWithoutRecord: () => void;
}

export function OpenTabsBatchBar({
  visibleTabIds,
  selectedTabs,
  onToggleSelectAll,
  onReadLater,
  onBookmark,
  onWorkspace,
  onArchive,
  onLock,
  onUnlock,
  onRenew,
  onCloseWithoutRecord,
}: OpenTabsBatchBarProps) {
  const { t } = useTranslation("bookmark");
  const count = selectedTabs.length;
  const none = count === 0;
  const allSelected = visibleTabIds.length > 0 && count === visibleTabIds.length;

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card/95 px-4 py-2.5 backdrop-blur">
      <div className="flex items-center gap-2.5 text-sm">
        <Checkbox
          aria-label={t("bookmark.batch.selectAll")}
          checked={allSelected}
          disabled={visibleTabIds.length === 0}
          onCheckedChange={() => onToggleSelectAll(visibleTabIds)}
        />
        <span className={cn(none && "text-muted-foreground")}>
          {none ? t("bookmark.batch.selectAll") : t("bookmark.batch.selected", { count })}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <Button variant="outline" size="sm" disabled={none} onClick={onReadLater}>
          <BookOpen className="mr-1.5 h-4 w-4" />
          {t("tabCenter.actions.readLater")}
        </Button>
        <Button variant="outline" size="sm" disabled={none} onClick={onBookmark}>
          <BookmarkPlus className="mr-1.5 h-4 w-4" />
          {t("tabCenter.actions.bookmark")}
        </Button>
        <Button variant="outline" size="sm" disabled={none} onClick={onWorkspace}>
          <Briefcase className="mr-1.5 h-4 w-4" />
          {t("tabCenter.actions.workspace")}
        </Button>
        <Button variant="outline" size="sm" disabled={none} onClick={onArchive} data-testid="open-tabs-archive">
          <Archive className="mr-1.5 h-4 w-4" />
          {t("tabCenter.actions.archive")}
        </Button>
        <Button variant="ghost" size="sm" disabled={none} onClick={onLock}>
          <Lock className="mr-1.5 h-4 w-4" />
          {t("tabCenter.actions.lock")}
        </Button>
        <Button variant="ghost" size="sm" disabled={none} onClick={onUnlock}>
          <LockOpen className="mr-1.5 h-4 w-4" />
          {t("tabCenter.actions.unlock")}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={none} aria-label={t("tabCenter.actions.more")}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onRenew}>{t("tabCenter.actions.renew")}</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={onCloseWithoutRecord}>
              {t("tabCenter.actions.closeWithoutRecord")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default OpenTabsBatchBar;
