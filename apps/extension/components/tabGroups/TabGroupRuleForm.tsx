import { Minus, Plus } from "lucide-react";
import {
  Button,
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
  Switch,
} from "@hamhome/ui";
import { useTranslation } from "react-i18next";
import type {
  TabGroupRuleColor,
  TabGroupRuleMatchCondition,
  TabGroupRuleMatchType,
} from "@/types";
import type { TabGroupRuleFormState } from "@/hooks/useTabGroupRules";

interface TabGroupRuleFormProps {
  form: TabGroupRuleFormState;
  editing: boolean;
  saving: boolean;
  onChange: (form: TabGroupRuleFormState) => void;
  onSave: () => void | Promise<void>;
  onCancel: () => void;
}

const COLORS: TabGroupRuleColor[] = ["grey", "blue", "red", "yellow", "green", "pink", "purple", "cyan", "orange"];

const MATCH_TYPES: TabGroupRuleMatchType[] = [
  "domain",
  "urlContains",
  "title",
  "titleIgnoreCase",
];

const MATCH_CONDITIONS: TabGroupRuleMatchCondition[] = [
  "contains",
  "equals",
  "startsWith",
  "endsWith",
  "regex",
];

function createClientId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

export function TabGroupRuleForm({
  form,
  editing,
  saving,
  onChange,
  onSave,
  onCancel,
}: TabGroupRuleFormProps) {
  const { t } = useTranslation("bookmark");
  const updateForm = <K extends keyof TabGroupRuleFormState>(
    key: K,
    value: TabGroupRuleFormState[K],
  ) => onChange({ ...form, [key]: value });

  const updateMatcher = (
    clientId: string,
    updates: Partial<TabGroupRuleFormState["matchers"][number]>,
  ) => {
    onChange({
      ...form,
      matchers: form.matchers.map((matcher) =>
        matcher.clientId === clientId ? { ...matcher, ...updates } : matcher,
      ),
    });
  };

  const addMatcher = (afterClientId?: string) => {
    const matcher = {
      clientId: createClientId(),
      matchType: "domain" as TabGroupRuleMatchType,
      matchCondition: "contains" as TabGroupRuleMatchCondition,
      pattern: "",
    };
    const index = form.matchers.findIndex((item) => item.clientId === afterClientId);
    const nextMatchers = [...form.matchers];
    nextMatchers.splice(index >= 0 ? index + 1 : nextMatchers.length, 0, matcher);
    updateForm("matchers", nextMatchers);
  };

  const removeMatcher = (clientId: string) => {
    if (form.matchers.length === 1) return;
    updateForm(
      "matchers",
      form.matchers.filter((matcher) => matcher.clientId !== clientId),
    );
  };

  return (
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
      <DialogHeader>
        <DialogTitle>
          {editing ? t("tabGroups.form.editTitle") : t("tabGroups.form.createTitle")}
        </DialogTitle>
        <DialogDescription>
          {t("tabGroups.form.description")}
        </DialogDescription>
      </DialogHeader>

      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          void onSave();
        }}
      >
        <div className="grid gap-4 md:grid-cols-[1fr_1fr_14rem]">
          <div className="space-y-2">
            <Label htmlFor="tab-rule-name">{t("tabGroups.form.ruleName")}</Label>
            <Input
              id="tab-rule-name"
              value={form.name}
              onChange={(event) => updateForm("name", event.target.value)}
              placeholder={t("tabGroups.form.ruleNamePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tab-rule-group">{t("tabGroups.form.groupName")}</Label>
            <Input
              id="tab-rule-group"
              value={form.groupTitle}
              onChange={(event) => updateForm("groupTitle", event.target.value)}
              placeholder={t("tabGroups.form.groupNamePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("tabGroups.form.groupColor")}</Label>
            <Select
              value={form.color}
              onValueChange={(value) => updateForm("color", value as TabGroupRuleColor)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLORS.map((color) => (
                  <SelectItem key={color} value={color}>
                    {t(`tabGroups.colors.${color}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-3">
          <Label>{t("tabGroups.form.matchRules")}</Label>
          <div className="space-y-3">
            {form.matchers.map((matcher) => (
              <div
                key={matcher.clientId}
                className="grid gap-3 md:grid-cols-[1fr_1fr_1.4fr_auto]"
              >
                <Select
                  value={matcher.matchType}
                  onValueChange={(value) =>
                    updateMatcher(matcher.clientId, {
                      matchType: value as TabGroupRuleMatchType,
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MATCH_TYPES.map((item) => (
                      <SelectItem key={item} value={item}>
                        {t(`tabGroups.matchTypes.${item}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={matcher.matchCondition}
                  onValueChange={(value) =>
                    updateMatcher(matcher.clientId, {
                      matchCondition: value as TabGroupRuleMatchCondition,
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MATCH_CONDITIONS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {t(`tabGroups.matchConditions.${item}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={matcher.pattern}
                  onChange={(event) =>
                    updateMatcher(matcher.clientId, { pattern: event.target.value })
                  }
                  placeholder={t("tabGroups.form.patternPlaceholder")}
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="icon-sm"
                    aria-label={t("tabGroups.form.addMatcher")}
                    onClick={() => addMatcher(matcher.clientId)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon-sm"
                    aria-label={t("tabGroups.form.removeMatcher")}
                    disabled={form.matchers.length === 1}
                    onClick={() => removeMatcher(matcher.clientId)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {t("tabGroups.form.matchRulesHint")}
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="tab-rule-collapsed">{t("tabGroups.form.collapsed")}</Label>
            <Switch
              id="tab-rule-collapsed"
              checked={form.collapsed}
              onCheckedChange={(checked) => updateForm("collapsed", checked)}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="tab-rule-enabled">{t("tabGroups.form.enabled")}</Label>
            <Switch
              id="tab-rule-enabled"
              checked={form.enabled}
              onCheckedChange={(checked) => updateForm("enabled", checked)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("tabGroups.actions.cancel")}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving
              ? t("tabGroups.actions.saving")
              : editing
                ? t("tabGroups.actions.saveRule")
                : t("tabGroups.actions.createRule")}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
