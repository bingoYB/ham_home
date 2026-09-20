/**
 * 保存面板容器组件
 * 负责状态管理与行为逻辑，展示层由 SavePanelView 承担。
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@hamhome/ui';
import { useSavePanel } from './useSavePanel';
import type { PageContent, LocalBookmark, SaveFlowClipContext } from '@/types';
import { SavePanelView } from './SavePanelView';
import { getBackgroundService } from '@/lib/services';

interface SavePanelProps {
  pageContent: PageContent;
  existingBookmark: LocalBookmark | null;
  onSaved: () => void;
  onClose?: () => void;
  onDelete?: () => void;
  hideSnapshotOptions?: boolean;
  initialSaveSnapshot?: boolean;
  initialSaveScreenshot?: boolean;
  initialClip?: SaveFlowClipContext;
  /** 首次加载（含自动 AI 分析）结束回调 */
  onInitialLoadSettled?: () => void;
  /** Popover/下拉的 portal 容器（在 shadow root 中渲染时必须传入） */
  portalContainer?: HTMLElement;
}

export function SavePanel({
  pageContent,
  existingBookmark,
  onSaved,
  onClose,
  onDelete,
  hideSnapshotOptions = false,
  initialSaveSnapshot,
  initialSaveScreenshot,
  initialClip,
  onInitialLoadSettled,
  portalContainer,
}: SavePanelProps) {
  const { t } = useTranslation(['bookmark', 'common']);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const {
    title,
    description,
    categoryId,
    tags,
    categories,
    allTags,
    aiStatus,
    aiError,
    aiRecommendedCategory,
    saving,
    saveSnapshot,
    snapshotStatus,
    snapshotError,
    saveScreenshot,
    screenshotStatus,
    screenshotError,
    clipNote,
    clipStatus,
    clipError,
    syncToObsidian,
    obsidianStatus,
    obsidianError,
    actionError,
    setTitle,
    setDescription,
    setCategoryId,
    setTags,
    setSaveSnapshot,
    setSaveScreenshot,
    setClipNote,
    setSyncToObsidian,
    runAIAnalysis,
    retryAnalysis,
    applyAIRecommendedCategory,
    save,
    deleteBookmark,
  } = useSavePanel({
    pageContent,
    existingBookmark,
    onSaved,
    initialSaveSnapshot,
    initialSaveScreenshot,
    initialClip,
    onInitialLoadSettled,
  });

  const handleConfirmDelete = () => {
    setDeleteDialogOpen(false);
    // 删除失败时保留面板，错误信息在面板内展示
    deleteBookmark().then((deleted) => {
      if (deleted) onDelete?.();
    });
  };

  return (
    <>
      <SavePanelView
        title={title}
        description={description}
        categoryId={categoryId}
        tags={tags}
        categories={categories}
        allTags={allTags}
        existingBookmark={existingBookmark}
        aiRecommendedCategory={aiRecommendedCategory}
        aiStatus={aiStatus}
        aiError={aiError}
        saving={saving}
        saveSnapshot={saveSnapshot}
        snapshotStatus={snapshotStatus}
        snapshotError={snapshotError}
        saveScreenshot={saveScreenshot}
        screenshotStatus={screenshotStatus}
        screenshotError={screenshotError}
        initialClip={initialClip}
        clipNote={clipNote}
        clipStatus={clipStatus}
        clipError={clipError}
        syncToObsidian={syncToObsidian}
        obsidianStatus={obsidianStatus}
        obsidianError={obsidianError}
        actionError={actionError}
        onTitleChange={setTitle}
        onDescriptionChange={setDescription}
        onCategoryChange={setCategoryId}
        onTagsChange={setTags}
        onSaveSnapshotChange={setSaveSnapshot}
        onSaveScreenshotChange={setSaveScreenshot}
        onClipNoteChange={setClipNote}
        onSyncToObsidianChange={setSyncToObsidian}
        onLoadSuggestions={runAIAnalysis}
        onApplyAICategory={applyAIRecommendedCategory}
        onRetry={retryAnalysis}
        onConfigureAI={() => {
          // 统一交给 background 打开：content script 没有 tabs API
          getBackgroundService()
            .openOptionsPage('settings')
            .catch((error: unknown) => {
              console.error('[SavePanel] Failed to open settings:', error);
            });
        }}
        onSave={save}
        onCancel={onClose}
        onDelete={
          existingBookmark ? () => setDeleteDialogOpen(true) : undefined
        }
        hideSnapshotOptions={hideSnapshotOptions}
        portalContainer={portalContainer}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title={t('bookmark:bookmark.deleteTitle')}
        description={t('bookmark:bookmark.deleteConfirm', {
          title: existingBookmark?.title ?? '',
        })}
        confirmText={t('common:common.delete')}
        cancelText={t('common:common.cancel')}
        variant="destructive"
        container={portalContainer}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
