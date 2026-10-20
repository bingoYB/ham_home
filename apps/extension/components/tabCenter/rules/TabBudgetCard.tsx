/**
 * TabBudgetCard - tab budget switch, limit, counting scope, what happens when the
 * budget is exceeded (badge only / nudge / make room automatically) and the badge.
 */
import { useTranslation } from "react-i18next";
import { Gauge } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  confirm,
} from "@hamhome/ui";
import { BUDGET_LIMIT_MAX, BUDGET_LIMIT_MIN } from "@/lib/tabs/tab-budget.utils";
import type { TabBudgetOverAction, TabBudgetScope, TabBudgetSettings } from "@/types";
import { NumberSettingInput } from "./NumberSettingInput";
import { RuleRow } from "./RuleRow";

interface TabBudgetCardProps {
  budget: TabBudgetSettings;
  autoMakeRoomActive: boolean;
  nudgePaused: boolean;
  onChange: (patch: Partial<TabBudgetSettings>) => void;
  onOverActionChange: (action: TabBudgetOverAction) => void;
  onResumeNudge: () => void;
}

const ACTIONS: TabBudgetOverAction[] = ["badge-only", "nudge", "auto-archive"];

export function TabBudgetCard({
  budget,
  autoMakeRoomActive,
  nudgePaused,
  onChange,
  onOverActionChange,
  onResumeNudge,
}: TabBudgetCardProps) {
  const { t } = useTranslation(["bookmark", "common"]);
  const action = budget.overBudgetAction === "auto-archive" && !autoMakeRoomActive ? "nudge" : budget.overBudgetAction;

  const changeAction = async (next: TabBudgetOverAction) => {
    if (next === "auto-archive") {
      const accepted = await confirm({
        title: t("bookmark:tabCenter.rules.budget.makeRoomTitle"),
        description: t("bookmark:tabCenter.rules.budget.makeRoomDescription"),
        confirmText: t("bookmark:tabCenter.rules.budget.makeRoomConfirm"),
        cancelText: t("common:common.cancel"),
      });
      if (!accepted) return;
    }
    onOverActionChange(next);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">{t("bookmark:tabCenter.rules.budget.title")}</CardTitle>
        </div>
        <CardDescription>{t("bookmark:tabCenter.rules.budget.description")}</CardDescription>
      </CardHeader>
      <CardContent className="divide-y">
        <RuleRow label={t("bookmark:tabCenter.rules.budget.enable")} htmlFor="budget-enabled">
          <Switch id="budget-enabled" checked={budget.enabled} onCheckedChange={(value) => onChange({ enabled: value })} data-testid="budget-switch" />
        </RuleRow>
        <RuleRow label={t("bookmark:tabCenter.rules.budget.limit")} description={t("bookmark:tabCenter.rules.budget.limitHint")} htmlFor="budget-limit">
          <NumberSettingInput
            id="budget-limit"
            value={budget.limit}
            min={BUDGET_LIMIT_MIN}
            max={BUDGET_LIMIT_MAX}
            onCommit={(limit) => onChange({ limit })}
          />
        </RuleRow>
        <RuleRow label={t("bookmark:tabCenter.rules.budget.scope")}>
          <Select value={budget.scope} onValueChange={(value) => onChange({ scope: value as TabBudgetScope })}>
            <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all-windows">{t("bookmark:tabCenter.rules.budget.scopeOption.all-windows")}</SelectItem>
              <SelectItem value="per-window">{t("bookmark:tabCenter.rules.budget.scopeOption.per-window")}</SelectItem>
            </SelectContent>
          </Select>
        </RuleRow>
        <RuleRow label={t("bookmark:tabCenter.rules.budget.overAction")} description={t(`bookmark:tabCenter.rules.budget.overActionHint.${action}`)}>
          <Select value={action} onValueChange={(value) => void changeAction(value as TabBudgetOverAction)}>
            <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {ACTIONS.map((item) => (
                <SelectItem key={item} value={item}>{t(`bookmark:tabCenter.rules.budget.overActionOption.${item}`)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </RuleRow>
        {!budget.enabled && (
          <RuleRow label={t("bookmark:tabCenter.rules.budget.showBadge")} description={t("bookmark:tabCenter.rules.budget.showBadgeHint")} htmlFor="budget-badge">
            <Switch id="budget-badge" checked={budget.showBadge} onCheckedChange={(value) => onChange({ showBadge: value })} />
          </RuleRow>
        )}
        {nudgePaused && (
          <RuleRow label={t("bookmark:tabCenter.rules.budget.paused")}>
            <Button variant="outline" size="sm" onClick={onResumeNudge}>
              {t("bookmark:tabCenter.rules.budget.resume")}
            </Button>
          </RuleRow>
        )}
      </CardContent>
    </Card>
  );
}

export default TabBudgetCard;
