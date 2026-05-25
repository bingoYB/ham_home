import { useTranslation } from "react-i18next";
import { useBookmarks } from "@/contexts/BookmarkContext";
import { useLanguage } from "@/hooks/useLanguage";
import { useShortcuts } from "@/hooks/useShortcuts";
import { useRelativeTime } from "@/hooks/useRelativeTime";
import { useStorageStats } from "@/hooks/useStorageStats";
import { useOptionsTab } from "./useOptionsTab";
import { useAIConfig } from "./useAIConfig";
import { useEmbeddingConfig } from "./useEmbeddingConfig";
import { useSyncConfig } from "./useSyncConfig";
import { useCustomFilters } from "./useCustomFilters";
import { useClearData } from "./useClearData";

export function useOptionsPage() {
  const { t } = useTranslation(["common", "settings"]);
  const { language, switchLanguage, availableLanguages } = useLanguage();
  const { shortcuts, refresh: refreshShortcuts } = useShortcuts();
  const { appSettings, syncStatus, storageInfo, updateAppSettings } = useBookmarks();

  const { activeTab, handleTabChange } = useOptionsTab();
  const aiConfigState = useAIConfig();
  const embeddingState = useEmbeddingConfig();
  const syncState = useSyncConfig();
  const filtersState = useCustomFilters();
  const clearDataState = useClearData();
  const { snapshotStats } = useStorageStats();

  const relativeSyncTime = useRelativeTime(
    syncStatus?.lastSyncTime || undefined,
  );

  const handleAutoSaveSnapshotChange = (checked: boolean) => {
    updateAppSettings({
      autoSaveSnapshot: checked,
    });
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return {
    ...aiConfigState,
    ...embeddingState,
    ...syncState,
    ...filtersState,
    ...clearDataState,
    // Override spread values with explicit ones
    aiConfig: aiConfigState.aiConfig,
    syncConfig: syncState.syncConfig,
    t,
    language,
    switchLanguage,
    availableLanguages,
    shortcuts,
    refreshShortcuts,
    appSettings,
    updateAppSettings,
    syncStatus,
    storageInfo,
    snapshotStats,
    activeTab,
    handleTabChange,
    relativeSyncTime,
    handleAutoSaveSnapshotChange,
    formatBytes,
  };
}