import { Search } from "lucide-react";
import {
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hamhome/ui";
import { useWorkspaceLabels } from "./WorkspaceLabelsContext";
import type { WorkspaceCategoryData, WorkspaceSortBy } from "./types";
import { ALL_CATEGORIES, UNCATEGORIZED } from "./constants";

export interface WorkspaceSearchBarProps {
  searchQuery: string;
  categoryFilter: string;
  sortBy: WorkspaceSortBy;
  categories: WorkspaceCategoryData[];
  onSearchChange: (value: string) => void;
  onCategoryFilterChange: (value: string) => void;
  onSortByChange: (value: WorkspaceSortBy) => void;
  className?: string;
}

export function WorkspaceSearchBar({
  searchQuery,
  categoryFilter,
  sortBy,
  categories,
  onSearchChange,
  onCategoryFilterChange,
  onSortByChange,
  className,
}: WorkspaceSearchBarProps) {
  const labels = useWorkspaceLabels();

  return (
    <div className={`flex flex-wrap gap-2 ${className || ""}`}>
      <div className="relative min-w-[240px] flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={labels.searchPlaceholder}
          className="pl-9"
        />
      </div>
      <Select value={categoryFilter} onValueChange={onCategoryFilterChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL_CATEGORIES}>
            {labels.allCategories}
          </SelectItem>
          <SelectItem value={UNCATEGORIZED}>
            {labels.uncategorized}
          </SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              <div className="flex items-center gap-2">
                {category.icon && <span className="shrink-0">{category.icon}</span>}
                <span className="truncate">{category.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={sortBy}
        onValueChange={(value) => onSortByChange(value as WorkspaceSortBy)}
      >
        <SelectTrigger className="w-[170px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="manual">
            {labels.sortManual}
          </SelectItem>
          <SelectItem value="createdAt">
            {labels.sortCreatedAt}
          </SelectItem>
          <SelectItem value="restoredAt">
            {labels.sortRestoredAt}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
