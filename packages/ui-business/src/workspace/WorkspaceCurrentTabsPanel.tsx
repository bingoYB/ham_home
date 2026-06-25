import { useMemo, useState, ReactNode } from "react";
import { RefreshCw, Save, Sidebar, ChevronDown, ChevronRight } from "lucide-react";
import { Button, ScrollArea } from "@hamhome/ui";
import { useWorkspaceLabels } from "./WorkspaceLabelsContext";
import type { WorkspacePreviewData, WorkspaceTabPageData, WorkspaceTabGroupData } from "./types";
import { WorkspaceTabGroupList } from "./WorkspaceTabGroupList";

export interface WorkspaceCurrentTabsPanelProps {
  preview: WorkspacePreviewData | null;
  loading: boolean;
  onRefresh: () => void;
  onSaveCurrentWindow: (pages: WorkspaceTabPageData[]) => void;
  renderPage: (page: WorkspaceTabPageData) => ReactNode;
  className?: string;
}

export function WorkspaceCurrentTabsPanel({
  preview,
  loading,
  onRefresh,
  onSaveCurrentWindow,
  renderPage,
  className,
}: WorkspaceCurrentTabsPanelProps) {
  const labels = useWorkspaceLabels();

  const pages = preview?.pages ?? [];
  const groupedPages = useMemo(() => {
    const groups = new Map<number, WorkspaceTabPageData[]>();
    for (const page of pages) {
      const windowId = page.windowId ?? -1;
      if (!groups.has(windowId)) {
        groups.set(windowId, []);
      }
      groups.get(windowId)!.push(page);
    }
    return Array.from(groups.entries());
  }, [pages]);

  const isSingleWindow = groupedPages.length === 1;

  return (
    <aside className={`flex h-90 w-full shrink-0 flex-col border-t bg-muted/20 xl:h-auto xl:w-85 xl:border-l xl:border-t-0 ${className || ""}`}>
      <div className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
        <Sidebar className="h-4 w-4 text-muted-foreground" />
        <h2 className="min-w-0 flex-1 truncate text-base font-semibold">
          {labels.currentTabs} ({pages.length})
        </h2>
        
        {isSingleWindow && (
          <Button
            size="sm"
            variant="ghost"
            title={labels.saveThisWindow}
            onClick={() => onSaveCurrentWindow(groupedPages[0][1])}
          >
            <Save className="h-4 w-4" />
          </Button>
        )}

        <Button
          size="sm"
          variant="ghost"
          title={labels.refreshCurrentTabs}
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        </Button>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 p-3 pb-24">
          {loading && pages.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              {labels.currentTabsLoading}
            </div>
          ) : null}
          {!loading && pages.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              {labels.currentTabsEmpty}
            </div>
          ) : null}
          
          {isSingleWindow ? (
            <WorkspaceTabGroupList
              pages={groupedPages[0][1]}
              tabGroups={preview?.tabGroups}
              className="px-1"
              renderPage={renderPage}
            />
          ) : (
            groupedPages.map(([windowId, windowPages], groupIndex) => (
              <WorkspaceWindowGroup
                key={windowId}
                windowId={windowId}
                windowPages={windowPages}
                groupIndex={groupIndex}
                isCurrentWindow={windowId === preview?.currentWindowId}
                tabGroups={preview?.tabGroups}
                onSave={() => onSaveCurrentWindow(windowPages)}
                renderPage={renderPage}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </aside>
  );
}

interface WorkspaceWindowGroupProps {
  windowId: number;
  windowPages: WorkspaceTabPageData[];
  groupIndex: number;
  isCurrentWindow: boolean;
  tabGroups?: WorkspaceTabGroupData[];
  onSave: () => void;
  renderPage: (page: WorkspaceTabPageData) => ReactNode;
}

function WorkspaceWindowGroup({
  windowPages,
  groupIndex,
  isCurrentWindow,
  tabGroups,
  onSave,
  renderPage,
}: WorkspaceWindowGroupProps) {
  const [expanded, setExpanded] = useState(isCurrentWindow);
  const labels = useWorkspaceLabels();

  const windowTabGroups = useMemo(() => {
    if (!tabGroups) return [];
    // Only include groups that have at least one page in this window
    const pageGroupIds = new Set(windowPages.map(p => p.tabGroupId).filter(Boolean));
    return tabGroups.filter(g => pageGroupIds.has(g.id));
  }, [tabGroups, windowPages]);

  return (
    <div className="space-y-3 pb-4 last:pb-0">
      <div
        className="flex items-center justify-between rounded-t-lg bg-muted/40 px-3 py-2 border-b cursor-pointer select-none hover:bg-muted/60 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className="truncate text-sm font-semibold">
              {isCurrentWindow
                ? labels.currentWindowLabel
                : labels.windowLabel(groupIndex + 1)}
            </span>
            <span className="shrink-0 text-xs font-normal text-muted-foreground">
              ({labels.pageCount(windowPages.length)})
            </span>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          title={labels.saveThisWindow}
          onClick={(e) => {
            e.stopPropagation();
            onSave();
          }}
        >
          <Save className="h-4 w-4" />
        </Button>
      </div>
      {expanded && (
        <WorkspaceTabGroupList
          pages={windowPages}
          tabGroups={windowTabGroups}
          className="px-1"
          renderPage={renderPage}
        />
      )}
    </div>
  );
}
