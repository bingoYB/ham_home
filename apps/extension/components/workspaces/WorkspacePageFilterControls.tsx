import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hamhome/ui";
import type { WorkspacePageBookmarkStatus } from "@/types";
import { ALL_CATEGORIES } from "./workspace-ui";

interface WorkspacePageFilterControlsProps {
  domains: string[];
  aiCategories: string[];
  domainFilter: string;
  bookmarkStatusFilter: WorkspacePageBookmarkStatus | typeof ALL_CATEGORIES;
  aiCategoryFilter: string;
  onDomainFilterChange: (value: string) => void;
  onBookmarkStatusFilterChange: (
    value: WorkspacePageBookmarkStatus | typeof ALL_CATEGORIES,
  ) => void;
  onAiCategoryFilterChange: (value: string) => void;
}

export function WorkspacePageFilterControls({
  domains,
  aiCategories,
  domainFilter,
  bookmarkStatusFilter,
  aiCategoryFilter,
  onDomainFilterChange,
  onBookmarkStatusFilterChange,
  onAiCategoryFilterChange,
}: WorkspacePageFilterControlsProps) {
  const { t } = useTranslation("bookmark");

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <Select value={domainFilter} onValueChange={onDomainFilterChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_CATEGORIES}>
            {t("workspace.allDomains")}
          </SelectItem>
          {domains.map((domain) => (
            <SelectItem key={domain} value={domain}>
              {domain}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={bookmarkStatusFilter}
        onValueChange={(value) =>
          onBookmarkStatusFilterChange(
            value as WorkspacePageBookmarkStatus | typeof ALL_CATEGORIES,
          )
        }
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_CATEGORIES}>
            {t("workspace.allBookmarkStatus")}
          </SelectItem>
          <SelectItem value="not_bookmarked">
            {t("workspace.notBookmarked")}
          </SelectItem>
          <SelectItem value="converted">{t("workspace.converted")}</SelectItem>
          <SelectItem value="existing">
            {t("workspace.alreadyBookmarked")}
          </SelectItem>
          <SelectItem value="failed">
            {t("workspace.convertFailedStatus")}
          </SelectItem>
        </SelectContent>
      </Select>
      <Select value={aiCategoryFilter} onValueChange={onAiCategoryFilterChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_CATEGORIES}>
            {t("workspace.allAiCategories")}
          </SelectItem>
          {aiCategories.map((category) => (
            <SelectItem key={category} value={category}>
              {category}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
