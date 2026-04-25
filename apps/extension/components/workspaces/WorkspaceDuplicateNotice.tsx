import { useTranslation } from "react-i18next";
import { Checkbox, Label } from "@hamhome/ui";

interface WorkspaceDuplicateNoticeProps {
  duplicateCount: number;
  keepDuplicatePages: boolean;
  onKeepDuplicatePagesChange: (value: boolean) => void;
}

export function WorkspaceDuplicateNotice({
  duplicateCount,
  keepDuplicatePages,
  onKeepDuplicatePagesChange,
}: WorkspaceDuplicateNoticeProps) {
  const { t } = useTranslation("bookmark");
  if (duplicateCount === 0) return null;

  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
      <div className="text-sm font-medium text-amber-900 dark:text-amber-100">
        {t("workspace.duplicateNotice", { count: duplicateCount })}
      </div>
      <label className="mt-2 flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
        <Checkbox
          checked={keepDuplicatePages}
          onCheckedChange={(value) =>
            onKeepDuplicatePagesChange(Boolean(value))
          }
        />
        <Label className="cursor-pointer">
          {t("workspace.keepDuplicatePages")}
        </Label>
      </label>
    </div>
  );
}
