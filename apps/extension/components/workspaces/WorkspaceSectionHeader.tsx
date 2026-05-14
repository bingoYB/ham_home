/**
 * WorkspaceSectionHeader - Extension 包装层
 * 注入 DnD dragHandle 和 i18n labels（通过上层 Provider）
 */
import { GripVertical } from "lucide-react";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import type { Workspace, WorkspaceRestoreMode } from "@/types";
import {
  WorkspaceSectionHeader as SharedWorkspaceSectionHeader,
} from "@hamhome/ui-business/workspace";

interface WorkspaceSectionHeaderProps {
  workspace: Workspace;
  categoryName: string;
  categoryIcon?: string;
  onEdit: (workspace: Workspace) => void;
  onRestore: (workspace: Workspace, mode: WorkspaceRestoreMode) => void;
  onDelete: (workspace: Workspace) => void;
  onUpdateName?: (workspaceId: string, newName: string) => void;
  expanded?: boolean;
  onToggle?: () => void;
  dragHandleProps?: {
    listeners?: SyntheticListenerMap;
    attributes?: DraggableAttributes;
  };
  isDragging?: boolean;
}

export function WorkspaceSectionHeader({
  workspace,
  categoryName,
  categoryIcon,
  onEdit,
  onRestore,
  onDelete,
  onUpdateName,
  expanded = true,
  onToggle,
  dragHandleProps,
  isDragging,
}: WorkspaceSectionHeaderProps) {
  const dragHandle = (
    <div
      className={`shrink-0 touch-none mr-1 ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
      {...(dragHandleProps?.listeners ?? {})}
      {...(dragHandleProps?.attributes ?? {})}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground" />
    </div>
  );

  return (
    <SharedWorkspaceSectionHeader
      workspace={workspace}
      categoryName={categoryName}
      categoryIcon={categoryIcon}
      onEdit={onEdit as (w: import("@hamhome/ui-business/workspace").WorkspaceData) => void}
      onRestore={onRestore as (w: import("@hamhome/ui-business/workspace").WorkspaceData, m: import("@hamhome/ui-business/workspace").WorkspaceRestoreMode) => void}
      onDelete={onDelete as (w: import("@hamhome/ui-business/workspace").WorkspaceData) => void}
      onUpdateName={onUpdateName}
      expanded={expanded}
      onToggle={onToggle}
      dragHandle={dragHandle}
      isDragging={isDragging}
    />
  );
}
