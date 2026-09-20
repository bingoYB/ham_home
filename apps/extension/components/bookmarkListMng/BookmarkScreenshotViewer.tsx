/**
 * 界面截图查看器
 * 展示保存书签时截取的页面界面截图，支持新标签页打开、下载与删除。
 */
import { useTranslation } from "react-i18next";
import { Download, ExternalLink, Image as ImageIcon, Loader2, Trash2 } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  confirm,
  toast,
} from "@hamhome/ui";
import { useBookmarkScreenshotUrl } from "@/hooks/useBookmarkScreenshot";
import { bookmarkScreenshotStorage } from "@/lib/storage/bookmark-screenshot-storage";
import type { LocalBookmark } from "@/types";

interface BookmarkScreenshotViewerProps {
  bookmark: LocalBookmark | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BookmarkScreenshotViewer({
  bookmark,
  open,
  onOpenChange,
}: BookmarkScreenshotViewerProps) {
  const { t } = useTranslation(["bookmark", "common"]);
  const { url, loading, error } = useBookmarkScreenshotUrl(
    open ? (bookmark?.id ?? null) : null,
    "image",
    open,
  );

  const download = () => {
    if (!url || !bookmark) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = `${bookmark.title.replace(/[^a-zA-Z0-9一-龥]/g, "_")}_screenshot.png`;
    link.click();
  };

  const remove = async () => {
    if (!bookmark) return;
    const accepted = await confirm({
      title: t("bookmark:bookmark.screenshot.deleteTitle"),
      description: t("bookmark:bookmark.screenshot.deleteDesc"),
      confirmText: t("common:common.delete"),
      cancelText: t("common:common.cancel"),
      variant: "destructive",
    });
    if (!accepted) return;
    await bookmarkScreenshotStorage.delete(bookmark.id);
    toast.success(t("bookmark:bookmark.screenshot.deleted"));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="border-b px-6 py-4 pr-12 text-left">
          <DialogTitle className="flex items-center gap-2 text-sm font-medium">
            <ImageIcon className="h-4 w-4 text-primary" />
            {t("bookmark:bookmark.screenshot.view")}
          </DialogTitle>
          <DialogDescription className="truncate">
            {bookmark?.title ?? ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-52 flex-1 items-center justify-center overflow-auto bg-muted/30 p-6">
          {url ? (
            <img
              src={url}
              alt={bookmark?.title ?? ""}
              className="mx-auto w-full max-w-full rounded-lg object-contain object-top"
            />
          ) : loading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <p className="text-sm text-muted-foreground">
              {error || t("bookmark:bookmark.screenshot.notFound")}
            </p>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t px-6 py-4">
          <Button
            variant="outline"
            size="sm"
            disabled={!url}
            onClick={() => url && window.open(url, "_blank")}
          >
            <ExternalLink className="mr-1.5 h-4 w-4" />
            {t("bookmark:bookmark.screenshot.openInNewTab")}
          </Button>
          <Button variant="outline" size="sm" disabled={!url} onClick={download}>
            <Download className="mr-1.5 h-4 w-4" />
            {t("bookmark:bookmark.screenshot.download")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!url}
            className="text-destructive hover:text-destructive"
            onClick={() => void remove()}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            {t("bookmark:bookmark.screenshot.delete")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
