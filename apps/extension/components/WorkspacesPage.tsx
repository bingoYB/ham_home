import { useMemo, useCallback, useState } from "react";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button, ScrollArea } from "@hamhome/ui";
import {
  WorkspaceLabelsProvider,
  WorkspaceSearchBar,
  WorkspaceCurrentTabsPanel,
  type WorkspaceLabels,
} from "@hamhome/ui-business/workspace";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  pointerWithin,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { WorkspaceSection, WORKSPACE_DROP_TYPE } from "@/components/workspaces/WorkspaceSection";
import { WorkspacePageDialogs } from "@/components/workspaces/WorkspacePageDialogs";
import { useWorkspacesPage } from "@/components/workspaces/useWorkspacesPage";
import { WorkspacePageBookmarkDialog } from "@/components/workspaces/WorkspacePageBookmarkDialog";
import { DraggableTabCard, TAB_DRAG_TYPE } from "@/components/workspaces/DraggableTabCard";
import { PAGE_DRAG_TYPE } from "@/components/workspaces/WorkspacePageTile";

import type { WorkspaceTabPage } from "@/types";
import { WorkspacePageFavicon } from "@/components/workspaces/WorkspacePageFavicon";



type DraggingItem =
  | { type: "tab"; page: WorkspaceTabPage }
  | { type: "page"; page: WorkspaceTabPage; workspaceId: string };

