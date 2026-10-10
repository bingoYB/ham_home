/**
 * TabArchiveView - the tab center's "Archive": every tab HamHome closed, grouped by
 * day and batch, searchable and filterable (virtualized for 10,000 entries), with
 * restore / read later / bookmark / workspace / delete, one by one or in batch.
 */
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Archive, BookOpen, BookmarkPlus, Briefcase, RotateCcw, Trash2 } from "lucide-react";
import { Button, ScrollArea, confirm } from "@hamhome/ui";
import { BatchSelectionToolbar } from "@/components/common/BatchSelectionToolbar";
import { WorkspacePageBookmarkDialog } from "@/components/workspaces/WorkspacePageBookmarkDialog";
import { useBookmarks } from "@/contexts/BookmarkContext";
import { useBookmarkSelection } from "@/hooks/useBookmarkSelection";
import { useScrollAreaVirtualList } from "@/hooks/useScrollAreaVirtualList";
import { useTabArchive } from "@/hooks/useTabArchive";
import { normalizeBookmarkUrl } from "@/lib/bookmarks/bookmark-dedup";
import { buildArchiveRows } from "@/lib/tabs/tab-archive.utils";
import { formatArchiveTime } from "@/utils/tab-time-format";
import type { TabArchiveEntry, WorkspaceTabPage } from "@/types";
import { AddToWorkspaceDialog } from "./AddToWorkspaceDialog";
import { ArchiveBatchHeader, ArchiveDateHeader } from "./ArchiveListHeaders";
import { ArchiveEntryRow } from "./ArchiveEntryRow";
import { ArchiveToolbar } from "./ArchiveToolbar";

interface TabArchiveViewProps {
  header: ReactNode;
}

function toPage(entry: TabArchiveEntry): WorkspaceTabPage {
  return { id: entry.id, title: entry.title, url: entry.url, domain: entry.domain, favicon: entry.favicon, index: 0 };
}

