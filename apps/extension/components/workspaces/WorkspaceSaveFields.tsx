import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { Button, Input, Label, Textarea } from "@hamhome/ui";
import { CategorySelect } from "@/components/common/CategorySelect";
import type { WorkspaceCategory } from "@/types";

interface WorkspaceSaveFieldsProps {
  name: string;
  description: string;
  categoryId: string | null;
  categories: WorkspaceCategory[];
  newCategoryName: string;
  creatingCategory: boolean;
  namePlaceholder?: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCategoryChange: (value: string | null) => void;
  onNewCategoryNameChange: (value: string) => void;
  onCreateCategory: () => void;
}

export function WorkspaceSaveFields({
  name,
  description,
  categoryId,
  categories,
  newCategoryName,
  creatingCategory,
  namePlaceholder,
  onNameChange,
  onDescriptionChange,
  onCategoryChange,
  onNewCategoryNameChange,
  onCreateCategory,
}: WorkspaceSaveFieldsProps) {
  const { t } = useTranslation("bookmark");

  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="workspace-name">{t("workspace.name")}</Label>
        <Input
          id="workspace-name"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder={namePlaceholder}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="workspace-description">{t("workspace.summary")}</Label>
        <Textarea
          id="workspace-description"
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder={t("workspace.descriptionPlaceholder")}
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label>{t("workspace.category")}</Label>
        <CategorySelect
          value={categoryId}
          onChange={onCategoryChange}
          categories={categories}
        />
        <div className="flex gap-2">
          <Input
            value={newCategoryName}
            onChange={(event) => onNewCategoryNameChange(event.target.value)}
            placeholder={t("workspace.newCategoryPlaceholder")}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onCreateCategory();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            onClick={onCreateCategory}
            disabled={creatingCategory || !newCategoryName.trim()}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t("workspace.createCategory")}
          </Button>
        </div>
      </div>
    </>
  );
}
