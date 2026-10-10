/**
 * AddToWorkspaceDialog - add open or archived tabs to an existing workspace or to a
 * new one; URLs already in the workspace are skipped.
 */
import { useEffect, useState } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
} from "@hamhome/ui";
import { useAddToWorkspace, type WorkspacePageInput } from "@/hooks/useAddToWorkspace";

const NEW_WORKSPACE = "__new__";

interface AddToWorkspaceDialogProps {
  open: boolean;
  pages: WorkspacePageInput[];
  onOpenChange: (open: boolean) => void;
  onAdded?: (count: number) => void;
}

export function AddToWorkspaceDialog({ open, pages, onOpenChange, onAdded }: AddToWorkspaceDialogProps) {
  const { t } = useTranslation("bookmark");
  const { workspaces, addPages } = useAddToWorkspace();
  const [target, setTarget] = useState(NEW_WORKSPACE);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTarget(NEW_WORKSPACE);
    setName("");
  }, [open]);

  const submit = async () => {
    setSaving(true);
    try {
      const added = await addPages(
        target === NEW_WORKSPACE ? { name: name.trim() || t("tabCenter.workspace.defaultName") } : { workspaceId: target },
        pages,
      );
      toast.success(t("tabCenter.workspace.added", { count: added }));
      onAdded?.(added);
      onOpenChange(false);
    } catch (error) {
      console.error("[AddToWorkspaceDialog] failed:", error);
      toast.error(t("tabCenter.actionFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("tabCenter.workspace.title")}</DialogTitle>
          <DialogDescription>{t("tabCenter.workspace.description", { count: pages.length })}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>{t("tabCenter.workspace.target")}</Label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NEW_WORKSPACE}>{t("tabCenter.workspace.new")}</SelectItem>
                {workspaces.map((workspace) => (
                  <SelectItem key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {target === NEW_WORKSPACE && (
            <div className="space-y-1.5">
              <Label htmlFor="tab-center-workspace-name">{t("tabCenter.workspace.name")}</Label>
              <Input
                id="tab-center-workspace-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={t("tabCenter.workspace.defaultName")}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("tabCenter.workspace.cancel")}
          </Button>
          <Button onClick={() => void submit()} disabled={saving || pages.length === 0}>
            {t("tabCenter.workspace.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AddToWorkspaceDialog;
