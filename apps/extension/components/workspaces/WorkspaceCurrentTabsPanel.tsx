import { useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw, Save, Sidebar, ChevronDown, ChevronRight } from "lucide-react";
import { Button, ScrollArea } from "@hamhome/ui";
import type { WorkspacePreview } from "@/lib/services/workspace-service";
import type { WorkspaceTabGroup, WorkspaceTabPage } from "@/types";
import { DraggableTabCard } from "./DraggableTabCard";
import { filterWorkspaceTabGroups } from "./workspace-ui";
import { WorkspaceTabGroupList } from "./WorkspaceTabGroupList";

interface WorkspaceCurrentTabsPanelProps {
  preview: WorkspacePreview | null;
  loading: boolean;
  onRefresh: () => void;
  onSaveCurrentWindow: (customPreview?: WorkspacePreview) => void;
}

export function WorkspaceCurrentTabsPanel({
  preview,
  loading,
  onRefresh,
  onSaveCurrentWindow,
}: WorkspaceCurrentTabsPanelProps) {
  const { t } = useTranslation("bookmark");

  const pages = preview?.pages ?? [];
  const groupedPages = useMemo(() => {
    const groups = new Map<number, WorkspaceTabPage[]>();
    for (const page of pages) {
      const windowId = page.windowId ?? -1;
      if (!groups.has(windowId)) {
        groups.set(windowId, []);
      }
      groups.get(windowId)!.push(page);
    }
    return Array.from(groups.entries());
  }, [pages]);

  const handleSavePages = useCallback((windowPages: WorkspaceTabPage[]) => {
    import("@/lib/services/workspace-service").then(({ workspaceService }) => {
      onSaveCurrentWindow(
        workspaceService.createPreviewFromPages(
          windowPages,
          preview?.currentWindowId,
          preview?.tabGroups,
        )
      );
    });
  }, [onSaveCurrentWindow, preview?.currentWindowId, preview?.tabGroups]);

  const isSingleWindow = groupedPages.length === 1;

  return (
    <aside className="flex h-90 w-full shrink-0 flex-col border-t bg-muted/20 xl:h-auto xl:w-85 xl:border-l xl:border-t-0">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
        <Sidebar className="h-4 w-4 text-muted-foreground" />
        <h2 className="min-w-0 flex-1 truncate text-base font-semibold">
          {t("workspace.currentTabs")} ({pages.length})
        </h2>
        
        {isSingleWindow && (
          <Button
            size="sm"
            variant="ghost"
            aria-label={t("workspace.saveThisWindow")}
            title={t("workspace.saveThisWindow")}
            onClick={() => handleSavePages(groupedPages[0][1])}
          >
            <Save className="h-4 w-4" />
          </Button>
        )}

        <Button
          size="sm"
          variant="ghost"
          aria-label={t("workspace.refreshCurrentTabs")}
          title={t("workspace.refreshCurrentTabs")}
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
        </Button>
      </div>
      <ScrollArea className="min-h-0 flex-1 fixed-scroll-area scroll-table-fix">
        <div className="space-y-2 p-3">
          {loading && pages.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              {t("workspace.currentTabsLoading")}
            </div>
          ) : null}
          {!loading && pages.length === 0 ? (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              {t("workspace.currentTabsEmpty")}
            </div>
          ) : null}
          
          {isSingleWindow ? (
            <WorkspaceTabGroupList
              pages={groupedPages[0][1]}
              tabGroups={preview?.tabGroups}
              className="px-1"
              renderPage={(page) => <DraggableTabCard page={page} />}
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
                onSave={() => handleSavePages(windowPages)}
                t={t}
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
  windowPages: WorkspaceTabPage[];
  groupIndex: number;
  isCurrentWindow: boolean;
  tabGroups?: WorkspaceTabGroup[];
  onSave: () => void;
  t: (key: string, options?: any) => string;
}

function WorkspaceWindowGroup({
  windowPages,
  groupIndex,
  isCurrentWindow,
  tabGroups,
  onSave,
  t,
}: WorkspaceWindowGroupProps) {
  const [expanded, setExpanded] = useState(isCurrentWindow);
  const windowTabGroups = useMemo(
    () => filterWorkspaceTabGroups(tabGroups, windowPages),
    [tabGroups, windowPages],
  );

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
                ? t("workspace.currentWindowLabel")
                : t("workspace.windowLabel", { index: groupIndex + 1 })}
            </span>
            <span className="shrink-0 text-xs font-normal text-muted-foreground">
              ({t("workspace.pageCount", { count: windowPages.length })})
            </span>
          </div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          title={t("workspace.saveThisWindow")}
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
          renderPage={(page) => <DraggableTabCard page={page} />}
        />
      )}
    </div>
  );
}
