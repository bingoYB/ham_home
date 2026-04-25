import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDndContext } from "@dnd-kit/core";
import { useSortable, defaultAnimateLayoutChanges } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@hamhome/ui";
import type { Workspace, WorkspaceRestoreMode, WorkspaceTabPage } from "@/types";
import { WorkspaceSectionHeader } from "./WorkspaceSectionHeader";
import { WorkspacePageTile } from "./WorkspacePageTile";
import { WorkspaceTabGroupList } from "./WorkspaceTabGroupList";
import { PAGE_DRAG_TYPE } from "./WorkspacePageTile";
import { TAB_DRAG_TYPE } from "./DraggableTabCard";

export const WORKSPACE_DROP_TYPE = "workspace-drop";

interface WorkspaceSectionProps {
  workspace: Workspace;
  pages: WorkspaceTabPage[];
  categoryName: string;
  categoryIcon?: string;
  onEdit: (workspace: Workspace) => void;
  onUpdateName?: (workspaceId: string, newName: string) => void;
  onRestore: (workspace: Workspace, mode: WorkspaceRestoreMode) => void;
  onDelete: (workspace: Workspace) => void;
  onEditPage?: (page: WorkspaceTabPage) => void;
  onDeletePage?: (pageId: string) => void;
  onSavePageBookmark?: (page: WorkspaceTabPage) => void;
  sortable?: boolean;
  isTabDragOver?: boolean;
  /** Insertion placeholder info for external drag */
  insertPlaceholder?: { pageId: string | null; position: "before" | "after" };
}

export function WorkspaceSection({
  workspace,
  pages,
  categoryName,
  categoryIcon,
  onEdit,
  onUpdateName,
  onRestore,
  onDelete,
  onEditPage,
  onDeletePage,
  onSavePageBookmark,
  sortable = false,
  isTabDragOver = false,
  insertPlaceholder,
}: WorkspaceSectionProps) {
  const { t } = useTranslation("bookmark");
  const [expanded, setExpanded] = useState(true);

  // Detect if content (page/tab) is being dragged — suppress workspace transform
  const { active } = useDndContext();
  const activeType = active?.data.current?.type;
  const isContentDragging =
    activeType === PAGE_DRAG_TYPE || activeType === TAB_DRAG_TYPE;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: workspace.id,
    disabled: !sortable,
    data: {
      type: WORKSPACE_DROP_TYPE,
      workspaceId: workspace.id,
    },
    animateLayoutChanges: (args) => {
      // 当拖拽内容（如Page）引起工作空间高度变化时，禁用工作空间本身的重排动画，防止 dnd-kit 误判导致错位
      if (args.active?.data.current?.type !== WORKSPACE_DROP_TYPE) {
        return false;
      }
      return defaultAnimateLayoutChanges(args);
    },
  });

  // When content is being dragged, don't apply workspace transform/transition
  const effectiveTransform = isContentDragging ? null : transform;
  const effectiveTransition = isContentDragging ? undefined : transition;
  const draggingTransform = CSS.Transform.toString(effectiveTransform) || "";

  const style = {
    transform: draggingTransform + (isDragging ? ' scale(0.98)' : 'scale(1)'),
    transition: effectiveTransition,
    zIndex: isDragging ? 1000 : undefined,
    position: isDragging ? "relative" as const : undefined,
    opacity: isDragging ? 0.9 : undefined,
  };

  return (
    <section
      ref={setNodeRef}
      style={style}
      className={cn(
        "border-b bg-muted/5 transition-colors",
        isDragging && "shadow-lg ring-2 ring-primary/20 rounded-lg bg-background",
        isTabDragOver && "ring-2 ring-primary/40 bg-primary/5",
      )}
      aria-label={t("workspace.pagesGridLabel", { name: workspace.name })}
    >
      <WorkspaceSectionHeader
        workspace={workspace}
        categoryName={categoryName}
        categoryIcon={categoryIcon}
        onEdit={onEdit}
        onUpdateName={onUpdateName}
        onRestore={onRestore}
        onDelete={onDelete}
        expanded={expanded}
        onToggle={() => setExpanded(!expanded)}
        dragHandleProps={sortable ? { listeners, attributes } : undefined}
        isDragging={isDragging}
      />
      <div
        className={cn(
          "px-8 pb-8 pt-4",
          !expanded && "hidden"
        )}
      >
        <WorkspaceTabGroupList
          pages={pages}
          tabGroups={workspace.tabGroups}
          grid
          workspaceId={workspace.id}
          insertPlaceholder={insertPlaceholder}
          renderPage={(page, sortableId) => (
            <WorkspacePageTile
              page={page}
              sortableId={sortableId}
              workspaceId={workspace.id}
              onEdit={onEditPage}
              onDelete={onDeletePage ? () => onDeletePage(page.id) : undefined}
              onSaveBookmark={onSavePageBookmark}
            />
          )}
        />
      </div>
    </section>
  );
}

