import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink, RotateCcw, Search, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Checkbox,
  Input,
  cn,
  confirm,
  toast,
} from "@hamhome/ui";
import { BatchSelectionToolbar } from "@/components/common/BatchSelectionToolbar";
import { useBookmarks } from "@/contexts/BookmarkContext";
import { useBookmarkSelection } from "@/hooks/useBookmarkSelection";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import { bookmarkStorage } from "@/lib/storage/bookmark-storage";
import {
  TRASH_RETENTION_DAYS,
  getTrashRemainingDays,
} from "@/lib/bookmarks/bookmark-retention";
import type { LocalBookmark } from "@/types";

/** 老数据没有 deletedAt，软删除当时正是用 updatedAt 记的时间 */
function getDeletedAt(bookmark: LocalBookmark): number {
  return bookmark.deletedAt ?? bookmark.updatedAt;
}

export function TrashPage() {
  const { t } = useTranslation(["bookmark", "common"]);
  const { bookmarks, refreshBookmarks } = useBookmarks();
  const [trashed, setTrashed] = useState<LocalBookmark[]>([]);
  const [query, setQuery] = useState("");
  const { selectedIds, toggleSelect, deselectAll, toggleSelectAll } =
    useBookmarkSelection();

  const loadTrash = useCallback(async () => {
    const deleted = await bookmarkStorage.getDeletedBookmarks();
    setTrashed(
      [...deleted].sort((a, b) => getDeletedAt(b) - getDeletedAt(a)),
    );
  }, []);

  // bookmarks 只含未删除项，但它变化说明书签存储被改过，回收站要跟着刷新
  useEffect(() => {
    void loadTrash();
  }, [bookmarks, loadTrash]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return trashed;
    return trashed.filter((bookmark) =>
      `${bookmark.title} ${bookmark.url}`.toLowerCase().includes(keyword),
    );
  }, [query, trashed]);

  const refresh = useCallback(async () => {
    deselectAll();
    await refreshBookmarks();
    await loadTrash();
  }, [deselectAll, loadTrash, refreshBookmarks]);

  const restore = useCallback(
    async (ids: string[]) => {
      try {
        await bookmarkStorage.batchRestoreBookmarks(ids);
        await refresh();
        toast.success(t("bookmark:trash.restoreSuccess", { count: ids.length }));
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : t("bookmark:trash.restoreFailed"),
        );
      }
    },
    [refresh, t],
  );

  const purge = useCallback(
    async (ids: string[], description: string) => {
      const accepted = await confirm({
        title: t("bookmark:trash.purgeTitle"),
        description,
        confirmText: t("bookmark:trash.purgeConfirmText"),
        cancelText: t("common:common.cancel"),
        variant: "destructive",
      });
      if (!accepted) return;

      try {
        await bookmarkStorage.purgeBookmarks(ids);
        await refresh();
        toast.success(t("bookmark:trash.purgeSuccess", { count: ids.length }));
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : t("bookmark:trash.purgeFailed"),
        );
      }
    },
    [refresh, t],
  );

  const purgeSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    return purge(
      Array.from(selectedIds),
      t("bookmark:trash.purgeSelectedConfirm", { count: selectedIds.size }),
    );
  }, [purge, selectedIds, t]);

  const emptyTrash = useCallback(() => {
    if (trashed.length === 0) return;
    return purge(
      trashed.map((bookmark) => bookmark.id),
      t("bookmark:trash.emptyConfirm", { count: trashed.length }),
    );
  }, [purge, t, trashed]);

  return (
    <div className="h-full overflow-auto bg-background px-6 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Trash2 className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-semibold tracking-tight">
                {t("bookmark:trash.title")}
              </h1>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {t("bookmark:trash.description", { days: TRASH_RETENTION_DAYS })}
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("bookmark:trash.searchPlaceholder")}
              className="pl-9"
            />
          </div>
        </header>

        <BatchSelectionToolbar
          visibleIds={filtered.map((bookmark) => bookmark.id)}
          selectedCount={selectedIds.size}
          onToggleSelectAll={toggleSelectAll}
        >
          <Button
            data-testid="trash-restore-selected"
            variant="outline"
            size="sm"
            disabled={selectedIds.size === 0}
            onClick={() => void restore(Array.from(selectedIds))}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {t("bookmark:trash.restore")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={trashed.length === 0}
            onClick={() => void emptyTrash()}
          >
            {t("bookmark:trash.empty")}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={selectedIds.size === 0}
            onClick={() => void purgeSelected()}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {t("bookmark:trash.purge")}
          </Button>
        </BatchSelectionToolbar>

        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
              {t("bookmark:trash.empty_state")}
            </div>
          ) : (
            filtered.map((bookmark) => (
              <TrashRow
                key={bookmark.id}
                bookmark={bookmark}
                selected={selectedIds.has(bookmark.id)}
                onToggleSelect={() => toggleSelect(bookmark.id)}
                onRestore={() => void restore([bookmark.id])}
                onPurge={() =>
                  void purge(
                    [bookmark.id],
                    t("bookmark:trash.purgeOneConfirm", { title: bookmark.title }),
                  )
                }
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface TrashRowProps {
  bookmark: LocalBookmark;
  selected: boolean;
  onToggleSelect: () => void;
  onRestore: () => void;
  onPurge: () => void;
}

function TrashRow({
  bookmark,
  selected,
  onToggleSelect,
  onRestore,
  onPurge,
}: TrashRowProps) {
  const { t } = useTranslation(["bookmark", "common"]);
  const deletedAt = getDeletedAt(bookmark);
  const relativeDeletedAt = useRelativeTime(deletedAt);
  const remainingDays = getTrashRemainingDays(deletedAt);

  return (
    <article
      className={cn(
        "rounded-xl border bg-card p-4 [content-visibility:auto] [contain-intrinsic-size:88px]",
        selected && "border-primary/50 bg-primary/5",
      )}
    >
      <div className="flex flex-wrap items-start gap-3">
        <Checkbox
          className="mt-1 shrink-0"
          checked={selected}
          onCheckedChange={onToggleSelect}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-medium">{bookmark.title}</h2>
            <Badge
              variant="outline"
              className={cn(
                "shrink-0 text-[11px] font-normal",
                remainingDays <= 3 &&
                  "border-destructive/30 bg-destructive/10 text-destructive",
              )}
            >
              {t("bookmark:trash.remainingDays", { count: remainingDays })}
            </Badge>
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">{bookmark.url}</p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {t("bookmark:trash.deletedAt", { time: relativeDeletedAt })}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon" onClick={onRestore} title={t("bookmark:trash.restore")}>
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.open(bookmark.url, "_blank")}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-destructive" onClick={onPurge}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </article>
  );
}

export default TrashPage;
