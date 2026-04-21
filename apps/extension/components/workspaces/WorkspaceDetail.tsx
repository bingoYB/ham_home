import { useTranslation } from "react-i18next";
import {
  CheckSquare,
  ExternalLink,
  Globe,
  RotateCcw,
  Square,
} from "lucide-react";
import {
  Button,
  ScrollArea,
  Separator,
  cn,
} from "@hamhome/ui";
import type { Workspace, WorkspaceRestoreMode } from "@/types";
import { formatWorkspaceDate } from "./workspace-ui";

interface WorkspaceDetailProps {
  workspace: Workspace | null;
  selectedPageIds: Set<string>;
  onTogglePage: (pageId: string) => void;
  onToggleAllPages: () => void;
  onRestoreSelected: (mode: WorkspaceRestoreMode) => void;
}

export function WorkspaceDetail({
  workspace,
  selectedPageIds,
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

  const allSelected = selectedPageIds.size === workspace.pages.length;

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
            total: workspace.pages.length,
          })}
        </Button>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 p-4 pt-0">
          {workspace.pages.map((page) => {
            const checked = selectedPageIds.has(page.id);
            return (
              <button
                key={page.id}
                type="button"
                className={cn(
                  "flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors hover:bg-accent",
                  checked && "border-primary bg-primary/5",
                )}
                onClick={() => onTogglePage(page.id)}
              >
                {checked ? (
                  <CheckSquare className="mt-0.5 h-4 w-4 text-primary" />
                ) : (
                  <Square className="mt-0.5 h-4 w-4 text-muted-foreground" />
                )}
                {page.favicon ? (
                  <img src={page.favicon} alt="" className="mt-0.5 h-4 w-4 rounded-sm" />
                ) : (
                  <Globe className="mt-0.5 h-4 w-4 text-muted-foreground" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {page.title}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {page.url}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
