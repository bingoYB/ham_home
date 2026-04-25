import { useTranslation } from "react-i18next";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@hamhome/ui";
import type { WorkspaceCategory } from "@/types";
import { WorkspaceSaveFields } from "./WorkspaceSaveFields";

interface WorkspaceEditDialogProps {
  open: boolean;
  saving: boolean;
  name: string;
  description: string;
  categoryId: string | null;
  categories: WorkspaceCategory[];
  newCategoryName: string;
  creatingCategory: boolean;
  onOpenChange: (open: boolean) => void;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCategoryChange: (value: string | null) => void;
  onNewCategoryNameChange: (value: string) => void;
  onCreateCategory: () => void;
  onSave: () => void;
}

export function WorkspaceEditDialog({
  open,
  saving,
  name,
  description,
  categoryId,
  categories,
  newCategoryName,
  creatingCategory,
  onOpenChange,
  onNameChange,
  onDescriptionChange,
  onCategoryChange,
  onNewCategoryNameChange,
  onCreateCategory,
  onSave,
}: WorkspaceEditDialogProps) {
  const { t } = useTranslation("bookmark");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-[1000px]">
        <DialogHeader>
          <DialogTitle>{t("workspace.editDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("workspace.editDialogDescription")}
          </DialogDescription>
        </DialogHeader>
        <WorkspaceSaveFields
          name={name}
          description={description}
          categoryId={categoryId}
          categories={categories}
          newCategoryName={newCategoryName}
          creatingCategory={creatingCategory}
          onNameChange={onNameChange}
          onDescriptionChange={onDescriptionChange}
          onCategoryChange={onCategoryChange}
          onNewCategoryNameChange={onNewCategoryNameChange}
          onCreateCategory={onCreateCategory}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("workspace.cancel")}
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? t("workspace.saving") : t("workspace.saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
