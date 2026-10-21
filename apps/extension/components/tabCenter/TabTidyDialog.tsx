/**
 * TabTidyDialog - rule-based tidy-up suggestions grouped by destination; every
 * group and every tab can be unchecked before applying.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@hamhome/ui";
import type { UseTabTidyResult } from "@/hooks/useTabTidy";
import { countTidySuggestions } from "@/lib/tabs/tab-tidy.utils";
import type { OpenTabInfo } from "@/types";

interface TabTidyDialogProps {
  open: boolean;
  tabCount: number;
  tabs: Map<number, OpenTabInfo>;
  tidy: UseTabTidyResult;
  onOpenChange: (open: boolean) => void;
}

export function TabTidyDialog({ open, tabCount, tabs, tidy, onOpenChange }: TabTidyDialogProps) {
  const { t } = useTranslation("bookmark");
  const { suggestions } = tidy;
  const groups = [
    { key: "duplicates", ids: suggestions.duplicates },
    { key: "lowValue", ids: suggestions.lowValue },
    { key: "readLater", ids: suggestions.readLater },
    { key: "archive", ids: suggestions.archive },
    ...suggestions.workspaces.map((group) => ({ key: "workspace", ids: group.tabIds, name: group.name })),
  ].filter((group) => group.ids.length > 0);
  const total = countTidySuggestions(suggestions);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl" data-testid="tab-tidy-dialog">
        <DialogHeader>
          <DialogTitle>{t("tabCenter.tidyUp.title")}</DialogTitle>
          <DialogDescription>{t("tabCenter.tidyUp.description", { count: tabCount })}</DialogDescription>
        </DialogHeader>
        {total === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("tabCenter.tidyUp.nothing")}</p>
        ) : (
          <div className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">
            {groups.map((group, index) => (
              <TidyGroup
                key={`${group.key}:${index}`}
                title={
                  "name" in group
                    ? t("tabCenter.tidyUp.groups.workspace", { name: group.name, count: group.ids.length })
                    : t(`tabCenter.tidyUp.groups.${group.key}`, { count: group.ids.length })
                }
                hint={t(`tabCenter.tidyUp.hints.${group.key}`)}
                ids={group.ids}
                tabs={tabs}
                selected={tidy.selected}
                onToggle={tidy.toggle}
              />
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("tabCenter.tidyUp.cancel")}
          </Button>
          <Button
            disabled={tidy.applying || tidy.selected.size === 0}
            onClick={async () => {
              if (await tidy.apply()) onOpenChange(false);
            }}
          >
            {tidy.applying && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {t("tabCenter.tidyUp.apply", { count: tidy.selected.size })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface TidyGroupProps {
  title: string;
  hint: string;
  ids: number[];
  tabs: Map<number, OpenTabInfo>;
  selected: ReadonlySet<number>;
  onToggle: (tabIds: number[], selected: boolean) => void;
}

function TidyGroup({ title, hint, ids, tabs, selected, onToggle }: TidyGroupProps) {
  const [expanded, setExpanded] = useState(false);
  const selectedCount = ids.filter((id) => selected.has(id)).length;
  const checked = selectedCount === ids.length ? true : selectedCount === 0 ? false : "indeterminate";

  return (
    <div className="rounded-lg border">
      <div className="flex items-center gap-2 px-3 py-2">
        <Checkbox checked={checked} onCheckedChange={(value) => onToggle(ids, value === true)} aria-label={title} />
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
        >
          {expanded ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
          <span className="text-sm font-medium">{title}</span>
          <span className="truncate text-xs text-muted-foreground">{hint}</span>
        </button>
      </div>
      {expanded && (
        <ul className="space-y-1 border-t px-3 py-2">
          {ids.map((id) => {
            const tab = tabs.get(id);
            if (!tab) return null;
            return (
              <li key={id} className="flex items-center gap-2 text-xs">
                <Checkbox checked={selected.has(id)} onCheckedChange={(value) => onToggle([id], value === true)} aria-label={tab.title} />
                <span className="min-w-0 flex-1 truncate" title={tab.url}>{tab.title}</span>
                <span className="shrink-0 text-muted-foreground">{tab.domain}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default TabTidyDialog;
