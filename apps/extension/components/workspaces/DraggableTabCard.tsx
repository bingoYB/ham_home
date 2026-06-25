import { useDraggable } from "@dnd-kit/core";
import { cn } from "@hamhome/ui";
import { browser } from "wxt/browser";
import type { WorkspaceTabPage } from "@/types";
import { WorkspacePageFavicon } from "./WorkspacePageFavicon";

interface DraggableTabCardProps {
  page: WorkspaceTabPage;
}

export const TAB_DRAG_TYPE = "tab-page";

export function DraggableTabCard({ page }: DraggableTabCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `tab-${page.tabId ?? page.id}`,
    data: {
      type: TAB_DRAG_TYPE,
      page,
    },
  });

  const handleClick = async () => {
    try {
      if (page.tabId) {
        await browser.tabs.update(page.tabId, { active: true });
      }
      if (page.windowId) {
        await browser.windows.update(page.windowId, { focused: true });
      }
    } catch (error) {
      console.error("[DraggableTabCard] Failed to activate tab:", error);
    }
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        "flex min-h-12 cursor-grab items-center gap-3 rounded-[12px] border bg-card p-3 transition-all hover:border-primary/40 hover:shadow-sm hover:bg-accent/5 active:cursor-grabbing",
        isDragging && "z-50 opacity-50 ring-2 ring-primary/30 shadow-lg",
      )}
      onClick={handleClick}
      title={page.title + "\n" + page.url}
    >
      <WorkspacePageFavicon favicon={page.favicon} url={page.url} className="h-6 w-6" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium leading-snug">
          {page.title}
        </span>
      </span>
    </div>
  );
}
