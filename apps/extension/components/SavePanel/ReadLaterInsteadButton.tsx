/**
 * ReadLaterInsteadButton - header action of the in-page save overlay: not ready to
 * keep the page yet, so put it in Read later instead.
 */
import { useTranslation } from "react-i18next";
import { BookOpen } from "lucide-react";
import { Button } from "@hamhome/ui";

interface ReadLaterInsteadButtonProps {
  onClick: () => void;
}

export function ReadLaterInsteadButton({ onClick }: ReadLaterInsteadButtonProps) {
  const { t } = useTranslation("bookmark");
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 shrink-0 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
      onClick={onClick}
      title={t("inPageSave.readLaterHint")}
      data-testid="inpage-save-read-later"
    >
      <BookOpen className="h-3.5 w-3.5" />
      {t("inPageSave.readLater")}
    </Button>
  );
}
