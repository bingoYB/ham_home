/**
 * ArchiveToolbar - search (title and URL), reason, domain and time filters.
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
} from "@hamhome/ui";
import type { ArchiveFilterState } from "@/hooks/useTabArchive";
import { ARCHIVE_DATE_GROUPS, ARCHIVE_REASONS } from "@/lib/tabs/tab-archive.utils";

interface ArchiveToolbarProps {
  filter: ArchiveFilterState;
  domains: string[];
  onChange: (patch: Partial<ArchiveFilterState>) => void;
}

export function ArchiveToolbar({ filter, domains, onChange }: ArchiveToolbarProps) {
  const { t } = useTranslation("bookmark");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[200px] flex-1">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={filter.query}
          onChange={(event) => onChange({ query: event.target.value })}
          placeholder={t("tabCenter.archive.searchPlaceholder")}
          className="pl-9"
          data-testid="archive-search"
        />
      </div>
      <ToolbarSelect
        value={filter.reason}
        label={t("tabCenter.archive.filters.reason")}
        onChange={(value) => onChange({ reason: value as ArchiveFilterState["reason"] })}
        options={[
          { value: "all", label: t("tabCenter.archive.filters.allReasons") },
          ...ARCHIVE_REASONS.map((reason) => ({ value: reason, label: t(`tabCenter.reasons.${reason}`) })),
        ]}
      />
      <ToolbarSelect
        value={filter.domain}
        label={t("tabCenter.archive.filters.domain")}
        onChange={(value) => onChange({ domain: value })}
        options={[
          { value: "all", label: t("tabCenter.archive.filters.allDomains") },
          ...domains.slice(0, 200).map((domain) => ({ value: domain, label: domain })),
        ]}
      />
      <ToolbarSelect
        value={filter.dateGroup}
        label={t("tabCenter.archive.filters.time")}
        onChange={(value) => onChange({ dateGroup: value as ArchiveFilterState["dateGroup"] })}
        options={[
          { value: "all", label: t("tabCenter.archive.filters.allTime") },
          ...ARCHIVE_DATE_GROUPS.map((group) => ({ value: group, label: t(`tabCenter.archive.dateGroups.${group}`) })),
        ]}
      />
    </div>
  );
}

interface ToolbarSelectProps {
  value: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}

function ToolbarSelect({ value, label, options, onChange }: ToolbarSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-auto min-w-[130px] text-xs" aria-label={label}>
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

export default ArchiveToolbar;