export function WorkspacesPage() {
  const { t } = useTranslation("bookmark");
  const state = useWorkspacesPage({});
  const [draggingItem, setDraggingItem] = useState<DraggingItem | null>(null);
  const [dragOverWorkspaceId, setDragOverWorkspaceId] = useState<string | null>(null);
  /** Tracks where a drag would be inserted */
  const [insertTarget, setInsertTarget] = useState<{ workspaceId: string; pageId: string | null; position: "before" | "after" } | null>(null);

  const isManualSort = state.sortBy === "manual";

  const workspaceLabels = useMemo<WorkspaceLabels>(() => ({
    pageCount: (count) => t("workspace.pageCount", { count }),
    restoredAt: t("workspace.restoredAt"),
    neverRestored: t("workspace.neverRestored"),
    editWorkspace: t("workspace.editWorkspace"),
    restoreNewWindow: t("workspace.restoreNewWindow"),
    restoreCurrentWindow: t("workspace.restoreCurrentWindow"),
    deleteWorkspace: t("workspace.deleteWorkspace"),
    clickToEdit: t("workspace.clickToEdit"),
    moreActions: t("workspace.moreActions"),
    edit: t("bookmark.edit"),
    openPage: t("workspace.openPage"),
    copyUrl: t("workspace.copyUrl"),
    saveToBookmark: t("workspace.saveToBookmark"),
    deletePage: t("workspace.deletePage"),
    searchPlaceholder: t("workspace.searchPlaceholder"),
    allCategories: t("workspace.allCategories"),
    uncategorized: t("bookmark.uncategorized"),
    unknownCategory: t("workspace.unknownCategory"),
    sortManual: t("workspace.sortManual"),
    sortCreatedAt: t("workspace.sortCreatedAt"),
    sortRestoredAt: t("workspace.sortRestoredAt"),
    currentTabs: t("workspace.currentTabs"),
    saveCurrentWindow: t("workspace.saveCurrentWindow"),
    saveThisWindow: t("workspace.saveThisWindow"),
    refreshCurrentTabs: t("workspace.refreshCurrentTabs"),
    currentTabsLoading: t("workspace.currentTabsLoading"),
    currentTabsEmpty: t("workspace.currentTabsEmpty"),
    currentWindowLabel: t("workspace.currentWindowLabel"),
    windowLabel: (index) => t("workspace.windowLabel", { index }),
  }), [t]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const sortableIds = useMemo(
    () => state.filteredWorkspaces.map((w) => w.id),
    [state.filteredWorkspaces],
  );

  // Use pointerWithin for tab/page drag (must drop precisely),
  // closestCenter for workspace reordering
  const collisionDetection: CollisionDetection = useCallback(
    (args) => {
      if (draggingItem) {
        // Try pointerWithin first, fall back to rectIntersection
        const pointerCollisions = pointerWithin(args);
        if (pointerCollisions.length > 0) return pointerCollisions;
        return rectIntersection(args);
      }
      return closestCenter(args);
    },
    [draggingItem],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const data = event.active.data.current;
      if (data?.type === TAB_DRAG_TYPE) {
        setDraggingItem({ type: "tab", page: data.page as WorkspaceTabPage });
      } else if (data?.type === PAGE_DRAG_TYPE) {
        setDraggingItem({
          type: "page",
          page: data.page as WorkspaceTabPage,
          workspaceId: data.workspaceId as string,
        });
      }
    },
    [],
  );

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event;
      const activeData = active.data.current;

      if (activeData?.type !== TAB_DRAG_TYPE && activeData?.type !== PAGE_DRAG_TYPE) {
        setDragOverWorkspaceId(null);
        setInsertTarget(null);
        return;
      }

      if (!over) {
        setDragOverWorkspaceId(null);
        setInsertTarget(null);
        return;
      }

      const overData = over.data.current;
      let wsId: string | null = null;
      const isExternalDrag = activeData?.type === TAB_DRAG_TYPE;
      const isCrossWorkspace =
        activeData?.type === PAGE_DRAG_TYPE &&
        overData?.workspaceId &&
        activeData.workspaceId !== overData.workspaceId;
      const isCrossGroup =
        activeData?.type === PAGE_DRAG_TYPE &&
        overData?.type === PAGE_DRAG_TYPE &&
        overData?.workspaceId &&
        activeData.workspaceId === overData.workspaceId &&
        (activeData.page as WorkspaceTabPage).tabGroupId !==
          (overData.page as WorkspaceTabPage).tabGroupId;
      const needsPlaceholder = isExternalDrag || isCrossWorkspace || isCrossGroup;

      // Determine before/after based on pointer position relative to over element center
      const getPosition = (): "before" | "after" => {
        const activeRect = active.rect.current.translated;
        const overRect = over.rect;
        if (!activeRect || !overRect) return "after";
        const aCenterY = activeRect.top + activeRect.height / 2;
        const oCenterY = overRect.top + overRect.height / 2;
        const aCenterX = activeRect.left + activeRect.width / 2;
        const oCenterX = overRect.left + overRect.width / 2;
        // Different row → compare Y
        if (Math.abs(aCenterY - oCenterY) > overRect.height * 0.4) {
          return aCenterY < oCenterY ? "before" : "after";
        }
        // Same row → compare X
        return aCenterX <= oCenterX ? "before" : "after";
      };

      if (overData?.type === PAGE_DRAG_TYPE && overData.workspaceId) {
        wsId = overData.workspaceId as string;
        if (needsPlaceholder) {
          const pos = getPosition();
          setInsertTarget({ workspaceId: wsId, pageId: (overData.page as WorkspaceTabPage).id, position: pos });
        } else {
          setInsertTarget(null);
        }
      } else if (overData?.type === WORKSPACE_DROP_TYPE && overData.workspaceId) {
        wsId = overData.workspaceId as string;
        if (needsPlaceholder) {
          setInsertTarget({ workspaceId: wsId, pageId: null, position: "after" });
        } else {
          setInsertTarget(null);
        }
      } else {
        setInsertTarget(null);
      }

      setDragOverWorkspaceId(wsId);
    },
    [],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      // Reset drag state
      setDraggingItem(null);
      setInsertTarget(null);
      setDragOverWorkspaceId(null);

      if (!over) return;

      const activeData = active.data.current;
      const overData = over.data.current;

      // ─── Tab card from right panel dropped ───
      if (activeData?.type === TAB_DRAG_TYPE) {
        const page = activeData.page as WorkspaceTabPage;

        if (overData?.type === PAGE_DRAG_TYPE && overData.workspaceId) {
          const targetWorkspaceId = overData.workspaceId as string;
          const targetPage = overData.page as WorkspaceTabPage;
          const workspace = state.filteredWorkspaces.find((w) => w.id === targetWorkspaceId);
          if (workspace) {
            const idx = workspace.pages.findIndex((p) => p.id === targetPage.id);
            // Use saved insertTarget position to decide before/after
            const offset = insertTarget?.position === "before" ? 0 : 1;
            state.addPageToWorkspace(targetWorkspaceId, page, idx >= 0 ? idx + offset : undefined);
          }
          return;
        }

        if (overData?.type === WORKSPACE_DROP_TYPE && overData.workspaceId) {
          state.addPageToWorkspace(overData.workspaceId as string, page);
        }
        return;
      }

      // ─── Workspace page dragged ───
      if (activeData?.type === PAGE_DRAG_TYPE) {
        const srcWorkspaceId = activeData.workspaceId as string;
        const activePage = activeData.page as WorkspaceTabPage;

        if (overData?.type === PAGE_DRAG_TYPE && overData.workspaceId) {
          const dstWorkspaceId = overData.workspaceId as string;
          const overPage = overData.page as WorkspaceTabPage;

          if (srcWorkspaceId === dstWorkspaceId) {
            state.reorderPagesInWorkspace(srcWorkspaceId, activePage.id, overPage.id);
          } else {
            const dstWorkspace = state.filteredWorkspaces.find((w) => w.id === dstWorkspaceId);
            if (dstWorkspace) {
              const idx = dstWorkspace.pages.findIndex((p) => p.id === overPage.id);
              const offset = insertTarget?.position === "before" ? 0 : 1;
              state.movePageBetweenWorkspaces(srcWorkspaceId, activePage.id, dstWorkspaceId, idx >= 0 ? idx + offset : undefined);
            }
          }
          return;
        }

        if (overData?.type === WORKSPACE_DROP_TYPE && overData.workspaceId) {
          const dstWorkspaceId = overData.workspaceId as string;
          if (srcWorkspaceId !== dstWorkspaceId) {
            state.movePageBetweenWorkspaces(srcWorkspaceId, activePage.id, dstWorkspaceId);
          }
          return;
        }
        return;
      }

      // ─── Workspace reorder (only when dragging a workspace, not content) ───
      if (activeData?.type === WORKSPACE_DROP_TYPE && active.id !== over.id) {
        state.reorderWorkspaces(String(active.id), String(over.id));
      }
    },
    [insertTarget, state.reorderWorkspaces, state.addPageToWorkspace, state.reorderPagesInWorkspace, state.movePageBetweenWorkspaces, state.filteredWorkspaces],
  );

  const handleDragCancel = useCallback(() => {
    setDraggingItem(null);
    setDragOverWorkspaceId(null);
    setInsertTarget(null);
  }, []);

  const dragOverlayPage = draggingItem?.page ?? null;

  return (
    <WorkspaceLabelsProvider labels={workspaceLabels}>
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex h-full min-h-0 flex-col bg-background xl:flex-row">
        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex min-h-16 flex-wrap gap-3 border-b px-4 py-3">
            <div className="min-w-0 flex-1">
              <WorkspaceSearchBar
                searchQuery={state.searchQuery}
                categoryFilter={state.categoryFilter}
                sortBy={state.sortBy}
                categories={state.workspaceCategories}
                onSearchChange={state.setSearchQuery}
                onCategoryFilterChange={state.setCategoryFilter}
                onSortByChange={state.setSortBy}
              />
            </div>
            <Button 
              size="sm"
              onClick={() => state.openSaveDialog()}
              title={workspaceLabels.saveCurrentWindow}
            >
              <Plus className="mr-2 h-4 w-4" />
              {workspaceLabels.saveCurrentWindow}
            </Button>
          </header>
          <ScrollArea className="min-h-0 flex-1">
            <SortableContext
              items={sortableIds}
              strategy={verticalListSortingStrategy}
            >
              <div>
                {state.filteredWorkspaces.length > 0 ? (
                  state.filteredWorkspaces.map((workspace) => (
                    <WorkspaceSection
                      key={workspace.id}
                      workspace={workspace}
                      pages={workspace.pages}
                      categoryName={
                        workspace.categoryId
                          ? state.categoryById.get(workspace.categoryId)?.name ??
                            t("workspace.unknownCategory")
                          : t("bookmark.uncategorized")
                      }
                      categoryIcon={
                        workspace.categoryId
                          ? state.categoryById.get(workspace.categoryId)?.icon
                          : undefined
                      }
                      onEdit={state.openEditDialog}
                      onUpdateName={state.updateWorkspaceName}
                      onRestore={state.restoreWorkspace}
                      onDelete={state.deleteWorkspace}
                      onEditPage={(page) => state.openEditPageDialog(workspace.id, page)}
                      onDeletePage={(pageId) => state.deletePageFromWorkspace(workspace.id, pageId)}
                      onSavePageBookmark={state.openSaveBookmarkDialog}
                      sortable={isManualSort}
                      isTabDragOver={draggingItem != null && dragOverWorkspaceId === workspace.id}
                      insertPlaceholder={
                        insertTarget?.workspaceId === workspace.id
                          ? { pageId: insertTarget.pageId, position: insertTarget.position }
                          : undefined
                      }
                    />
                  ))
                ) : (
                  <div className="m-6 rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
                    {state.workspaces.length === 0
                      ? t("workspace.empty")
                      : t("workspace.emptyFilter")}
                  </div>
                )}
              </div>
            </SortableContext>
          </ScrollArea>
        </section>
        <WorkspaceCurrentTabsPanel
          preview={state.currentWindowPreview}
          loading={state.currentWindowLoading}
          onRefresh={state.refreshCurrentWindowPreview}
          onSaveCurrentWindow={(pages) => {
            import("@/lib/services/workspace-service").then(({ workspaceService }) => {
              state.openSaveDialog(
                workspaceService.createPreviewFromPages(
                  pages as any,
                  state.currentWindowPreview?.currentWindowId,
                  state.currentWindowPreview?.tabGroups,
                )
              );
            });
          }}
          className="scroll-table-fix"
          renderPage={(page) => <DraggableTabCard page={page as any} />}
        />
        <WorkspacePageDialogs
          state={state}
        />
        <WorkspacePageBookmarkDialog
          page={state.savingBookmarkPage}
          onOpenChange={(open) => !open && state.setSavingBookmarkPage(null)}
        />
      </div>
      <DragOverlay dropAnimation={null}>
        {dragOverlayPage ? (
          <div className="flex min-h-14.5 w-75 items-center gap-3 rounded-md border bg-background px-3 py-2 shadow-xl ring-2 ring-primary/30">
            <WorkspacePageFavicon favicon={dragOverlayPage.favicon} className="h-7 w-7" />
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 text-sm font-medium leading-snug">
                {dragOverlayPage.title}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {dragOverlayPage.domain || dragOverlayPage.url}
              </span>
            </span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
    </WorkspaceLabelsProvider>
  );
}
