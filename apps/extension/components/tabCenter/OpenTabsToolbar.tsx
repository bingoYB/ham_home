/**
 * OpenTabsToolbar - search, grouping, sorting and filter chips of the open tabs list.
 */
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  cn,
} from "@hamhome/ui";
import type {
  OpenTabsFilter,
  OpenTabsGroupBy,
  OpenTabsSort,
} from "@/lib/tabs/tab-view.utils";

const GROUP_OPTIONS: OpenTabsGroupBy[] = ["window", "group", "domain"];
const SORT_OPTIONS: OpenTabsSort[] = ["position", "recent", "idle"];
const FILTERS: OpenTabsFilter[] = ["idle", "expiring", "duplicates", "protected"];

interface OpenTabsToolbarProps {
  query: string;
  groupBy: OpenTabsGroupBy;
  sort: OpenTabsSort;
  filters: ReadonlySet<OpenTabsFilter>;
  supportsGroups: boolean;
  onQueryChange: (query: string) => void;
  onGroupByChange: (groupBy: OpenTabsGroupBy) => void;
  onSortChange: (sort: OpenTabsSort) => void;
  onToggleFilter: (filter: OpenTabsFilter) => void;
}

export function OpenTabsToolbar({
  query,
  groupBy,
  sort,
  filters,
  supportsGroups,
  onQueryChange,
  onGroupByChange,
  onSortChange,
  onToggleFilter,
}: OpenTabsToolbarProps) {
  const { t } = useTranslation("bookmark");

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t("tabCenter.searchPlaceholder")}
            className="pl-9"
          />
        </div>
        <Select value={groupBy} onValueChange={(value) => onGroupByChange(value as OpenTabsGroupBy)}>
          <SelectTrigger className="h-9 w-auto min-w-[140px] text-xs" aria-label={t("tabCenter.groupBy.label")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {GROUP_OPTIONS.filter((option) => option !== "group" || supportsGroups).map((option) => (
              <SelectItem key={option} value={option} className="text-xs">
                {t(`tabCenter.groupBy.${option}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(value) => onSortChange(value as OpenTabsSort)}>
          <SelectTrigger className="h-9 w-auto min-w-[140px] text-xs" aria-label={t("tabCenter.sort.label")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option} value={option} className="text-xs">
                {t(`tabCenter.sort.${option}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t("tabCenter.filters.label")}>
        {FILTERS.map((filter) => {
          const active = filters.has(filter);
          return (
            <button
              key={filter}
              type="button"
              aria-pressed={active}
              onClick={() => onToggleFilter(filter)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs transition-colors",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {t(`tabCenter.filters.${filter}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default OpenTabsToolbar;
