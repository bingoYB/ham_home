import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { BookmarkPlus, Sparkles } from "lucide-react";
import { Button, Input } from "@hamhome/ui";
import type {
  Workspace,
  WorkspacePageBookmarkStatus,
  WorkspaceTabPage,
} from "@/types";
import { ALL_CATEGORIES } from "./workspace-ui";
import { WorkspacePageFilterControls } from "./WorkspacePageFilterControls";

interface WorkspaceBookmarkControlsProps {
  workspace: Workspace;
  pages: WorkspaceTabPage[];
  selectedPageIds: Set<string>;
  domainFilter: string;
  bookmarkStatusFilter: WorkspacePageBookmarkStatus | typeof ALL_CATEGORIES;
  aiCategoryFilter: string;
  aiCommand: string;
  onDomainFilterChange: (value: string) => void;
  onBookmarkStatusFilterChange: (
    value: WorkspacePageBookmarkStatus | typeof ALL_CATEGORIES,
  ) => void;
  onAiCategoryFilterChange: (value: string) => void;
  onAiCommandChange: (value: string) => void;
  onAiRecommend: () => void;
  onConvertPages: (pageIds: string[]) => void;
}

export function WorkspaceBookmarkControls({
  workspace,
  pages,
  selectedPageIds,
  domainFilter,
  bookmarkStatusFilter,
  aiCategoryFilter,
  aiCommand,
  onDomainFilterChange,
  onBookmarkStatusFilterChange,
  onAiCategoryFilterChange,
  onAiCommandChange,
  onAiRecommend,
  onConvertPages,
}: WorkspaceBookmarkControlsProps) {
  const { t } = useTranslation("bookmark");
  const domains = useMemo(
    () =>
      Array.from(new Set(workspace.pages.map((page) => page.domain))).filter(
        Boolean,
      ),
    [workspace.pages],
  );
  const aiCategories = useMemo(
    () =>
      Array.from(
        new Set(workspace.pages.map((page) => page.aiCategory).filter(Boolean)),
      ) as string[],
    [workspace.pages],
  );
  const selectedFilteredIds = pages
    .map((page) => page.id)
    .filter((pageId) => selectedPageIds.has(pageId));

  return (
    <div className="space-y-3 px-4 pb-3">
      <WorkspacePageFilterControls
        domains={domains}
        aiCategories={aiCategories}
        domainFilter={domainFilter}
        bookmarkStatusFilter={bookmarkStatusFilter}
        aiCategoryFilter={aiCategoryFilter}
        onDomainFilterChange={onDomainFilterChange}
        onBookmarkStatusFilterChange={onBookmarkStatusFilterChange}
        onAiCategoryFilterChange={onAiCategoryFilterChange}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onConvertPages(workspace.pages.map((page) => page.id))}
        >
          <BookmarkPlus className="mr-2 h-4 w-4" />
          {t("workspace.convertAll")}
        </Button>
        <Button size="sm" onClick={() => onConvertPages(selectedFilteredIds)}>
          <BookmarkPlus className="mr-2 h-4 w-4" />
          {t("workspace.convertSelected")}
        </Button>
      </div>
      <div className="flex gap-2">
        <Input
          value={aiCommand}
          onChange={(event) => onAiCommandChange(event.target.value)}
          placeholder={t("workspace.aiCommandPlaceholder")}
        />
        <Button variant="secondary" onClick={onAiRecommend}>
          <Sparkles className="mr-2 h-4 w-4" />
          {t("workspace.aiRecommend")}
        </Button>
      </div>
    </div>
  );
}
