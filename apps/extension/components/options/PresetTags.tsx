import { useTranslation } from "react-i18next";
import { Button, Input, Label } from "@hamhome/ui";
import { Plus, X } from "lucide-react";

interface PresetTagsProps {
  tags: string[];
  newTag: string;
  onNewTagChange: (value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function PresetTags({
  tags,
  newTag,
  onNewTagChange,
  onAdd,
  onRemove,
  onKeyDown,
}: PresetTagsProps) {
  const { t } = useTranslation(["common", "settings"]);

  return (
    <div className="space-y-4 pt-4 border-t">
      <div className="space-y-1">
        <Label className="text-base font-semibold">{t("settings:settings.ai.presetTags")}</Label>
        <p className="text-sm text-muted-foreground">{t("settings:settings.ai.presetTagsDesc")}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags?.map((tag, index) => (
          <div
            key={index}
            className="flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-sm border border-primary/20"
          >
            {tag}
            <X
              className="h-3 w-3 cursor-pointer hover:text-primary/70"
              onClick={() => onRemove(index)}
            />
          </div>
        ))}
        <div className="flex gap-2 w-full mt-2">
          <Input
            placeholder={t("settings:settings.ai.addTagPlaceholder")}
            value={newTag}
            onChange={(e) => onNewTagChange(e.target.value)}
            onKeyDown={onKeyDown}
            className="flex-1"
          />
          <Button variant="outline" size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4 mr-1" />
            {t("common:common.add")}
          </Button>
        </div>
      </div>
    </div>
  );
}