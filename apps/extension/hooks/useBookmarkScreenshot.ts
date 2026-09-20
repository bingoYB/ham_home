import { useEffect, useState } from "react";
import { bookmarkScreenshotStorage } from "@/lib/storage/bookmark-screenshot-storage";

type ScreenshotVariant = "thumbnail" | "image";

export function useBookmarkScreenshotUrl(
  bookmarkId: string | null,
  variant: ScreenshotVariant,
  enabled = true,
): { url: string | null; loading: boolean; error: string | null } {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookmarkId || !enabled) {
      setUrl(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    setLoading(true);
    setError(null);

    const load = async () => {
      try {
        const blob =
          variant === "thumbnail"
            ? await bookmarkScreenshotStorage.getThumbnail(bookmarkId)
            : await bookmarkScreenshotStorage.getImage(bookmarkId);
        if (!blob || cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setUrl(objectUrl);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "截图读取失败");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [bookmarkId, enabled, variant]);

  return { url, loading, error };
}
