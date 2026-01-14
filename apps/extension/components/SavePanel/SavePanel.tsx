/**
 * 保存面板组件
 * 参考 NewBookmarkModal 设计风格优化 UI
 */
import { Loader2, Bookmark, FileText, FolderOpen, Tag as TagIcon, AlignLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Input,
  Textarea,
  Label,
} from '@hamhome/ui';
import { TagInput } from '@/components/common/TagInput';
import { CategorySelect } from '@/components/common/CategorySelect';
import { AIStatus } from './AIStatus';
import { useSavePanel } from './useSavePanel';
import type { PageContent, LocalBookmark, LocalCategory } from '@/types';

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
  const { t } = useTranslation();
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
    <div className="p-4 space-y-4">
      {/* 表单 */}
      <BookmarkForm
        title={title}
        description={description}
        categoryId={categoryId}
        tags={tags}
        categories={categories}
        allTags={allTags}
        existingBookmark={existingBookmark}
        isLoading={aiStatus === 'loading'}
        aiRecommendedCategory={aiRecommendedCategory}
        aiStatus={aiStatus}
        aiError={aiError}
        onTitleChange={setTitle}
        onDescriptionChange={setDescription}
        onCategoryChange={setCategoryId}
        onTagsChange={setTags}
        onLoadSuggestions={runAIAnalysis}
        onApplyAICategory={applyAIRecommendedCategory}
        onRetry={retryAnalysis}
      />

      {/* 操作按钮 */}
      <div className="flex gap-2 pt-2">
        {/* 取消按钮 */}
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onClose}
        >
          {t('bookmark:savePanel.cancel')}
        </Button>

        {/* 保存按钮 */}
        <Button
          size="sm"
          className="flex-1 bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 text-primary-foreground shadow-sm"
          onClick={save}
          disabled={saving || !title.trim()}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              {t('bookmark:savePanel.saving')}
            </>
          ) : (
            <>
              <Bookmark className="h-4 w-4 mr-2" />
              {existingBookmark ? t('bookmark:savePanel.updateBookmark') : t('bookmark:savePanel.saveBookmark')}
            </>
          )}
        </Button>

        {/* 删除按钮（仅已保存书签显示） */}
        {existingBookmark && (
          <Button
            variant="destructive"
            size="sm"
            className="flex-1"
            onClick={() => {
              deleteBookmark().then(() => {
                onDelete?.();
              });
            }}
            disabled={saving}
          >
            {t('common:common.delete')}
          </Button>
        )}
      </div>
    </div>
  );
}

// ========== 子组件 ==========

interface BookmarkFormProps {
  title: string;
  description: string;
  categoryId: string | null;
  tags: string[];
  categories: LocalCategory[];
  allTags: string[];
  existingBookmark: LocalBookmark | null;
  isLoading: boolean;
  aiRecommendedCategory: string | null;
  aiStatus: 'idle' | 'loading' | 'success' | 'error' | 'disabled';
  aiError: string | null;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onCategoryChange: (value: string | null) => void;
  onTagsChange: (value: string[]) => void;
  onLoadSuggestions: () => void;
  onApplyAICategory: () => void;
  onRetry: () => void;
}

function BookmarkForm({
  title,
  description,
  categoryId,
  tags,
  categories,
  allTags,
  existingBookmark,
  isLoading,
  aiRecommendedCategory,
  aiStatus,
  aiError,
  onTitleChange,
  onDescriptionChange,
  onCategoryChange,
  onTagsChange,
  onLoadSuggestions,
  onApplyAICategory,
  onRetry,
}: BookmarkFormProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      {/* 标题 */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="title" className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4 text-blue-500" />
            {t('bookmark:savePanel.titleLabel')}
          </Label>
          {!existingBookmark && <AIStatus status={aiStatus} error={aiError} onRetry={onRetry} />}
        </div>
        <Input
          id="title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder={t('bookmark:savePanel.titlePlaceholder')}
          className="h-9 text-sm"
        />
      </div>

      {/* 摘要 */}
      <div className="space-y-1.5">
        <Label htmlFor="description" className="flex items-center gap-2 text-sm font-medium">
          <AlignLeft className="h-4 w-4 text-orange-500" />
          {t('bookmark:savePanel.descriptionLabel')}
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder={t('bookmark:savePanel.descriptionPlaceholder')}
          rows={2}
          className="text-sm resize-none"
        />
      </div>

      {/* 分类 */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <FolderOpen className="h-4 w-4 text-emerald-500" />
            {t('bookmark:savePanel.categoryLabel')}
          </Label>
          {!existingBookmark && !aiRecommendedCategory && !categoryId && (
            <button
              onClick={onLoadSuggestions}
              className="text-xs text-primary hover:text-primary/80 font-medium"
              disabled={isLoading}
            >
              {isLoading ? t('bookmark:savePanel.loading') : t('bookmark:savePanel.getSuggestions')}
            </button>
          )}
        </div>
        <CategorySelect
          value={categoryId}
          onChange={onCategoryChange}
          categories={categories}
          aiRecommendedCategory={aiRecommendedCategory}
          onApplyAICategory={onApplyAICategory}
        />
      </div>

      {/* 标签 */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <TagIcon className="h-4 w-4 text-purple-500" />
            {t('bookmark:savePanel.tagsLabel')}
          </Label>
          {!existingBookmark && tags.length === 0 && (
            <button
              onClick={onLoadSuggestions}
              className="text-xs text-primary hover:text-primary/80 font-medium"
              disabled={isLoading}
            >
              {isLoading ? t('bookmark:savePanel.loading') : t('bookmark:savePanel.getSuggestions')}
            </button>
          )}
        </div>
        <TagInput
          value={tags}
          onChange={onTagsChange}
          placeholder={t('bookmark:savePanel.tagPlaceholder')}
          maxTags={10}
          suggestions={allTags}
        />
      </div>
    </div>
  );
}
