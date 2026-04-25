import { Edit, Trash2 } from "lucide-react";
import {
  Button,
  Switch,
} from "@hamhome/ui";
import { useTranslation } from "react-i18next";
import type { TabGroupRuleGroup } from "@/hooks/useTabGroupRules";

interface TabGroupRuleListProps {
  groups: TabGroupRuleGroup[];
  loading: boolean;
  onEdit: (group: TabGroupRuleGroup) => void;
  onDelete: (group: TabGroupRuleGroup) => void;
  onToggle: (group: TabGroupRuleGroup) => void;
}

const COLOR_DOT_COLORS: Record<TabGroupRuleGroup["color"], string> = {
  grey: "#9ca3af",
  blue: "#3b82f6",
  red: "#ef4444",
  yellow: "#eab308",
  green: "#22c55e",
  pink: "#ec4899",
  purple: "#a855f7",
  cyan: "#06b6d4",
  orange: "#f97316",
};

export function TabGroupRuleList({
  groups,
  loading,
  onEdit,
  onDelete,
  onToggle,
}: TabGroupRuleListProps) {
  const { t } = useTranslation("bookmark");

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="rounded-md border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
          {t("tabGroups.list.loading")}
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-md border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
          {t("tabGroups.list.empty")}
        </div>
      ) : (
        groups.map((group) => (
          <div
            key={group.key}
            className="relative rounded-md border bg-card px-4 pb-4 pt-7 text-card-foreground shadow-xs"
          >
            <div className="absolute left-5 flex max-w-[calc(100%-2.5rem)] items-center gap-2 px-2 bg-card" style={{height: 1, top: -1}}>
              <span
                className="h-3.5 w-3.5 rounded-full border"
                style={{ backgroundColor: COLOR_DOT_COLORS[group.color] }}
                aria-hidden="true"
              />
              <h3 className="truncate text-lg">
                {group.name} ({group.groupTitle})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-160 divide-y border-b">
                {group.rules.map((rule, index) => (
                  <div
                    key={rule.id}
                    className="grid grid-cols-[48px_1fr_1fr_2fr] items-center gap-4 py-3 text-sm"
                  >
                    <div className="text-foreground">{index + 1}</div>
                    <div className="font-medium">
                      {t(
                        `tabGroups.matchTypes.${rule.matchType === "regex" ? "urlContains" : rule.matchType}`,
                      )}
                    </div>
                    <div className="font-medium">
                      {t(
                        `tabGroups.matchConditions.${
                          rule.matchCondition ?? (rule.matchType === "regex" ? "regex" : "contains")
                        }`,
                      )}
                    </div>
                    <div className="break-all text-foreground">
                      {rule.pattern}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" onClick={() => onEdit(group)}>
                  <Edit className="h-4 w-4" />
                  {t("tabGroups.actions.edit")}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => onDelete(group)}
                >
                  <Trash2 className="h-4 w-4" />
                  {t("tabGroups.actions.delete")}
                </Button>
              </div>
              <label className="flex items-center justify-end gap-2 text-sm font-medium">
                <Switch checked={group.enabled} onCheckedChange={() => onToggle(group)} />
                {t("tabGroups.actions.enable")}
              </label>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
