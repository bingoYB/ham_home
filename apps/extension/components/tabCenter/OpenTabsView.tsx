/**
 * OpenTabsView - the tab center's "Open" view: stats, toolbar, a virtualized list of
 * open tabs grouped by window / tab group / domain, and batch actions.
 */
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ScrollArea } from "@hamhome/ui";
import { useOpenTabActions } from "@/hooks/useOpenTabActions";
import { useOpenTabsList } from "@/hooks/useOpenTabsList";
import { useScrollAreaVirtualList } from "@/hooks/useScrollAreaVirtualList";
import { useTabTidy } from "@/hooks/useTabTidy";
import type { OpenTabInfo, OpenTabsSnapshot } from "@/types";
import { AddToWorkspaceDialog } from "./AddToWorkspaceDialog";
import { OpenTabRow } from "./OpenTabRow";
import { OpenTabsBatchBar } from "./OpenTabsBatchBar";
import { OpenTabsGroupHeader } from "./OpenTabsGroupHeader";
import { OpenTabsStatsBar } from "./OpenTabsStatsBar";
import { OpenTabsToolbar } from "./OpenTabsToolbar";
import { TabAITriageDialog } from "./TabAITriageDialog";
import { TabTidyDialog } from "./TabTidyDialog";

interface OpenTabsViewProps {
  snapshot: OpenTabsSnapshot;
  header: ReactNode;
  /** Tabs to select when the view opens (onboarding "tidy up now") */
  preselectTabIds?: number[];
  onPreselectConsumed?: () => void;
  /** AI tidy-up without an AI config: go to the AI settings */
  onOpenAISettings: () => void;
}

export function OpenTabsView({
  snapshot,
  header,
  preselectTabIds,
  onPreselectConsumed,
  onOpenAISettings,
}: OpenTabsViewProps) {
  const { t } = useTranslation("bookmark");
  const list = useOpenTabsList(snapshot);
  const actions = useOpenTabActions();
  const tidy = useTabTidy(snapshot);
  const [workspaceTabs, setWorkspaceTabs] = useState<OpenTabInfo[] | null>(null);
  const [tidyOpen, setTidyOpen] = useState(false);
  const [aiTriageOpen, setAITriageOpen] = useState(false);
  const supportsGroups = typeof (globalThis as { chrome?: { tabGroups?: unknown } }).chrome?.tabGroups !== "undefined";
  const pending = useMemo(() => new Set(snapshot.pendingConfirm.map((item) => item.tabId)), [snapshot.pendingConfirm]);
  const tabsById = useMemo(() => new Map(snapshot.tabs.map((tab) => [tab.tabId, tab])), [snapshot.tabs]);
  const { selectOnly } = list;

  useEffect(() => {
    if (!preselectTabIds?.length) return;
    selectOnly(preselectTabIds);
    onPreselectConsumed?.();
  }, [onPreselectConsumed, preselectTabIds, selectOnly]);

  const getItemKey = useCallback((index: number) => list.rows[index]?.key ?? index, [list.rows]);
  const virtual = useScrollAreaVirtualList({ count: list.rows.length, estimateSize: 58, gap: 4, getItemKey });

  const onLockToggle = useCallback((tab: OpenTabInfo) => void actions.setLocked([tab.tabId], !tab.locked), [actions]);
  const onReadLater = useCallback((tabId: number) => void actions.readLater([tabId]), [actions]);
  const onArchive = useCallback((tabId: number) => void actions.archive([tabId]), [actions]);
  const onFocus = useCallback((tabId: number) => void actions.focus(tabId), [actions]);
  const selectedIds = list.selectedTabs.map((tab) => tab.tabId);
  const run = (action: (ids: number[]) => Promise<void>) => async () => {
    await action(selectedIds);
    list.clearSelection();
  };

  return (
    <ScrollArea type="auto" className="h-full bg-background" viewportRef={virtual.viewportRef} viewportClassName="[&>div]:block!">
      <div className="mx-auto max-w-6xl space-y-4 px-6 py-6 pb-24">
        {header}
        <OpenTabsStatsBar
          snapshot={snapshot}
          onCloseDuplicates={() => void actions.closeDuplicates()}
          onTidyUp={() => {
            tidy.reset();
            setTidyOpen(true);
          }}
          onAITriage={() => setAITriageOpen(true)}
        />
        <OpenTabsToolbar
          query={list.query}
          groupBy={list.groupBy}
          sort={list.sort}
          filters={list.filters}
          supportsGroups={supportsGroups}
          onQueryChange={list.setQuery}
          onGroupByChange={list.setGroupBy}
          onSortChange={list.setSort}
          onToggleFilter={list.toggleFilter}
        />
        <OpenTabsBatchBar
          visibleTabIds={list.visibleTabIds}
          selectedTabs={list.selectedTabs}
          onToggleSelectAll={(ids) => list.selectOnly(list.selected.size === ids.length ? [] : ids)}
          onReadLater={run(actions.readLater)}
          onBookmark={run(actions.bookmark)}
          onWorkspace={() => setWorkspaceTabs(list.selectedTabs)}
          onArchive={run((ids) => actions.archive(ids))}
          onLock={run((ids) => actions.setLocked(ids, true))}
          onUnlock={run((ids) => actions.setLocked(ids, false))}
          onRenew={run(actions.renew)}
          onCloseWithoutRecord={run(actions.closeWithoutRecord)}
        />

        {list.rows.length === 0 ? (
          <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
            {t("tabCenter.emptyFilter")}
          </div>
        ) : (
          <div ref={virtual.listRef} className="relative" style={{ height: virtual.totalSize }}>
            {virtual.virtualItems.map((item) => {
              const row = list.rows[item.index];
              if (!row) return null;
              return (
                <div
                  key={item.key}
                  data-index={item.index}
                  ref={virtual.measureElement}
                  className="absolute left-0 top-0 w-full"
                  style={{ transform: `translateY(${item.start - virtual.scrollMargin}px)` }}
                >
                  {row.type === "header" ? (
                    <OpenTabsGroupHeader
                      label={row.label}
                      count={row.count}
                      selectedCount={row.tabIds.filter((id) => list.selected.has(id)).length}
                      onToggleAll={(value) => list.setSelected(row.tabIds, value)}
                    />
                  ) : (
                    <OpenTabRow
                      tab={row.tab}
                      selected={list.selected.has(row.tab.tabId)}
                      archiveMode={snapshot.autoArchive.mode}
                      thresholdUnit={snapshot.autoArchive.threshold.unit}
                      pendingConfirm={pending.has(row.tab.tabId)}
                      onToggleSelect={list.toggleSelect}
                      onFocus={onFocus}
                      onLockToggle={onLockToggle}
                      onReadLater={onReadLater}
                      onArchive={onArchive}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AddToWorkspaceDialog
        open={!!workspaceTabs}
        pages={(workspaceTabs ?? []).map((tab) => ({ title: tab.title, url: tab.url, favicon: tab.favicon }))}
        onOpenChange={(open) => !open && setWorkspaceTabs(null)}
        onAdded={() => list.clearSelection()}
      />
      <TabTidyDialog open={tidyOpen} tabCount={snapshot.stats.total} tabs={tabsById} tidy={tidy} onOpenChange={setTidyOpen} />
      <TabAITriageDialog
        open={aiTriageOpen}
        snapshot={snapshot}
        tabs={tabsById}
        onOpenChange={setAITriageOpen}
        onOpenAISettings={onOpenAISettings}
      />
    </ScrollArea>
  );
}

export default OpenTabsView;
