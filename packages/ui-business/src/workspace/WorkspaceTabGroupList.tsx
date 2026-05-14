/**
 * WorkspaceTabGroupList - Headless 标签分组列表
 * 无 DnD 依赖，通过 renderPage + sortableWrapper 注入排序逻辑
 */
import { Fragment, useMemo, type ReactNode } from "react";
import { cn } from "@hamhome/ui";
import { Plus } from "lucide-react";
import type {
  WorkspaceTabGroupData,
  WorkspaceTabGroupColor,
  WorkspaceTabPageData,
} from "./types";
import {
  getWorkspacePageGroupKey,
  getWorkspaceTabGroupKey,
} from "./workspace-utils";

interface InsertPlaceholderInfo {
  /** Target page ID. null = append at end of last section */
  pageId: string | null;
  position: "before" | "after";
}

export interface WorkspaceTabGroupListProps {
  pages: WorkspaceTabPageData[];
  tabGroups?: WorkspaceTabGroupData[];
  className?: string;
  grid?: boolean;
  /** When provided, enables sortable pages within this workspace */
  workspaceId?: string;
  /** Show an insertion placeholder at the specified position */
  insertPlaceholder?: InsertPlaceholderInfo;
  renderPage: (page: WorkspaceTabPageData, sortableId?: string) => ReactNode;
  /**
   * Sortable 容器包装器 — 由消费端注入 SortableContext
   * 默认不排序，直接渲染 children
   */
  sortableWrapper?: (items: string[], children: ReactNode) => ReactNode;
}

interface DisplaySection {
  key: string;
  group?: WorkspaceTabGroupData;
  pages: WorkspaceTabPageData[];
}

const groupColorClasses: Record<WorkspaceTabGroupColor, string> = {
  grey: "bg-slate-400",
  blue: "bg-blue-500",
  red: "bg-red-500",
  yellow: "bg-yellow-400",
  green: "bg-emerald-500",
  pink: "bg-pink-500",
  purple: "bg-violet-500",
  cyan: "bg-cyan-500",
  orange: "bg-orange-500",
};

function buildDisplaySections(
  pages: WorkspaceTabPageData[],
  tabGroups?: WorkspaceTabGroupData[],
): DisplaySection[] {
  const groupsByKey = new Map(
    (tabGroups ?? []).map((group) => [getWorkspaceTabGroupKey(group), group]),
  );
  const ungroupedPages: WorkspaceTabPageData[] = [];
  const groupedPagesMap = new Map<string, WorkspaceTabPageData[]>();

  for (const page of pages) {
    const key = getWorkspacePageGroupKey(page);
    const group = key ? groupsByKey.get(key) : null;
    if (!key || !group) {
      ungroupedPages.push(page);
      continue;
    }
    const arr = groupedPagesMap.get(key);
    if (arr) arr.push(page);
    else groupedPagesMap.set(key, [page]);
  }

  const sections: DisplaySection[] = [];

  if (ungroupedPages.length > 0) {
    sections.push({ key: "__ungrouped__", pages: ungroupedPages });
  }

  const groupEntries = Array.from(groupedPagesMap.entries())
    .map(([key, gPages]) => ({
      key,
      group: groupsByKey.get(key)!,
      pages: gPages,
      order: Math.min(...gPages.map((p) => p.index)),
    }))
    .sort((a, b) => a.order - b.order);

  for (const entry of groupEntries) {
    sections.push({ key: entry.key, group: entry.group, pages: entry.pages });
  }

  return sections;
}

/** Generate a sortable ID for a page within a workspace */
function pageSortableId(workspaceId: string, pageId: string): string {
  return `page-${workspaceId}-${pageId}`;
}

/** Placeholder card shown at the insertion point */
function InsertionPlaceholder({ grid }: { grid: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-[12px] border-2 border-dashed border-primary/40 bg-primary/5 transition-all animate-in fade-in-0 zoom-in-95 duration-200",
        grid ? "min-h-14" : "min-h-12",
      )}
    >
      <Plus className="h-5 w-5 text-primary/50" />
    </div>
  );
}

export function WorkspaceTabGroupList({
  pages,
  tabGroups,
  className,
  grid = false,
  workspaceId,
  insertPlaceholder,
  renderPage,
  sortableWrapper,
}: WorkspaceTabGroupListProps) {
  const sections = useMemo(
    () => buildDisplaySections(pages, tabGroups),
    [pages, tabGroups],
  );

  const gridClasses = grid
    ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
    : "space-y-2";

  return (
    <div className={cn(className)}>
      {sections.map((section, sectionIdx) => {
        const sectionPageIds = workspaceId
          ? section.pages.map((p) => pageSortableId(workspaceId, p.id))
          : [];

        const pageElements = section.pages.map((page) => {
          const sid = workspaceId
            ? pageSortableId(workspaceId, page.id)
            : undefined;
          const matchesPage = insertPlaceholder?.pageId === page.id;
          const showBefore =
            matchesPage && insertPlaceholder?.position === "before";
          const showAfter =
            matchesPage && insertPlaceholder?.position === "after";
          return (
            <Fragment key={page.id}>
              {showBefore && <InsertionPlaceholder grid={grid} />}
              <div>{renderPage(page, sid)}</div>
              {showAfter && <InsertionPlaceholder grid={grid} />}
            </Fragment>
          );
        });

        const isLastSection = sectionIdx === sections.length - 1;
        const showEnd = insertPlaceholder?.pageId === null && isLastSection;

        const gridContent = (
          <div className={gridClasses}>
            {pageElements}
            {showEnd && <InsertionPlaceholder grid={grid} />}
          </div>
        );

        const wrappedContent =
          sortableWrapper && workspaceId && sectionPageIds.length > 0
            ? sortableWrapper(sectionPageIds, gridContent)
            : gridContent;

        return (
          <div key={section.key} className={sectionIdx > 0 ? "mt-3" : undefined}>
            {section.group && (
              <div className="flex min-h-9 min-w-0 items-center gap-2 border-b px-1 py-1 mb-2">
                <span
                  className={cn(
                    "h-3 w-3 shrink-0 rounded-full",
                    groupColorClasses[section.group.color],
                  )}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                  {section.group.title}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {section.pages.length}
                </span>
              </div>
            )}
            {wrappedContent}
          </div>
        );
      })}
      {sections.length === 0 && insertPlaceholder && (
        <div className={gridClasses}>
          <InsertionPlaceholder grid={grid} />
        </div>
      )}
    </div>
  );
}
