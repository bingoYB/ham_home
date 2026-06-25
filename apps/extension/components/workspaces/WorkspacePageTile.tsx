import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslation } from "react-i18next";
import { cn } from "@hamhome/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@hamhome/ui";
import { MoreHorizontal, Edit2, ExternalLink, Copy, Trash2, BookmarkPlus, GripVertical } from "lucide-react";
import type { WorkspaceTabPage } from "@/types";
import { WorkspacePageFavicon } from "./WorkspacePageFavicon";

export const PAGE_DRAG_TYPE = "workspace-page";

interface WorkspacePageTileProps {
  page: WorkspaceTabPage;
  sortableId?: string;
  workspaceId?: string;
  onEdit?: (page: WorkspaceTabPage) => void;
  onDelete?: (page: WorkspaceTabPage) => void;
  onSaveBookmark?: (page: WorkspaceTabPage) => void;
}

export function WorkspacePageTile({
  page,
  sortableId,
  workspaceId,
  onEdit,
  onDelete,
  onSaveBookmark,
}: WorkspacePageTileProps) {
  const { t } = useTranslation("bookmark");
  const isSortable = !!sortableId;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sortableId ?? page.id,
    disabled: !isSortable,
    data: {
      type: PAGE_DRAG_TYPE,
      page,
      workspaceId,
    },
    transition: {
      duration: 200,
      easing: "ease-in-out",
    }
  });

  const style = isSortable
    ? {
        transform: CSS.Translate.toString(transform),
        transition,
      }
    : undefined;

  const handleCopyUrl = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(page.url);
  };

  const handleOpen = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    window.open(page.url, "_blank", "noopener,noreferrer");
  };

  if (isDragging) {
    // Show a ghost placeholder where the item was
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="min-h-14 w-full rounded-[12px] border-2 border-dashed border-primary/30 bg-primary/5"
      />
    );
  }

  return (
    <div
      ref={isSortable ? setNodeRef : undefined}
      style={style}
      className={cn(
        "group relative flex min-h-14 w-full items-center gap-4 rounded-[12px] border bg-card p-3 text-left transition-all hover:border-primary/40 hover:shadow-md hover:bg-accent/5",
      )}
    >
      {isSortable && (
        <div
          className={cn(
            "relative z-10 shrink-0 touch-none",
            isDragging ? "cursor-grabbing" : "cursor-grab",
          )}
          {...listeners}
          {...attributes}
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <a
        href={page.url}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute inset-0 z-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={page.title}
        title={page.title + "\n" + page.url}
      />
      <div className="relative z-10 pointer-events-none shrink-0">
        <WorkspacePageFavicon favicon={page.favicon} url={page.url} className="h-7 w-7" />
      </div>
      <span className="relative z-10 min-w-0 flex-1 pointer-events-none">
        <span className="block truncate text-sm font-medium leading-snug" >
          {page.title}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {page.domain || page.url}
        </span>
      </span>
      <div className="relative z-10 shrink-0 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground outline-none ring-primary focus-visible:ring-2"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              aria-label={t("workspace.moreActions")}
              title={t("workspace.moreActions")}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onEdit?.(page);
              }}
            >
              <Edit2 className="mr-2 h-4 w-4" />
              {t("bookmark.edit")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleOpen}>
              <ExternalLink className="mr-2 h-4 w-4" />
              {t("workspace.openPage")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCopyUrl}>
              <Copy className="mr-2 h-4 w-4" />
              {t("workspace.copyUrl")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onSaveBookmark?.(page);
              }}
            >
              <BookmarkPlus className="mr-2 h-4 w-4" />
              {t("workspace.saveToBookmark")}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:bg-destructive focus:text-destructive-foreground"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete?.(page);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t("workspace.deletePage")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
