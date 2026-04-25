import { useTranslation } from "react-i18next";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@hamhome/ui";

interface WorkspacePageEditDialogProps {
  open: boolean;
  name: string;
  url: string;
  onOpenChange: (open: boolean) => void;
  onNameChange: (value: string) => void;
  onUrlChange: (value: string) => void;
  onSave: () => void;
}

export function WorkspacePageEditDialog({
  open,
  name,
  url,
  onOpenChange,
  onNameChange,
  onUrlChange,
  onSave,
}: WorkspacePageEditDialogProps) {
  const { t } = useTranslation("bookmark");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t("workspace.editPage")}</DialogTitle>
          <DialogDescription>
            {t("workspace.editPageDescription")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="page-name">{t("workspace.pageTitle")}</Label>
            <Input
              id="page-name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder={t("workspace.pageTitlePlaceholder")}
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="page-url">{t("workspace.pageUrl")}</Label>
            <Input
              id="page-url"
              value={url}
              onChange={(e) => onUrlChange(e.target.value)}
              placeholder={t("workspace.pageUrlPlaceholder")}
            />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("workspace.cancel")}
          </Button>
          <Button onClick={onSave} disabled={!name.trim() || !url.trim()}>
            {t("workspace.saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
