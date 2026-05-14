/**
 * WorkspaceSectionHeader - Headless 工作空间区块头部
 * 无 i18n / DnD 依赖，通过 Context 获取文本，通过 dragHandle 插槽注入拖拽
 */
import { useState, useRef, useEffect, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronRight,
  Edit3,
  ExternalLink,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Button, Badge, cn } from "@hamhome/ui";
import type { WorkspaceData, WorkspaceRestoreMode } from "./types";
import { useWorkspaceLabels } from "./WorkspaceLabelsContext";
import { formatWorkspaceDateTime, formatWorkspaceDate, CATEGORY_COLOR } from "./workspace-utils";

export interface WorkspaceSectionHeaderProps {
  workspace: WorkspaceData;
  categoryName: string;
  categoryIcon?: string;
  onEdit: (workspace: WorkspaceData) => void;
  onRestore: (workspace: WorkspaceData, mode: WorkspaceRestoreMode) => void;
  onDelete: (workspace: WorkspaceData) => void;
  onUpdateName?: (workspaceId: string, newName: string) => void;
  expanded?: boolean;
  onToggle?: () => void;
  /** 拖拽手柄插槽 */
  dragHandle?: ReactNode;
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
  dragHandle,
  isDragging,
}: WorkspaceSectionHeaderProps) {
  const labels = useWorkspaceLabels();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(workspace.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditName(workspace.name);
  }, [workspace.name]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleNameClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditName(e.target.value);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      saveName();
    } else if (e.key === "Escape") {
      setEditName(workspace.name);
      setIsEditing(false);
    }
  };

  const saveName = () => {
    setIsEditing(false);
    const trimmed = editName.trim();
    if (trimmed && trimmed !== workspace.name) {
      onUpdateName?.(workspace.id, trimmed);
    } else {
      setEditName(workspace.name);
    }
  };

  return (
    <div className="flex items-center gap-2 px-4 pl-3 py-3 bg-muted/20">
      {dragHandle ?? (
        <div
          className={`shrink-0 touch-none mr-1 ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        />
      )}
      <div
        className="min-w-0 flex-1 text-left cursor-pointer"
        onClick={onToggle}
      >
        <span className="flex min-w-0 items-center gap-2">
          {isEditing ? (
            <input
              ref={inputRef}
              type="text"
              value={editName}
              onChange={handleNameChange}
              onKeyDown={handleNameKeyDown}
              onBlur={saveName}
              onClick={(e) => e.stopPropagation()}
              className="min-w-[100px] max-w-[300px] truncate border-b border-primary bg-transparent text-base font-semibold outline-none focus:border-primary focus:ring-0"
            />
          ) : (
            <span
              className="truncate text-base font-semibold cursor-text hover:underline"
              onClick={handleNameClick}
              title={labels.clickToEdit}
            >
              {workspace.name}
            </span>
          )}
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
        </span>
        <div className="mt-1 flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <span>{formatWorkspaceDateTime(workspace.createdAt)}</span>
          <span>·</span>
          <Badge
            variant="secondary"
            className={cn(
              "px-1.5 py-0 h-4 text-[10px] font-normal gap-1",
              CATEGORY_COLOR,
            )}
          >
            {categoryIcon && (
              <span className="text-[12px]">{categoryIcon}</span>
            )}
            {categoryName}
          </Badge>
          <span>·</span>
          <span>
            {labels.pageCount((workspace.pages ?? []).length)}
          </span>
          <span>·</span>
          <span>
            {labels.restoredAt}:{" "}
            {workspace.restoredAt
              ? formatWorkspaceDate(workspace.restoredAt)
              : labels.neverRestored}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          aria-label={labels.editWorkspace}
          title={labels.editWorkspace}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(workspace);
          }}
        >
          <Edit3 className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-label={labels.restoreNewWindow}
          title={labels.restoreNewWindow}
          onClick={(e) => {
            e.stopPropagation();
            onRestore(workspace, "newWindow");
          }}
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          aria-label={labels.restoreCurrentWindow}
          title={labels.restoreCurrentWindow}
          onClick={(e) => {
            e.stopPropagation();
            onRestore(workspace, "currentWindow");
          }}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          aria-label={labels.deleteWorkspace}
          title={labels.deleteWorkspace}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(workspace);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
