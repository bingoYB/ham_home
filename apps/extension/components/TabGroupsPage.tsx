import { useState } from "react";
import { AlertTriangle, BrainCircuit, Layers, Plus } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  Label,
  Switch,
  Textarea,
} from "@hamhome/ui";
import { useTranslation } from "react-i18next";
import { useTabGroupRules } from "@/hooks/useTabGroupRules";
import { TabGroupRuleForm } from "@/components/tabGroups/TabGroupRuleForm";
import { TabGroupRuleList } from "@/components/tabGroups/TabGroupRuleList";
import type { TabGroupRuleGroup } from "@/hooks/useTabGroupRules";

export function TabGroupsPage() {
  const { t } = useTranslation("bookmark");
  const state = useTabGroupRules();
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const aiInstructionsId = "ai-tab-group-instructions";

  const openCreateDialog = () => {
    state.startCreateRule();
    setRuleDialogOpen(true);
  };

  const openEditDialog = (group: TabGroupRuleGroup) => {
    state.editRuleGroup(group);
    setRuleDialogOpen(true);
  };

  const updateRuleDialogOpen = (open: boolean) => {
    setRuleDialogOpen(open);
    if (!open) state.resetForm();
  };

  const saveRule = async () => {
    const saved = await state.saveRule();
    if (saved) setRuleDialogOpen(false);
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-primary/10 p-2 text-primary">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-normal">
              {t("tabGroups.title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("tabGroups.description")}
            </p>
          </div>
        </div>
        <Button type="button" className="w-full sm:w-auto" onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          {t("tabGroups.newRule")}
        </Button>
      </div>

      {!state.supported && (
        <Card className="border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
          <CardContent className="flex gap-3 p-4 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {t("tabGroups.unsupported")}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="grid-cols-[1fr_auto] items-center">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              <BrainCircuit className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base">
                {t("tabGroups.aiAutoGroup.title")}
              </CardTitle>
              <CardDescription className="mt-1">
                {t("tabGroups.aiAutoGroup.description")}
              </CardDescription>
            </div>
          </div>
          <Switch
            checked={state.aiAutoGroupEnabled}
            disabled={!state.supported}
            onCheckedChange={state.updateAiAutoGroupEnabled}
            aria-label={t("tabGroups.aiAutoGroup.title")}
          />
        </CardHeader>
        <CardContent className="space-y-2 pt-0">
          <Label htmlFor={aiInstructionsId}>
            {t("tabGroups.aiAutoGroup.instructionsLabel")}
          </Label>
          <Textarea
            id={aiInstructionsId}
            value={state.aiAutoGroupInstructions}
            disabled={!state.supported}
            maxLength={1000}
            rows={3}
            placeholder={t("tabGroups.aiAutoGroup.instructionsPlaceholder")}
            onChange={(event) => state.updateAiAutoGroupInstructions(event.target.value)}
            onBlur={state.saveAiAutoGroupInstructions}
          />
          <p className="text-xs text-muted-foreground">
            {t("tabGroups.aiAutoGroup.instructionsHint")}
          </p>
        </CardContent>
      </Card>

      <Dialog open={ruleDialogOpen} onOpenChange={updateRuleDialogOpen}>
        <TabGroupRuleForm
          form={state.form}
          editing={state.editingGroupKey != null}
          saving={state.saving}
          onChange={state.setForm}
          onSave={saveRule}
          onCancel={() => updateRuleDialogOpen(false)}
        />
      </Dialog>
      <TabGroupRuleList
        groups={state.groups}
        loading={state.loading}
        onEdit={openEditDialog}
        onDelete={state.deleteRuleGroup}
        onToggle={state.toggleRuleGroup}
      />
    </div>
  );
}
