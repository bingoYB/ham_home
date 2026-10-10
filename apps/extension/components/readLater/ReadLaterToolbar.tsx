/**
 * ReadLaterToolbar - unread / read / expired views, sorting and filters
 * (domain, source, kept in library or not).
 */
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@hamhome/ui";
import type { ReadLaterFilters } from "@/hooks/useReadLaterQueue";
import type { ReadLaterSort, ReadLaterSource, ReadLaterView } from "@/types";

const VIEWS: ReadLaterView[] = ["unread", "read", "expired"];
const SORTS: ReadLaterSort[] = ["newest", "oldest", "shortest", "expiring"];
const SOURCES: ReadLaterSource[] = ["manual", "link", "tab-center", "archive", "triage", "agent", "import"];

interface ReadLaterToolbarProps {
  view: ReadLaterView;
  counts: Record<ReadLaterView, number>;
  sort: ReadLaterSort;
  filters: ReadLaterFilters;
  domains: string[];
  onViewChange: (view: ReadLaterView) => void;
  onSortChange: (sort: ReadLaterSort) => void;
  onFiltersChange: (patch: Partial<ReadLaterFilters>) => void;
}

export function ReadLaterToolbar({
  view,
  counts,
  sort,
  filters,
  domains,
  onViewChange,
  onSortChange,
  onFiltersChange,
}: ReadLaterToolbarProps) {
  const { t } = useTranslation("bookmark");

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Tabs value={view} onValueChange={(value) => onViewChange(value as ReadLaterView)}>
        <TabsList>
          {VIEWS.map((item) => (
            <TabsTrigger key={item} value={item} data-testid={`read-later-view-${item}`}>
              {t(`readLater.views.${item}`)}
              <span className="ml-1.5 text-xs text-muted-foreground">{counts[item]}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          value={sort}
          onChange={(value) => onSortChange(value as ReadLaterSort)}
          label={t("readLater.sort.label")}
          options={SORTS.map((item) => ({ value: item, label: t(`readLater.sort.${item}`) }))}
        />
        <FilterSelect
          value={filters.domain}
          onChange={(value) => onFiltersChange({ domain: value })}
          label={t("readLater.filters.domain")}
          options={[
            { value: "all", label: t("readLater.filters.allDomains") },
            ...domains.map((domain) => ({ value: domain, label: domain })),
          ]}
        />
        <FilterSelect
          value={filters.source}
          onChange={(value) => onFiltersChange({ source: value as ReadLaterSource | "all" })}
          label={t("readLater.filters.source")}
          options={[
            { value: "all", label: t("readLater.filters.allSources") },
            ...SOURCES.map((source) => ({ value: source, label: t(`readLater.sources.${source}`) })),
          ]}
        />
        <FilterSelect
          value={filters.kept}
          onChange={(value) => onFiltersChange({ kept: value as ReadLaterFilters["kept"] })}
          label={t("readLater.filters.kept")}
          options={[
            { value: "all", label: t("readLater.filters.keptAll") },
            { value: "kept", label: t("readLater.filters.keptOnly") },
            { value: "queueOnly", label: t("readLater.filters.queueOnly") },
          ]}
        />
      </div>
    </div>
  );
}

interface FilterSelectProps {
  value: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}

function FilterSelect({ value, label, options, onChange }: FilterSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-auto min-w-[120px] gap-1 text-xs" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} className="text-xs">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default ReadLaterToolbar;
