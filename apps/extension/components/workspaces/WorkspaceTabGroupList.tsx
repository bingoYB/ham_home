/**
 * WorkspaceTabGroupList - Extension 包装层
 * 注入 SortableContext 作为 sortableWrapper
 */
import type { ReactNode } from "react";
import {
  SortableContext,
  rectSortingStrategy,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { WorkspaceTabGroup, WorkspaceTabPage } from "@/types";
import {
  WorkspaceTabGroupList as SharedWorkspaceTabGroupList,
} from "@hamhome/ui-business/workspace";

interface InsertPlaceholderInfo {
  /** Target page ID. null = append at end of last section */
  pageId: string | null;
  position: "before" | "after";
}

interface WorkspaceTabGroupListProps {
  pages: WorkspaceTabPage[];
  tabGroups?: WorkspaceTabGroup[];
  className?: string;
  grid?: boolean;
  /** When provided, enables sortable pages within this workspace */
  workspaceId?: string;
  /** Show an insertion placeholder at the specified position */
  insertPlaceholder?: InsertPlaceholderInfo;
  renderPage: (page: WorkspaceTabPage, sortableId?: string) => ReactNode;
}

export function WorkspaceTabGroupList({
  pages,
  tabGroups,
  className,
  grid = false,
  workspaceId,
  insertPlaceholder,
  renderPage,
}: WorkspaceTabGroupListProps) {
  const sortableWrapper = (items: string[], children: ReactNode) => (
    <SortableContext
      items={items}
      strategy={grid ? rectSortingStrategy : verticalListSortingStrategy}
    >
      {children}
    </SortableContext>
  );

  return (
    <SharedWorkspaceTabGroupList
      pages={pages}
      tabGroups={tabGroups}
      className={className}
      grid={grid}
      workspaceId={workspaceId}
      insertPlaceholder={insertPlaceholder}
      renderPage={renderPage}
      sortableWrapper={sortableWrapper}
    />
  );
}