export function TabArchiveView({ header }: TabArchiveViewProps) {
  const { t, i18n } = useTranslation(["bookmark", "common"]);
  const archive = useTabArchive();
  const { bookmarks } = useBookmarks();
  const { selectedIds, toggleSelect, selectAll, deselectAll, toggleSelectAll } = useBookmarkSelection();
  const [bookmarkEntry, setBookmarkEntry] = useState<TabArchiveEntry | null>(null);
  const [workspaceEntries, setWorkspaceEntries] = useState<TabArchiveEntry[] | null>(null);

  const libraryUrls = useMemo(() => new Set(bookmarks.map((bookmark) => normalizeBookmarkUrl(bookmark.url))), [bookmarks]);
  const rows = useMemo(() => buildArchiveRows(archive.filtered, archive.batches), [archive.batches, archive.filtered]);
  const visibleIds = useMemo(() => archive.filtered.map((item) => item.entry.id), [archive.filtered]);
  const entriesById = useMemo(() => new Map(archive.entries.map((entry) => [entry.id, entry])), [archive.entries]);
  const selected = useMemo(() => Array.from(selectedIds).filter((id) => entriesById.has(id)), [entriesById, selectedIds]);

  const getItemKey = useCallback((index: number) => rows[index]?.key ?? index, [rows]);
  const virtual = useScrollAreaVirtualList({ count: rows.length, estimateSize: 58, gap: 4, getItemKey });

  const removeEntries = useCallback(
    async (ids: string[]) => {
      if (ids.length > 1) {
        const accepted = await confirm({
          title: t("bookmark:tabCenter.archive.deleteTitle"),
          description: t("bookmark:tabCenter.archive.deleteConfirm", { count: ids.length }),
          confirmText: t("common:common.delete"),
          cancelText: t("common:common.cancel"),
          variant: "destructive",
        });
        if (!accepted) return;
      }
      await archive.remove(ids);
      deselectAll();
    },
    [archive, deselectAll, t],
  );

  const batch = (action: (ids: string[]) => Promise<void>) => async () => {
    await action(selected);
    deselectAll();
  };

  return (
    <ScrollArea type="auto" className="h-full bg-background" viewportRef={virtual.viewportRef} viewportClassName="[&>div]:block!">
      <div className="mx-auto max-w-6xl space-y-4 px-6 py-6 pb-24">
        {header}
        {archive.latestBatch && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3 text-sm" data-testid="archive-latest-batch">
            <span>
              {t("bookmark:tabCenter.archive.latest", {
                time: formatArchiveTime(archive.latestBatch.batch.createdAt, i18n.language),
                reason: t(`bookmark:tabCenter.reasons.${archive.latestBatch.batch.reason}`),
                count: archive.latestBatch.count,
              })}
            </span>
            <Button size="sm" variant="outline" onClick={() => void archive.restoreBatch(archive.latestBatch!.batch.id)}>
              <RotateCcw className="mr-1.5 h-4 w-4" />
              {t("bookmark:tabCenter.archive.restoreBatch")}
            </Button>
          </div>
        )}
        <ArchiveToolbar filter={archive.filter} domains={archive.domains} onChange={archive.setFilter} />
        <BatchSelectionToolbar visibleIds={visibleIds} selectedCount={selected.length} onToggleSelectAll={toggleSelectAll}>
          <Button variant="outline" size="sm" disabled={selected.length === 0} onClick={batch((ids) => archive.restore(ids))}>
            <RotateCcw className="mr-1.5 h-4 w-4" />
            {t("bookmark:tabCenter.archive.restore")}
          </Button>
          <Button variant="outline" size="sm" disabled={selected.length === 0} onClick={batch(archive.readLater)}>
            <BookOpen className="mr-1.5 h-4 w-4" />
            {t("bookmark:tabCenter.actions.readLater")}
          </Button>
          <Button variant="outline" size="sm" disabled={selected.length === 0} onClick={batch(archive.bookmark)}>
            <BookmarkPlus className="mr-1.5 h-4 w-4" />
            {t("bookmark:tabCenter.actions.bookmark")}
          </Button>
          <Button variant="outline" size="sm" disabled={selected.length === 0} onClick={() => setWorkspaceEntries(selected.map((id) => entriesById.get(id)!))}>
            <Briefcase className="mr-1.5 h-4 w-4" />
            {t("bookmark:tabCenter.actions.workspace")}
          </Button>
          <Button variant="destructive" size="sm" disabled={selected.length === 0} onClick={() => void removeEntries(selected)}>
            <Trash2 className="mr-1.5 h-4 w-4" />
            {t("bookmark:tabCenter.archive.delete")}
          </Button>
        </BatchSelectionToolbar>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground" data-testid="archive-empty">
            <Archive className="h-6 w-6 text-muted-foreground/50" />
            {archive.entries.length === 0 ? t("bookmark:tabCenter.archive.empty") : t("bookmark:tabCenter.emptyFilter")}
          </div>
        ) : (
          <div ref={virtual.listRef} className="relative" style={{ height: virtual.totalSize }}>
            {virtual.virtualItems.map((item) => {
              const row = rows[item.index];
              if (!row) return null;
              return (
                <div key={item.key} data-index={item.index} ref={virtual.measureElement} className="absolute left-0 top-0 w-full" style={{ transform: `translateY(${item.start - virtual.scrollMargin}px)` }}>
                  {row.type === "date" ? (
                    <ArchiveDateHeader group={row.group} count={row.count} />
                  ) : row.type === "batch" ? (
                    <ArchiveBatchHeader
                      batch={row.batch}
                      count={row.entryIds.length}
                      selectedCount={row.entryIds.filter((id) => selectedIds.has(id)).length}
                      onToggleAll={(value) =>
                        value
                          ? selectAll(Array.from(new Set([...selectedIds, ...row.entryIds])))
                          : selectAll(Array.from(selectedIds).filter((id) => !row.entryIds.includes(id)))
                      }
                      onRestore={() => void archive.restore(row.entryIds)}
                    />
                  ) : (
                    <ArchiveEntryRow
                      entry={row.entry}
                      selected={selectedIds.has(row.entry.id)}
                      bookmarked={libraryUrls.has(normalizeBookmarkUrl(row.entry.url))}
                      onToggleSelect={toggleSelect}
                      onRestore={(entry) => void archive.restore([entry.id], true)}
                      onReadLater={(entry) => void archive.readLater([entry.id])}
                      onBookmark={setBookmarkEntry}
                      onWorkspace={(entry) => setWorkspaceEntries([entry])}
                      onDelete={(entry) => void removeEntries([entry.id])}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <WorkspacePageBookmarkDialog page={bookmarkEntry ? toPage(bookmarkEntry) : null} onOpenChange={(open) => !open && setBookmarkEntry(null)} />
      <AddToWorkspaceDialog
        open={!!workspaceEntries}
        pages={(workspaceEntries ?? []).map((entry) => ({ title: entry.title, url: entry.url, favicon: entry.favicon }))}
        onOpenChange={(open) => !open && setWorkspaceEntries(null)}
        onAdded={() => deselectAll()}
      />
    </ScrollArea>
  );
}

export default TabArchiveView;
