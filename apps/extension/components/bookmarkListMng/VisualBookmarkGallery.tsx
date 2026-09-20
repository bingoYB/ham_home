import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button, Checkbox } from "@hamhome/ui";
import { useBookmarkScreenshotUrl } from "@/hooks/useBookmarkScreenshot";
import type { LocalBookmark } from "@/types";

interface VisualBookmarkGalleryProps {
  bookmarks: LocalBookmark[];
  screenshotIds: Set<string>;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  /** 画廊里的每张卡片都有界面截图，点击卡片直接看大图 */
  onViewScreenshot: (bookmark: LocalBookmark) => void;
  onOpenBookmark: (url: string) => void;
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function VisualBookmarkGallery({
  bookmarks,
  screenshotIds,
  selectedIds,
  onToggleSelect,
  onViewScreenshot,
  onOpenBookmark,
}: VisualBookmarkGalleryProps) {
  const { t } = useTranslation("bookmark");
  const visualBookmarks = bookmarks.filter((bookmark) => screenshotIds.has(bookmark.id));

  if (visualBookmarks.length === 0) {
    return (
      <div className="flex h-full min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <ImageIcon className="h-7 w-7 text-muted-foreground/60" />
        </span>
        <p className="mt-4 font-medium">{t("visualGallery.empty")}</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {t("visualGallery.emptyDesc")}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
      {visualBookmarks.map((bookmark) => (
        <VisualCard
          key={bookmark.id}
          bookmark={bookmark}
          selected={selectedIds.has(bookmark.id)}
          onToggleSelect={() => onToggleSelect(bookmark.id)}
          onViewScreenshot={() => onViewScreenshot(bookmark)}
          onOpenBookmark={() => onOpenBookmark(bookmark.url)}
        />
      ))}
    </div>
  );
}

interface VisualCardProps {
  bookmark: LocalBookmark;
  selected: boolean;
  onToggleSelect: () => void;
  onViewScreenshot: () => void;
  onOpenBookmark: () => void;
}

function VisualCard({
  bookmark,
  selected,
  onToggleSelect,
  onViewScreenshot,
  onOpenBookmark,
}: VisualCardProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const { url, loading } = useBookmarkScreenshotUrl(
    bookmark.id,
    "thumbnail",
    visible,
  );

  return (
    <article
      ref={ref}
      className={`group relative overflow-hidden rounded-2xl border bg-card transition-shadow hover:shadow-lg [content-visibility:auto] [contain-intrinsic-size:300px] ${
        selected ? "border-primary ring-2 ring-primary/20" : "border-border"
      }`}
    >
      <button
        type="button"
        className="block aspect-[16/10] w-full overflow-hidden bg-muted text-left"
        onClick={onViewScreenshot}
      >
        {url ? (
          <img
            src={url}
            alt={bookmark.title}
            loading="lazy"
            className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <span className="flex h-full items-center justify-center">
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <ImageIcon className="h-7 w-7 text-muted-foreground/40" />
            )}
          </span>
        )}
      </button>
      <div className="absolute left-3 top-3 rounded-md bg-background/85 p-1 shadow-sm backdrop-blur-sm">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggleSelect}
          aria-label={bookmark.title}
        />
      </div>
      <Button
        variant="secondary"
        size="icon"
        className="absolute right-3 top-3 h-8 w-8 bg-background/85 opacity-0 shadow-sm backdrop-blur-sm transition-opacity group-hover:opacity-100"
        onClick={onOpenBookmark}
      >
        <ExternalLink className="h-4 w-4" />
      </Button>
      <button type="button" className="w-full p-4 text-left" onClick={onViewScreenshot}>
        <h3 className="truncate text-sm font-semibold">{bookmark.title}</h3>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {getHostname(bookmark.url)}
        </p>
      </button>
    </article>
  );
}
