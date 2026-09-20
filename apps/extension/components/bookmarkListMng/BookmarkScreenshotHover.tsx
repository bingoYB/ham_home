import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Image as ImageIcon, Loader2 } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@hamhome/ui";
import { useBookmarkScreenshotUrl } from "@/hooks/useBookmarkScreenshot";

interface BookmarkScreenshotHoverProps {
  bookmarkId: string;
  title: string;
  enabled?: boolean;
  children: ReactNode;
}

export function BookmarkScreenshotHover({
  bookmarkId,
  title,
  enabled = false,
  children,
}: BookmarkScreenshotHoverProps) {
  if (!enabled) return children;

  return (
    <HoverCard openDelay={450} closeDelay={100}>
      <HoverCardTrigger asChild>
        <div>{children}</div>
      </HoverCardTrigger>
      <HoverCardContent side="right" align="start" className="w-80 overflow-hidden p-0">
        <ScreenshotPreview bookmarkId={bookmarkId} title={title} />
      </HoverCardContent>
    </HoverCard>
  );
}

function ScreenshotPreview({ bookmarkId, title }: { bookmarkId: string; title: string }) {
  const { t } = useTranslation("bookmark");
  const { url, loading, error } = useBookmarkScreenshotUrl(
    bookmarkId,
    "thumbnail",
  );
  return (
    <div className="bg-muted/30">
      <div className="flex aspect-video items-center justify-center overflow-hidden bg-muted">
        {url ? (
          <img src={url} alt={title} className="h-full w-full object-cover object-top" />
        ) : loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
        )}
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {error || t("screenshotPreview.capturedPage")}
        </p>
      </div>
    </div>
  );
}
