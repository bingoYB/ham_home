/**
 * CategoryStructureBar - the "folder view" strip above the bookmark list:
 * a clickable breadcrumb of the selected category plus its direct
 * sub-categories as jump chips. Renders nothing when no category is selected.
 */
import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, FolderClosed } from "lucide-react";
import { cn } from "@hamhome/ui";
import type { CategoryTreeNode } from "@/components/common/CategoryTree";
import type { CategoryBookmarkCounts } from "@/utils/category-tree.utils";
import type { CategoryTrailItem } from "@/hooks/useCategoryNavigation";

interface CategoryStructureBarProps {
  trail: CategoryTrailItem[];
  subCategories: CategoryTreeNode[];
  counts: CategoryBookmarkCounts;
  onSelect: (id: string) => void;
}

export function CategoryStructureBar({
  trail,
  subCategories,
  counts,
  onSelect,
}: CategoryStructureBarProps) {
  const { t } = useTranslation(["bookmark"]);

  if (trail.length === 0) return null;

  return (
    <div className="shrink-0 space-y-2 border-b border-border bg-muted/20 px-6 py-3">
      <nav
        aria-label={t("bookmark:bookmark.categoryTree.breadcrumb")}
        className="flex flex-wrap items-center gap-1 text-sm"
      >
        <button
          type="button"
          className="rounded px-1.5 py-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          onClick={() => onSelect("all")}
        >
          {t("bookmark:bookmark.categoryTree.allBookmarks")}
        </button>
        {trail.map((item, index) => {
          const isCurrent = index === trail.length - 1;
          return (
            <Fragment key={item.id}>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
              <button
                type="button"
                aria-current={isCurrent ? "page" : undefined}
                className={cn(
                  "rounded px-1.5 py-0.5 transition-colors",
                  isCurrent
                    ? "font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
                onClick={() => onSelect(item.id)}
              >
                {item.name}
              </button>
            </Fragment>
          );
        })}
      </nav>

      {subCategories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {t("bookmark:bookmark.categoryTree.subCategories")}
          </span>
          {subCategories.map((node) => (
            <button
              key={node.id}
              type="button"
              className="group flex max-w-48 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1 text-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
              onClick={() => onSelect(node.id)}
              title={node.name}
            >
              <FolderClosed className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              <span className="truncate">{node.name}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {counts.byCategory.get(node.id) ?? 0}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
