/**
 * WorkspaceBudgetSwitchDialog - "Restoring 'Research' opens 12 tabs, 9 over budget":
 * save the current window as a workspace and switch, open anyway, or cancel.
 */
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
import type { BudgetSwitchChoice, BudgetSwitchPrompt } from "@/hooks/useWorkspaceBudgetSwitch";

interface WorkspaceBudgetSwitchDialogProps {
  prompt: BudgetSwitchPrompt | null;
  onChoose: (choice: BudgetSwitchChoice) => void;
}

export function WorkspaceBudgetSwitchDialog({ prompt, onChoose }: WorkspaceBudgetSwitchDialogProps) {
  const { t } = useTranslation("bookmark");
  return (
    <Dialog open={!!prompt} onOpenChange={(open) => !open && onChoose("cancel")}>
      <DialogContent className="max-w-md" data-testid="workspace-budget-switch">
        <DialogHeader>
          <DialogTitle>{t("workspace.budgetSwitch.title")}</DialogTitle>
          <DialogDescription>
            {prompt &&
              t("workspace.budgetSwitch.description", {
                name: prompt.name,
                count: prompt.pageCount,
                over: prompt.over,
              })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="ghost" onClick={() => onChoose("cancel")}>
            {t("workspace.budgetSwitch.cancel")}
          </Button>
          <Button variant="outline" onClick={() => onChoose("open")}>
            {t("workspace.budgetSwitch.openAnyway")}
          </Button>
          <Button onClick={() => onChoose("switch")}>{t("workspace.budgetSwitch.switch")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default WorkspaceBudgetSwitchDialog;
