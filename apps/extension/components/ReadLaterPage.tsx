/**
 * ReadLaterPage - the read later queue (unread / read / expired).
 * Composes the queue hook with the header, stats, toolbar, batch bar and a
 * virtualized card list (1,000 items scroll smoothly).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, BookmarkPlus, Check, Layers, RotateCcw, Search, Trash2 } from "lucide-react";
import { Button, Input, ScrollArea, confirm } from "@hamhome/ui";
import { BatchSelectionToolbar } from "@/components/common/BatchSelectionToolbar";
import { ReadLaterCard } from "@/components/readLater/ReadLaterCard";
import { ReadLaterSettingsMenu } from "@/components/readLater/ReadLaterSettingsMenu";
import { ReadLaterStats } from "@/components/readLater/ReadLaterStats";
import { ReadLaterToolbar } from "@/components/readLater/ReadLaterToolbar";
import { ReadLaterTriageDialog } from "@/components/readLater/ReadLaterTriageDialog";
import { useBookmarkSelection } from "@/hooks/useBookmarkSelection";
import { useReadLaterQueue } from "@/hooks/useReadLaterQueue";
import { useScrollAreaVirtualList } from "@/hooks/useScrollAreaVirtualList";
import { useShortcuts } from "@/hooks/useShortcuts";

interface ReadLaterPageProps {
  /** Hash view, e.g. "read-later?q=pricing" */
  currentView: string;
}

function readQuery(currentView: string): string {
  const params = new URLSearchParams(currentView.split("?")[1] ?? "");
  return params.get("q") ?? "";
}

