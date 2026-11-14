import { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { confirm, toast } from "@hamhome/ui";
import { useBookmarks } from "@/contexts/BookmarkContext";

/** Confirm and submit one batch while preventing duplicate submissions. */
export function useBatchBookmarkDelete() {
  const { t } = useTranslation(["bookmark", "common"]);
  const { deleteBookmarks, refreshBookmarks } = useBookmarks();
  const [isDeleting, setIsDeleting] = useState(false);
  const pendingRef = useRef(false);

  const deleteSelected = useCallback(async (ids: string[]): Promise<boolean> => {
    if (ids.length === 0 || pendingRef.current) return false;
    pendingRef.current = true;
    setIsDeleting(true);

    try {
      const confirmed = await confirm({
        title: t("bookmark:bookmark.batch.deleteTitle"),
        description: t("bookmark:bookmark.batch.deleteConfirm", { count: ids.length }),
        confirmText: t("common:common.delete"),
        cancelText: t("common:common.cancel"),
        variant: "destructive",
      });
      if (!confirmed) return false;

      await deleteBookmarks(ids);
      return true;
    } catch (error) {
      // A failed response does not prove the background write was not applied.
      await refreshBookmarks();
      toast.error(t("bookmark:bookmark.batch.deleteUncertain"), {
        description: error instanceof Error ? error.message : typeof error === "string" ? error : undefined,
      });
      return false;
    } finally {
      pendingRef.current = false;
      setIsDeleting(false);
    }
  }, [deleteBookmarks, refreshBookmarks, t]);

  return { deleteSelected, isDeleting };
}
