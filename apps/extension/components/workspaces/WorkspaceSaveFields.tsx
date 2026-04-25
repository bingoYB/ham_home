import { useTranslation } from "react-i18next";
import { Input, Label, Textarea } from "@hamhome/ui";
import { CategorySelect } from "@/components/common/CategorySelect";
import { TagInput } from "@/components/common/TagInput";
import type { LocalCategory } from "@/types";

interface WorkspaceSaveFieldsProps {
  name: string;
  description: string;
  categoryId: string | null;
  tags: string[];
  categories: LocalCategory[];
  allTags: string[];
  namePlaceholder?: string;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCategoryChange: (value: string | null) => void;
  onTagsChange: (value: string[]) => void;
}

export function WorkspaceSaveFields({
  name,
  description,
  categoryId,
  tags,
  categories,
  allTags,
  namePlaceholder,
  onNameChange,
  onDescriptionChange,
  onCategoryChange,
  onTagsChange,
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
    </>
  );
}
