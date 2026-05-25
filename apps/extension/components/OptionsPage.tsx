/**
 * OptionsPage 设置页面
 * 迁移自 design-example，整合现有设置功能
 */
import { useTranslation } from "react-i18next";
import {
  Globe,
  Database,
  Sparkles,
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@hamhome/ui";
import { useOptionsPage } from "@/hooks/useOptionsPage";
import { AITab } from "./options/AITab";
import { GeneralTab } from "./options/GeneralTab";
import { StorageTab } from "./options/StorageTab";
import { OptionsDialogs } from "./options/OptionsDialogs";

export function OptionsPage() {
  const {
    t,
    language,
    switchLanguage,
    availableLanguages,
    shortcuts,
    refreshShortcuts,
    aiConfig,
    appSettings,
    syncConfig,
    syncStatus,
    storageInfo,
    activeTab,
    handleTabChange,
    isAdvancedOpen,
    setIsAdvancedOpen,
    isTesting,
    showClearDialog,
    setShowClearDialog,
    showClearBookmarkDialog,
    setShowClearBookmarkDialog,
    showClearSnapshotDialog,
    setShowClearSnapshotDialog,
    showClearRemoteDialog,
    setShowClearRemoteDialog,
    isClearingBookmarks,
    isClearingSnapshots,
    isClearingRemote,
    relativeSyncTime,
    isClearingAll,
    testResult,
    newTag,
    setNewTag,
    customFilters,
    filterDialogOpen,
    setFilterDialogOpen,
    editingFilter,
    setEditingFilter,
    deleteFilterTarget,
    setDeleteFilterTarget,
    localApiKey,
    setLocalApiKey,
    localBaseUrl,
    setLocalBaseUrl,
    localModel,
    setLocalModel,
    modelSelectorOpen,
    setModelSelectorOpen,
    remoteModels,
    isFetchingModels,
    modelFetchResult,
    embeddingConfig,
    localEmbeddingApiKey,
    setLocalEmbeddingApiKey,
    localEmbeddingBaseUrl,
    setLocalEmbeddingBaseUrl,
    localEmbeddingModel,
    setLocalEmbeddingModel,
    embeddingTestResult,
    isEmbeddingTesting,
    vectorStats,
    isLoadingStats,
    isRebuilding,
    rebuildProgress,
    showFullRebuildDialog,
    setShowFullRebuildDialog,
    showClearVectorsDialog,
    setShowClearVectorsDialog,
    isClearing,
    snapshotStats,
    handleAutoSaveSnapshotChange,
    formatBytes,
    localWebdavUrl,
    setLocalWebdavUrl,
    localWebdavUser,
    setLocalWebdavUser,
    localWebdavPwd,
    setLocalWebdavPwd,
    localWebdavE2e,
    setLocalWebdavE2e,
    isSyncing,
    setIsSyncing,
    updateAIConfig,
    updateAppSettings,
    updateSyncConfig,
    updateEmbeddingConfig,
    onTestConnection: handleTestConnection,
    onFetchModels: handleFetchModels,
    recommendedModels,
    onClearAllData: handleClearData,
    onClearBookmarkData: handleClearBookmarkData,
    onClearSnapshotData: handleClearSnapshotData,
    onClearRemoteData: handleClearRemoteData,
    onExport: handleExport,
    onAddTag: handleAddTag,
    onRemoveTag: handleRemoveTag,
    onKeyDown: handleKeyDown,
    onTestEmbeddingConnection: handleTestEmbeddingConnection,
    onIncrementalRebuild: handleIncrementalRebuild,
    onFullRebuild: handleFullRebuild,
    onClearVectors: handleClearVectors,
    onAddFilter: handleAddFilter,
    onEditFilter: handleEditFilter,
    onSaveFilter: handleSaveFilter,
    onDeleteFilter: handleDeleteFilter,
  } = useOptionsPage();

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Globe className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">
          {t("settings:settings.title")}
        </h1>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            {t("settings:settings.tabs.ai")}
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            {t("settings:settings.tabs.general")}
          </TabsTrigger>
          <TabsTrigger value="storage" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            {t("settings:settings.tabs.storage")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="space-y-6 mt-6">
          <AITab
            aiConfig={aiConfig}
            embeddingConfig={embeddingConfig}
            localApiKey={localApiKey}
            localBaseUrl={localBaseUrl}
            localModel={localModel}
            modelSelectorOpen={modelSelectorOpen}
            isFetchingModels={isFetchingModels}
            remoteModels={remoteModels}
            modelFetchResult={modelFetchResult}
            isTesting={isTesting}
            testResult={testResult}
            isAdvancedOpen={isAdvancedOpen}
            newTag={newTag}
            recommendedModels={recommendedModels}
            vectorStats={vectorStats}
            isLoadingStats={isLoadingStats}
            isRebuilding={isRebuilding}
            rebuildProgress={rebuildProgress}
            isClearing={isClearing}
            localEmbeddingApiKey={localEmbeddingApiKey}
            localEmbeddingBaseUrl={localEmbeddingBaseUrl}
            localEmbeddingModel={localEmbeddingModel}
            isEmbeddingTesting={isEmbeddingTesting}
            embeddingTestResult={embeddingTestResult}
            setLocalApiKey={setLocalApiKey}
            setLocalBaseUrl={setLocalBaseUrl}
            setLocalModel={setLocalModel}
            setModelSelectorOpen={setModelSelectorOpen}
            setIsAdvancedOpen={setIsAdvancedOpen}
            setNewTag={setNewTag}
            setLocalEmbeddingApiKey={setLocalEmbeddingApiKey}
            setLocalEmbeddingBaseUrl={setLocalEmbeddingBaseUrl}
            setLocalEmbeddingModel={setLocalEmbeddingModel}
            updateAIConfig={updateAIConfig}
            updateEmbeddingConfig={updateEmbeddingConfig}
            onTestConnection={handleTestConnection}
            onFetchModels={handleFetchModels}
            onAddTag={handleAddTag}
            onRemoveTag={handleRemoveTag}
            onKeyDown={handleKeyDown}
            onTestEmbeddingConnection={handleTestEmbeddingConnection}
            onIncrementalRebuild={handleIncrementalRebuild}
            onFullRebuild={() => setShowFullRebuildDialog(true)}
            onClearVectors={() => setShowClearVectorsDialog(true)}
            showFullRebuildDialog={showFullRebuildDialog}
            showClearVectorsDialog={showClearVectorsDialog}
            setShowFullRebuildDialog={setShowFullRebuildDialog}
            setShowClearVectorsDialog={setShowClearVectorsDialog}
            formatBytes={formatBytes}
          />
        </TabsContent>

        <TabsContent value="general" className="space-y-6 mt-6">
          <GeneralTab
            language={language}
            switchLanguage={(lng: string) => switchLanguage(lng as import("@/types").Language)}
            availableLanguages={availableLanguages}
            appSettings={appSettings}
            updateAppSettings={updateAppSettings}
            shortcuts={shortcuts}
            refreshShortcuts={refreshShortcuts}
            customFilters={customFilters}
            onAddFilter={handleAddFilter}
            onEditFilter={handleEditFilter}
            onDeleteFilter={setDeleteFilterTarget}
            handleAutoSaveSnapshotChange={handleAutoSaveSnapshotChange}
          />
        </TabsContent>

        <TabsContent value="storage" className="space-y-6 mt-6">
          <StorageTab
            storageInfo={storageInfo}
            snapshotStats={snapshotStats}
            vectorStats={vectorStats}
            embeddingConfig={embeddingConfig}
            syncConfig={syncConfig ?? { enabled: false, url: '', username: '' }}
            syncStatus={syncStatus}
            localWebdavUrl={localWebdavUrl}
            localWebdavUser={localWebdavUser}
            localWebdavPwd={localWebdavPwd}
            localWebdavE2e={localWebdavE2e}
            isSyncing={isSyncing}
            isClearingBookmarks={isClearingBookmarks}
            isClearingSnapshots={isClearingSnapshots}
            isClearingAll={isClearingAll}
            isRebuilding={isRebuilding}
            isClearing={isClearing}
            isClearingRemote={isClearingRemote}
            relativeSyncTime={relativeSyncTime}
            setLocalWebdavUrl={setLocalWebdavUrl}
            setLocalWebdavUser={setLocalWebdavUser}
            setLocalWebdavPwd={setLocalWebdavPwd}
            setLocalWebdavE2e={setLocalWebdavE2e}
            updateSyncConfig={updateSyncConfig}
            setIsSyncing={setIsSyncing}
            onClearBookmarkData={() => setShowClearBookmarkDialog(true)}
            onClearSnapshotData={() => setShowClearSnapshotDialog(true)}
            onClearVectors={() => setShowClearVectorsDialog(true)}
            onExport={handleExport}
            onClearAllData={() => setShowClearDialog(true)}
            onClearRemoteData={() => setShowClearRemoteDialog(true)}
            formatBytes={formatBytes}
          />
        </TabsContent>
      </Tabs>

      <OptionsDialogs
        t={t}
        showClearDialog={showClearDialog}
        setShowClearDialog={setShowClearDialog}
        handleClearData={handleClearData}
        showClearBookmarkDialog={showClearBookmarkDialog}
        setShowClearBookmarkDialog={setShowClearBookmarkDialog}
        handleClearBookmarkData={handleClearBookmarkData}
        showClearSnapshotDialog={showClearSnapshotDialog}
        setShowClearSnapshotDialog={setShowClearSnapshotDialog}
        handleClearSnapshotData={handleClearSnapshotData}
        showClearRemoteDialog={showClearRemoteDialog}
        setShowClearRemoteDialog={setShowClearRemoteDialog}
        handleClearRemoteData={handleClearRemoteData}
        deleteFilterTarget={deleteFilterTarget}
        setDeleteFilterTarget={setDeleteFilterTarget}
        handleDeleteFilter={handleDeleteFilter}
        filterDialogOpen={filterDialogOpen}
        setFilterDialogOpen={setFilterDialogOpen}
        handleSaveFilter={handleSaveFilter}
        editingFilter={editingFilter}
        setEditingFilter={setEditingFilter}
        showFullRebuildDialog={showFullRebuildDialog}
        setShowFullRebuildDialog={setShowFullRebuildDialog}
        handleFullRebuild={handleFullRebuild}
        showClearVectorsDialog={showClearVectorsDialog}
        setShowClearVectorsDialog={setShowClearVectorsDialog}
        handleClearVectors={handleClearVectors}
        isClearingAll={isClearingAll}
        isClearingBookmarks={isClearingBookmarks}
        isClearingSnapshots={isClearingSnapshots}
        isClearingRemote={isClearingRemote}
        isRebuilding={isRebuilding}
        isClearing={isClearing}
      />
    </div>
  );
}
