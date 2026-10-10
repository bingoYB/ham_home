/**
 * TriageGroupSection - one destination of the AI tidy-up: a group checkbox and
 * every tab with its reason, or why local rules decided it.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Checkbox } from "@hamhome/ui";
import type { TriageGroup } from "@/lib/tabs/tab-triage.utils";
import type { OpenTabInfo, TabTriageSuggestion } from "@/types";

interface TriageGroupSectionProps {
  group: TriageGroup;
  tabs: Map<number, OpenTabInfo>;
  selected: ReadonlySet<number>;
  onToggle: (tabIds: number[], selected: boolean) => void;
}

export function TriageGroupSection({ group, tabs, selected, onToggle }: TriageGroupSectionProps) {
  const { t } = useTranslation("bookmark");
  const [expanded, setExpanded] = useState(group.destination !== "keep");
  const visible = group.suggestions.filter((item) => tabs.has(item.tabId));
  if (visible.length === 0) return null;

  const ids = visible.map((item) => item.tabId);
  const selectedCount = ids.filter((id) => selected.has(id)).length;
  const checked = selectedCount === ids.length ? true : selectedCount === 0 ? false : "indeterminate";
  const title = t(`tabCenter.aiTriage.groups.${group.destination}`, { count: ids.length });
  const hint =
    group.destination === "workspace"
      ? Array.from(new Set(visible.map((item) => `“${item.workspaceName}”`))).join(" ")
      : t(`tabCenter.aiTriage.hints.${group.destination}`);

  return (
    <div className="rounded-lg border" data-testid={`ai-triage-group-${group.destination}`}>
      <div className="flex items-center gap-2 px-3 py-2">
        <Checkbox checked={checked} onCheckedChange={(value) => onToggle(ids, value === true)} aria-label={title} />
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
        >
          {expanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
          <span className="shrink-0 text-sm font-medium">{title}</span>
          <span className="truncate text-xs text-muted-foreground">{hint}</span>
        </button>
      </div>
      {expanded && (
        <ul className="space-y-1.5 border-t px-3 py-2">
          {visible.map((item) => (
            <TriageRow
              key={item.tabId}
              item={item}
              tab={tabs.get(item.tabId)!}
              checked={selected.has(item.tabId)}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

interface TriageRowProps {
  item: TabTriageSuggestion;
  tab: OpenTabInfo;
  checked: boolean;
  onToggle: (tabIds: number[], selected: boolean) => void;
}

function TriageRow({ item, tab, checked, onToggle }: TriageRowProps) {
  const { t } = useTranslation("bookmark");
  const target =
    item.destination === "bookmark"
      ? item.categoryName ?? t("tabCenter.aiTriage.uncategorized")
      : item.destination === "workspace"
        ? item.workspaceName
        : undefined;
  const reason = item.local ? t(`tabCenter.aiTriage.local.${item.local}`) : item.reason;

  return (
    <li className="flex items-start gap-2 text-xs">
      <Checkbox
        className="mt-0.5"
        checked={checked}
        onCheckedChange={(value) => onToggle([item.tabId], value === true)}
        aria-label={tab.title}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate font-medium" title={tab.url}>{tab.title}</span>
          {target && <span className="shrink-0 text-primary">→ {target}</span>}
        </div>
        <p className="truncate text-muted-foreground">
          {[tab.domain, reason].filter(Boolean).join(" · ")}
        </p>
      </div>
    </li>
  );
}
