/**
 * useOpenTabActions - actions on open tabs from the tab center and the popup.
 * Everything that closes a tab runs in the background (archive first, then close)
 * and offers an undo in the toast.
 */
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { confirm, toast } from "@hamhome/ui";
import { getBackgroundService } from "@/lib/services";
import type { TabArchiveReason } from "@/types";

export interface UseOpenTabActionsResult {
  focus: (tabId: number) => Promise<void>;
  readLater: (tabIds: number[]) => Promise<void>;
  bookmark: (tabIds: number[]) => Promise<void>;
  archive: (tabIds: number[], reason?: TabArchiveReason) => Promise<void>;
  closeDuplicates: (tabIds?: number[]) => Promise<void>;
  setLocked: (tabIds: number[], locked: boolean) => Promise<void>;
  renew: (tabIds: number[]) => Promise<void>;
  closeWithoutRecord: (tabIds: number[]) => Promise<void>;
  confirmPending: (tabIds?: number[]) => Promise<void>;
  keepPending: (tabIds?: number[]) => Promise<void>;
}

export function useOpenTabActions(): UseOpenTabActionsResult {
  const { t } = useTranslation(["bookmark", "common"]);

  const fail = useCallback(
    (error: unknown) => {
      console.error("[useOpenTabActions] action failed:", error);
      toast.error(t("bookmark:tabCenter.actionFailed"));
    },
    [t],
  );

  const undoAction = useCallback(
    (token?: string) =>
      token
        ? {
            action: {
              label: t("bookmark:tabFeedback.undo"),
              onClick: () => {
                void getBackgroundService()
                  .undoTabAction(token)
                  .then((ok) => toast[ok ? "success" : "error"](
                    ok ? t("bookmark:tabFeedback.undone") : t("bookmark:tabFeedback.undoExpired"),
                  ));
              },
            },
          }
        : undefined,
    [t],
  );

  const focus = useCallback(async (tabId: number) => {
    await getBackgroundService().focusTab(tabId).catch(fail);
  }, [fail]);

  const readLater = useCallback(
    async (tabIds: number[]) => {
      try {
        const result = await getBackgroundService().readLaterTabs(tabIds, "tab-center", {
          closeTabs: true,
        });
        toast.success(
          t("bookmark:tabCenter.readLaterAdded", { count: result.added + result.alreadyQueued }),
          undoAction(result.undoToken),
        );
      } catch (error) {
        fail(error);
      }
    },
    [fail, t, undoAction],
  );

  const bookmark = useCallback(
    async (tabIds: number[]) => {
      try {
        const result = await getBackgroundService().bookmarkTabs(tabIds);
        toast.success(t("bookmark:tabCenter.bookmarked", { count: result.created, existing: result.existing }));
      } catch (error) {
        fail(error);
      }
    },
    [fail, t],
  );

  const archive = useCallback(
    async (tabIds: number[], reason: TabArchiveReason = "manual") => {
      try {
        const result = await getBackgroundService().archiveTabs(tabIds, reason);
        if (!result.ok) throw new Error(result.error);
        toast.success(t("bookmark:tabCenter.archived", { count: result.archived }), undoAction(result.undoToken));
      } catch (error) {
        fail(error);
      }
    },
    [fail, t, undoAction],
  );

  const closeDuplicates = useCallback(
    async (tabIds?: number[]) => {
      try {
        const result = await getBackgroundService().closeDuplicateTabs(tabIds);
        toast.success(
          t("bookmark:tabCenter.duplicatesClosed", { count: result.archived }),
          undoAction(result.undoToken),
        );
      } catch (error) {
        fail(error);
      }
    },
    [fail, t, undoAction],
  );

  const setLocked = useCallback(
    async (tabIds: number[], locked: boolean) => {
      try {
        await getBackgroundService().setTabsLocked(tabIds, locked);
        toast.success(t(locked ? "bookmark:tabCenter.locked" : "bookmark:tabCenter.unlocked", { count: tabIds.length }));
      } catch (error) {
        fail(error);
      }
    },
    [fail, t],
  );

  const renew = useCallback(
    async (tabIds: number[]) => {
      try {
        await getBackgroundService().renewTabs(tabIds);
        toast.success(t("bookmark:tabCenter.renewed", { count: tabIds.length }));
      } catch (error) {
        fail(error);
      }
    },
    [fail, t],
  );

  const closeWithoutRecord = useCallback(
    async (tabIds: number[]) => {
      const accepted = await confirm({
        title: t("bookmark:tabCenter.closeWithoutRecord.title"),
        description: t("bookmark:tabCenter.closeWithoutRecord.description", { count: tabIds.length }),
        confirmText: t("bookmark:tabCenter.closeWithoutRecord.confirm"),
        cancelText: t("common:common.cancel"),
        variant: "destructive",
      });
      if (!accepted) return;
      try {
        const closed = await getBackgroundService().closeTabsWithoutRecord(tabIds);
        toast.success(t("bookmark:tabCenter.closed", { count: closed }));
      } catch (error) {
        fail(error);
      }
    },
    [fail, t],
  );

  const confirmPending = useCallback(
    async (tabIds?: number[]) => {
      try {
        const archived = await getBackgroundService().confirmPendingArchive(tabIds);
        toast.success(t("bookmark:tabCenter.archived", { count: archived }));
      } catch (error) {
        fail(error);
      }
    },
    [fail, t],
  );

  const keepPending = useCallback(
    async (tabIds?: number[]) => {
      await getBackgroundService().keepPendingArchive(tabIds).catch(fail);
    },
    [fail],
  );

  return {
    focus,
    readLater,
    bookmark,
    archive,
    closeDuplicates,
    setLocked,
    renew,
    closeWithoutRecord,
    confirmPending,
    keepPending,
  };
}
