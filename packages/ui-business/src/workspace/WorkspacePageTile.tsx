/**
 * WorkspacePageTile - Headless 页面卡片组件
 * 无 DnD 依赖，通过 dragHandle/actions 插槽注入交互
 */
import type { ReactNode } from "react";
import { cn } from "@hamhome/ui";
import { FaviconIcon } from "./FaviconIcon";
import type { WorkspaceTabPageData } from "./types";

export interface WorkspacePageTileProps {
  page: WorkspaceTabPageData;
  /** 拖拽手柄插槽 - 由消费端注入 sortable listeners */
  dragHandle?: ReactNode;
  /** 操作菜单插槽 - 由消费端注入 DropdownMenu */
  actions?: ReactNode;
  /** 点击回调 */
  onClick?: () => void;
  className?: string;
  /** 是否为拖拽占位态 */
  isDragPlaceholder?: boolean;
}

export function WorkspacePageTile({
  page,
  dragHandle,
  actions,
  onClick,
  className,
  isDragPlaceholder = false,
}: WorkspacePageTileProps) {
  if (isDragPlaceholder) {
    return (
      <div
        className="min-h-14 w-full rounded-[12px] border-2 border-dashed border-primary/30 bg-primary/5"
      />
    );
  }

  return (
    <div
      className={cn(
        "group relative flex min-h-14 w-full items-center gap-4 rounded-[12px] border bg-card p-3 text-left transition-all hover:border-primary/40 hover:shadow-md hover:bg-accent/5",
        className,
      )}
    >
      {dragHandle}
      <a
        href={page.url}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute inset-0 z-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={page.title}
        title={page.title + "\n" + page.url}
        onClick={onClick ? (e) => { e.preventDefault(); onClick(); } : undefined}
      />
      <div className="relative z-10 pointer-events-none shrink-0">
        <FaviconIcon favicon={page.favicon} className="h-7 w-7" />
      </div>
      <span className="relative z-10 min-w-0 flex-1 pointer-events-none">
        <span className="block truncate text-sm font-medium leading-snug">
          {page.title}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {page.domain || page.url}
        </span>
      </span>
      {actions && (
        <div className="relative z-10 shrink-0 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          {actions}
        </div>
      )}
    </div>
  );
}
