import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@hamhome/ui";
import { Loader2 } from "lucide-react";
import { CustomFilterDialog } from "@/components/bookmarkPanel/CustomFilterDialog";

interface OptionsDialogsProps {
  t: any;
  showClearDialog: boolean;
  setShowClearDialog: (show: boolean) => void;
  handleClearData: () => void;
  showClearBookmarkDialog: boolean;
  setShowClearBookmarkDialog: (show: boolean) => void;
  handleClearBookmarkData: () => void;
  showClearSnapshotDialog: boolean;
  setShowClearSnapshotDialog: (show: boolean) => void;
  handleClearSnapshotData: () => void;
  showClearRemoteDialog: boolean;
  setShowClearRemoteDialog: (show: boolean) => void;
  handleClearRemoteData: () => void;
  deleteFilterTarget: any;
  setDeleteFilterTarget: (target: any) => void;
  handleDeleteFilter: () => void;
  filterDialogOpen: boolean;
  setFilterDialogOpen: (open: boolean) => void;
  handleSaveFilter: (name: string, conditions: any[]) => void;
  editingFilter: any;
  setEditingFilter: (filter: any) => void;
  showFullRebuildDialog: boolean;
  setShowFullRebuildDialog: (show: boolean) => void;
  handleFullRebuild: () => void;
  showClearVectorsDialog: boolean;
  setShowClearVectorsDialog: (show: boolean) => void;
  handleClearVectors: () => void;
  isClearingAll?: boolean;
  isClearingBookmarks?: boolean;
  isClearingSnapshots?: boolean;
  isClearingRemote?: boolean;
  isRebuilding?: boolean;
  isClearing?: boolean;
}

export function OptionsDialogs({
  t,
  showClearDialog,
  setShowClearDialog,
  handleClearData,
  showClearBookmarkDialog,
  setShowClearBookmarkDialog,
  handleClearBookmarkData,
  showClearSnapshotDialog,
  setShowClearSnapshotDialog,
  handleClearSnapshotData,
  showClearRemoteDialog,
  setShowClearRemoteDialog,
  handleClearRemoteData,
  deleteFilterTarget,
  setDeleteFilterTarget,
  handleDeleteFilter,
  filterDialogOpen,
  setFilterDialogOpen,
  handleSaveFilter,
  editingFilter,
  setEditingFilter,
  showFullRebuildDialog,
  setShowFullRebuildDialog,
  handleFullRebuild,
  showClearVectorsDialog,
  setShowClearVectorsDialog,
  handleClearVectors,
  isClearingAll,
  isClearingBookmarks,
  isClearingSnapshots,
  isClearingRemote,
  isRebuilding,
  isClearing,
}: OptionsDialogsProps) {
  return (
    <>
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("settings:settings.storage.confirmClearAll")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings:settings.storage.clearAllWarning")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("common:common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearData}
              disabled={isClearingAll}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isClearingAll ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("common:common.clearing")}
                </>
              ) : (
                t("common:common.clear")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showClearBookmarkDialog}
        onOpenChange={setShowClearBookmarkDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("settings:settings.storage.bookmarkData.confirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings:settings.storage.bookmarkData.confirmWarning")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("common:common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearBookmarkData}
              disabled={isClearingBookmarks}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isClearingBookmarks ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("common:common.clearing")}
                </>
              ) : (
                t("common:common.clear")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showClearSnapshotDialog}
        onOpenChange={setShowClearSnapshotDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("settings:settings.storage.snapshotData.confirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings:settings.storage.snapshotData.confirmWarning")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("common:common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearSnapshotData}
              disabled={isClearingSnapshots}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isClearingSnapshots ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("common:common.clearing")}
                </>
              ) : (
                t("common:common.clear")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showClearRemoteDialog}
        onOpenChange={setShowClearRemoteDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("settings:settings.sync.config.clearRemoteConfirmTitle", "清除远端数据")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings:settings.sync.config.clearRemoteConfirmDesc", "确定要清除 WebDAV 远端的所有同步数据吗？此操作无法撤销。")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("common:common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearRemoteData}
              disabled={isClearingRemote}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isClearingRemote ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("common:common.clearing")}
                </>
              ) : (
                t("common:common.clear")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showFullRebuildDialog}
        onOpenChange={setShowFullRebuildDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("settings:settings.ai.embedding.rebuild.fullTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings:settings.ai.embedding.rebuild.fullDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("common:common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFullRebuild}
              disabled={isRebuilding}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("settings:settings.ai.embedding.rebuild.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showClearVectorsDialog}
        onOpenChange={setShowClearVectorsDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("settings:settings.ai.embedding.clear.title")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings:settings.ai.embedding.clear.desc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("common:common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearVectors}
              disabled={isClearing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common:common.clear")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deleteFilterTarget}
        onOpenChange={(open) => !open && setDeleteFilterTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("settings:settings.general.customFilters.deleteConfirm")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("settings:settings.general.customFilters.deleteWarning", {
                name: deleteFilterTarget?.name,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t("common:common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFilter}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("common:common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CustomFilterDialog
        open={filterDialogOpen}
        onOpenChange={(open) => {
          setFilterDialogOpen(open);
          if (!open) setEditingFilter(null);
        }}
        onSave={handleSaveFilter}
        editingFilter={editingFilter}
      />
    </>
  );
}
