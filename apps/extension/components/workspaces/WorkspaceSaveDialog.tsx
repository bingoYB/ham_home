import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ScrollArea,
} from "@hamhome/ui";
import type { WorkspaceCategory } from "@/types";
import type { WorkspacePreview } from "@/lib/services/workspace-service";
import { WorkspacePageFavicon } from "./WorkspacePageFavicon";
import { WorkspaceDuplicateNotice } from "./WorkspaceDuplicateNotice";
import { WorkspaceSaveFields } from "./WorkspaceSaveFields";
import { filterWorkspaceTabGroups } from "./workspace-ui";
import { WorkspaceTabGroupList } from "./WorkspaceTabGroupList";

interface WorkspaceSaveDialogProps {
  open: boolean;
  preview: WorkspacePreview | null;
  saving: boolean;
  name: string;
  description: string;
  categoryId: string | null;
  keepDuplicatePages: boolean;
  categories: WorkspaceCategory[];
  newCategoryName: string;
  creatingCategory: boolean;
  onOpenChange: (open: boolean) => void;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCategoryChange: (value: string | null) => void;
  onNewCategoryNameChange: (value: string) => void;
  onCreateCategory: () => void;
  onKeepDuplicatePagesChange: (value: boolean) => void;
  onSave: () => void;
}

export function WorkspaceSaveDialog({
  open,
  preview,
  saving,
  name,
  description,
  categoryId,
  keepDuplicatePages,
  categories,
  newCategoryName,
  creatingCategory,
  onOpenChange,
  onNameChange,
  onDescriptionChange,
  onCategoryChange,
  onNewCategoryNameChange,
  onCreateCategory,
  onKeepDuplicatePagesChange,
  onSave,
}: WorkspaceSaveDialogProps) {
  const { t } = useTranslation("bookmark");
  const pages = preview?.pages ?? [];
  const groupedPages = useMemo(() => {
    const groups = new Map<number, typeof pages>();
    for (const page of pages) {
      const windowId = page.windowId ?? -1;
      if (!groups.has(windowId)) {
        groups.set(windowId, []);
      }
      groups.get(windowId)!.push(page);
    }
    return Array.from(groups.entries());
  }, [pages]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[1000px]">
        <DialogHeader>
          <DialogTitle>{t("workspace.saveDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("workspace.saveDialogDescription", {
              count: preview?.pages.length ?? 0,
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_280px] min-w-0">
          <div className="space-y-4">
            <WorkspaceSaveFields
              name={name}
              description={description}
              categoryId={categoryId}
              categories={categories}
              newCategoryName={newCategoryName}
              creatingCategory={creatingCategory}
              namePlaceholder={preview?.name}
              onNameChange={onNameChange}
              onDescriptionChange={onDescriptionChange}
              onCategoryChange={onCategoryChange}
              onNewCategoryNameChange={onNewCategoryNameChange}
              onCreateCategory={onCreateCategory}
            />
            <WorkspaceDuplicateNotice
              duplicateCount={preview?.duplicateUrlCount ?? 0}
              keepDuplicatePages={keepDuplicatePages}
              onKeepDuplicatePagesChange={onKeepDuplicatePagesChange}
            />
          </div>
          <div className="space-y-2 min-w-0">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">{t("workspace.pageList")}</span>
              {preview?.duplicateUrlCount ? (
                <Badge variant="secondary">
                  {t("workspace.duplicatePages", {
                    count: preview.duplicateUrlCount,
                  })}
                </Badge>
              ) : null}
            </div>
            <ScrollArea className="h-[390px] w-full max-w-full rounded-md border scroll-table-fix">
              <div className="space-y-2 p-3 min-w-0">
                {groupedPages.map(([windowId, windowPages], groupIndex) => (
                  <div key={windowId} className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 px-1 py-1 min-w-0">
                      <span className="truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                        {windowId === preview?.currentWindowId
                          ? t("workspace.currentWindowLabel")
                          : t("workspace.windowLabel", { index: groupIndex + 1 })}
                        {` (${t("workspace.pageCount", { count: windowPages.length })})`}
                      </span>
                      <div className="h-px flex-1 bg-border/40" />
                    </div>
                    <WorkspaceTabGroupList
                      pages={windowPages}
                      tabGroups={filterWorkspaceTabGroups(preview?.tabGroups, windowPages)}
                      renderPage={(page) => (
                        <div className="flex min-h-12 min-w-0 items-center gap-2 rounded-[12px] bg-card border p-2">
                          <WorkspacePageFavicon favicon={page.favicon} url={page.url} className="h-5 w-5" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium" title={page.title}>
                              {page.title}
                            </div>
                            <div className="truncate text-xs text-muted-foreground" title={page.url}>
                              {page.url}
                            </div>
                          </div>
                        </div>
                      )}
                    />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("workspace.cancel")}
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? t("workspace.saving") : t("workspace.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
