import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hamhome/ui";
import type { LocalCategory } from "@/types";
import { ALL_CATEGORIES, UNCATEGORIZED } from "./workspace-ui";

interface WorkspaceSearchBarProps {
  searchQuery: string;
  categoryFilter: string;
  sortBy: "createdAt" | "restoredAt";
  categories: LocalCategory[];
  onSearchChange: (value: string) => void;
  onCategoryFilterChange: (value: string) => void;
  onSortByChange: (value: "createdAt" | "restoredAt") => void;
}

export function WorkspaceSearchBar({
  searchQuery,
  categoryFilter,
  sortBy,
  categories,
  onSearchChange,
  onCategoryFilterChange,
  onSortByChange,
}: WorkspaceSearchBarProps) {
  const { t } = useTranslation("bookmark");

  return (
    <div className="flex flex-wrap gap-2">
      <div className="relative min-w-[240px] flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={t("workspace.searchPlaceholder")}
          className="pl-9"
        />
      </div>
      <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_CATEGORIES}>
            {t("workspace.allCategories")}
          </SelectItem>
          <SelectItem value={UNCATEGORIZED}>
            {t("bookmark.uncategorized")}
          </SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={sortBy}
        onValueChange={(value) => onSortByChange(value as "createdAt" | "restoredAt")}
      >
        <SelectTrigger className="w-[170px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="createdAt">
            {t("workspace.sortCreatedAt")}
          </SelectItem>
          <SelectItem value="restoredAt">
            {t("workspace.sortRestoredAt")}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
