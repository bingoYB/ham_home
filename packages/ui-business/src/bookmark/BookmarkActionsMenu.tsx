import {
  Camera,
  Copy,
  Download,
  Edit,
  ExternalLink,
  MoreHorizontal,
  Pin,
  Share2,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@hamhome/ui";
import type { BookmarkActionProps, BookmarkItemData } from "./types";

export interface BookmarkActionsMenuProps extends BookmarkActionProps {
  bookmark: BookmarkItemData;
  triggerClassName?: string;
}

export function BookmarkActionsMenu({
  bookmark,
  triggerClassName = "h-8 w-8",
  onOpen,
  onEdit,
  onDelete,
  onViewSnapshot,
  onSaveSnapshot,
  onDeleteSnapshot,
  onSyncToObsidian,
  onTogglePin,
  isPinned = false,
  onReanalyzeAI,
  isProcessingAI,
  t,
}: BookmarkActionsMenuProps) {
  const hasSnapshotActions =
    onViewSnapshot || onSaveSnapshot || onDeleteSnapshot || onSyncToObsidian;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(bookmark.url);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: bookmark.title, url: bookmark.url });
      return;
    }
    handleCopyLink();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={`${triggerClassName} text-muted-foreground hover:text-foreground`}
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={onOpen}>
          <ExternalLink className="h-4 w-4 mr-2" />
          {t("bookmark:bookmark.open")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}>
          <Edit className="h-4 w-4 mr-2" />
          {t("bookmark:bookmark.edit")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyLink}>
          <Copy className="h-4 w-4 mr-2" />
          {t("bookmark:bookmark.copyLink")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleShare}>
          <Share2 className="h-4 w-4 mr-2" />
          {t("bookmark:bookmark.share")}
        </DropdownMenuItem>
        {onTogglePin && (
          <DropdownMenuItem onClick={onTogglePin}>
            <Pin className="h-4 w-4 mr-2" />
            {isPinned ? t("bookmark:bookmark.unpin") : t("bookmark:bookmark.pin")}
          </DropdownMenuItem>
        )}
        {hasSnapshotActions && (
          <>
            <DropdownMenuSeparator />
            {bookmark.hasSnapshot && onViewSnapshot && (
              <DropdownMenuItem onClick={onViewSnapshot}>
                <Camera className="h-4 w-4 mr-2" />
                {t("bookmark:bookmark.viewSnapshot")}
              </DropdownMenuItem>
            )}
            {onSaveSnapshot && (
              <DropdownMenuItem onClick={onSaveSnapshot}>
                <Camera className="h-4 w-4 mr-2" />
                {bookmark.hasSnapshot
                  ? t("bookmark:bookmark.snapshot.update")
                  : t("bookmark:bookmark.snapshot.save")}
              </DropdownMenuItem>
            )}
            {bookmark.hasSnapshot && onDeleteSnapshot && (
              <DropdownMenuItem onClick={onDeleteSnapshot}>
                <Trash2 className="h-4 w-4 mr-2" />
                {t("bookmark:bookmark.snapshot.delete")}
              </DropdownMenuItem>
            )}
            {bookmark.hasSnapshot && onSyncToObsidian && (
              <DropdownMenuItem onClick={onSyncToObsidian}>
                <Download className="h-4 w-4 mr-2" />
                {t("bookmark:bookmark.snapshot.syncToObsidian")}
              </DropdownMenuItem>
            )}
          </>
        )}
        {onReanalyzeAI && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onReanalyzeAI} disabled={isProcessingAI}>
              <Sparkles className="h-4 w-4 mr-2" />
              {t("ai:reanalyze")}
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {t("bookmark:bookmark.delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
