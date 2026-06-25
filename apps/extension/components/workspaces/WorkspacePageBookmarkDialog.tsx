import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@hamhome/ui";
import { SavePanel } from "@/components/SavePanel";
import { getSafeFaviconUrl } from "@/utils/bookmark-utils";
import type { WorkspaceTabPage, PageContent } from "@/types";

interface WorkspacePageBookmarkDialogProps {
  page: WorkspaceTabPage | null;
  onOpenChange: (open: boolean) => void;
}

export function WorkspacePageBookmarkDialog({
  page,
  onOpenChange,
}: WorkspacePageBookmarkDialogProps) {
  const { t } = useTranslation("bookmark");

  if (!page) return null;

  const pageContent: PageContent = {
    url: page.url,
    title: page.title,
    content: "",
    htmlContent: "",
    textContent: "",
    excerpt: "",
    favicon: getSafeFaviconUrl(page.url, page.favicon) || "",
  };

  return (
    <Dialog open={!!page} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden border bg-background/95 shadow-xl sm:rounded-xl">
        <DialogHeader className="px-4 py-3 border-b bg-muted/20">
          <DialogTitle className="text-base font-semibold">
            {t("bookmark.saveBookmark", { defaultValue: "保存到书签" })}
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[80vh] overflow-y-auto">
          <SavePanel
            pageContent={pageContent}
            existingBookmark={null}
            onSaved={() => onOpenChange(false)}
            onClose={() => onOpenChange(false)}
            hideSnapshotOptions={true}
            initialSaveSnapshot={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
