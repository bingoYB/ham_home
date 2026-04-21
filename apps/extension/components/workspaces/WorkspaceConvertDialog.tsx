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
  Label,
  ScrollArea,
} from "@hamhome/ui";
import { CategorySelect } from "@/components/common/CategorySelect";
import { TagInput } from "@/components/common/TagInput";
import type {
  LocalCategory,
  WorkspacePageBookmarkStatus,
  WorkspaceTabPage,
} from "@/types";

interface WorkspaceConvertDialogProps {
  open: boolean;
  pages: WorkspaceTabPage[];
  statusById: Record<string, WorkspacePageBookmarkStatus>;
  categoryId: string | null;
  tags: string[];
  categories: LocalCategory[];
  allTags: string[];
  converting: boolean;
  onOpenChange: (open: boolean) => void;
  onCategoryChange: (value: string | null) => void;
  onTagsChange: (value: string[]) => void;
  onConfirm: () => void;
}

export function WorkspaceConvertDialog({
  open,
  pages,
  statusById,
  categoryId,
  tags,
  categories,
  allTags,
  converting,
  onOpenChange,
  onCategoryChange,
  onTagsChange,
  onConfirm,
}: WorkspaceConvertDialogProps) {
  const { t } = useTranslation("bookmark");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("workspace.convertDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("workspace.convertDialogDescription", { count: pages.length })}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_240px]">
          <ScrollArea className="h-[360px] rounded-md border">
            <div className="space-y-2 p-3">
              {pages.map((page) => {
                const status = statusById[page.id] ?? "not_bookmarked";
                return (
                  <div key={page.id} className="rounded-md border p-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {page.title}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {page.url}
                        </div>
                      </div>
                      <Badge variant={status === "not_bookmarked" ? "outline" : "secondary"}>
                        {t(`workspace.pageStatus.${status}`)}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("workspace.category")}</Label>
              <CategorySelect
                value={categoryId}
                onChange={onCategoryChange}
                categories={categories}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("workspace.tags")}</Label>
              <TagInput
                value={tags}
                onChange={onTagsChange}
                suggestions={allTags}
                placeholder={t("workspace.tagsPlaceholder")}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("workspace.cancel")}
          </Button>
          <Button onClick={onConfirm} disabled={converting || pages.length === 0}>
            {converting ? t("workspace.converting") : t("workspace.confirmConvert")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
