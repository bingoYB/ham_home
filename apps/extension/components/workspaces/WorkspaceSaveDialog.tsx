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
import type { LocalCategory } from "@/types";
import type { WorkspacePreview } from "@/lib/services/workspace-service";
import { WorkspaceDuplicateNotice } from "./WorkspaceDuplicateNotice";
import { WorkspaceSaveFields } from "./WorkspaceSaveFields";

interface WorkspaceSaveDialogProps {
  open: boolean;
  preview: WorkspacePreview | null;
  saving: boolean;
  name: string;
  description: string;
  categoryId: string | null;
  tags: string[];
  keepDuplicatePages: boolean;
  categories: LocalCategory[];
  allTags: string[];
  onOpenChange: (open: boolean) => void;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCategoryChange: (value: string | null) => void;
  onTagsChange: (value: string[]) => void;
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
  tags,
  keepDuplicatePages,
  categories,
  allTags,
  onOpenChange,
  onNameChange,
  onDescriptionChange,
  onCategoryChange,
  onTagsChange,
  onKeepDuplicatePagesChange,
  onSave,
}: WorkspaceSaveDialogProps) {
  const { t } = useTranslation("bookmark");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{t("workspace.saveDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("workspace.saveDialogDescription", {
              count: preview?.pages.length ?? 0,
            })}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4">
            <WorkspaceSaveFields
              name={name}
              description={description}
              categoryId={categoryId}
              tags={tags}
              categories={categories}
              allTags={allTags}
              namePlaceholder={preview?.name}
              onNameChange={onNameChange}
              onDescriptionChange={onDescriptionChange}
              onCategoryChange={onCategoryChange}
              onTagsChange={onTagsChange}
            />
            <WorkspaceDuplicateNotice
              duplicateCount={preview?.duplicateUrlCount ?? 0}
              keepDuplicatePages={keepDuplicatePages}
              onKeepDuplicatePagesChange={onKeepDuplicatePagesChange}
            />
          </div>
          <div className="space-y-2">
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
            <ScrollArea className="h-[390px] rounded-md border">
              <div className="space-y-2 p-3">
                {preview?.pages.map((page) => (
                  <div key={page.id} className="min-w-0 rounded-md border p-2">
                    <div className="truncate text-sm font-medium">
                      {page.title}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {page.url}
                    </div>
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
