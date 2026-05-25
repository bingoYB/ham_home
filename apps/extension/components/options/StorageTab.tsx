import { useTranslation } from "react-i18next";
import { Download, Trash2, Loader2, RefreshCw, AlertTriangle, Sparkles } from "lucide-react";
import {
  Button,
  Input,
  Label,
  Switch,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@hamhome/ui";
import { syncEngine } from "@/lib/sync/sync-engine";
import type { WebDAVConfig, SyncStatus, EmbeddingConfig } from "@/types";
import type { VectorStoreStats } from "@/lib/storage/vector-store";

interface StorageInfo {
  bookmarkCount: number;
  categoryCount: number;
  tagCount: number;
  workspaceCount: number;
  storageSize: string;
}

interface SnapshotStats {
  count: number;
  totalSize: number;
}

interface StorageTabProps {
  storageInfo: StorageInfo;
  snapshotStats: SnapshotStats | null;
  vectorStats: VectorStoreStats | null;
  embeddingConfig: EmbeddingConfig;
  syncConfig: WebDAVConfig;
  syncStatus: SyncStatus;
  localWebdavUrl: string;
  localWebdavUser: string;
  localWebdavPwd: string;
  localWebdavE2e: string;
  isSyncing: boolean;
  isClearingBookmarks: boolean;
  isClearingSnapshots: boolean;
  isClearingAll: boolean;
  isRebuilding: boolean;
  isClearing: boolean;
  isClearingRemote: boolean;
  relativeSyncTime: string;
  setLocalWebdavUrl: (val: string) => void;
  setLocalWebdavUser: (val: string) => void;
  setLocalWebdavPwd: (val: string) => void;
  setLocalWebdavE2e: (val: string) => void;
  setIsSyncing: (val: boolean) => void;
  updateSyncConfig: (updates: Partial<WebDAVConfig>) => void;
  onClearBookmarkData: () => void;
  onClearSnapshotData: () => void;
  onClearVectors: () => void;
  onClearWorkspaceData?: () => void; // Optional because we don't have a separate clear button just for workspace yet. Or we can just use clearAll for now and disable the button, but it's better to add the button if the user wants it, wait, the user didn't ask for a separate clear workspace button, just "清除所有业务数据，需要将工作空间的数据删除", and "存储管理增加工作空间的数据统计展示". I'll just show the stats without a clear button, or with a clear button that's disabled/omitted. Let's add a clear button and a prop for it, or we can just omit the button and show the stats. Actually, it's consistent to have a clear button. I'll add `onClearWorkspaceData` prop. But wait, `useClearData` doesn't return `onClearWorkspaceData`. We can implement it in `useClearData.ts`. Let's just omit the clear button for workspace for now and see, or we can just disable it. Wait, the request says "清除所有业务数据，需要将工作空间的数据删除" which implies the "Clear All" button should clear it. "增加工作空间的数据统计展示" means adding the stats. I'll just show the stats card.
  onExport: (format: "json" | "html") => void;
  onClearAllData: () => void;
  onClearRemoteData: () => void;
  formatBytes: (bytes: number) => string;
}

export function StorageTab({
  storageInfo,
  snapshotStats,
  vectorStats,
  embeddingConfig,
  syncConfig,
  syncStatus,
  localWebdavUrl,
  localWebdavUser,
  localWebdavPwd,
  localWebdavE2e,
  isSyncing,
  isClearingBookmarks,
  isClearingSnapshots,
  isClearingAll,
  isRebuilding,
  isClearing,
  isClearingRemote,
  relativeSyncTime,
  setLocalWebdavUrl,
  setLocalWebdavUser,
  setLocalWebdavPwd,
  setLocalWebdavE2e,
  setIsSyncing,
  updateSyncConfig,
  onClearBookmarkData,
  onClearSnapshotData,
  onClearVectors,
  onExport,
  onClearAllData,
  onClearRemoteData,
  formatBytes,
}: StorageTabProps) {
  const { t } = useTranslation(["common", "settings"]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("settings:settings.storage.title")}</CardTitle>
          <CardDescription>
            {t("settings:settings.storage.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 数据概览 */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">
              {t("settings:settings.storage.dataOverview")}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 书签 & 分类 */}
              <div className="flex flex-col p-4 rounded-lg border bg-muted/30 gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {t("settings:settings.storage.bookmarkData.title")}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("settings:settings.storage.bookmarkData.count", {
                      bookmarks: storageInfo.bookmarkCount,
                      categories: storageInfo.categoryCount,
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("settings:settings.storage.bookmarkData.size", {
                      size: storageInfo.storageSize,
                    })}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearBookmarkData}
                  disabled={
                    isClearingBookmarks ||
                    isClearingAll ||
                    (storageInfo.bookmarkCount === 0 && storageInfo.categoryCount === 0)
                  }
                  className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                >
                  {isClearingBookmarks ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5 shrink-0" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                  )}
                  {t("settings:settings.storage.bookmarkData.clear")}
                </Button>
              </div>

              {/* 工作空间 */}
              <div className="flex flex-col p-4 rounded-lg border bg-muted/30 gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {t("settings:settings.storage.workspaceData.title")}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("settings:settings.storage.workspaceData.count", {
                      count: storageInfo.workspaceCount || 0,
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("settings:settings.storage.workspaceData.size")}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearAllData}
                  disabled={isClearingAll || !storageInfo.workspaceCount}
                  className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                >
                  {isClearingAll ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5 shrink-0" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                  )}
                  {t("settings:settings.storage.workspaceData.clear")}
                </Button>
              </div>

              {/* 网页快照 */}
              <div className="flex flex-col p-4 rounded-lg border bg-muted/30 gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {t("settings:settings.storage.snapshotData.title")}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("settings:settings.storage.snapshotData.count", {
                      count: snapshotStats?.count || 0,
                    })}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("settings:settings.storage.snapshotData.size", {
                      size: formatBytes(snapshotStats?.totalSize || 0),
                    })}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearSnapshotData}
                  disabled={isClearingSnapshots || isClearingAll || !snapshotStats?.count}
                  className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                >
                  {isClearingSnapshots ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5 shrink-0" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                  )}
                  {t("settings:settings.storage.snapshotData.clear")}
                </Button>
              </div>

              {/* 语义向量索引 */}
              <div className="flex flex-col p-4 rounded-lg border bg-muted/30 gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    {t("settings:settings.storage.vectorData.title")}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {embeddingConfig.enabled
                      ? t("settings:settings.storage.vectorData.count", {
                          count: vectorStats?.count || 0,
                        })
                      : t("settings:settings.storage.notEnabled")}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {embeddingConfig.enabled
                      ? t("settings:settings.storage.vectorData.size", {
                          size: formatBytes(vectorStats?.estimatedSize || 0),
                        })
                      : "—"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearVectors}
                  disabled={
                    isRebuilding ||
                    isClearing ||
                    isClearingAll ||
                    !embeddingConfig.enabled ||
                    (vectorStats?.count ?? 0) === 0
                  }
                  className="w-full text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                >
                  {isClearing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5 shrink-0" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                  )}
                  {t("settings:settings.storage.vectorData.clear")}
                </Button>
              </div>
            </div>
          </div>

          {/* 数据导出 */}
          <div className="pt-4 border-t space-y-3">
            <h4 className="text-sm font-medium text-foreground">
              {t("settings:settings.storage.dataExport")}
            </h4>
            <div className="flex gap-2">
              <Button onClick={() => onExport("json")} variant="outline" className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                {t("settings:settings.storage.exportJSON")}
              </Button>
              <Button onClick={() => onExport("html")} variant="outline" className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                {t("settings:settings.storage.exportHTML")}
              </Button>
            </div>
          </div>

          {/* 危险区 */}
          <div className="pt-4 border-t space-y-3">
            <div>
              <h4 className="text-sm font-medium text-foreground">
                {t("settings:settings.storage.dangerZone")}
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                {t("settings:settings.storage.clearAllDesc")}
              </p>
            </div>
            <Button
              onClick={onClearAllData}
              variant="destructive"
              className="w-full"
              disabled={isClearingAll}
            >
              {isClearingAll ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("settings:settings.storage.clearAllData")}...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("settings:settings.storage.clearAllData")}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 数据同步区块 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("settings:settings.sync.config.title")}</CardTitle>
          <CardDescription>
            {t("settings:settings.sync.config.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>{t("settings:settings.sync.config.enabled")}</Label>
              <p className="text-sm text-muted-foreground">
                {t("settings:settings.sync.config.enabledDesc")}
              </p>
            </div>
            <Switch
              checked={syncConfig.enabled}
              onCheckedChange={(checked) => updateSyncConfig({ enabled: checked })}
            />
          </div>

          {syncConfig.enabled && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label>{t("settings:settings.sync.config.url")}</Label>
                <Input
                  type="url"
                  placeholder="https://example.com/webdav/"
                  value={localWebdavUrl}
                  onChange={(e) => setLocalWebdavUrl(e.target.value)}
                  onBlur={(e) => updateSyncConfig({ url: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("settings:settings.sync.config.username")}</Label>
                  <Input
                    type="text"
                    placeholder="username"
                    value={localWebdavUser}
                    onChange={(e) => setLocalWebdavUser(e.target.value)}
                    onBlur={(e) => updateSyncConfig({ username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("settings:settings.sync.config.password")}</Label>
                  <Input
                    type="password"
                    placeholder="password"
                    value={localWebdavPwd}
                    onChange={(e) => setLocalWebdavPwd(e.target.value)}
                    onBlur={(e) => updateSyncConfig({ password: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={async () => {
                    setIsSyncing(true);
                    try {
                      await syncEngine.doSync();
                    } catch (err) {
                      console.error("Manual sync failed", err);
                    } finally {
                      setIsSyncing(false);
                    }
                  }}
                  disabled={
                    isSyncing ||
                    syncStatus.status === "syncing" ||
                    !syncConfig.url ||
                    !syncConfig.username ||
                    !syncConfig.password
                  }
                  className="bg-primary hover:bg-primary/90"
                >
                  {isSyncing || syncStatus.status === "syncing" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("settings:settings.sync.config.syncingBtn")}
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {t("settings:settings.sync.config.syncBtn")}
                    </>
                  )}
                </Button>

                <Button
                  onClick={onClearRemoteData}
                  variant="destructive"
                  disabled={
                    isClearingRemote ||
                    isSyncing ||
                    syncStatus.status === "syncing" ||
                    !syncConfig.url ||
                    !syncConfig.username ||
                    !syncConfig.password
                  }
                >
                  {isClearingRemote ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t("settings:settings.sync.config.clearingRemoteBtn", "清除中...")}
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t("settings:settings.sync.config.clearRemoteBtn", "清除远端数据")}
                    </>
                  )}
                </Button>
              </div>

              {/* 同步状态展示 */}
              <div className="mt-4 p-4 rounded-lg bg-muted text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("settings:settings.sync.config.statusLabel")}
                  </span>
                  <span
                    className={
                      syncStatus.status === "error"
                        ? "text-destructive font-bold"
                        : syncStatus.status === "syncing"
                          ? "text-blue-500"
                          : "text-green-600"
                    }
                  >
                    {syncStatus.status === "error"
                      ? t("settings:settings.sync.config.statusError")
                      : syncStatus.status === "syncing"
                        ? t("settings:settings.sync.config.statusSyncing")
                        : t("settings:settings.sync.config.statusIdle")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("settings:settings.sync.config.lastSyncLabel")}
                  </span>
                  <span>
                    {syncStatus.lastSyncTime > 0
                      ? relativeSyncTime
                      : t("settings:settings.sync.config.neverSynced")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t("settings:settings.sync.config.remoteVersionLabel")}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    {syncStatus.syncVersion || "-"}
                  </span>
                </div>
                {syncStatus.errorMessage && (
                  <div className="mt-2 text-destructive p-2 bg-red-50 dark:bg-red-900/10 rounded-md border border-red-100 dark:border-red-900/30">
                    <AlertTriangle className="inline-block mr-1 h-3 w-3" />
                    {syncStatus.errorMessage}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
