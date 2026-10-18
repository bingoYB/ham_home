/**
 * CategoryTreePanel - traditional left-hand category tree for the bookmarks page.
 * Lists "all" and "uncategorized" entries above the nested category tree, with a
 * bookmark count per node. Purely presentational: selection and expansion state
 * live in the parent (see useCategoryNavigation).
 */
import { useTranslation } from "react-i18next";
import {
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Folder,
  FolderClosed,
  FolderOpen,
  FolderX,
  Library,
  PanelLeftClose,
} from "lucide-react";
import { Button, ScrollArea, cn } from "@hamhome/ui";
import type { CategoryTreeNode } from "@/components/common/CategoryTree";
import type { CategoryBookmarkCounts } from "@/utils/category-tree.utils";

interface CategoryTreePanelProps {
  tree: CategoryTreeNode[];
  counts: CategoryBookmarkCounts;
  /** 'all' | 'uncategorized' | categoryId */
  selectedId: string;
  expandedIds: ReadonlySet<string>;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onClose: () => void;
}

interface TreeRowProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  level?: number;
  selected: boolean;
  /** undefined: leaf row (spacer instead of chevron) */
  expanded?: boolean;
  onSelect: () => void;
  onToggleExpand?: () => void;
}

function TreeRow({
  icon,
  label,
  count,
  level = 0,
  selected,
  expanded,
  onSelect,
  onToggleExpand,
}: TreeRowProps) {
  return (
    <div
      className={cn(
        "flex items-center rounded-md pr-1 text-sm transition-colors",
        selected
          ? "bg-primary/10 font-medium text-primary"
          : "text-foreground hover:bg-accent",
      )}
      style={{ paddingLeft: 4 + level * 14 }}
    >
      {onToggleExpand ? (
        <button
          type="button"
          tabIndex={-1}
          aria-hidden="true"
          className="flex h-6 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground"
          onClick={onToggleExpand}
        >
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-150",
              expanded && "rotate-90",
            )}
          />
        </button>
      ) : (
        <span className="h-6 w-5 shrink-0" />
      )}
      <button
        type="button"
        role="treeitem"
        aria-selected={selected}
        aria-expanded={expanded}
        title={label}
        className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-md"
        onClick={onSelect}
      >
        <span className="shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
        <span className="ml-auto shrink-0 pl-2 text-xs tabular-nums text-muted-foreground">
          {count}
        </span>
      </button>
    </div>
  );
}

interface TreeBranchProps {
  nodes: CategoryTreeNode[];
  level: number;
  counts: CategoryBookmarkCounts;
  selectedId: string;
  expandedIds: ReadonlySet<string>;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
}

function TreeBranch({
  nodes,
  level,
  counts,
  selectedId,
  expandedIds,
  onSelect,
  onToggleExpand,
}: TreeBranchProps) {
  return (
    <ul role={level === 0 ? undefined : "group"} className="space-y-0.5">
      {nodes.map((node) => {
        const hasChildren = node.children.length > 0;
        const expanded = hasChildren && expandedIds.has(node.id);
        return (
          <li key={node.id} role="none">
            <TreeRow
              icon={
                expanded ? (
                  <FolderOpen className="h-4 w-4 text-emerald-500" />
                ) : (
                  <FolderClosed className="h-4 w-4 text-emerald-500" />
                )
              }
              label={node.name}
              count={counts.byCategory.get(node.id) ?? 0}
              level={level}
              selected={selectedId === node.id}
              expanded={hasChildren ? expanded : undefined}
              onSelect={() => onSelect(node.id)}
              onToggleExpand={
                hasChildren ? () => onToggleExpand(node.id) : undefined
              }
            />
            {expanded && (
              <TreeBranch
                nodes={node.children}
                level={level + 1}
                counts={counts}
                selectedId={selectedId}
                expandedIds={expandedIds}
                onSelect={onSelect}
                onToggleExpand={onToggleExpand}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function CategoryTreePanel({
  tree,
  counts,
  selectedId,
  expandedIds,
  onSelect,
  onToggleExpand,
  onExpandAll,
  onCollapseAll,
  onClose,
}: CategoryTreePanelProps) {
  const { t } = useTranslation(["bookmark"]);

  return (
    <aside
      className="flex w-60 shrink-0 flex-col border-r border-border bg-background"
      aria-label={t("bookmark:bookmark.categoryTree.title")}
    >
      <div className="flex h-20 shrink-0 items-center justify-between gap-1 border-b border-border px-3 pt-2">
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Folder className="h-4 w-4 text-muted-foreground" />
          {t("bookmark:bookmark.categoryTree.title")}
        </span>
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onExpandAll}
            title={t("bookmark:bookmark.categoryTree.expandAll")}
            aria-label={t("bookmark:bookmark.categoryTree.expandAll")}
          >
            <ChevronsUpDown className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onCollapseAll}
            title={t("bookmark:bookmark.categoryTree.collapseAll")}
            aria-label={t("bookmark:bookmark.categoryTree.collapseAll")}
          >
            <ChevronsDownUp className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
            title={t("bookmark:bookmark.categoryTree.hide")}
            aria-label={t("bookmark:bookmark.categoryTree.hide")}
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea type="auto" className="min-h-0 flex-1">
        <nav role="tree" className="space-y-0.5 p-2 pb-24">
          <TreeRow
            icon={<Library className="h-4 w-4 text-muted-foreground" />}
            label={t("bookmark:bookmark.categoryTree.allBookmarks")}
            count={counts.all}
            selected={selectedId === "all"}
            onSelect={() => onSelect("all")}
          />
          <TreeRow
            icon={<FolderX className="h-4 w-4 text-muted-foreground" />}
            label={t("bookmark:bookmark.uncategorized")}
            count={counts.uncategorized}
            selected={selectedId === "uncategorized"}
            onSelect={() => onSelect("uncategorized")}
          />
          {tree.length > 0 ? (
            <div className="pt-1">
              <TreeBranch
                nodes={tree}
                level={0}
                counts={counts}
                selectedId={selectedId}
                expandedIds={expandedIds}
                onSelect={onSelect}
                onToggleExpand={onToggleExpand}
              />
            </div>
          ) : (
            <p className="px-3 py-4 text-xs text-muted-foreground">
              {t("bookmark:bookmark.categoryTree.empty")}
            </p>
          )}
        </nav>
      </ScrollArea>
    </aside>
  );
}
