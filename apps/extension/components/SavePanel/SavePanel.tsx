/**
 * 保存面板容器组件
 * 负责状态管理与行为逻辑，展示层由 SavePanelView 承担。
 */
import { useSavePanel } from './useSavePanel';
import type { PageContent, LocalBookmark } from '@/types';
import { SavePanelView } from './SavePanelView';
import { getExtensionURL, safeCreateTab } from '@/utils/browser-api';

interface SavePanelProps {
  pageContent: PageContent;
  existingBookmark: LocalBookmark | null;
  onSaved: () => void;
  onClose?: () => void;
  onDelete?: () => void;
}

export function SavePanel({
  pageContent,
  existingBookmark,
  onSaved,
  onClose,
  onDelete,
}: SavePanelProps) {
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
    setTitle,
    setDescription,
    setCategoryId,
    setTags,
    runAIAnalysis,
    retryAnalysis,
    applyAIRecommendedCategory,
    save,
    deleteBookmark,
  } = useSavePanel({
    pageContent,
    existingBookmark,
    onSaved,
  });

  return (
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
      onTitleChange={setTitle}
      onDescriptionChange={setDescription}
      onCategoryChange={setCategoryId}
      onTagsChange={setTags}
      onLoadSuggestions={runAIAnalysis}
      onApplyAICategory={applyAIRecommendedCategory}
      onRetry={retryAnalysis}
      onConfigureAI={() => {
        safeCreateTab(getExtensionURL('app.html#settings'));
      }}
      onSave={save}
      onCancel={onClose}
      onDelete={
        existingBookmark
          ? () => {
              deleteBookmark().then(() => {
                onDelete?.();
              });
            }
          : undefined
      }
    />
  );
}