export function ReadLaterPage({ currentView }: ReadLaterPageProps) {
  const { t } = useTranslation(["bookmark", "common"]);
  const queue = useReadLaterQueue(readQuery(currentView));
  const { selectedIds, toggleSelect, deselectAll, toggleSelectAll } = useBookmarkSelection();
  const [triageOpen, setTriageOpen] = useState(false);
  const { shortcuts } = useShortcuts();
  const shortcut = shortcuts.find((item) => item.name === "read-later-close");

  useEffect(() => deselectAll(), [deselectAll, queue.view]);

  const visibleIds = useMemo(() => queue.items.map((item) => item.entry.bookmarkId), [queue.items]);
  const selected = useMemo(
    () => Array.from(selectedIds).filter((id) => visibleIds.includes(id)),
    [selectedIds, visibleIds],
  );

  const getItemKey = useCallback((index: number) => queue.items[index]?.entry.bookmarkId ?? index, [queue.items]);
  const list = useScrollAreaVirtualList({
    count: queue.items.length,
    estimateSize: 112,
    gap: 8,
    getItemKey,
  });

  const removeWithConfirm = useCallback(
    async (ids: string[]) => {
      if (ids.length > 1) {
        const accepted = await confirm({
          title: t("bookmark:readLater.confirmDelete.title"),
          description: t("bookmark:readLater.confirmDelete.description", { count: ids.length }),
          confirmText: t("common:common.delete"),
          cancelText: t("common:common.cancel"),
          variant: "destructive",
        });
        if (!accepted) return;
      }
      await queue.remove(ids);
      deselectAll();
    },
    [deselectAll, queue, t],
  );

  const batch = (action: (ids: string[]) => Promise<void>) => async () => {
    await action(selected);
    deselectAll();
  };

  return (
    <ScrollArea type="auto" className="h-full bg-background" viewportRef={list.viewportRef} viewportClassName="[&>div]:block!">
      <div className="mx-auto max-w-5xl space-y-5 px-6 py-6 pb-24">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-semibold tracking-tight">{t("bookmark:readLater.title")}</h1>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("bookmark:readLater.pageDescription")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={queue.query}
                onChange={(event) => queue.setQuery(event.target.value)}
                placeholder={t("bookmark:readLater.searchPlaceholder")}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setTriageOpen(true)} disabled={queue.counts.unread === 0}>
              <Layers className="h-4 w-4" />
              {t("bookmark:readLater.triage.open")}
            </Button>
            <ReadLaterSettingsMenu settings={queue.settings} onChange={(patch) => void queue.updateSettings(patch)} />
          </div>
        </header>

        <ReadLaterStats
          unread={queue.counts.unread}
          expiringSoon={queue.expiringSoon}
          completion={queue.completion}
          onShowExpiring={() => {
            queue.setView("unread");
            queue.setSort("expiring");
          }}
        />

        <ReadLaterToolbar
          view={queue.view}
          counts={queue.counts}
          sort={queue.sort}
          filters={queue.filters}
          domains={queue.domains}
          onViewChange={queue.setView}
          onSortChange={queue.setSort}
          onFiltersChange={queue.setFilters}
        />

        <BatchSelectionToolbar visibleIds={visibleIds} selectedCount={selected.length} onToggleSelectAll={toggleSelectAll}>
          {queue.view === "unread" ? (
            <Button variant="outline" size="sm" disabled={selected.length === 0} onClick={batch(queue.markRead)}>
              <Check className="mr-1.5 h-4 w-4" />
              {t("bookmark:readLater.actions.markRead")}
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled={selected.length === 0} onClick={batch(queue.requeue)}>
              <RotateCcw className="mr-1.5 h-4 w-4" />
              {t("bookmark:readLater.actions.requeue")}
            </Button>
          )}
          <Button variant="outline" size="sm" disabled={selected.length === 0} onClick={batch((ids) => queue.keep(ids, false))}>
            <BookmarkPlus className="mr-1.5 h-4 w-4" />
            {t("bookmark:readLater.actions.keep")}
          </Button>
          <Button variant="destructive" size="sm" disabled={selected.length === 0} onClick={() => void removeWithConfirm(selected)}>
            <Trash2 className="mr-1.5 h-4 w-4" />
            {t("bookmark:readLater.actions.delete")}
          </Button>
        </BatchSelectionToolbar>

        {queue.items.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center" data-testid="read-later-empty">
            <p className="text-sm font-medium text-foreground">
              {queue.query ? t("bookmark:readLater.emptySearch") : t(`bookmark:readLater.empty.${queue.view}`)}
            </p>
            {queue.view === "unread" && !queue.query && (
              <p className="mt-1 text-xs text-muted-foreground">
                {t("bookmark:readLater.emptyHint", { shortcut: shortcut?.shortcut || "Alt+Shift+R" })}
              </p>
            )}
          </div>
        ) : (
          <div ref={list.listRef} className="relative" style={{ height: list.totalSize }}>
            {list.virtualItems.map((virtual) => {
              const item = queue.items[virtual.index];
              if (!item) return null;
              const id = item.entry.bookmarkId;
              return (
                <div
                  key={virtual.key}
                  data-index={virtual.index}
                  ref={list.measureElement}
                  className="absolute left-0 top-0 w-full"
                  style={{ transform: `translateY(${virtual.start - list.scrollMargin}px)` }}
                >
                  <ReadLaterCard
                    item={item}
                    selected={selectedIds.has(id)}
                    expireAfterDays={queue.settings.expireAfterDays}
                    onToggleSelect={() => toggleSelect(id)}
                    onOpen={() => void queue.open(id)}
                    onMarkRead={() => void queue.markRead([id])}
                    onKeep={() => void queue.keep([id], true)}
                    onRequeue={() => void queue.requeue([id])}
                    onRemove={() => void removeWithConfirm([id])}
                    onSaveNote={(note) => void queue.updateNote(id, note)}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ReadLaterTriageDialog
        open={triageOpen}
        items={queue.view === "unread" ? queue.items : []}
        onOpenChange={setTriageOpen}
        onRead={(id) => void queue.open(id)}
        onKeep={(id) => void queue.keep([id], true)}
        onMarkRead={(id) => void queue.markRead([id])}
        onRemove={(id) => void queue.remove([id])}
      />
    </ScrollArea>
  );
}

export default ReadLaterPage;
