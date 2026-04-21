import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import { CheckSquare, ExternalLink, RotateCcw, Square } from "lucide-react";
import { Button, ScrollArea, Separator } from "@hamhome/ui";
import type {
  Workspace,
  WorkspacePageBookmarkStatus,
  WorkspaceRestoreMode,
  WorkspaceTabPage,
} from "@/types";
import { formatWorkspaceDate } from "./workspace-ui";
import { WorkspacePageRow } from "./WorkspacePageRow";

interface WorkspaceDetailProps {
  workspace: Workspace | null;
  pages: WorkspaceTabPage[];
  statusById: Record<string, WorkspacePageBookmarkStatus>;
  selectedPageIds: Set<string>;
  toolbar?: ReactNode;
  onTogglePage: (pageId: string) => void;
  onToggleAllPages: () => void;
  onRestoreSelected: (mode: WorkspaceRestoreMode) => void;
}

export function WorkspaceDetail({
  workspace,
  pages,
  statusById,
  selectedPageIds,
  toolbar,
  onTogglePage,
  onToggleAllPages,
  onRestoreSelected,
}: WorkspaceDetailProps) {
  const { t } = useTranslation("bookmark");

  if (!workspace) {
    return (
      <div className="flex h-full min-h-[360px] items-center justify-center rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        {t("workspace.selectHint")}
      </div>
    );
  }

  const allSelected =
    pages.length > 0 && pages.every((page) => selectedPageIds.has(page.id));

  return (
    <div className="flex h-full min-h-[360px] flex-col rounded-lg border">
      <div className="space-y-3 p-4">
        <div className="space-y-1">
          <h3 className="line-clamp-2 text-base font-semibold">
            {workspace.name}
          </h3>
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {workspace.description || t("workspace.noDescription")}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <span>
            {t("workspace.createdAt")}:{" "}
            {formatWorkspaceDate(workspace.createdAt)}
          </span>
          <span>
            {t("workspace.restoredAt")}:{" "}
            {workspace.restoredAt
              ? formatWorkspaceDate(workspace.restoredAt)
              : t("workspace.neverRestored")}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => onRestoreSelected("newWindow")}>
            <ExternalLink className="mr-2 h-4 w-4" />
            {t("workspace.restoreSelectedNewWindow")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onRestoreSelected("currentWindow")}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            {t("workspace.restoreSelectedCurrentWindow")}
          </Button>
        </div>
      </div>
      {toolbar}
      <Separator />
      <div className="flex items-center justify-between px-4 py-2">
        <Button variant="ghost" size="sm" onClick={onToggleAllPages}>
          {allSelected ? (
            <CheckSquare className="mr-2 h-4 w-4" />
          ) : (
            <Square className="mr-2 h-4 w-4" />
          )}
          {t("workspace.selectedPages", {
            selected: selectedPageIds.size,
            total: pages.length,
          })}
        </Button>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 p-4 pt-0">
          {pages.map((page) => {
            const status = statusById[page.id] ?? "not_bookmarked";
            return (
              <WorkspacePageRow
                key={page.id}
                page={page}
                checked={selectedPageIds.has(page.id)}
                status={status}
                onToggle={onTogglePage}
              />
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
