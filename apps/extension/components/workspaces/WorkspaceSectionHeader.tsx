import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronDown,
  ChevronRight,
  Edit3,
  ExternalLink,
  GripVertical,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { Button, Badge, cn } from "@hamhome/ui";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import type { Workspace, WorkspaceRestoreMode } from "@/types";
import { CATEGORY_COLOR } from "@/utils/bookmark-utils";
import { formatWorkspaceDate, formatWorkspaceDateTime } from "./workspace-ui";

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
  const { t } = useTranslation("bookmark");
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
      <div
        className={`shrink-0 touch-none mr-1 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        {...(dragHandleProps?.listeners ?? {})}
        {...(dragHandleProps?.attributes ?? {})}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
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
              title={t("workspace.clickToEdit")}
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
            className={cn("px-1.5 py-0 h-4 text-[10px] font-normal gap-1", CATEGORY_COLOR)}
          >
            {categoryIcon && <span className="text-[12px]">{categoryIcon}</span>}
            {categoryName}
          </Badge>
          <span>·</span>
          <span>
            {t("workspace.pageCount", { count: (workspace.pages ?? []).length })}
          </span>
          <span>·</span>
          <span>
            {t("workspace.restoredAt")}:{" "}
            {workspace.restoredAt
              ? formatWorkspaceDate(workspace.restoredAt)
              : t("workspace.neverRestored")}
          </span>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          aria-label={t("workspace.editWorkspace")}
          title={t("workspace.editWorkspace")}
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
          aria-label={t("workspace.restoreNewWindow")}
          title={t("workspace.restoreNewWindow")}
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
          aria-label={t("workspace.restoreCurrentWindow")}
          title={t("workspace.restoreCurrentWindow")}
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
          aria-label={t("workspace.deleteWorkspace")}
          title={t("workspace.deleteWorkspace")}
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
